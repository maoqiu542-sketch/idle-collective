const { spawnSync } = require('node:child_process')
const {
  loadSpecs,
  parseArgs,
  paths,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')

const args = parseArgs(process.argv.slice(2))
const assetId = typeof args.asset === 'string' ? args.asset : null
const action = typeof args.action === 'string' ? args.action : 'approve'
const note = typeof args.note === 'string' ? args.note : ''

if (!assetId) {
  console.error('[art:final-review] missing --asset=<asset_id>')
  process.exit(1)
}

const { catalog } = loadSpecs()
const asset = catalog.assets.find(entry => entry.asset_id === assetId)

if (!asset) {
  console.error(`[art:final-review] unknown asset ${assetId}`)
  process.exit(1)
}

const meta = readAssetMeta(asset)
if (!meta?.staging_source?.path) {
  console.error(`[art:final-review] no staged source for ${assetId}`)
  process.exit(1)
}

const now = new Date().toISOString()

if (action === 'approve') {
  writeAssetMeta(asset, {
    ...meta,
    runtime_source: {
      ...meta.staging_source,
      approved_at: now,
      note: note || 'Promoted after final review.'
    },
    pipeline_state: 'final_approved',
    final_review_status: 'final_approved',
    review_queue: {
      status: 'clean',
      candidate_variant: meta.staging_source.variant,
      updated_at: now,
      note
    },
    generated_at: now
  })
} else if (action === 'reject') {
  writeAssetMeta(asset, {
    ...meta,
    staging_source: null,
    pipeline_state: 'ai_rejected',
    final_review_status: 'changes_requested',
    review_queue: {
      status: 'changes_requested',
      candidate_variant: meta.review_queue.candidate_variant,
      updated_at: now,
      note: note || 'Rejected during final human review.'
    },
    generated_at: now
  })
} else {
  console.error(`[art:final-review] unsupported action ${action}`)
  process.exit(1)
}

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

console.log(`[art:final-review] ${action} ${assetId}`)
