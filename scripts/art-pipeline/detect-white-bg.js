const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const GAME_ASSETS = path.join(__dirname, '..', '..', 'public', 'textures')
const TARGET_CATEGORIES = ['character_portrait', 'boss_portrait', 'ui_icon_fallback']

async function hasWhiteBackground(filePath, threshold = 240) {
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true })
  const channels = info.channels || 4

  let cornerWhiteCount = 0
  const sampleSize = Math.min(5, Math.floor(info.width / 10))

  for (let y of [0, info.height - 1]) {
    for (let x of [0, info.width - 1]) {
      const idx = (y * info.width + x) * channels
      if (channels >= 3) {
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        if (r > threshold && g > threshold && b > threshold) {
          cornerWhiteCount++
        }
      }
    }
  }

  if (cornerWhiteCount >= 3) return true

  let totalWhite = 0
  const edgePixels = []
  for (let x = 0; x < info.width; x += Math.max(1, Math.floor(info.width / 20))) {
    edgePixels.push([x, 0])
    edgePixels.push([x, info.height - 1])
  }
  for (let y = 0; y < info.height; y += Math.max(1, Math.floor(info.height / 20))) {
    edgePixels.push([0, y])
    edgePixels.push([info.width - 1, y])
  }

  for (const [x, y] of edgePixels) {
    const idx = (y * info.width + x) * channels
    if (channels >= 3) {
      const r = data[idx], g = data[idx + 1], b = data[idx + 2]
      if (r > threshold && g > threshold && b > threshold) totalWhite++
    }
  }

  return totalWhite > edgePixels.length * 0.7
}

async function removeWhiteBackground(inputPath, outputPath, tolerance = 30) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const channels = info.channels || 4

  const output = Buffer.alloc(data.length)
  const toleranceSq = tolerance * tolerance

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const brightness = (r * r + g * g + b * b) / 3
    const isWhite = r > 220 && g > 220 && b > 220 &&
      Math.abs(r - g) < tolerance &&
      Math.abs(g - b) < tolerance &&
      Math.abs(r - b) < tolerance

    output[i] = r
    output[i + 1] = g
    output[i + 2] = b
    output[i + 3] = isWhite ? 0 : (channels > 3 ? data[i + 3] : 255)
  }

  await sharp(output, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath)
}

async function main() {
  console.log('=== Detecting White Background Assets ===\n')

  const results = []

  for (const cat of TARGET_CATEGORIES) {
    const catDir = path.join(GAME_ASSETS, cat)
    if (!fs.existsSync(catDir)) continue

    const subdirs = fs.readdirSync(catDir).filter(s => {
      return fs.statSync(path.join(catDir, s)).isDirectory()
    })

    for (const sub of subdirs) {
      const src128 = path.join(catDir, sub, `${sub}__128.png`)
      if (!fs.existsSync(src128)) continue

      const whiteBg = await hasWhiteBackground(src128)
      results.push({
        category: cat,
        id: sub,
        hasWhiteBackground: whiteBg,
        path: src128
      })
      process.stdout.write(whiteBg ? 'W' : '.')
    }
  }

  console.log(`\n\nScanned ${results.length} assets`)

  const withWhiteBg = results.filter(r => r.hasWhiteBackground)
  const withoutWhiteBg = results.filter(r => !r.hasWhiteBackground)

  console.log(`\nWhite background (${withWhiteBg.length}):`)
  for (const r of withWhiteBg) {
    console.log(`  ${r.category}/${r.id}`)
  }

  console.log(`\nNo white background / already transparent (${withoutWhiteBg.length})`)

  fs.writeFileSync(
    path.join(GAME_ASSETS, 'manifests', 'white-bg-detection.json'),
    JSON.stringify(results, null, 2)
  )

  return results
}

main().catch(console.error)
