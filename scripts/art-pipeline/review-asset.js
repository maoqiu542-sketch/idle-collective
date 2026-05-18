const { spawnSync } = require('node:child_process')
const {
  findVariantPath,
  getSeededSourcePath,
  loadSpecs,
  paths,
  parseArgs,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')

const args = parseArgs(process.argv.slice(2))
const assetId = typeof args.asset === 'string' ? args.asset : null
const action = typeof args.action === 'string' ? args.action : 'approve'
const variant = typeof args.variant === 'string' ? args.variant : 'cand01'
const note = typeof args.note === 'string' ? args.note : ''

if (!assetId) {
  console.error('[art:review] missing --asset=<asset_id>')
  process.exit(1)
}

const { catalog } = loadSpecs()
const asset = catalog.assets.find(entry => entry.asset_id === assetId)

if (!asset) {
  console.error(`[art:review] unknown asset ${assetId}`)
  process.exit(1)
}

const existingMeta = readAssetMeta(asset)
if (!existingMeta) {
  console.error(`[art:review] missing asset meta for ${assetId}`)
  process.exit(1)
}

const now = new Date().toISOString()
let runtimeSource = existingMeta.runtime_source ?? null
let stagingSource = existingMeta.staging_source ?? null
let reviewStatus = existingMeta.review_queue?.status ?? 'clean'
let pipelineState = existingMeta.pipeline_state ?? 'idle'
let finalReviewStatus = existingMeta.final_review_status ?? 'not_requested'
let aiReview = existingMeta.ai_review ?? { decision: 'pending' }

if (action === 'approve') {
  const approvedPath = findVariantPath(asset, variant)
  if (!approvedPath) {
    console.error(`[art:review] variant ${variant} not found for ${assetId}`)
    process.exit(1)
  }

  stagingSource = {
    kind: 'generated',
    variant,
    path: approvedPath,
    approved_at: now,
    note
  }
  reviewStatus = 'ai_approved'
  pipelineState = 'ai_approved'
  finalReviewStatus = 'final_review_pending'
  aiReview = {
    decision: 'approve',
    score_total: existingMeta.ai_review?.score_total ?? 100,
    score_breakdown: existingMeta.ai_review?.score_breakdown ?? { manual_override: 100 },
    rejection_tags: [],
    reviewer_version: 'manual_override',
    approved_at: now,
    reviewed_at: now
  }
} else if (action === 'reject') {
  stagingSource = null
  reviewStatus = 'changes_requested'
  pipelineState = 'ai_rejected'
  finalReviewStatus = 'not_requested'
  aiReview = {
    decision: 'reject',
    score_total: existingMeta.ai_review?.score_total ?? 0,
    score_breakdown: existingMeta.ai_review?.score_breakdown ?? {},
    rejection_tags: existingMeta.ai_review?.rejection_tags ?? ['manual_reject'],
    reviewer_version: 'manual_override',
    reviewed_at: now
  }
} else if (action === 'revert') {
  const seededSource = getSeededSourcePath(asset)
  if (!seededSource) {
    console.error(`[art:review] seeded source not found for ${assetId}`)
    process.exit(1)
  }

  runtimeSource = {
    kind: 'seeded',
    variant: null,
    path: seededSource,
    approved_at: now,
    note
  }
  stagingSource = null
  reviewStatus = 'clean'
  pipelineState = 'idle'
  finalReviewStatus = 'not_requested'
  aiReview = {
    decision: 'pending',
    reviewer_version: existingMeta.ai_review?.reviewer_version
  }
} else {
  console.error(`[art:review] unsupported action ${action}`)
  process.exit(1)
}

writeAssetMeta(asset, {
  ...existingMeta,
  runtime_source: runtimeSource,
  staging_source: stagingSource,
  review_queue: {
    status: reviewStatus,
    candidate_variant: action === 'approve' ? variant : existingMeta.review_queue?.candidate_variant ?? variant,
    updated_at: now,
    note
  },
  pipeline_state: pipelineState,
  ai_review: aiReview,
  final_review_status: finalReviewStatus,
  generated_at: now
})

for (const command of [
  ['scripts/art-pipeline/export-approved-assets.js'],
  ['scripts/art-pipeline/sync-runtime-manifest.js'],
  ['scripts/art-pipeline/export-approved-assets.js', '--scope=staged'],
  ['scripts/art-pipeline/sync-staged-manifest.js']
]) {
  const result = spawnSync(process.execPath, command, {
    cwd: paths.projectRoot,
    stdio: 'inherit'
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log(`[art:review] ${action} ${assetId}${action === 'approve' ? ` ${variant}` : ''}`)
