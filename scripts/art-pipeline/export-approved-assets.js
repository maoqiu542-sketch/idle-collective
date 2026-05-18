const path = require('node:path')
const sharp = require('sharp')
const {
  ensureDir,
  loadSpecs,
  assetOutputDir,
  findApprovedSource,
  findStagingSource,
  parseArgs,
  paths,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')

const args = parseArgs(process.argv.slice(2))
const scope = typeof args.scope === 'string' ? args.scope : 'live'

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  }
}

async function loadRawImage(sourcePath, width, height) {
  return sharp(sourcePath)
    .resize(width, height, { fit: 'inside', withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

function findOpaqueBounds(rawBuffer, info, alphaThreshold) {
  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1
  let opaquePixels = 0

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alphaIndex = (y * info.width + x) * info.channels + 3
      if (rawBuffer[alphaIndex] > alphaThreshold) {
        opaquePixels += 1
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  return {
    hasOpaquePixels: opaquePixels > 0,
    opaquePixels,
    bounds: opaquePixels > 0
      ? {
          left: minX,
          top: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1
        }
      : {
          left: 0,
          top: 0,
          width: info.width,
          height: info.height
        }
  }
}

function averageRgb(rawBuffer, info, bounds, alphaThreshold) {
  let red = 0
  let green = 0
  let blue = 0
  let count = 0

  for (let y = bounds.top; y < bounds.top + bounds.height; y += 1) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x += 1) {
      const pixelIndex = (y * info.width + x) * info.channels
      const alpha = rawBuffer[pixelIndex + 3]
      if (alpha <= alphaThreshold) continue
      red += rawBuffer[pixelIndex]
      green += rawBuffer[pixelIndex + 1]
      blue += rawBuffer[pixelIndex + 2]
      count += 1
    }
  }

  if (count === 0) {
    return { r: 0, g: 0, b: 0 }
  }

  return {
    r: Math.round(red / count),
    g: Math.round(green / count),
    b: Math.round(blue / count)
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

async function exportAsset(asset, recipe, styleProfile) {
  const sourcePath = scope === 'staged'
    ? findStagingSource(asset)
    : findApprovedSource(asset)
  if (!sourcePath) {
    console.log(`[art:export] skipped ${asset.asset_id} (${scope}, no source)`)
    return
  }
  const existingMeta = readAssetMeta(asset)

  const analysis = await loadRawImage(
    sourcePath,
    asset.source_resolution.width,
    asset.source_resolution.height
  )
  const boundsResult = findOpaqueBounds(
    analysis.data,
    analysis.info,
    styleProfile.postprocess.alpha_threshold
  )

  const margin = styleProfile.postprocess.safe_margin
  const cropBounds = recipe.category === 'terrain'
    ? {
        left: 0,
        top: 0,
        width: analysis.info.width,
        height: analysis.info.height
      }
    : {
        left: Math.max(0, boundsResult.bounds.left - margin),
        top: Math.max(0, boundsResult.bounds.top - margin),
        width: Math.min(
          analysis.info.width - Math.max(0, boundsResult.bounds.left - margin),
          boundsResult.bounds.width + margin * 2
        ),
        height: Math.min(
          analysis.info.height - Math.max(0, boundsResult.bounds.top - margin),
          boundsResult.bounds.height + margin * 2
        )
      }

  const averageColor = averageRgb(
    analysis.data,
    analysis.info,
    cropBounds,
    styleProfile.postprocess.alpha_threshold
  )

  const outputDir = assetOutputDir(asset, scope)
  ensureDir(outputDir)

  const basePipeline = sharp(sourcePath)
    .extract(cropBounds)
    .ensureAlpha()

  const exports = {}
  for (const preset of recipe.export_presets) {
    const targetPath = path.join(outputDir, `${asset.asset_id}__${preset.name}.png`)
    let instance = basePipeline.clone()
    if (recipe.category === 'terrain') {
      instance = instance.resize(preset.width, preset.height, { fit: 'cover' })
    } else {
      instance = instance.resize(preset.width, preset.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
    }
    await instance.png().toFile(targetPath)
    exports[preset.name] = targetPath
  }

  ensureDir(paths.previewsDir)
  const previewSuffix = scope === 'staged' ? '__staged-preview.png' : '__preview.png'
  const previewPath = path.join(paths.previewsDir, `${asset.asset_id}${previewSuffix}`)
  await sharp(sourcePath)
    .extract(cropBounds)
    .resize(128, 128, {
      fit: recipe.category === 'terrain' ? 'cover' : 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(previewPath)

  writeAssetMeta(asset, {
    ...(existingMeta ?? {}),
    source_path: scope === 'live' ? sourcePath : existingMeta?.source_path ?? null,
    crop_bounds: cropBounds,
    opaque_pixels: boundsResult.opaquePixels,
    average_color: averageColor,
    palette_distance: paletteDistance(averageColor, styleProfile.palette),
    exports: scope === 'live'
      ? Object.fromEntries(Object.entries(exports).map(([key, value]) => [key, path.relative(paths.projectRoot, value)]))
      : existingMeta?.exports ?? {},
    staged_exports: scope === 'staged'
      ? Object.fromEntries(Object.entries(exports).map(([key, value]) => [key, path.relative(paths.projectRoot, value)]))
      : existingMeta?.staged_exports ?? {},
    preview: scope === 'live' ? path.relative(paths.projectRoot, previewPath) : existingMeta?.preview ?? null,
    staged_preview: scope === 'staged' ? path.relative(paths.projectRoot, previewPath) : existingMeta?.staged_preview ?? null,
    generated_at: new Date().toISOString()
  })

  console.log(`[art:export] exported ${asset.asset_id} (${scope})`)
}

async function main() {
  const { catalog, recipeMap, styleMap } = loadSpecs()

  for (const asset of catalog.assets) {
    const recipe = recipeMap.get(asset.recipe_id)
    const styleProfile = styleMap.get(asset.style_profile)
    await exportAsset(asset, recipe, styleProfile)
  }
}

main().catch(error => {
  console.error('[art:export] failed', error)
  process.exitCode = 1
})
