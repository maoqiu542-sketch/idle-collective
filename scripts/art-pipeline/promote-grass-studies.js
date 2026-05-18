const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const {
  assetOutputDir,
  assetSourceDir,
  ensureDir,
  loadSpecs,
  paths,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')

const studyDir = path.join(paths.reportsDir, 'grass-studies')

const promotions = [
  {
    assetId: 'terrain_grass',
    variant: 'procedural',
    studyFile: 'terrain_grass_meadow.png'
  },
  {
    assetId: 'terrain_grass_b',
    variant: 'procedural',
    studyFile: 'terrain_grass_prairie.png'
  },
  {
    assetId: 'terrain_grass_c',
    variant: 'procedural',
    studyFile: 'terrain_grass_dense.png'
  }
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

  fs.copyFileSync(studyPath, sourcePath)
  await sharp(studyPath).resize(32, 32, { fit: 'cover' }).png().toFile(output32)
  await sharp(studyPath).resize(64, 64, { fit: 'cover' }).png().toFile(output64)
  await sharp(studyPath).resize(128, 128, { fit: 'cover' }).png().toFile(output128)
  ensureDir(paths.previewsDir)
  await sharp(studyPath).resize(128, 128, { fit: 'cover' }).png().toFile(previewPath)

  const now = new Date().toISOString()
  const existingMeta = readAssetMeta(asset)
  writeAssetMeta(asset, {
    ...existingMeta,
    status: 'approved',
    approved_variant: 'procedural',
    source_kind: 'procedural_generated',
    runtime_source: {
      kind: 'procedural',
      variant: 'procedural',
      path: sourcePath,
      approved_at: now,
      note: 'Promoted from the grass study set for in-game use.'
    },
    review_queue: {
      status: 'clean',
      candidate_variant: null,
      updated_at: now
    },
    pipeline_state: 'final_approved',
    final_review_status: 'final_approved',
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

  console.log(`[art:promote-grass] promoted ${asset.asset_id} from ${studyFile}`)
}

async function main() {
  const { catalog } = loadSpecs()
  const assetMap = new Map(catalog.assets.map(asset => [asset.asset_id, asset]))

  for (const entry of promotions) {
    const asset = assetMap.get(entry.assetId)
    if (!asset) {
      throw new Error(`Unknown asset: ${entry.assetId}`)
    }
    await promote(asset, entry.studyFile)
  }
}

main().catch(error => {
  console.error('[art:promote-grass] failed', error)
  process.exitCode = 1
})
