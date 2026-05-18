const path = require('node:path')
const { spawnSync } = require('node:child_process')
const {
  loadMonitorSession,
  loadSpecs,
  paths,
  readAssetMeta,
  writeMonitorSession
} = require('./shared')

const CATEGORY_ORDER = [
  'terrain',
  'resource_node',
  'building_map',
  'ui_icon_fallback',
  'character_portrait',
  'boss_portrait'
]

function runNodeScript(scriptPath, scriptArgs = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: paths.projectRoot,
    encoding: 'utf8'
  })

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  }
}

function skippedStep(reason) {
  return {
    ok: true,
    status: 0,
    skipped: true,
    stdout: '',
    stderr: '',
    reason
  }
}

async function fetchQueueStatus(baseUrl) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/queue`)
  if (!response.ok) {
    throw new Error(`ComfyUI queue request failed with ${response.status}`)
  }

  const payload = await response.json()
  const running = Array.isArray(payload.queue_running) ? payload.queue_running : []
  const pending = Array.isArray(payload.queue_pending) ? payload.queue_pending : []

  return {
    ok: true,
    runningCount: running.length,
    pendingCount: pending.length,
    runningAsset: running[0]?.[2]?.['7']?.inputs?.filename_prefix ?? null,
    pendingAssets: pending
      .map(entry => entry?.[2]?.['7']?.inputs?.filename_prefix ?? null)
      .filter(Boolean)
  }
}

function buildCategoryStats(catalog, maxAttempts) {
  return CATEGORY_ORDER.map(category => {
    const items = catalog.assets.filter(asset => asset.category === category)
    const metaList = items.map(asset => readAssetMeta(asset)).filter(Boolean)
    const approvedCount = metaList.filter(meta =>
      meta.ai_review?.decision === 'approve' &&
      ((meta.staging_source?.kind && meta.staging_source.kind !== 'seeded') ||
        (meta.runtime_source?.kind && meta.runtime_source.kind !== 'seeded'))
    ).length
    const pendingReviewCount = metaList.filter(meta => meta.review_queue?.status === 'pending_review').length
    const blockedCount = metaList.filter(meta =>
      (meta.attempt_count ?? 0) >= maxAttempts && meta.ai_review?.decision !== 'approve'
    ).length

    return {
      category,
      total: items.length,
      approvedCount,
      pendingReviewCount,
      blockedCount
    }
  })
}

function allAssets(catalog) {
  return catalog.assets.map(asset => ({
    asset,
    meta: readAssetMeta(asset)
  }))
}

function isApproved(meta) {
  return meta?.ai_review?.decision === 'approve' &&
    ((meta?.staging_source?.kind && meta.staging_source.kind !== 'seeded') ||
      (meta?.runtime_source?.kind && meta.runtime_source.kind !== 'seeded'))
}

function isSemanticApproved(meta) {
  return isApproved(meta) && meta?.ai_review?.semantic_checked === true
}

function candidateNeedGeneration(entry, maxAttempts) {
  if (!entry.meta) return true
  if (isApproved(entry.meta)) return false
  if (entry.meta.attempt_count >= maxAttempts) return false
  if (entry.meta.review_queue?.status === 'pending_review') return false
  if (entry.meta.pipeline_state === 'queued') return false
  return true
}

function latestRejectionTags(meta) {
  return Array.isArray(meta?.ai_review?.rejection_tags) ? meta.ai_review.rejection_tags : []
}

function promptAdjustments(asset, rejectionTags, reviewFeedback) {
  const promptParts = []
  const negativeParts = []
  const feedback = reviewFeedback?.categories?.[asset.category]?.enforced_additions ?? {}

  if (asset.category === 'terrain') {
    promptParts.push('continuous outdoor ground texture', 'full-bleed natural terrain', 'no border')
    negativeParts.push('frame', 'floor tile border', 'floating island', 'single scenic composition')
    if (rejectionTags.includes('terrain_not_natural')) {
      promptParts.push('no focal point', 'no scene vignette', 'no horizon')
      negativeParts.push('pond', 'river', 'scene illustration', 'cutaway')
    }
    if (rejectionTags.includes('duplicate_candidate')) {
      promptParts.push('stronger local variation', 'subtle micro texture changes')
    }
  }

  if (asset.category === 'resource_node') {
    promptParts.push('single readable subject', 'transparent background', 'clean silhouette')
    negativeParts.push('background scene', 'multiple objects', 'cropped object')
  }

  if (asset.category === 'building_map') {
    promptParts.push('consistent isometric map prop', 'single building', 'clean transparent background')
    negativeParts.push('scene background', 'cutaway view', 'side elevation')
  }

  if (asset.category === 'ui_icon_fallback') {
    promptParts.push('minimal centered game icon', 'simple silhouette', 'transparent background')
    negativeParts.push('scene background', 'photographic texture', 'text label')
  }

  if (asset.category === 'character_portrait') {
    promptParts.push('bust portrait', 'clear profession identity', 'game UI friendly crop')
    negativeParts.push('full body', 'busy background', 'multiple people')
  }

  if (asset.category === 'boss_portrait') {
    promptParts.push('boss portrait', 'threatening face crop', 'single subject')
    negativeParts.push('full scene', 'crowd', 'background environment')
  }

  if (rejectionTags.includes('subject_touching_edge')) {
    promptParts.push('keep safe margins around subject')
    negativeParts.push('cropped subject', 'touching frame edge')
  }

  if (rejectionTags.includes('low_readability_32px')) {
    promptParts.push('large readable shapes', 'simplified silhouette')
    negativeParts.push('fine clutter', 'micro details', 'visual noise')
  }

  if (rejectionTags.includes('palette_drift')) {
    promptParts.push('stay within assigned palette')
    negativeParts.push('off-palette colors', 'neon accents')
  }

  if (rejectionTags.includes('weak_silhouette')) {
    promptParts.push('strong outer contour', 'clear silhouette separation')
  }

  promptParts.push(...(Array.isArray(feedback.must_include) ? feedback.must_include : []))
  negativeParts.push(...(Array.isArray(feedback.must_avoid) ? feedback.must_avoid : []))

  return {
    promptAppend: [...new Set(promptParts.filter(Boolean))].join(', '),
    negativeAppend: [...new Set(negativeParts.filter(Boolean))].join(', ')
  }
}

function generationPlan(entry, queueStatus, pipelineConfig, reviewFeedback) {
  const attemptNumber = (entry.meta?.attempt_count ?? 0) + 1
  const rejectionTags = latestRejectionTags(entry.meta)
  const adjustments = promptAdjustments(entry.asset, rejectionTags, reviewFeedback)
  const forceLocal = entry.asset.category === 'terrain' || entry.asset.category === 'ui_icon_fallback'
  const stalledAttempts = entry.meta?.attempt_count ?? 0

  let stage = 'seed_explore'
  if (!queueStatus.ok && stalledAttempts === 0 && entry.asset.category !== 'terrain') {
    stage = 'baseline_reset'
  } else if (stalledAttempts >= 24) {
    stage = 'baseline_reset'
  } else if (attemptNumber >= 7) {
    stage = 'fallback_local'
  } else if (attemptNumber >= 5) {
    stage = 'template_swap'
  } else if (attemptNumber >= 3) {
    stage = 'prompt_tuned'
  }

  const useLocal = forceLocal ||
    !queueStatus.ok ||
    attemptNumber >= pipelineConfig.generation.localFallbackStartAttempt ||
    stage === 'baseline_reset'

  return {
    attemptNumber,
    strategy: `${useLocal ? 'local' : 'comfyui'}_${stage}`,
    useLocal,
    ...adjustments,
    note: rejectionTags.length > 0
      ? `Adaptive retry using ${stage}; tags=${rejectionTags.join(',')}`
      : `Adaptive retry using ${stage}.`
  }
}

function pickNextAssets(entries, maxAttempts, limit) {
  const eligible = entries
    .filter(entry => candidateNeedGeneration(entry, maxAttempts))
    .sort((left, right) => (left.meta?.attempt_count ?? 0) - (right.meta?.attempt_count ?? 0))

  const buckets = new Map(
    CATEGORY_ORDER.map(category => [
      category,
      eligible
        .filter(entry => entry.asset.category === category)
        .sort((left, right) => (left.meta?.attempt_count ?? 0) - (right.meta?.attempt_count ?? 0))
    ])
  )

  const selection = []
  while (selection.length < limit) {
    let advanced = false
    for (const category of CATEGORY_ORDER) {
      const bucket = buckets.get(category)
      if (!bucket || bucket.length === 0) {
        continue
      }
      selection.push(bucket.shift())
      advanced = true
      if (selection.length >= limit) {
        break
      }
    }

    if (!advanced) {
      break
    }
  }

  return selection
}

function buildSessionSnapshot(catalog, startedAt, previousTicks, queueStatus, pipelineConfig) {
  const entries = allAssets(catalog)
  const autoScreenPassedCount = entries.filter(entry => isApproved(entry.meta)).length
  const semanticApprovedCount = entries.filter(entry => isSemanticApproved(entry.meta)).length
  const blockedAssets = entries
    .filter(entry => (entry.meta?.attempt_count ?? 0) >= pipelineConfig.monitoring.maxAttemptsPerAsset && !isApproved(entry.meta))
    .map(entry => ({
      asset_id: entry.asset.asset_id,
      category: entry.asset.category,
      attempt_count: entry.meta?.attempt_count ?? 0
    }))

  return {
    startedAt,
    ticksRun: previousTicks,
    elapsedMs: Date.now() - new Date(startedAt).getTime(),
    targetAssetCount: catalog.assets.length,
    approvedAssetCount: autoScreenPassedCount,
    autoScreenPassedCount,
    semanticApprovedCount,
    finalPendingCount: entries.filter(entry =>
      entry.meta?.final_review_status === 'final_review_pending' &&
      entry.meta?.ai_review?.semantic_checked === true
    ).length,
    finalApprovedCount: entries.filter(entry => entry.meta?.final_review_status === 'final_approved').length,
    pendingReviewCount: entries.filter(entry => entry.meta?.review_queue?.status === 'pending_review').length,
    blockedAssets,
    queue: queueStatus,
    categories: buildCategoryStats(catalog, pipelineConfig.monitoring.maxAttemptsPerAsset)
  }
}

async function main() {
  const { catalog, pipelineConfig, reviewFeedback } = loadSpecs()
  const existingSession = loadMonitorSession()
  const startedAt = existingSession?.startedAt ?? new Date().toISOString()
  const queueStatus = { ok: false, runningCount: 0, pendingCount: 0, runningAsset: null, pendingAssets: [] }
  let comfyuiRecovery = null

  try {
    Object.assign(queueStatus, await fetchQueueStatus(pipelineConfig.comfyui.baseUrl))
  } catch (error) {
    queueStatus.ok = false
    queueStatus.error = error.message
    const restartResult = runNodeScript('scripts/art-pipeline/start-comfyui.js')
    comfyuiRecovery = restartResult
    if (restartResult.ok) {
      try {
        Object.assign(queueStatus, await fetchQueueStatus(pipelineConfig.comfyui.baseUrl))
        queueStatus.recovered = true
      } catch (recoveryError) {
        queueStatus.ok = false
        queueStatus.error = recoveryError.message
      }
    }
  }

  const initialEntries = allAssets(catalog)
  const pendingReviewCount = initialEntries.filter(entry => entry.meta?.review_queue?.status === 'pending_review').length
  const generationBudget = Math.max(0, Math.min(
    pipelineConfig.monitoring.queueBatchSize,
    pipelineConfig.monitoring.maxPendingReviews - pendingReviewCount
  ))

  const generationTargets = pickNextAssets(
    initialEntries,
    pipelineConfig.monitoring.maxAttemptsPerAsset,
    generationBudget
  )

  const generationResults = []
  for (const entry of generationTargets) {
    const plan = generationPlan(entry, queueStatus, pipelineConfig, reviewFeedback)
    const attemptNumber = plan.attemptNumber
    const variant = `cand${String(attemptNumber).padStart(2, '0')}`

    if (plan.useLocal) {
      const localResult = runNodeScript('scripts/art-pipeline/generate-local-candidates.js', [
        `--asset=${entry.asset.asset_id}`,
        `--variant=${variant}`,
        `--strategy=${plan.strategy}`,
        `--note=${plan.note}`,
        '--limit=1'
      ])
      generationResults.push({
        asset_id: entry.asset.asset_id,
        strategy: plan.strategy,
        ok: localResult.ok,
        note: plan.note
      })
      continue
    }

    const queueResult = runNodeScript('scripts/art-pipeline/queue-comfyui-generation.js', [
      '--execute',
      `--asset=${entry.asset.asset_id}`,
      '--candidates=1',
      `--startIndex=${attemptNumber}`,
      `--strategy=${plan.strategy}`,
      `--promptAppend=${plan.promptAppend}`,
      `--negativeAppend=${plan.negativeAppend}`,
      `--note=${plan.note}`
    ])
    generationResults.push({
      asset_id: entry.asset.asset_id,
      strategy: plan.strategy,
      ok: queueResult.ok,
      note: plan.note
    })
  }

  const importResult = runNodeScript('scripts/art-pipeline/import-comfyui-output.js')
  const aiReviewResult = runNodeScript('scripts/art-pipeline/ai-review-assets.js')
  const reviewFeedbackResult = runNodeScript('scripts/art-pipeline/update-review-feedback.js')
  const livePromotionMode = pipelineConfig.promotion?.liveMode ?? 'manual_only'
  const liveExportResult = livePromotionMode === 'manual_only'
    ? skippedStep('live export is locked behind final human approval')
    : runNodeScript('scripts/art-pipeline/export-approved-assets.js')
  const liveManifestResult = livePromotionMode === 'manual_only'
    ? skippedStep('live manifest is locked behind final human approval')
    : runNodeScript('scripts/art-pipeline/sync-runtime-manifest.js')
  const stagedExportResult = runNodeScript('scripts/art-pipeline/export-approved-assets.js', ['--scope=staged'])
  const stagedManifestResult = runNodeScript('scripts/art-pipeline/sync-staged-manifest.js')
  const reviewQueueResult = runNodeScript('scripts/art-pipeline/list-review-queue.js')
  const dashboardResult = runNodeScript('scripts/art-pipeline/build-review-dashboard.js')

  const snapshot = buildSessionSnapshot(
    catalog,
    startedAt,
    (existingSession?.ticksRun ?? 0) + 1,
    queueStatus,
    pipelineConfig
  )
  const meetsDuration = snapshot.elapsedMs >= pipelineConfig.monitoring.minimumDurationHours * 60 * 60 * 1000
  const semanticReviewRequired = pipelineConfig.review?.semanticReviewRequiredForFinal !== false
  const allApproved = semanticReviewRequired
    ? snapshot.semanticApprovedCount >= snapshot.targetAssetCount
    : snapshot.autoScreenPassedCount >= snapshot.targetAssetCount

  const session = {
    version: '1.0.0',
    startedAt,
    lastTickAt: new Date().toISOString(),
    ticksRun: snapshot.ticksRun,
    elapsedMs: snapshot.elapsedMs,
    minimumDurationHours: pipelineConfig.monitoring.minimumDurationHours,
    completed: meetsDuration && allApproved,
    nextAction: meetsDuration && allApproved
      ? 'session_complete'
      : snapshot.blockedAssets.length > 0
        ? 'manual_intervention_needed'
        : semanticReviewRequired && snapshot.autoScreenPassedCount > snapshot.semanticApprovedCount
          ? 'semantic_review_required'
        : snapshot.pendingReviewCount > 0
          ? 'review_pending'
          : generationResults.length > 0
            ? 'generation_continues'
            : 'monitoring_idle',
    targetAssetCount: snapshot.targetAssetCount,
    approvedAssetCount: snapshot.approvedAssetCount,
    autoScreenPassedCount: snapshot.autoScreenPassedCount,
    semanticApprovedCount: snapshot.semanticApprovedCount,
    finalPendingCount: snapshot.finalPendingCount,
    finalApprovedCount: snapshot.finalApprovedCount,
    pendingReviewCount: snapshot.pendingReviewCount,
    livePromotionMode,
    blockedAssets: snapshot.blockedAssets,
    categories: snapshot.categories,
    comfyui: queueStatus,
    comfyuiRecovery,
    generationResults,
    steps: {
      import: importResult,
      aiReview: aiReviewResult,
      reviewFeedback: reviewFeedbackResult,
      liveExport: liveExportResult,
      liveManifest: liveManifestResult,
      stagedExport: stagedExportResult,
      stagedManifest: stagedManifestResult,
      reviewQueue: reviewQueueResult,
      dashboard: dashboardResult
    }
  }

  writeMonitorSession(session)
  console.log(`[art:session-tick] approved=${session.approvedAssetCount}/${session.targetAssetCount} pendingReview=${session.pendingReviewCount} completed=${session.completed}`)
  console.log(`[art:session-tick] wrote ${path.relative(paths.projectRoot, paths.monitorSessionPath)}`)
}

main().catch(error => {
  console.error('[art:session-tick] failed', error)
  process.exitCode = 1
})
