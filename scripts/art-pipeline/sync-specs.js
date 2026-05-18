const fs = require('node:fs')
const path = require('node:path')
const {
  PIPELINE_CONFIG,
  STYLE_PROFILES,
  RECIPE_DEFINITIONS,
  GENERATION_STANDARDS,
  REVIEW_RUBRICS,
  REVIEW_FEEDBACK_DEFAULT,
  RUNTIME_MAPPING,
  buildAssetCatalog
} = require('./pipeline-definitions')

const projectRoot = path.resolve(__dirname, '..', '..')
const specsRoot = path.join(projectRoot, 'art-pipeline', 'specs')

function writeJson(fileName, payload) {
  const targetPath = path.join(specsRoot, fileName)
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`[art:sync-specs] wrote ${path.relative(projectRoot, targetPath)}`)
}

function writeJsonIfMissing(fileName, payload) {
  const targetPath = path.join(specsRoot, fileName)
  if (fs.existsSync(targetPath)) {
    console.log(`[art:sync-specs] kept ${path.relative(projectRoot, targetPath)}`)
    return
  }
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`[art:sync-specs] wrote ${path.relative(projectRoot, targetPath)}`)
}

writeJson('style-profiles.json', {
  version: '1.0.0',
  profiles: STYLE_PROFILES
})

writeJson('asset-recipes.json', {
  version: '1.0.0',
  recipes: RECIPE_DEFINITIONS
})

writeJson('generation-standards.json', GENERATION_STANDARDS)
writeJson('review-rubrics.json', REVIEW_RUBRICS)
writeJsonIfMissing('review-feedback.json', REVIEW_FEEDBACK_DEFAULT)

writeJson('runtime-mapping.json', {
  version: '1.0.0',
  mapping: RUNTIME_MAPPING
})

writeJson('pipeline-config.json', PIPELINE_CONFIG)

writeJson('asset-catalog.json', {
  version: '1.0.0',
  assets: buildAssetCatalog()
})
