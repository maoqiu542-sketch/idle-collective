const sharp = require('sharp')

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
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

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

async function imageMetrics(filePath, alphaThreshold = 12) {
  const image = sharp(filePath)
  const metadata = await image.metadata()
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  let opaquePixels = 0
  let edgeOpaquePixels = 0
  let centerOpaquePixels = 0
  let red = 0
  let green = 0
  let blue = 0
  let luminanceSum = 0
  let luminanceSquaredSum = 0
  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1

  const centerLeft = Math.floor(info.width * 0.25)
  const centerRight = Math.ceil(info.width * 0.75)
  const centerTop = Math.floor(info.height * 0.25)
  const centerBottom = Math.ceil(info.height * 0.75)

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels
      const alpha = data[index + 3]
      if (alpha <= alphaThreshold) continue

      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]
      const lum = luminance(r, g, b)

      opaquePixels += 1
      red += r
      green += g
      blue += b
      luminanceSum += lum
      luminanceSquaredSum += lum * lum

      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
        edgeOpaquePixels += 1
      }
      if (x >= centerLeft && x < centerRight && y >= centerTop && y < centerBottom) {
        centerOpaquePixels += 1
      }
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  const average = opaquePixels === 0
    ? { r: 0, g: 0, b: 0 }
    : {
        r: Math.round(red / opaquePixels),
        g: Math.round(green / opaquePixels),
        b: Math.round(blue / opaquePixels)
      }

  const avgLuminance = opaquePixels === 0 ? 0 : luminanceSum / opaquePixels
  const variance = opaquePixels === 0 ? 0 : luminanceSquaredSum / opaquePixels - avgLuminance ** 2
  const stdDeviation = Math.sqrt(Math.max(0, variance))
  const totalPixels = info.width * info.height
  const centerPixels = Math.max(1, (centerRight - centerLeft) * (centerBottom - centerTop))
  const boundsWidth = maxX >= minX ? maxX - minX + 1 : 0
  const boundsHeight = maxY >= minY ? maxY - minY + 1 : 0

  return {
    metadata,
    width: info.width,
    height: info.height,
    opaqueRatio: opaquePixels / Math.max(1, totalPixels),
    edgeOpaqueRatio: edgeOpaquePixels / Math.max(1, info.width * 2 + info.height * 2 - 4),
    centerOpaqueRatio: centerOpaquePixels / centerPixels,
    average,
    luminanceStdDev: stdDeviation,
    bounds: {
      width: boundsWidth,
      height: boundsHeight,
      areaRatio: (boundsWidth * boundsHeight) / Math.max(1, totalPixels)
    }
  }
}

async function exportCandidatePreview(sourcePath, outputPath, preset, category) {
  let pipeline = sharp(sourcePath).ensureAlpha()
  if (category === 'terrain') {
    pipeline = pipeline.resize(preset.width, preset.height, { fit: 'cover' })
  } else {
    pipeline = pipeline.resize(preset.width, preset.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
  }

  await pipeline.png().toFile(outputPath)
}

module.exports = {
  hexToRgb,
  paletteDistance,
  imageMetrics,
  exportCandidatePreview
}
