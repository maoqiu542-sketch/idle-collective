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
  const meta = readAssetMeta(asset)
  if (!meta?.staging_source || meta.ai_review?.decision !== 'approve') {
    return null
  }

  const outputDir = assetOutputDir(asset, 'staged')
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
    status: meta.pipeline_state,
    sourceKind: meta.staging_source.kind,
    approvedVariant: meta.staging_source.variant,
    reviewStatus: meta.review_queue.status,
    aiDecision: meta.ai_review.decision,
    reviewMethod: meta.ai_review.review_method ?? 'unknown',
    semanticChecked: meta.ai_review.semantic_checked === true,
    finalReviewStatus: meta.final_review_status,
    files
  }
}

function main() {
  const { catalog, runtimeMapping } = loadSpecs()
  const assetEntries = catalog.assets
    .map(asset => [asset.asset_id, buildAssetEntry(asset)])
    .filter(([, entry]) => entry)

  writeJson(paths.stagedManifestPath, {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    assets: Object.fromEntries(assetEntries),
    mapping: runtimeMapping.mapping,
    fallbacks: {
      terrain: runtimeMapping.mapping.ui.terrain_default,
      resource: runtimeMapping.mapping.ui.resource_default,
      building: runtimeMapping.mapping.ui.building_default,
      character: runtimeMapping.mapping.ui.character_default,
      boss: runtimeMapping.mapping.ui.boss_default
    }
  })

  console.log(`[art:staged-manifest] wrote ${path.relative(paths.projectRoot, paths.stagedManifestPath)}`)
}

main()
