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

function mulberry32(seed) {
  let t = seed >>> 0
  return function random() {
    t += 0x6D2B79F5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)]
}

function range(random, min, max) {
  return min + (max - min) * random()
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function bladePath(random, x, y, length, sway, direction) {
  const bend = sway * range(random, 0.35, 0.95)
  const midX = x + Math.cos(direction) * length * 0.35 + bend
  const midY = y - Math.sin(direction) * length * 0.55
  const tipX = x + Math.cos(direction) * length + bend * 0.35
  const tipY = y - Math.sin(direction) * length
  const control1X = x + Math.cos(direction) * length * 0.18 + bend * 0.2
  const control1Y = y - Math.sin(direction) * length * 0.22
  const control2X = midX + Math.cos(direction) * length * 0.16 - bend * 0.15
  const control2Y = midY - Math.sin(direction) * length * 0.18

  return `M ${x.toFixed(1)} ${y.toFixed(1)} C ${control1X.toFixed(1)} ${control1Y.toFixed(1)} ${control2X.toFixed(1)} ${control2Y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)} S ${tipX.toFixed(1)} ${tipY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`
}

function buildGrassSvg(assetId, variantKey, seed, style) {
  const random = mulberry32(seed)
  const width = 256
  const height = 256

  const palettes = {
    meadow: ['#8FC36C', '#9AD06F', '#7EAE59', '#A8D87A', '#6C9C48'],
    moss: ['#7FA958', '#8EC36B', '#6E9648', '#A2CF79', '#67903F'],
    field: ['#92C86F', '#A8D96D', '#81B957', '#D5E48D', '#6F9D48'],
    plain: ['#89B95F', '#A1D37C', '#78A94E', '#C6DD8F', '#618A3E'],
    prairie: ['#8BBE63', '#9ED376', '#76A54B', '#D0E48A', '#5C8739']
  }

  const base = pick(random, palettes[style.palette])
  const accent = pick(random, palettes[style.accentPalette])
  const soil = pick(random, ['#C8B37A', '#BCA66C', '#C4AE72', '#BFA86A'])
  const clover = pick(random, ['#D8F0A7', '#EAF7C1', '#F0E9B1'])
  const flower = pick(random, ['#F6D6E8', '#F4E7A5', '#FFD59E', '#F7F0B8'])

  const blobs = []
  for (let i = 0; i < style.blobCount; i += 1) {
    const x = range(random, -20, width + 20)
    const y = range(random, -20, height + 20)
    const rx = range(random, 18, 58)
    const ry = range(random, 12, 42)
    const angle = range(random, 0, Math.PI)
    const opacity = range(random, 0.08, 0.22)
    const fill = random() > 0.65 ? soil : pick(random, [base, accent, '#B4D77B'])
    blobs.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${(angle * 180 / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${fill}" opacity="${opacity.toFixed(2)}" />`)
  }

  const blades = []
  for (let i = 0; i < style.bladeCount; i += 1) {
    const x = range(random, -8, width + 8)
    const y = range(random, -4, height + 8)
    const heightBias = y / height
    const length = range(random, 8, 30) + heightBias * range(random, 0, 12)
    const sway = range(random, -10, 10)
    const direction = range(random, -Math.PI / 3, Math.PI / 3)
    const stroke = pick(random, [base, accent, '#6D9A47', '#A8D86D', '#5C8437'])
    const widthStroke = range(random, 0.6, 1.8)
    const opacity = range(random, 0.35, 0.95)
    blades.push(`<path d="${bladePath(random, x, y, length, sway, direction)}" stroke="${stroke}" stroke-width="${widthStroke.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${opacity.toFixed(2)}" />`)
  }

  const tufts = []
  for (let i = 0; i < style.tuftCount; i += 1) {
    const x = range(random, 0, width)
    const y = range(random, 0, height)
    const radius = range(random, 1.5, 4.8)
    const opacity = range(random, 0.22, 0.7)
    const fill = random() > 0.5 ? clover : flower
    tufts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${fill}" opacity="${opacity.toFixed(2)}" />`)
  }

  const seedNoise = []
  for (let i = 0; i < style.noiseCount; i += 1) {
    const x = range(random, 0, width)
    const y = range(random, 0, height)
    const rx = range(random, 0.7, 2.6)
    const ry = range(random, 0.7, 2.4)
    const fill = random() > 0.5 ? '#F5EFCB' : '#668E42'
    seedNoise.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" opacity="${range(random, 0.08, 0.18).toFixed(2)}" />`)
  }

  const vignette = `<rect x="0" y="0" width="256" height="256" fill="none" stroke="${base}" stroke-opacity="0.02" stroke-width="8" />`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bg-${assetId}-${variantKey}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${style.bg0}" />
      <stop offset="45%" stop-color="${style.bg1}" />
      <stop offset="100%" stop-color="${style.bg2}" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#bg-${assetId}-${variantKey})" />
  ${blobs.join('\n  ')}
  ${seedNoise.join('\n  ')}
  ${blades.join('\n  ')}
  ${tufts.join('\n  ')}
  ${vignette}
</svg>`
}

async function writeGrassAsset(asset, variantKey, seed, style) {
  const sourceDir = assetSourceDir(asset)
  const outputDir = assetOutputDir(asset)
  ensureDir(sourceDir)
  ensureDir(outputDir)

  const svgPath = path.join(sourceDir, `${asset.asset_id}__${variantKey}__${asset.version}.svg`)
  const pngPath = path.join(sourceDir, `${asset.asset_id}__${variantKey}__${asset.version}.png`)
  const png32Path = path.join(outputDir, `${asset.asset_id}__32.png`)
  const png64Path = path.join(outputDir, `${asset.asset_id}__64.png`)
  const png128Path = path.join(outputDir, `${asset.asset_id}__128.png`)
  const previewPath = path.join(paths.reportsDir, 'previews', `${asset.asset_id}__preview.png`)

  const svg = buildGrassSvg(asset.asset_id, variantKey, seed, style)
  fs.writeFileSync(svgPath, svg, 'utf8')
  ensureDir(paths.previewsDir)
  await sharp(Buffer.from(svg)).png().toFile(pngPath)
  await sharp(Buffer.from(svg)).png().resize(32, 32, { fit: 'cover' }).toFile(png32Path)
  await sharp(Buffer.from(svg)).png().resize(64, 64, { fit: 'cover' }).toFile(png64Path)
  await sharp(Buffer.from(svg)).png().resize(128, 128, { fit: 'cover' }).toFile(png128Path)
  await sharp(Buffer.from(svg)).png().resize(128, 128, { fit: 'cover' }).toFile(previewPath)

  const now = new Date().toISOString()
  const existingMeta = readAssetMeta(asset)
  writeAssetMeta(asset, {
    ...existingMeta,
    status: 'approved',
    approved_variant: variantKey,
    source_kind: 'procedural_generated',
    runtime_source: {
      kind: 'procedural',
      variant: variantKey,
      path: svgPath,
      approved_at: now,
      note: 'Procedural grass texture generated after AI iterations failed to produce a usable wild ground tile.'
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
        variant: variantKey,
        path: pngPath,
        source_kind: 'procedural_generated',
        imported_at: now
      }
    ],
    imported_variants: [
      {
        variant: variantKey,
        source_file: svgPath,
        imported_file: pngPath,
        imported_at: now
      }
    ],
    generated_at: now
  })

  console.log(`[art:grass] wrote ${asset.asset_id} ${variantKey}`)
}

async function main() {
  const { catalog } = loadSpecs()
  const grassAssets = catalog.assets.filter(asset => asset.category === 'terrain' && asset.target_key === 'grass')
  const styleTable = [
    { bg0: '#A8D077', bg1: '#94C361', bg2: '#81B04C', palette: 'meadow', accentPalette: 'moss', bladeCount: 220, blobCount: 48, tuftCount: 36, noiseCount: 120 },
    { bg0: '#9CC66C', bg1: '#8DBB5D', bg2: '#749E46', palette: 'moss', accentPalette: 'field', bladeCount: 240, blobCount: 54, tuftCount: 40, noiseCount: 130 },
    { bg0: '#B2D46B', bg1: '#99C653', bg2: '#7DAB43', palette: 'field', accentPalette: 'prairie', bladeCount: 210, blobCount: 44, tuftCount: 38, noiseCount: 110 },
    { bg0: '#A5CC72', bg1: '#8FBE60', bg2: '#7AA34A', palette: 'plain', accentPalette: 'meadow', bladeCount: 230, blobCount: 50, tuftCount: 34, noiseCount: 120 },
    { bg0: '#B6D873', bg1: '#9FCB5F', bg2: '#86AF48', palette: 'prairie', accentPalette: 'plain', bladeCount: 215, blobCount: 46, tuftCount: 42, noiseCount: 125 }
  ]

  for (let index = 0; index < grassAssets.length; index += 1) {
    const asset = grassAssets[index]
    const style = styleTable[index % styleTable.length]
    const variantKey = 'procedural'
    const seed = asset.seed_policy?.suggested_seed ?? (1000 + index)
    await writeGrassAsset(asset, variantKey, seed + index * 17, style)
  }
}

main().catch(error => {
  console.error('[art:grass] failed', error)
  process.exitCode = 1
})
