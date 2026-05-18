const fs = require('node:fs')
const path = require('node:path')
const {
  assetOutputDir,
  assetSourceDir,
  ensureDir,
  loadSpecs,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')

const terrainIds = [
  'terrain_forest',
  'terrain_forest_b',
  'terrain_forest_c',
  'terrain_mountain',
  'terrain_mountain_b',
  'terrain_mountain_c',
  'terrain_water',
  'terrain_water_b',
  'terrain_water_c',
  'terrain_sand',
  'terrain_sand_b',
  'terrain_sand_c',
  'terrain_snow',
  'terrain_snow_b',
  'terrain_snow_c'
]

async function rollback(asset) {
  const existingMeta = readAssetMeta(asset) ?? {}
  const now = new Date().toISOString()
  const sourceDir = assetSourceDir(asset)
  const outputDir = assetOutputDir(asset)
  ensureDir(sourceDir)
  ensureDir(outputDir)

  const seededSourceCandidates = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.startsWith(`${asset.asset_id}__src__` ) && entry.name.includes('__seed') && entry.name.endsWith('.svg'))
    .map(entry => path.join(sourceDir, entry.name))

  const seededSourcePath = seededSourceCandidates[0]
  if (!seededSourcePath || !fs.existsSync(seededSourcePath)) {
    throw new Error(`Seeded source missing for ${asset.asset_id}`)
  }

  const sourcePath = path.join(sourceDir, `${asset.asset_id}__src__${asset.version}__seed${asset.seed_policy?.suggested_seed ?? 0}.svg`)
  fs.copyFileSync(seededSourcePath, sourcePath)

  writeAssetMeta(asset, {
    ...existingMeta,
    status: 'approved',
    approved_variant: existingMeta.approved_variant ?? asset.approved_variant ?? null,
    source_kind: existingMeta.source_kind ?? asset.source_kind,
    runtime_source: {
      kind: 'seeded',
      variant: null,
      path: sourcePath,
      approved_at: now,
      note: 'Rolled back to seeded source until manual review completes.'
    },
    review_queue: {
      status: 'pending_review',
      candidate_variant: existingMeta.review_queue?.candidate_variant ?? 'procedural',
      updated_at: now,
      note: 'Rolled back because the promoted terrain needs manual approval.'
    },
    pipeline_state: 'imported',
    generated_at: now
  })

  console.log(`[art:rollback-terrain] rolled back ${asset.asset_id}`)
}

async function main() {
  const { catalog } = loadSpecs()
  const assetMap = new Map(catalog.assets.map(asset => [asset.asset_id, asset]))

  for (const assetId of terrainIds) {
    const asset = assetMap.get(assetId)
    if (!asset) {
      throw new Error(`Unknown terrain asset: ${assetId}`)
    }
    await rollback(asset)
  }
}

main().catch(error => {
  console.error('[art:rollback-terrain] failed', error)
  process.exitCode = 1
})
