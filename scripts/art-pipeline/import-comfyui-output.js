const fs = require('node:fs')
const path = require('node:path')
const {
  assetSourceDir,
  ensureDir,
  loadSpecs,
  loadPipelineConfig,
  parseArgs,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')

const args = parseArgs(process.argv.slice(2))
const requestedCategory = typeof args.category === 'string' ? args.category : null
const requestedAssetId = typeof args.asset === 'string' ? args.asset : null
const comfyOutputDir = typeof args.outputDir === 'string'
  ? path.resolve(args.outputDir)
  : loadPipelineConfig().comfyui.outputDir

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function collectOutputFiles(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`ComfyUI output directory not found: ${directory}`)
  }

  return fs.readdirSync(directory)
    .filter(fileName => /\.(png|webp|jpg|jpeg)$/i.test(fileName))
    .map(fileName => {
      const absolutePath = path.join(directory, fileName)
      const stat = fs.statSync(absolutePath)
      return {
        fileName,
        absolutePath,
        modifiedAt: stat.mtimeMs
      }
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
}

function findLatestMatch(outputFiles, asset, variant) {
  const prefix = `${asset.asset_id}__${variant}__${asset.version}`
  const matcher = new RegExp(`^${escapeRegExp(prefix)}(?:_\\d+_)?\\.(png|webp|jpg|jpeg)$`, 'i')
  return outputFiles.find(entry => matcher.test(entry.fileName)) || null
}

function collectDiscoveredVariants(outputFiles, asset) {
  const matcher = new RegExp(`^${escapeRegExp(asset.asset_id)}__(cand\\d+)__${escapeRegExp(asset.version)}(?:_\\d+_)?\\.(png|webp|jpg|jpeg)$`, 'i')
  const variants = new Set()
  for (const entry of outputFiles) {
    const match = entry.fileName.match(matcher)
    if (match) {
      variants.add(match[1])
    }
  }
  return [...variants].sort()
}

function inferImportedVariants(asset, outputFiles) {
  const imported = []
  const existingMeta = readAssetMeta(asset)
  const existingCandidates = new Map(
    (existingMeta?.candidates ?? []).map(candidate => [candidate.variant, candidate])
  )

  for (const variant of collectDiscoveredVariants(outputFiles, asset)) {
    const match = findLatestMatch(outputFiles, asset, variant)
    if (!match) {
      continue
    }

    const previousCandidate = existingCandidates.get(variant)
    const previousImportedAt = previousCandidate?.imported_at
      ? Date.parse(previousCandidate.imported_at)
      : Number.NEGATIVE_INFINITY
    if (previousImportedAt >= match.modifiedAt) {
      continue
    }

    const destinationDir = assetSourceDir(asset)
    const destinationPath = path.join(destinationDir, `${asset.asset_id}__${variant}__${asset.version}.png`)
    ensureDir(destinationDir)
    fs.copyFileSync(match.absolutePath, destinationPath)
    imported.push({
      variant,
      source_file: match.absolutePath,
      imported_file: destinationPath,
      imported_at: new Date().toISOString()
    })
  }

  return imported
}

function updateMeta(asset, imports) {
  const existingMeta = readAssetMeta(asset)
  const now = new Date().toISOString()
  const existingCandidates = Array.isArray(existingMeta?.candidates) ? existingMeta.candidates : []
  const preservedCandidates = existingCandidates.filter(candidate =>
    !imports.some(importEntry => importEntry.variant === candidate.variant)
  )
  const nextAttemptHistory = [...(existingMeta?.attempt_history ?? [])]

  for (const entry of imports) {
    const queuedIndex = nextAttemptHistory.findIndex(item => item.variant === entry.variant && (item.outcome === 'queued' || item.outcome === 'prepared'))
    if (queuedIndex >= 0) {
      nextAttemptHistory[queuedIndex] = {
        ...nextAttemptHistory[queuedIndex],
        imported_at: entry.imported_at,
        imported_file: entry.imported_file,
        outcome: 'imported'
      }
    } else {
      nextAttemptHistory.push({
        attempt: nextAttemptHistory.length + 1,
        variant: entry.variant,
        strategy: 'comfyui_generated',
        queued_at: entry.imported_at,
        imported_at: entry.imported_at,
        source_file: entry.source_file,
        imported_file: entry.imported_file,
        outcome: 'imported',
        note: 'Imported from ComfyUI output.'
      })
    }
  }

  writeAssetMeta(asset, {
    ...existingMeta,
    review_queue: {
      status: 'pending_review',
      candidate_variant: imports[imports.length - 1]?.variant ?? null,
      updated_at: now,
      note: 'Awaiting QC and AI review.'
    },
    pipeline_state: 'imported',
    attempt_count: Math.max(existingMeta?.attempt_count ?? 0, nextAttemptHistory.length),
    attempt_history: nextAttemptHistory,
    candidates: [
      ...preservedCandidates,
      ...imports.map(entry => ({
        variant: entry.variant,
        path: entry.imported_file,
        source_kind: 'comfyui_generated',
        imported_at: entry.imported_at
      }))
    ],
    imported_variants: [...(existingMeta?.imported_variants ?? []), ...imports],
    ai_review: {
      decision: 'pending',
      reviewer_version: existingMeta?.ai_review?.reviewer_version
    },
    generated_at: now
  })
}

function main() {
  const { catalog } = loadSpecs()
  const outputFiles = collectOutputFiles(comfyOutputDir)
  let importedCount = 0

  for (const asset of catalog.assets) {
    if (requestedAssetId && asset.asset_id !== requestedAssetId) {
      continue
    }
    if (requestedCategory && asset.category !== requestedCategory) {
      continue
    }

    const imports = inferImportedVariants(asset, outputFiles)
    if (imports.length === 0) {
      continue
    }

    updateMeta(asset, imports)
    importedCount += imports.length
    console.log(`[art:import] ${asset.asset_id} imported ${imports.map(entry => entry.variant).join(', ')}`)
  }

  console.log(`[art:import] imported ${importedCount} generated files from ${comfyOutputDir}`)
}

try {
  main()
} catch (error) {
  console.error('[art:import] failed', error)
  process.exitCode = 1
}
