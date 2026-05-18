const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const {
  assetOutputDir,
  loadSpecs,
  paths,
  readJson,
  writeJson
} = require('./shared')

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  }
}

async function imageMetrics(filePath) {
  const image = sharp(filePath)
  const metadata = await image.metadata()
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  let opaquePixels = 0
  let edgeOpaquePixels = 0
  let red = 0
  let green = 0
  let blue = 0

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels
      const alpha = data[index + 3]
      if (alpha <= 12) continue
      opaquePixels += 1
      red += data[index]
      green += data[index + 1]
      blue += data[index + 2]
      const isEdge = x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1
      if (isEdge) {
        edgeOpaquePixels += 1
      }
    }
  }

  const average = opaquePixels === 0
    ? { r: 0, g: 0, b: 0 }
    : {
        r: Math.round(red / opaquePixels),
        g: Math.round(green / opaquePixels),
        b: Math.round(blue / opaquePixels)
      }

  return {
    metadata,
    opaqueRatio: opaquePixels / (info.width * info.height),
    edgeOpaqueRatio: edgeOpaquePixels / Math.max(1, info.width * 2 + info.height * 2 - 4),
    average
  }
}

function paletteDistance(rgb, palette) {
  return Math.min(
    ...palette.map(entry => {
      const paletteRgb = hexToRgb(entry)
      return Math.sqrt(
        (rgb.r - paletteRgb.r) ** 2 +
        (rgb.g - paletteRgb.g) ** 2 +
        (rgb.b - paletteRgb.b) ** 2
      )
    })
  )
}

async function main() {
  const { catalog, styleMap } = loadSpecs()
  const seenIds = new Set()
  const signatures = []
  const errors = []
  const warnings = []

  for (const asset of catalog.assets) {
    if (seenIds.has(asset.asset_id)) {
      errors.push({ asset_id: asset.asset_id, message: 'Duplicate asset_id in catalog.' })
      continue
    }
    seenIds.add(asset.asset_id)

    const outputDir = assetOutputDir(asset)
    const output32 = path.join(outputDir, `${asset.asset_id}__32.png`)
    const output64 = path.join(outputDir, `${asset.asset_id}__64.png`)
    const output128 = path.join(outputDir, `${asset.asset_id}__128.png`)

    for (const targetPath of [output32, output64, output128]) {
      if (!fs.existsSync(targetPath)) {
        errors.push({
          asset_id: asset.asset_id,
          message: `Missing export ${path.relative(paths.projectRoot, targetPath)}`
        })
      }
    }
    if (!fs.existsSync(output32)) {
      continue
    }

    const metrics = await imageMetrics(output32)
    const styleProfile = styleMap.get(asset.style_profile)
    const paletteDelta = paletteDistance(metrics.average, styleProfile.palette)
    const isPlaceholderSeeded = asset.source_kind === 'placeholder_seeded'
    const opaqueRatioThreshold = asset.category === 'ui_icon_fallback' ? 0.04 : 0.08

    if (metrics.metadata.width !== 32 || metrics.metadata.height !== 32) {
      errors.push({ asset_id: asset.asset_id, message: '32px export does not match expected size.' })
    }

    if (asset.category !== 'terrain' && metrics.edgeOpaqueRatio > 0.65) {
      warnings.push({
        asset_id: asset.asset_id,
        message: 'Edge alpha usage is high; asset may touch canvas borders too aggressively.'
      })
    }

    if (asset.category !== 'terrain' && metrics.opaqueRatio < opaqueRatioThreshold) {
      warnings.push({
        asset_id: asset.asset_id,
        message: 'Opaque ratio is low; asset may be unreadable at 32px.'
      })
    }

    if (!isPlaceholderSeeded && paletteDelta > 120) {
      warnings.push({
        asset_id: asset.asset_id,
        message: `Average color drifted away from palette by ${paletteDelta.toFixed(2)}.`
      })
    }

    signatures.push({
      asset_id: asset.asset_id,
      category: asset.category,
      source_kind: asset.source_kind,
      average: metrics.average,
      opaqueRatio: metrics.opaqueRatio
    })
  }

  for (let index = 0; index < signatures.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < signatures.length; otherIndex += 1) {
      const a = signatures[index]
      const b = signatures[otherIndex]
      if (a.category !== b.category) continue
      if (a.source_kind === 'placeholder_seeded' || b.source_kind === 'placeholder_seeded') continue

      const distance = Math.sqrt(
        (a.average.r - b.average.r) ** 2 +
        (a.average.g - b.average.g) ** 2 +
        (a.average.b - b.average.b) ** 2
      )

      if (distance < 5 && Math.abs(a.opaqueRatio - b.opaqueRatio) < 0.03) {
        warnings.push({
          asset_id: `${a.asset_id}, ${b.asset_id}`,
          message: 'Assets look overly similar by average-color signature.'
        })
      }
    }
  }

  const manifestChecks = [
    { label: 'live', path: paths.liveManifestPath },
    { label: 'staged', path: paths.stagedManifestPath }
  ]

  for (const manifestCheck of manifestChecks) {
    if (!fs.existsSync(manifestCheck.path)) {
      errors.push({
        asset_id: manifestCheck.label,
        message: `Missing ${manifestCheck.label} manifest ${path.relative(paths.projectRoot, manifestCheck.path)}`
      })
      continue
    }

    const manifest = readJson(manifestCheck.path)
    for (const [assetId, entry] of Object.entries(manifest.assets ?? {})) {
      for (const filePath of Object.values(entry.files ?? {})) {
        const absolutePath = path.join(paths.projectRoot, 'public', filePath.replace(/^\//, '').replace(/\//g, path.sep))
        if (!fs.existsSync(absolutePath)) {
          errors.push({
            asset_id: assetId,
            message: `Manifest ${manifestCheck.label} points to missing file ${filePath}`
          })
        }
      }
    }
  }

  const reportPath = path.join(paths.reportsDir, 'validation-report.json')
  writeJson(reportPath, {
    generatedAt: new Date().toISOString(),
    summary: {
      assetCount: catalog.assets.length,
      errorCount: errors.length,
      warningCount: warnings.length
    },
    errors,
    warnings
  })

  console.log(`[art:validate] wrote ${path.relative(paths.projectRoot, reportPath)}`)

  if (errors.length > 0) {
    console.error('[art:validate] validation failed')
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error('[art:validate] failed', error)
  process.exitCode = 1
})
