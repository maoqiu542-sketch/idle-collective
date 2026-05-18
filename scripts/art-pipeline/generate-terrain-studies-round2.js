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

function rect(x, y, w, h, fill, opacity = 1, rotate = 0, rx = 0) {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${rx.toFixed(1)}" fill="${fill}" opacity="${opacity.toFixed(2)}" transform="rotate(${rotate.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" />`
}

function polygon(points, fill, opacity = 1) {
  return `<polygon points="${points.map(point => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ')}" fill="${fill}" opacity="${opacity.toFixed(2)}" />`
}

function pathArc(d, stroke, width, opacity = 1, fill = 'none') {
  return `<path d="${d}" stroke="${stroke}" stroke-width="${width.toFixed(2)}" opacity="${opacity.toFixed(2)}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round" />`
}

function makeBlobs(random, count, palette, opacityRange, radiusRange) {
  const shapes = []
  for (let i = 0; i < count; i += 1) {
    const x = range(random, -20, 276)
    const y = range(random, -20, 276)
    const rx = range(random, radiusRange[0], radiusRange[1])
    const ry = rx * range(random, 0.55, 1.35)
    shapes.push(ellipse(x, y, rx, ry, pick(random, palette), range(random, opacityRange[0], opacityRange[1]), range(random, 0, 180)))
  }
  return shapes
}

function makeSpeckles(random, count, palette, radiusRange, opacityRange) {
  const shapes = []
  for (let i = 0; i < count; i += 1) {
    shapes.push(circle(range(random, 0, 256), range(random, 0, 256), range(random, radiusRange[0], radiusRange[1]), pick(random, palette), range(random, opacityRange[0], opacityRange[1])))
  }
  return shapes
}

function makeGrassStrokes(random, count, palette, widthRange, opacityRange, lengthRange) {
  const shapes = []
  for (let i = 0; i < count; i += 1) {
    const x = range(random, 0, 256)
    const y = range(random, 0, 256)
    const len = range(random, lengthRange[0], lengthRange[1])
    const sway = range(random, -7, 7)
    shapes.push(pathArc(`M ${x.toFixed(1)} ${y.toFixed(1)} q ${(sway * 0.2).toFixed(1)} ${(-len * 0.22).toFixed(1)} ${(sway * 0.5).toFixed(1)} ${(-len).toFixed(1)}`, pick(random, palette), range(random, widthRange[0], widthRange[1]), range(random, opacityRange[0], opacityRange[1])))
  }
  return shapes
}

function buildForest(random) {
  const bg = pick(random, ['#4C763F', '#567F46', '#456C3A'])
  const bg2 = pick(random, ['#385A31', '#4A743E', '#507C45'])
  const bg3 = pick(random, ['#6F9C61', '#7CAD6D', '#5D8F50'])
  const accents = []

  accents.push(...makeBlobs(random, 56, ['#203F27', '#31552E', '#4A7440'], [0.05, 0.14], [14, 44]))
  accents.push(...makeBlobs(random, 48, ['#5D914F', '#7CA766', '#92BE76'], [0.05, 0.12], [8, 26]))
  accents.push(...makeGrassStrokes(random, 180, ['#214126', '#325A35', '#4B8048', '#74A66B'], [0.45, 1.25], [0.10, 0.30], [8, 26]))
  accents.push(...makeSpeckles(random, 100, ['#8BC37B', '#C3DE98', '#E5F0BF'], [0.4, 1.8], [0.12, 0.34]))
  accents.push(...makeBlobs(random, 20, ['#A4C87E', '#D5E29D'], [0.05, 0.14], [4, 10]))

  return { bg, bg2, bg3, accents }
}

function buildMountain(random) {
  const bg = pick(random, ['#816954', '#8B735C', '#76604D'])
  const bg2 = pick(random, ['#655341', '#7A6350', '#8E775F'])
  const bg3 = pick(random, ['#B09A7D', '#C3B196', '#9A846A'])
  const accents = []

  accents.push(...makeBlobs(random, 36, ['#544334', '#6B5846', '#8B735C'], [0.05, 0.16], [10, 42]))
  accents.push(...makeBlobs(random, 24, ['#A48C72', '#C7B29A', '#E2D4C2'], [0.05, 0.12], [5, 18]))

  for (let i = 0; i < 120; i += 1) {
    const x = range(random, 0, 256)
    const y = range(random, 0, 256)
    const len = range(random, 6, 22)
    const lean = range(random, -6, 6)
    accents.push(line(x, y, x + lean, y - len, pick(random, ['#4C3E31', '#695742', '#8B745D', '#B39C85']), range(random, 0.6, 1.5), range(random, 0.12, 0.38)))
  }

  for (let i = 0; i < 24; i += 1) {
    const x = range(random, -8, 248)
    const y = range(random, 6, 234)
    const w = range(random, 20, 68)
    const h = range(random, 10, 28)
    accents.push(polygon([
      [x, y],
      [x + w * 0.45, y - h],
      [x + w, y]
    ], pick(random, ['#6A5746', '#8A745D', '#B39D82']), range(random, 0.08, 0.22)))
  }

  accents.push(...makeSpeckles(random, 60, ['#DDD2C0', '#EAE0D1', '#CBBCA6'], [0.5, 2.2], [0.14, 0.40]))

  return { bg, bg2, bg3, accents }
}

function buildWater(random) {
  const bg = pick(random, ['#5EA0DD', '#6EB1E5', '#4F91D0'])
  const bg2 = pick(random, ['#3377BA', '#478CD0', '#2C68A9'])
  const bg3 = pick(random, ['#8DD0F2', '#9CDAF6', '#6FC0EA'])
  const accents = []

  for (let i = 0; i < 56; i += 1) {
    const y = range(random, -8, 264)
    const wobble = range(random, -7, 7)
    accents.push(line(-12, y, 268, y + wobble, pick(random, ['#BCE9FF', '#DBF4FF', '#95D7FF']), range(random, 0.6, 1.5), range(random, 0.10, 0.28)))
  }

  accents.push(...makeBlobs(random, 24, ['#BEEBFF', '#D6F4FF', '#8FD2F0'], [0.03, 0.10], [16, 52]))
  accents.push(...makeBlobs(random, 12, ['#EAFBFF', '#FFFFFF'], [0.05, 0.12], [4, 10]))
  accents.push(...makeSpeckles(random, 92, ['#EAFBFF', '#CFEFFF', '#D9F6FF'], [0.3, 1.5], [0.18, 0.48]))

  return { bg, bg2, bg3, accents }
}

function buildSand(random) {
  const bg = pick(random, ['#E7D5A7', '#E2CC98', '#EDDDB1'])
  const bg2 = pick(random, ['#CEB57E', '#C7AD72', '#D8BF8D'])
  const bg3 = pick(random, ['#F0E1BD', '#F5E8CA', '#EAD8A6'])
  const accents = []

  for (let i = 0; i < 88; i += 1) {
    const y = range(random, -8, 264)
    const wobble = range(random, -8, 8)
    accents.push(line(-12, y, 268, y + wobble, pick(random, ['#D7C08C', '#C6AE74', '#E6D5A8']), range(random, 0.6, 1.8), range(random, 0.12, 0.34)))
  }

  accents.push(...makeBlobs(random, 28, ['#D9C38D', '#BFA46B', '#E8D7A8'], [0.04, 0.12], [8, 26]))
  accents.push(...makeSpeckles(random, 82, ['#FFF3D4', '#E3CA97', '#F4E3B6'], [0.4, 1.8], [0.12, 0.38]))
  accents.push(...makeBlobs(random, 10, ['#CDB57E', '#BFA468'], [0.04, 0.10], [4, 8]))

  return { bg, bg2, bg3, accents }
}

function buildSnow(random) {
  const bg = pick(random, ['#EEF6FF', '#F5FAFF', '#E8F2FC'])
  const bg2 = pick(random, ['#D8E7F8', '#E1EDF9', '#CFDFF1'])
  const bg3 = pick(random, ['#FFFFFF', '#F8FCFF', '#EDF5FF'])
  const accents = []

  for (let i = 0; i < 72; i += 1) {
    const y = range(random, -8, 264)
    const wobble = range(random, -7, 7)
    accents.push(line(-12, y, 268, y + wobble, pick(random, ['#D0E0F4', '#F8FBFF', '#E1EEF9']), range(random, 0.55, 1.4), range(random, 0.12, 0.30)))
  }

  accents.push(...makeBlobs(random, 32, ['#E6EFF9', '#D9E8F7', '#F4FAFF'], [0.04, 0.10], [8, 24]))
  accents.push(...makeBlobs(random, 18, ['#FFFFFF', '#EEF7FF', '#DCEAF8'], [0.03, 0.10], [4, 12]))
  accents.push(...makeSpeckles(random, 96, ['#FFFFFF', '#DCE9F8', '#F4FAFF'], [0.3, 1.4], [0.16, 0.42]))
  accents.push(...makeGrassStrokes(random, 48, ['#C4D9EE', '#F7FBFF', '#D8E7F6'], [0.35, 0.8], [0.08, 0.22], [6, 16]))

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
  const outDir = path.join(paths.reportsDir, 'terrain-studies-round2')
  ensureDir(outDir)

  const variants = [
    { type: 'forest', name: 'canopy', seed: 3401 },
    { type: 'forest', name: 'grove', seed: 3402 },
    { type: 'forest', name: 'underbrush', seed: 3403 },
    { type: 'mountain', name: 'ridge', seed: 3501 },
    { type: 'mountain', name: 'cliff', seed: 3502 },
    { type: 'mountain', name: 'scree', seed: 3503 },
    { type: 'water', name: 'ripples', seed: 3601 },
    { type: 'water', name: 'shallows', seed: 3602 },
    { type: 'water', name: 'current', seed: 3603 },
    { type: 'sand', name: 'dunes', seed: 3701 },
    { type: 'sand', name: 'dry', seed: 3702 },
    { type: 'sand', name: 'beach', seed: 3703 },
    { type: 'snow', name: 'powder', seed: 3801 },
    { type: 'snow', name: 'wind', seed: 3802 },
    { type: 'snow', name: 'frost', seed: 3803 }
  ]

  const sheetByType = new Map()

  for (const entry of variants) {
    const result = await writeStudy(entry.type, entry.name, entry.seed, outDir)
    console.log(`[art:terrain-studies-round2] wrote ${path.basename(result.pngPath)}`)
    if (!sheetByType.has(entry.type)) {
      sheetByType.set(entry.type, [])
    }
    sheetByType.get(entry.type).push(result.pngPath)
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
        background: { r: 243, g: 244, b: 235, alpha: 1 }
      }
    }).composite(composites).png().toFile(sheetPath)
    console.log(`[art:terrain-studies-round2] wrote ${path.basename(sheetPath)}`)
  }
}

main().catch(error => {
  console.error('[art:terrain-studies-round2] failed', error)
  process.exitCode = 1
})
