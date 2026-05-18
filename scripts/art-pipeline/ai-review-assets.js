const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const {
  appendJsonLine,
  assetOutputDir,
  ensureDir,
  findVariantPath,
  loadSpecs,
  parseArgs,
  paths,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')
const {
  exportCandidatePreview,
  imageMetrics,
  paletteDistance
} = require('./review-utils')
const { requestDeepSeekReviewAssist } = require('./deepseek-client')

const args = parseArgs(process.argv.slice(2))
const requestedAssetId = typeof args.asset === 'string' ? args.asset : null
const requestedCategory = typeof args.category === 'string' ? args.category : null
const limit = typeof args.limit === 'string' ? Number(args.limit) : Number.POSITIVE_INFINITY

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function scoreWithinRange(value, min, max, tolerance) {
  if (value >= min && value <= max) {
    return 100
  }
  if (value < min) {
    return clamp(100 - ((min - value) / Math.max(tolerance, 0.0001)) * 100, 0, 100)
  }
  return clamp(100 - ((value - max) / Math.max(tolerance, 0.0001)) * 100, 0, 100)
}

function scoreAboveMin(value, min, tolerance) {
  if (value >= min) {
    return 100
  }
  return clamp(100 - ((min - value) / Math.max(tolerance, 0.0001)) * 100, 0, 100)
}

function scoreBelowMax(value, max, tolerance) {
  if (value <= max) {
    return 100
  }
  return clamp(100 - ((value - max) / Math.max(tolerance, 0.0001)) * 100, 0, 100)
}

function scorePalette(delta) {
  return clamp(100 - delta * 0.7, 0, 100)
}

function signatureDistance(left, right) {
  return Math.sqrt(
    (left.average.r - right.average.r) ** 2 +
    (left.average.g - right.average.g) ** 2 +
    (left.average.b - right.average.b) ** 2
  ) + Math.abs(left.opaqueRatio - right.opaqueRatio) * 100
}

async function buildComparableSignatures(asset, currentAssetId) {
  const { catalog } = loadSpecs()
  const signatures = []

  for (const entry of catalog.assets) {
    if (entry.category !== asset.category || entry.asset_id === currentAssetId) {
      continue
    }

    const candidate32 = path.join(assetOutputDir(entry, 'staged'), `${entry.asset_id}__32.png`)
    const live32 = path.join(assetOutputDir(entry), `${entry.asset_id}__32.png`)
    const comparePath = fs.existsSync(candidate32) ? candidate32 : live32
    if (!fs.existsSync(comparePath)) {
      continue
    }

    signatures.push(await imageMetrics(comparePath))
  }

  return signatures
}

function qcChecks(asset, metrics32, paletteDelta) {
  const errors = []
  const transparentCategory = asset.category !== 'terrain'

  if (metrics32.width !== 32 || metrics32.height !== 32) {
    errors.push('wrong_size')
  }

  if (asset.category === 'terrain' && metrics32.opaqueRatio < 0.95) {
    errors.push('terrain_not_full_bleed')
  }

  if (transparentCategory && metrics32.edgeOpaqueRatio > 0.72) {
    errors.push('edge_dirty')
  }

  if (transparentCategory && metrics32.opaqueRatio < 0.05) {
    errors.push('too_small_for_32px')
  }

  if (transparentCategory && metrics32.bounds.areaRatio > 0.92) {
    errors.push('subject_out_of_frame')
  }

  if (paletteDelta > 150) {
    errors.push('palette_drift')
  }

  if (metrics32.luminanceStdDev < 5) {
    errors.push('low_readability_32px')
  }

  if (asset.category === 'character_portrait' && metrics32.bounds.height < 18) {
    errors.push('portrait_too_small')
  }

  if (asset.category === 'boss_portrait' && metrics32.bounds.height < 20) {
    errors.push('boss_too_small')
  }

  return errors
}

function terrainWaterContamination(asset, metrics128) {
  if (asset.target_key === 'water') {
    return 100
  }

  const { r, g, b } = metrics128.average
  const blueDominance = b - Math.max(r, g)
  return scoreBelowMax(blueDominance, 12, 30)
}

function buildScores(asset, metrics32, metrics128, paletteDelta, duplicateDistance) {
  const base = {
    palette: scorePalette(paletteDelta),
    uniqueness: scoreAboveMin(duplicateDistance, 12, 12)
  }

  if (asset.category === 'terrain') {
    return {
      ...base,
      coverage: scoreAboveMin(metrics32.opaqueRatio, 0.98, 0.03),
      continuity: scoreAboveMin(metrics32.edgeOpaqueRatio, 0.96, 0.04),
      variation: scoreWithinRange(metrics32.luminanceStdDev, 10, 28, 6),
      naturality: terrainWaterContamination(asset, metrics128)
    }
  }

  if (asset.category === 'resource_node') {
    return {
      ...base,
      silhouette: scoreWithinRange(metrics32.opaqueRatio, 0.10, 0.45, 0.14),
      framing: scoreBelowMax(metrics32.edgeOpaqueRatio, 0.48, 0.22),
      readability: scoreAboveMin(metrics32.luminanceStdDev, 12, 8),
      subject_scale: scoreWithinRange(metrics32.bounds.areaRatio, 0.18, 0.62, 0.18)
    }
  }

  if (asset.category === 'building_map') {
    return {
      ...base,
      silhouette: scoreWithinRange(metrics32.opaqueRatio, 0.16, 0.58, 0.16),
      framing: scoreBelowMax(metrics32.edgeOpaqueRatio, 0.54, 0.18),
      readability: scoreAboveMin(metrics32.luminanceStdDev, 12, 8),
      map_scale: scoreWithinRange(metrics32.bounds.areaRatio, 0.22, 0.72, 0.16)
    }
  }

  if (asset.category === 'ui_icon_fallback') {
    return {
      ...base,
      silhouette: scoreWithinRange(metrics32.opaqueRatio, 0.08, 0.35, 0.12),
      framing: scoreBelowMax(metrics32.edgeOpaqueRatio, 0.40, 0.20),
      readability: scoreAboveMin(metrics32.luminanceStdDev, 14, 8),
      clarity: scoreWithinRange(metrics32.bounds.areaRatio, 0.12, 0.42, 0.12)
    }
  }

  if (asset.category === 'character_portrait') {
    return {
      ...base,
      framing: scoreBelowMax(metrics32.edgeOpaqueRatio, 0.52, 0.16),
      face_scale: scoreWithinRange(metrics32.bounds.areaRatio, 0.24, 0.78, 0.18),
      readability: scoreAboveMin(metrics32.luminanceStdDev, 12, 8),
      portrait_balance: scoreWithinRange(metrics32.centerOpaqueRatio, 0.22, 0.70, 0.18)
    }
  }

  return {
    ...base,
    framing: scoreBelowMax(metrics32.edgeOpaqueRatio, 0.58, 0.14),
    face_scale: scoreWithinRange(metrics32.bounds.areaRatio, 0.28, 0.86, 0.18),
    readability: scoreAboveMin(metrics32.luminanceStdDev, 14, 8),
    threat_readability: scoreWithinRange(metrics32.centerOpaqueRatio, 0.26, 0.78, 0.16)
  }
}

function criticalKeysForCategory(category, reviewRubrics) {
  const rubricKeys = reviewRubrics?.categories?.[category]?.critical_metrics
  if (Array.isArray(rubricKeys) && rubricKeys.length > 0) {
    return rubricKeys
  }

  switch (category) {
    case 'terrain':
      return ['coverage', 'continuity', 'variation', 'naturality']
    case 'resource_node':
      return ['silhouette', 'readability', 'subject_scale']
    case 'building_map':
      return ['silhouette', 'readability', 'map_scale']
    case 'ui_icon_fallback':
      return ['silhouette', 'readability']
    case 'character_portrait':
      return ['face_scale', 'readability']
    case 'boss_portrait':
      return ['face_scale', 'readability']
    default:
      return []
  }
}

function scoreThresholdForCategory(category, defaultThreshold, reviewRubrics) {
  const rubricThreshold = reviewRubrics?.categories?.[category]?.score_threshold
  if (Number.isFinite(rubricThreshold)) {
    return rubricThreshold
  }

  switch (category) {
    case 'terrain':
      return defaultThreshold
    case 'resource_node':
    case 'building_map':
    case 'ui_icon_fallback':
    case 'character_portrait':
    case 'boss_portrait':
      return Math.min(defaultThreshold, 82)
    default:
      return defaultThreshold
  }
}

function criticalThresholdForCategory(category, defaultThreshold, reviewRubrics) {
  const rubricThreshold = reviewRubrics?.categories?.[category]?.critical_threshold
  return Number.isFinite(rubricThreshold) ? rubricThreshold : defaultThreshold
}

function meetsApprovalThreshold(asset, scores, thresholds, reviewRubrics) {
  const criticalKeys = criticalKeysForCategory(asset.category, reviewRubrics)
  const categoryCriticalThreshold = criticalThresholdForCategory(asset.category, thresholds.critical, reviewRubrics)
  return criticalKeys.every(key => (scores[key] ?? 0) >= categoryCriticalThreshold)
}

function summarizeRejectTags(scores, qcErrors) {
  const tags = [...qcErrors]

  for (const [key, value] of Object.entries(scores)) {
    if (value >= 80) {
      continue
    }

    switch (key) {
      case 'coverage':
      case 'continuity':
      case 'naturality':
        tags.push('terrain_not_natural')
        break
      case 'silhouette':
      case 'subject_scale':
      case 'map_scale':
      case 'clarity':
        tags.push('weak_silhouette')
        break
      case 'framing':
        tags.push('subject_touching_edge')
        break
      case 'readability':
      case 'threat_readability':
        tags.push('low_readability_32px')
        break
      case 'face_scale':
      case 'portrait_balance':
        tags.push('portrait_crop_or_scale')
        break
      case 'palette':
        tags.push('palette_drift')
        break
      case 'uniqueness':
        tags.push('duplicate_candidate')
        break
      default:
        tags.push(`low_${key}`)
    }
  }

  return [...new Set(tags)]
}

function averageScore(scores) {
  const values = Object.values(scores)
  if (values.length === 0) {
    return 0
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

async function reviewAsset(asset, recipe, styleProfile, thresholds, reviewRubrics, pipelineConfig) {
  const meta = readAssetMeta(asset)
  const variant = meta?.review_queue?.candidate_variant
  if (!variant) {
    return null
  }

  const candidatePath = findVariantPath(asset, variant)
  if (!candidatePath || !fs.existsSync(candidatePath)) {
    return null
  }

  const reviewPreviewDir = path.join(paths.previewsDir, 'ai-review')
  ensureDir(reviewPreviewDir)
  const preview32Path = path.join(reviewPreviewDir, `${asset.asset_id}__${variant}__32.png`)
  const preview128Path = path.join(reviewPreviewDir, `${asset.asset_id}__${variant}__128.png`)
  await exportCandidatePreview(candidatePath, preview32Path, { width: 32, height: 32 }, asset.category)
  await exportCandidatePreview(candidatePath, preview128Path, { width: 128, height: 128 }, asset.category)

  const metrics32 = await imageMetrics(preview32Path, styleProfile.postprocess.alpha_threshold)
  const metrics128 = await imageMetrics(preview128Path, styleProfile.postprocess.alpha_threshold)
  const paletteDelta = paletteDistance(metrics128.average, styleProfile.palette)
  const qcErrors = qcChecks(asset, metrics32, paletteDelta)
  const comparableSignatures = await buildComparableSignatures(asset, asset.asset_id)
  const duplicateDistance = comparableSignatures.length === 0
    ? 100
    : Math.min(...comparableSignatures.map(signature => signatureDistance(metrics32, signature)))
  const now = new Date().toISOString()
  const existingMeta = readAssetMeta(asset)
  const lastAttempt = [...(existingMeta?.attempt_history ?? [])]
  const scores = buildScores(asset, metrics32, metrics128, paletteDelta, duplicateDistance)
  const totalScore = averageScore(scores)
  const rejectionTags = summarizeRejectTags(scores, qcErrors)
  const latestAttemptIndex = lastAttempt.length - 1
  const semanticAssist = pipelineConfig.review?.semanticReviewProvider === 'deepseek'
    ? await requestDeepSeekReviewAssist({
        asset_id: asset.asset_id,
        category: asset.category,
        target_key: asset.target_key,
        candidate_variant: variant,
        prompt_template: asset.prompt_template,
        rubric: reviewRubrics?.categories?.[asset.category] ?? null,
        qc_errors: qcErrors,
        score_total: totalScore,
        score_breakdown: scores,
        rejection_tags: rejectionTags,
        note: 'This is text assistance only. The model does not directly inspect the image in this request.'
      })
    : null

  let nextPayload
  let decision

  if (qcErrors.length > 0) {
    decision = 'reject'
    if (latestAttemptIndex >= 0) {
      lastAttempt[latestAttemptIndex] = {
        ...lastAttempt[latestAttemptIndex],
        outcome: 'qc_failed'
      }
    }
    nextPayload = {
      ...existingMeta,
      attempt_history: lastAttempt,
      pipeline_state: 'qc_failed',
      review_queue: {
        status: 'changes_requested',
        candidate_variant: variant,
        updated_at: now,
        note: qcErrors.join(', ')
      },
      ai_review: {
        decision: 'reject',
        score_total: totalScore,
        score_breakdown: scores,
        rejection_tags: rejectionTags,
        reviewer_version: thresholds.reviewerVersion,
        review_method: 'heuristic_screen',
        semantic_checked: false,
        semantic_model: null,
        score_basis: 'pixel_metrics_and_rules',
        semantic_assist: semanticAssist,
        reviewed_at: now
      },
      generated_at: now
    }
  } else if (
    totalScore >= scoreThresholdForCategory(asset.category, thresholds.score, reviewRubrics) &&
    meetsApprovalThreshold(asset, scores, thresholds, reviewRubrics)
  ) {
    decision = 'approve'
    const candidateRecord = (existingMeta?.candidates ?? []).find(entry => entry.variant === variant)
    const semanticReviewRequired = pipelineConfig.review?.semanticReviewRequiredForFinal !== false
    const semanticChecked = false
    const finalReviewStatus = semanticReviewRequired && !semanticChecked
      ? 'semantic_review_required'
      : 'final_review_pending'
    const reviewQueueStatus = semanticReviewRequired && !semanticChecked
      ? 'auto_screen_passed'
      : 'ai_approved'
    const pipelineState = semanticReviewRequired && !semanticChecked
      ? 'auto_screen_passed'
      : 'ai_approved'
    if (latestAttemptIndex >= 0) {
      lastAttempt[latestAttemptIndex] = {
        ...lastAttempt[latestAttemptIndex],
        outcome: semanticChecked ? 'approved' : 'auto_screen_passed'
      }
    }
    nextPayload = {
      ...existingMeta,
      attempt_history: lastAttempt,
      pipeline_state: pipelineState,
      review_queue: {
        status: reviewQueueStatus,
        candidate_variant: variant,
        updated_at: now,
        note: semanticChecked
          ? `Semantic AI review approved with score ${totalScore}.`
          : `Heuristic auto-screen passed with score ${totalScore}; semantic visual review still required.`
      },
      staging_source: {
        kind: candidateRecord?.source_kind ?? 'generated',
        variant,
        path: candidatePath,
        approved_at: now,
        note: semanticChecked
          ? 'Semantic AI approved and staged for final human review.'
          : 'Heuristic auto-screen passed; held in staging until semantic review exists or manual override is used.'
      },
      ai_review: {
        decision: 'approve',
        score_total: totalScore,
        score_breakdown: scores,
        rejection_tags: [],
        reviewer_version: thresholds.reviewerVersion,
        review_method: 'heuristic_screen',
        semantic_checked: semanticChecked,
        semantic_model: null,
        score_basis: 'pixel_metrics_and_rules',
        semantic_assist: semanticAssist,
        approved_at: now,
        reviewed_at: now
      },
      final_review_status: finalReviewStatus,
      generated_at: now
    }
  } else {
    decision = 'reject'
    if (latestAttemptIndex >= 0) {
      lastAttempt[latestAttemptIndex] = {
        ...lastAttempt[latestAttemptIndex],
        outcome: 'rejected'
      }
    }
    nextPayload = {
      ...existingMeta,
      attempt_history: lastAttempt,
      pipeline_state: 'ai_rejected',
      review_queue: {
        status: 'changes_requested',
        candidate_variant: variant,
        updated_at: now,
        note: rejectionTags.join(', ')
      },
      ai_review: {
        decision: 'reject',
        score_total: totalScore,
        score_breakdown: scores,
        rejection_tags: rejectionTags,
        reviewer_version: thresholds.reviewerVersion,
        review_method: 'heuristic_screen',
        semantic_checked: false,
        semantic_model: null,
        score_basis: 'pixel_metrics_and_rules',
        semantic_assist: semanticAssist,
        reviewed_at: now
      },
      generated_at: now
    }
  }

  writeAssetMeta(asset, nextPayload)
  appendJsonLine(paths.reviewDecisionsPath, {
    reviewedAt: now,
    asset_id: asset.asset_id,
    category: asset.category,
    candidate_variant: variant,
    decision,
    score_total: totalScore,
    score_breakdown: scores,
    rejection_tags: rejectionTags,
    qc_errors: qcErrors,
    review_method: nextPayload.ai_review?.review_method ?? 'unknown',
    semantic_checked: nextPayload.ai_review?.semantic_checked === true,
    final_review_status: nextPayload.final_review_status ?? 'not_requested'
  })

  console.log(`[art:ai-review] ${decision} ${asset.asset_id} ${variant} score=${totalScore}`)
  return { decision, assetId: asset.asset_id }
}

async function main() {
  const { catalog, pipelineConfig, recipeMap, styleMap, reviewRubrics } = loadSpecs()
  const thresholds = {
    score: pipelineConfig.review.scoreThreshold,
    critical: pipelineConfig.review.criticalScoreThreshold,
    reviewerVersion: pipelineConfig.review.reviewerVersion
  }

  let reviewed = 0
  for (const asset of catalog.assets) {
    if (requestedAssetId && asset.asset_id !== requestedAssetId) {
      continue
    }
    if (requestedCategory && asset.category !== requestedCategory) {
      continue
    }
    if (reviewed >= limit) {
      break
    }

    const meta = readAssetMeta(asset)
    if (!meta || meta.review_queue.status !== 'pending_review') {
      continue
    }

    const recipe = recipeMap.get(asset.recipe_id)
    const styleProfile = styleMap.get(asset.style_profile)
    const result = await reviewAsset(asset, recipe, styleProfile, thresholds, reviewRubrics, pipelineConfig)
    if (result) {
      reviewed += 1
    }
  }

  console.log(`[art:ai-review] reviewed ${reviewed} assets`)
}

main().catch(error => {
  console.error('[art:ai-review] failed', error)
  process.exitCode = 1
})
