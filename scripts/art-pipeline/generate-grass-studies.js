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

function bladePath(x, y, length, sway, direction) {
  const midX = x + Math.cos(direction) * length * 0.38 + sway * 0.25
  const midY = y - Math.sin(direction) * length * 0.56
  const tipX = x + Math.cos(direction) * length + sway * 0.12
  const tipY = y - Math.sin(direction) * length
  const c1x = x + Math.cos(direction) * length * 0.2
  const c1y = y - Math.sin(direction) * length * 0.25
  const c2x = midX + Math.cos(direction) * length * 0.16
  const c2y = midY - Math.sin(direction) * length * 0.18
  return `M ${x.toFixed(1)} ${y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)} S ${tipX.toFixed(1)} ${tipY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`
}

function buildTexture(seed, variant) {
  const random = mulberry32(seed)
  const styles = {
    meadow: {
      bg: ['#B5DC78', '#9FCC61', '#87B94C'],
      blades: 220,
      tufts: 24,
      blotches: 26,
      specks: 100,
      bladeColors: ['#7EA64B', '#96C55F', '#5F8537', '#B5E07D'],
      speckColors: ['#F6EFC8', '#E8F3B6', '#D8E7A3']
    },
    prairie: {
      bg: ['#A9D06E', '#95BF5C', '#7EAA46'],
      blades: 230,
      tufts: 30,
      blotches: 20,
      specks: 110,
      bladeColors: ['#739F44', '#88B255', '#5F8436', '#B3DE74'],
      speckColors: ['#F8D9A6', '#F4E6A7', '#F5F0BE']
    },
    dense: {
      bg: ['#9EC463', '#8CB751', '#779E3F'],
      blades: 300,
      tufts: 36,
      blotches: 18,
      specks: 90,
      bladeColors: ['#698D3F', '#7DA24F', '#597736', '#A6D96B'],
      speckColors: ['#F0E9B5', '#E5F3A9', '#E8DDA3']
    }
  }

  const style = styles[variant]
  const bg = pick(random, style.bg)
  const bg2 = pick(random, style.bg)
  const bg3 = pick(random, style.bg)

  const blobs = []
  for (let i = 0; i < style.blotches; i += 1) {
    const x = range(random, -20, 276)
    const y = range(random, -20, 276)
    const rx = range(random, 12, 42)
    const ry = range(random, 10, 30)
    const fill = random() > 0.65 ? '#B9A467' : pick(random, [bg, bg2, bg3, '#D9E798'])
    blobs.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}" opacity="${range(random, 0.05, 0.16).toFixed(2)}" transform="rotate(${range(random, 0, 180).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" />`)
  }

  const blades = []
  for (let i = 0; i < style.blades; i += 1) {
    const x = range(random, -8, 264)
    const y = range(random, -8, 264)
    const len = range(random, variant === 'dense' ? 10 : 8, variant === 'meadow' ? 26 : 30)
    const sway = range(random, -8, 8)
    const dir = range(random, -Math.PI / 4, Math.PI / 4)
    blades.push(`<path d="${bladePath(x, y, len, sway, dir)}" stroke="${pick(random, style.bladeColors)}" stroke-width="${range(random, 0.7, 1.8).toFixed(2)}" stroke-linecap="round" fill="none" opacity="${range(random, 0.34, 0.9).toFixed(2)}" />`)
  }

  const specks = []
  for (let i = 0; i < style.specks; i += 1) {
    const x = range(random, 0, 256)
    const y = range(random, 0, 256)
    const r = range(random, 0.7, 2.8)
    specks.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${pick(random, style.speckColors)}" opacity="${range(random, 0.16, 0.56).toFixed(2)}" />`)
  }

  const tufts = []
  for (let i = 0; i < style.tufts; i += 1) {
    const x = range(random, 0, 256)
    const y = range(random, 0, 256)
    const r = range(random, 2, 7)
    const fill = random() > 0.5 ? pick(random, style.bladeColors) : '#D5E597'
    tufts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${range(random, 0.12, 0.34).toFixed(2)}" />`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bg-${variant}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="52%" stop-color="${bg2}" />
      <stop offset="100%" stop-color="${bg3}" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#bg-${variant})" />
  ${blobs.join('\n  ')}
  ${specks.join('\n  ')}
  ${tufts.join('\n  ')}
  ${blades.join('\n  ')}
</svg>`
}

async function main() {
  const outDir = path.join(paths.reportsDir, 'grass-studies')
  ensureDir(outDir)

  const studies = [
    { name: 'meadow', seed: 1501 },
    { name: 'prairie', seed: 1602 },
    { name: 'dense', seed: 1703 }
  ]

  const tiles = []
  for (const study of studies) {
    const svg = buildTexture(study.seed, study.name)
    const pngPath = path.join(outDir, `terrain_grass_${study.name}.png`)
    await sharp(Buffer.from(svg)).png().toFile(pngPath)
    tiles.push({ name: study.name, path: pngPath })
    console.log(`[art:grass-studies] wrote ${pngPath}`)
  }

  const sheet = path.join(outDir, 'terrain_grass_sheet.png')
  const base = sharp({
    create: {
      width: 256 * tiles.length + 32 * (tiles.length - 1),
      height: 256,
      channels: 4,
      background: { r: 245, g: 244, b: 230, alpha: 1 }
    }
  })
  const composites = []
  for (let index = 0; index < tiles.length; index += 1) {
    composites.push({
      input: await sharp(tiles[index].path).png().toBuffer(),
      left: index * (256 + 32),
      top: 0
    })
  }
  await base.composite(composites).png().toFile(sheet)
  console.log(`[art:grass-studies] wrote ${sheet}`)
}

main().catch(error => {
  console.error('[art:grass-studies] failed', error)
  process.exitCode = 1
})
