const fs = require('node:fs')
const path = require('node:path')
const {
  assetOutputDir,
  loadSpecs,
  paths,
  readAssetMeta,
  relativePublicPath,
  writeJson
} = require('./shared')

function buildAssetEntry(asset) {
  const outputDir = assetOutputDir(asset, 'live')
  const meta = readAssetMeta(asset)
  const files = {}

  for (const preset of asset.export_presets) {
    const filePath = path.join(outputDir, `${asset.asset_id}__${preset.name}.png`)
    if (fs.existsSync(filePath)) {
      files[preset.name] = relativePublicPath(filePath)
    }
  }

  return {
    category: asset.category,
    targetKey: asset.target_key,
    version: asset.version,
    status: meta?.pipeline_state ?? meta?.review_queue?.status ?? asset.status,
    sourceKind: meta?.runtime_source?.kind ?? asset.source_kind,
    approvedVariant: meta?.runtime_source?.variant ?? asset.approved_variant,
    reviewStatus: meta?.review_queue?.status ?? 'clean',
    aiDecision: meta?.ai_review?.decision ?? 'pending',
    finalReviewStatus: meta?.final_review_status ?? 'not_requested',
    files
  }
}

const { catalog, runtimeMapping } = loadSpecs()
const manifestPath = paths.liveManifestPath

writeJson(manifestPath, {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  assets: Object.fromEntries(catalog.assets.map(asset => [asset.asset_id, buildAssetEntry(asset)])),
  mapping: runtimeMapping.mapping,
  fallbacks: {
    terrain: runtimeMapping.mapping.ui.terrain_default,
    resource: runtimeMapping.mapping.ui.resource_default,
    building: runtimeMapping.mapping.ui.building_default,
    character: runtimeMapping.mapping.ui.character_default,
    boss: runtimeMapping.mapping.ui.boss_default
  }
})

console.log(`[art:manifest] wrote ${path.relative(paths.projectRoot, manifestPath)}`)
