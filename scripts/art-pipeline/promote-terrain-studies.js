const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const {
  assetOutputDir,
  assetSourceDir,
  ensureDir,
  findVariantPath,
  loadSpecs,
  parseArgs,
  paths,
  getSeededSourcePath,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')

const args = parseArgs(process.argv.slice(2))
const studyDirName = typeof args['study-dir'] === 'string' ? args['study-dir'] : 'terrain-studies'
const requestedAssets = typeof args.assets === 'string'
  ? new Set(args.assets.split(',').map(value => value.trim()).filter(Boolean))
  : null
const studyDir = path.join(paths.reportsDir, studyDirName)

const promotions = [
  { assetId: 'terrain_forest', studyFile: 'terrain_forest_canopy.png' },
  { assetId: 'terrain_forest_b', studyFile: 'terrain_forest_grove.png' },
  { assetId: 'terrain_forest_c', studyFile: 'terrain_forest_underbrush.png' },
  { assetId: 'terrain_mountain', studyFile: 'terrain_mountain_ridge.png' },
  { assetId: 'terrain_mountain_b', studyFile: 'terrain_mountain_cliff.png' },
  { assetId: 'terrain_mountain_c', studyFile: 'terrain_mountain_scree.png' },
  { assetId: 'terrain_water', studyFile: 'terrain_water_ripples.png' },
  { assetId: 'terrain_water_b', studyFile: 'terrain_water_shallows.png' },
  { assetId: 'terrain_water_c', studyFile: 'terrain_water_current.png' },
  { assetId: 'terrain_sand', studyFile: 'terrain_sand_dunes.png' },
  { assetId: 'terrain_sand_b', studyFile: 'terrain_sand_dry.png' },
  { assetId: 'terrain_sand_c', studyFile: 'terrain_sand_beach.png' },
  { assetId: 'terrain_snow', studyFile: 'terrain_snow_powder.png' },
  { assetId: 'terrain_snow_b', studyFile: 'terrain_snow_wind.png' },
  { assetId: 'terrain_snow_c', studyFile: 'terrain_snow_frost.png' }
]

async function promote(asset, studyFile) {
  const studyPath = path.join(studyDir, studyFile)
  if (!fs.existsSync(studyPath)) {
    throw new Error(`Missing study file: ${studyPath}`)
  }

  const sourceDir = assetSourceDir(asset)
  const outputDir = assetOutputDir(asset)
  ensureDir(sourceDir)
  ensureDir(outputDir)

  const sourcePath = path.join(sourceDir, `${asset.asset_id}__procedural__${asset.version}.png`)
  const output32 = path.join(outputDir, `${asset.asset_id}__32.png`)
  const output64 = path.join(outputDir, `${asset.asset_id}__64.png`)
  const output128 = path.join(outputDir, `${asset.asset_id}__128.png`)
  const previewPath = path.join(paths.reportsDir, 'previews', `${asset.asset_id}__preview.png`)
  const seededSourcePath = getSeededSourcePath(asset)
  const existingMeta = readAssetMeta(asset)

  fs.copyFileSync(studyPath, sourcePath)
  await sharp(studyPath).resize(32, 32, { fit: 'cover' }).png().toFile(output32)
  await sharp(studyPath).resize(64, 64, { fit: 'cover' }).png().toFile(output64)
  await sharp(studyPath).resize(128, 128, { fit: 'cover' }).png().toFile(output128)
  ensureDir(paths.previewsDir)
  await sharp(studyPath).resize(128, 128, { fit: 'cover' }).png().toFile(previewPath)

  const now = new Date().toISOString()
  writeAssetMeta(asset, {
    ...existingMeta,
    status: 'approved',
    approved_variant: existingMeta?.approved_variant ?? asset.approved_variant,
    source_kind: existingMeta?.source_kind ?? asset.source_kind,
    runtime_source: existingMeta?.runtime_source ?? (seededSourcePath
      ? {
          kind: 'seeded',
          variant: null,
          path: seededSourcePath,
          approved_at: now,
          note: 'Terrain study staged for manual review.'
        }
      : null),
    review_queue: {
      status: 'pending_review',
      candidate_variant: 'procedural',
      updated_at: now
    },
    pipeline_state: 'imported',
    candidates: [
      {
        variant: 'procedural',
        path: sourcePath,
        source_kind: 'procedural_generated',
        imported_at: now
      }
    ],
    imported_variants: [
      {
        variant: 'procedural',
        source_file: studyPath,
        imported_file: sourcePath,
        imported_at: now
      }
    ],
    generated_at: now
  })

  console.log(`[art:promote-terrain] staged ${asset.asset_id} from ${studyFile}`)
}

async function main() {
  const { catalog } = loadSpecs()
  const assetMap = new Map(catalog.assets.map(asset => [asset.asset_id, asset]))

  for (const entry of promotions) {
    if (requestedAssets && !requestedAssets.has(entry.assetId)) {
      continue
    }
    const asset = assetMap.get(entry.assetId)
    if (!asset) {
      throw new Error(`Unknown asset: ${entry.assetId}`)
    }
    await promote(asset, entry.studyFile)
  }
}

main().catch(error => {
  console.error('[art:promote-terrain] failed', error)
  process.exitCode = 1
})
