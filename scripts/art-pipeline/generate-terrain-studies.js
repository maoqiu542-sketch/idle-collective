const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const { ensureDir, paths } = require('./shared')

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

function line(x1, y1, x2, y2, stroke, width, opacity = 1) {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${width.toFixed(2)}" opacity="${opacity.toFixed(2)}" stroke-linecap="round" />`
}

function circle(cx, cy, r, fill, opacity = 1) {
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${opacity.toFixed(2)}" />`
}

function ellipse(cx, cy, rx, ry, fill, opacity = 1, rotate = 0) {
  return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" opacity="${opacity.toFixed(2)}" transform="rotate(${rotate.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" />`
}

function pathArc(d, stroke, width, opacity = 1, fill = 'none') {
  return `<path d="${d}" stroke="${stroke}" stroke-width="${width.toFixed(2)}" opacity="${opacity.toFixed(2)}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round" />`
}

function buildForest(random) {
  const bg = pick(random, ['#4E7845', '#5F8A4E', '#45693D'])
  const bg2 = pick(random, ['#3F6237', '#4E7845', '#5A8B50'])
  const bg3 = pick(random, ['#6FA26A', '#7DB072', '#5D8F56'])
  const accents = []

  for (let i = 0; i < 32; i += 1) {
    const x = range(random, -12, 268)
    const y = range(random, -12, 268)
    const r = range(random, 10, 28)
    const leaf = pick(random, ['#365D34', '#4D8048', '#6F9C67', '#82B26D'])
    accents.push(ellipse(x, y, r, r * range(random, 0.65, 1.15), leaf, range(random, 0.09, 0.22), range(random, 0, 180)))
  }

  for (let i = 0; i < 80; i += 1) {
    const x = range(random, 0, 256)
    const y = range(random, 0, 256)
    const len = range(random, 10, 32)
    const sway = range(random, -8, 8)
    accents.push(pathArc(`M ${x.toFixed(1)} ${y.toFixed(1)} q ${(sway).toFixed(1)} ${(-len * 0.25).toFixed(1)} ${(sway * 0.7).toFixed(1)} ${(-len).toFixed(1)}`, pick(random, ['#214126', '#355B35', '#507E49']), range(random, 0.7, 1.6), range(random, 0.18, 0.55)))
  }

  for (let i = 0; i < 60; i += 1) {
    accents.push(circle(range(random, 0, 256), range(random, 0, 256), range(random, 0.5, 2.2), pick(random, ['#8CC47A', '#B4D88D', '#DEEAB2']), range(random, 0.22, 0.55)))
  }

  return { bg, bg2, bg3, accents }
}

function buildMountain(random) {
  const bg = pick(random, ['#8C765F', '#7D6853', '#9A8368'])
  const bg2 = pick(random, ['#6D5946', '#887158', '#5F4D3C'])
  const bg3 = pick(random, ['#B39C7C', '#C5B092', '#A78968'])
  const accents = []

  for (let i = 0; i < 18; i += 1) {
    const x = range(random, -20, 276)
    const y = range(random, -20, 276)
    const w = range(random, 26, 92)
    const h = range(random, 14, 42)
    const color = pick(random, ['#6A5746', '#9A8368', '#C7B49A', '#7C6751'])
    accents.push(`<path d="M ${x.toFixed(1)} ${y.toFixed(1)} l ${(w * 0.45).toFixed(1)} ${(-h).toFixed(1)} l ${(w * 0.55).toFixed(1)} ${h.toFixed(1)} z" fill="${color}" opacity="${range(random, 0.12, 0.26).toFixed(2)}" />`)
  }

  for (let i = 0; i < 120; i += 1) {
    const x = range(random, 0, 256)
    const y = range(random, 0, 256)
    const length = range(random, 8, 30)
    accents.push(line(x, y, x + range(random, -6, 6), y - length, pick(random, ['#5B4A3A', '#7C6650', '#A08A72']), range(random, 0.8, 1.7), range(random, 0.18, 0.55)))
  }

  for (let i = 0; i < 44; i += 1) {
    accents.push(circle(range(random, 0, 256), range(random, 0, 256), range(random, 0.7, 2.6), pick(random, ['#E0D5C3', '#D1C4AF', '#B8AA93']), range(random, 0.2, 0.45)))
  }

  return { bg, bg2, bg3, accents }
}

function buildWater(random) {
  const bg = pick(random, ['#64A9E8', '#5C9DDC', '#76B5EA'])
  const bg2 = pick(random, ['#3F82C8', '#4B8DD0', '#2F71B4'])
  const bg3 = pick(random, ['#8ED3F8', '#A0DCF7', '#74C6F0'])
  const accents = []

  for (let i = 0; i < 32; i += 1) {
    const y = range(random, -12, 268)
    accents.push(line(-10, y, 266, y + range(random, -8, 8), pick(random, ['#BFEAFF', '#D5F3FF', '#8FD5FF']), range(random, 0.7, 1.8), range(random, 0.11, 0.32)))
  }

  for (let i = 0; i < 38; i += 1) {
    const x = range(random, 0, 256)
    const y = range(random, 0, 256)
    const rx = range(random, 18, 66)
    const ry = range(random, 5, 20)
    accents.push(ellipse(x, y, rx, ry, pick(random, ['#B8E9FF', '#6FC0EA', '#A6E0FF']), range(random, 0.08, 0.24), range(random, 0, 180)))
  }

  for (let i = 0; i < 66; i += 1) {
    accents.push(circle(range(random, 0, 256), range(random, 0, 256), range(random, 0.4, 1.8), pick(random, ['#E9FAFF', '#C6EEFF', '#D6F4FF']), range(random, 0.26, 0.62)))
  }

  return { bg, bg2, bg3, accents }
}

function buildSand(random) {
  const bg = pick(random, ['#E8D7AA', '#E6D09D', '#EDDDB0'])
  const bg2 = pick(random, ['#D0BC88', '#C7B076', '#D9C191'])
  const bg3 = pick(random, ['#F4E7C8', '#EFD9A8', '#F3E2B7'])
  const accents = []

  for (let i = 0; i < 76; i += 1) {
    const y = range(random, 0, 256)
    accents.push(line(-10, y, 266, y + range(random, -10, 10), pick(random, ['#D2BD90', '#C7B27E', '#E7D6AB']), range(random, 0.8, 2.2), range(random, 0.18, 0.5)))
  }

  for (let i = 0; i < 30; i += 1) {
    accents.push(ellipse(range(random, 0, 256), range(random, 0, 256), range(random, 6, 26), range(random, 2, 10), pick(random, ['#C6B17B', '#DDC48A', '#BFA56A']), range(random, 0.08, 0.22), range(random, 0, 180)))
  }

  for (let i = 0; i < 46; i += 1) {
    accents.push(circle(range(random, 0, 256), range(random, 0, 256), range(random, 0.6, 2.6), pick(random, ['#FFF3D3', '#E2C998', '#F2E2B2']), range(random, 0.12, 0.42)))
  }

  return { bg, bg2, bg3, accents }
}

function buildSnow(random) {
  const bg = pick(random, ['#EDF7FF', '#F2F9FF', '#E7F3FE'])
  const bg2 = pick(random, ['#DCEBFA', '#CFE2F7', '#E4F0FC'])
  const bg3 = pick(random, ['#FFFFFF', '#F7FBFF', '#EDF6FF'])
  const accents = []

  for (let i = 0; i < 46; i += 1) {
    const y = range(random, 0, 256)
    accents.push(line(-10, y, 266, y + range(random, -8, 8), pick(random, ['#CBE0F4', '#F8FBFF', '#D7E9F8']), range(random, 0.8, 1.8), range(random, 0.12, 0.34)))
  }

  for (let i = 0; i < 36; i += 1) {
    accents.push(ellipse(range(random, 0, 256), range(random, 0, 256), range(random, 8, 30), range(random, 3, 12), pick(random, ['#D6E6F7', '#F3F9FF', '#E2EEF8']), range(random, 0.08, 0.24), range(random, 0, 180)))
  }

  for (let i = 0; i < 40; i += 1) {
    accents.push(circle(range(random, 0, 256), range(random, 0, 256), range(random, 0.4, 2.2), pick(random, ['#FFFFFF', '#DDEBFA', '#F2FAFF']), range(random, 0.22, 0.54)))
  }

  return { bg, bg2, bg3, accents }
}

function buildTexture(type, seed) {
  const random = mulberry32(seed)
  const builders = {
    forest: buildForest,
    mountain: buildMountain,
    water: buildWater,
    sand: buildSand,
    snow: buildSnow
  }
  const build = builders[type]
  if (!build) {
    throw new Error(`Unknown terrain type: ${type}`)
  }
  return build(random)
}

async function writeStudy(type, variant, seed, outDir) {
  const texture = buildTexture(type, seed)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bg-${type}-${variant}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${texture.bg}" />
      <stop offset="52%" stop-color="${texture.bg2}" />
      <stop offset="100%" stop-color="${texture.bg3}" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#bg-${type}-${variant})" />
  ${texture.accents.join('\n  ')}
</svg>`

  const pngPath = path.join(outDir, `terrain_${type}_${variant}.png`)
  const svgPath = path.join(outDir, `terrain_${type}_${variant}.svg`)
  fs.writeFileSync(svgPath, svg, 'utf8')
  await sharp(Buffer.from(svg)).png().toFile(pngPath)
  return { pngPath, svgPath }
}

async function main() {
  const outDir = path.join(paths.reportsDir, 'terrain-studies')
  ensureDir(outDir)

  const variants = [
    { type: 'forest', name: 'canopy', seed: 2401 },
    { type: 'forest', name: 'grove', seed: 2402 },
    { type: 'forest', name: 'underbrush', seed: 2403 },
    { type: 'mountain', name: 'ridge', seed: 2501 },
    { type: 'mountain', name: 'cliff', seed: 2502 },
    { type: 'mountain', name: 'scree', seed: 2503 },
    { type: 'water', name: 'ripples', seed: 2601 },
    { type: 'water', name: 'shallows', seed: 2602 },
    { type: 'water', name: 'current', seed: 2603 },
    { type: 'sand', name: 'dunes', seed: 2701 },
    { type: 'sand', name: 'dry', seed: 2702 },
    { type: 'sand', name: 'beach', seed: 2703 },
    { type: 'snow', name: 'powder', seed: 2801 },
    { type: 'snow', name: 'wind', seed: 2802 },
    { type: 'snow', name: 'frost', seed: 2803 }
  ]

  const sheetByType = new Map()
  const generatedByType = new Map()

  for (const entry of variants) {
    const result = await writeStudy(entry.type, entry.name, entry.seed, outDir)
    console.log(`[art:terrain-studies] wrote ${path.basename(result.pngPath)}`)
    if (!sheetByType.has(entry.type)) {
      sheetByType.set(entry.type, [])
    }
    sheetByType.get(entry.type).push(result.pngPath)
    if (!generatedByType.has(entry.type)) {
      generatedByType.set(entry.type, [])
    }
    generatedByType.get(entry.type).push({ name: entry.name, ...result })
  }

  for (const [type, files] of sheetByType.entries()) {
    const sheetPath = path.join(outDir, `terrain_${type}_sheet.png`)
    const composites = []
    for (let index = 0; index < files.length; index += 1) {
      composites.push({
        input: await sharp(files[index]).png().toBuffer(),
        left: index * 272,
        top: 0
      })
    }
    await sharp({
      create: {
        width: files.length * 256 + (files.length - 1) * 16,
        height: 256,
        channels: 4,
        background: { r: 245, g: 245, b: 232, alpha: 1 }
      }
    }).composite(composites).png().toFile(sheetPath)
    console.log(`[art:terrain-studies] wrote ${path.basename(sheetPath)}`)
  }
}

main().catch(error => {
  console.error('[art:terrain-studies] failed', error)
  process.exitCode = 1
})
