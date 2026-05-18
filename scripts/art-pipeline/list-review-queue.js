const path = require('node:path')
const {
  findVariantPath,
  loadSpecs,
  paths,
  readAssetMeta,
  writeJson
} = require('./shared')

function buildPendingEntry(asset, meta) {
  const candidateVariant = meta.review_queue.candidate_variant
  const semanticChecked = meta.ai_review?.semantic_checked === true
  return {
    asset_id: asset.asset_id,
    category: asset.category,
    candidate_variant: candidateVariant,
    updated_at: meta.review_queue.updated_at,
    runtime_source_kind: meta.runtime_source?.kind ?? 'unknown',
    runtime_source_path: meta.runtime_source?.path ?? null,
    candidate_path: candidateVariant ? findVariantPath(asset, candidateVariant) : null,
    preview_path: path.join(paths.previewsDir, `${asset.asset_id}__preview.png`),
    review_method: meta.ai_review?.review_method ?? 'unknown',
    semantic_checked: semanticChecked,
    recommendation: meta.ai_review?.decision === 'reject' ? 'reject' : 'manual_review',
    rationale: meta.review_queue.note || 'Awaiting QC and AI review.'
  }
}

function buildAutoScreenEntry(asset, meta) {
  return {
    asset_id: asset.asset_id,
    category: asset.category,
    candidate_variant: meta.staging_source?.variant ?? meta.review_queue.candidate_variant,
    updated_at: meta.ai_review?.reviewed_at ?? meta.review_queue.updated_at,
    runtime_source_kind: meta.runtime_source?.kind ?? 'unknown',
    runtime_source_path: meta.runtime_source?.path ?? null,
    candidate_path: meta.staging_source?.path ?? findVariantPath(asset, meta.review_queue.candidate_variant),
    preview_path: path.join(paths.previewsDir, `${asset.asset_id}__staged-preview.png`),
    review_method: meta.ai_review?.review_method ?? 'unknown',
    semantic_checked: false,
    recommendation: 'manual_review',
    rationale: `Heuristic auto-screen passed with score ${meta.ai_review?.score_total ?? 'n/a'}, but no semantic visual AI review was performed. Keep this in staging only.`
  }
}

function buildFinalEntry(asset, meta) {
  const semanticChecked = meta.ai_review?.semantic_checked === true
  return {
    asset_id: asset.asset_id,
    category: asset.category,
    candidate_variant: meta.staging_source?.variant ?? meta.review_queue.candidate_variant,
    updated_at: meta.staging_source?.approved_at ?? meta.review_queue.updated_at,
    runtime_source_kind: meta.runtime_source?.kind ?? 'unknown',
    runtime_source_path: meta.runtime_source?.path ?? null,
    candidate_path: meta.staging_source?.path ?? null,
    preview_path: path.join(paths.previewsDir, `${asset.asset_id}__staged-preview.png`),
    review_method: meta.ai_review?.review_method ?? 'unknown',
    semantic_checked: semanticChecked,
    recommendation: semanticChecked ? 'approve' : 'manual_review',
    rationale: semanticChecked
      ? `AI semantic review approved with score ${meta.ai_review.score_total ?? 'n/a'}.`
      : `Auto-screen passed with score ${meta.ai_review?.score_total ?? 'n/a'} using heuristic metrics only; no semantic visual review was performed.`
  }
}

function main() {
  const { catalog } = loadSpecs()
  const pending = []
  const autoScreenPassed = []
  const finalPending = []

  for (const asset of catalog.assets) {
    const meta = readAssetMeta(asset)
    if (!meta) {
      continue
    }

    if (meta.review_queue?.status === 'pending_review') {
      pending.push(buildPendingEntry(asset, meta))
    }

    if (meta.final_review_status === 'semantic_review_required' && meta.staging_source?.path) {
      autoScreenPassed.push(buildAutoScreenEntry(asset, meta))
    }

    if (
      meta.final_review_status === 'final_review_pending' &&
      meta.staging_source?.path &&
      meta.ai_review?.semantic_checked === true
    ) {
      finalPending.push(buildFinalEntry(asset, meta))
    }
  }

  const reportPath = path.join(paths.reportsDir, 'review-queue.json')
  writeJson(reportPath, {
    generatedAt: new Date().toISOString(),
    pending,
    autoScreenPassed,
    finalPending
  })

  console.log(`[art:review-queue] wrote ${path.relative(paths.projectRoot, reportPath)}`)
}

try {
  main()
} catch (error) {
  console.error('[art:review-queue] failed', error)
  process.exitCode = 1
}
