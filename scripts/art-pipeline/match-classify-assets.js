const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const crypto = require('crypto')

const INCOMING = path.join(__dirname, '..', '..', 'art-pipeline', 'incoming')
const GAME_ASSETS = path.join(__dirname, '..', '..', 'public', 'textures')
const STAGED_ASSETS = path.join(__dirname, '..', '..', 'public', 'textures', 'staged')
const EXPORTED = path.join(INCOMING, 'exported', '128')

async function computeFingerprint32(filePath) {
  const { data } = await sharp(filePath)
    .removeAlpha()
    .resize(32, 32, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return crypto.createHash('md5').update(data).digest('hex')
}

async function computeAverageColor(filePath) {
  const { data, info } = await sharp(filePath)
    .removeAlpha()
    .resize(8, 8, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let r = 0, g = 0, b = 0
  const channels = info.channels || 3
  for (let i = 0; i < data.length; i += channels) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const n = data.length / channels
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}

async function computeColorHistogram(filePath) {
  const { data, info } = await sharp(filePath)
    .removeAlpha()
    .resize(32, 32, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const hsv = { h: new Array(18).fill(0), s: new Array(10).fill(0), v: new Array(10).fill(0) }
  const channels = info.channels || 3

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min
    const v = max

    let h = 0
    if (d !== 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (max === g) h = ((b - r) / d + 2) / 6
      else h = ((r - g) / d + 4) / 6
    }

    const s = max === 0 ? 0 : d / max

    hsv.h[Math.min(Math.floor(h * 18), 17)]++
    hsv.s[Math.min(Math.floor(s * 10), 9)]++
    hsv.v[Math.min(Math.floor(v * 10), 9)]++
  }

  return hsv
}

function histogramSimilarity(h1, h2) {
  let sim = 0
  for (const key of ['h', 's', 'v']) {
    const a = h1[key]
    const b = h2[key]
    let dot = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    sim += dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
  }
  return sim / 3
}

function colorDistance(c1, c2) {
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2)
}

async function loadExistingAssetsWithMetadata() {
  const result = []
  const dirs = [GAME_ASSETS, STAGED_ASSETS]

  for (const baseDir of dirs) {
    if (!fs.existsSync(baseDir)) continue
    const files = fs.readdirSync(baseDir, { recursive: true }).filter(f => f.endsWith('__128.png'))
    for (const f of files) {
      const fullPath = path.join(baseDir, f)
      const relative = path.relative(baseDir, f)
      const parts = relative.split(path.sep)
      const category = parts[0] || 'unknown'
      const subdir = parts.length > 1 ? parts[1] : null
      const scope = baseDir === GAME_ASSETS ? 'live' : 'staged'

      result.push({
        path: fullPath,
        category,
        subdir,
        filename: path.basename(f),
        scope,
        fingerprint: await computeFingerprint32(fullPath),
        avgColor: await computeAverageColor(fullPath),
        histogram: await computeColorHistogram(fullPath)
      })
      process.stdout.write('E')
    }
  }
  console.log(`\nLoaded ${result.length} existing assets with metadata`)
  return result
}

async function classifyByVisualFeatures(newFilePath) {
  const stats = await sharp(newFilePath).stats()
  const meta = await sharp(newFilePath).metadata()

  const { channels } = stats
  const hasAlpha = channels && channels.length >= 4
  const mean = channels?.[0]?.mean || 128

  const edgeBuffer = await sharp(newFilePath)
    .removeAlpha()
    .resize(32, 32, { fit: 'fill' })
    .convolve({
      width: 3, height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
    })
    .raw()
    .toBuffer()

  let edgeSum = 0
  for (let i = 0; i < edgeBuffer.length; i++) {
    edgeSum += Math.abs(edgeBuffer[i] - 128)
  }
  const edgeIntensity = edgeSum / edgeBuffer.length

  const isLight = mean > 200
  const isMedium = mean > 120 && mean <= 200
  const isDark = mean <= 120
  const hasHighEdge = edgeIntensity > 30
  const hasTransparency = hasAlpha

  return { isLight, isMedium, isDark, hasHighEdge, hasTransparency, edgeIntensity, meanBrightness: mean }
}

async function matchSquareAssets() {
  console.log('=== Phase 1: Matching & Classifying Square Assets ===\n')

  const existing = await loadExistingAssetsWithMetadata()

  const byFingerprint = new Map()
  for (const e of existing) {
    byFingerprint.set(e.fingerprint, e)
  }

  const exportedFiles = fs.readdirSync(EXPORTED).filter(f => f.endsWith('.png')).sort()
  console.log(`New exported 128px files: ${exportedFiles.length}\n`)

  const matches = []

  console.log('Computing new asset metadata...')
  for (const exFile of exportedFiles) {
    const exPath = path.join(EXPORTED, exFile)
    const exFp = await computeFingerprint32(exPath)
    const exColor = await computeAverageColor(exPath)
    const exHist = await computeColorHistogram(exPath)
    const exFeatures = await classifyByVisualFeatures(exPath)

    let bestMatch = null
    let bestScore = -Infinity

    const exactMatch = byFingerprint.get(exFp)
    if (exactMatch) {
      bestMatch = { ...exactMatch, confidence: 'exact_fingerprint', score: 1.0 }
    } else {
      for (const e of existing) {
        const d = colorDistance(exColor, e.avgColor)
        const histSim = histogramSimilarity(exHist, e.histogram)
        const score = histSim * 0.7 + Math.max(0, 1 - d / 441) * 0.3

        if (score > bestScore) {
          bestScore = score
          const m = { ...e }
          m.confidence = score > 0.85 ? 'high_color_match' : score > 0.6 ? 'moderate_color_match' : 'low_color_match'
          m.score = score
          m.colorDist = d
          m.histSim = histSim
          bestMatch = m
        }
      }
    }

    matches.push({
      newFile: exFile,
      newFp: exFp,
      newColor: exColor,
      features: exFeatures,
      match: bestMatch
    })
    process.stdout.write('.')
  }

  console.log('\n')

  const exact = matches.filter(m => m.match?.confidence === 'exact_fingerprint')
  const highConfidence = matches.filter(m => m.match?.confidence === 'high_color_match')
  const moderateConfidence = matches.filter(m => m.match?.confidence === 'moderate_color_match')
  const lowConfidence = matches.filter(m => m.match?.confidence === 'low_color_match')

  console.log(`=== Results ===`)
  console.log(`Exact fingerprint matches: ${exact.length}`)
  console.log(`High color match (score > 0.85): ${highConfidence.length}`)
  console.log(`Moderate color match (score > 0.6): ${moderateConfidence.length}`)
  console.log(`Low color match (score <= 0.6): ${lowConfidence.length}\n`)

  const allMatches = [...exact, ...highConfidence, ...moderateConfidence, ...lowConfidence]

  const cats = {}
  for (const m of allMatches) {
    const cat = m.match?.category || 'unmatched'
    if (!cats[cat]) cats[cat] = []
    cats[cat].push(m)
  }

  for (const [cat, items] of Object.entries(cats)) {
    console.log(`\n--- ${cat} (${items.length} files) ---`)
    for (const m of items) {
      const c = m.newColor
      console.log(`  ${m.newFile} → ${m.match?.subdir || '?'} (score=${m.match?.score?.toFixed(3) || '1.0'}, dist=${m.match?.colorDist || 0}) | rgb(${c.r},${c.g},${c.b}) | ${JSON.stringify(m.features)}`)
    }
  }

  const manifest = {
    results: allMatches.map(m => ({
      newFile: m.newFile,
      matchedCategory: m.match?.category || null,
      matchedSubdir: m.match?.subdir || null,
      confidence: m.match?.confidence || 'none',
      score: m.match?.score || 0,
      colorDist: m.match?.colorDist || 0,
      avgColor: m.newColor,
      features: m.features
    })),
    categoryBreakdown: Object.fromEntries(
      Object.entries(cats).map(([k, v]) => [k, v.length])
    )
  }

  fs.writeFileSync(
    path.join(INCOMING, 'match-results.json'),
    JSON.stringify(manifest, null, 2)
  )
  console.log(`\nResults → ${path.join(INCOMING, 'match-results.json')}`)

  return matches
}

async function generateClassificationOverview() {
  const overview = {}
  
  const catDefs = require('../../art-pipeline/specs/asset-catalog.json')
  
  if (catDefs?.assets) {
    const byCategory = {}
    for (const a of catDefs.assets) {
      if (!byCategory[a.category]) byCategory[a.category] = []
      byCategory[a.category].push({
        id: a.asset_id,
        key: a.target_key,
        display: a.display_name
      })
    }
    
    console.log('\n=== Project Asset Catalog Needs ===')
    console.log('Format: category (count): asset_id (target_key, display_name)')
    console.log()
    
    for (const [cat, assets] of Object.entries(byCategory)) {
      console.log(`[${cat}] (${assets.length} needed):`)
      for (const a of assets) {
        console.log(`  ${a.id} → key:${a.key}, "${a.display}"`)
      }
      console.log()
    }
  }
}

async function analyzeWideImages() {
  console.log('\n=== Phase 2: Analyzing Wide Images (Sprite Sheets) ===')

  const wideDirs = [
    { dir: path.join(INCOMING, 'source_unique', 'wide_2172x724'), cols: 3, cellW: 724, cellH: 724 },
    { dir: path.join(INCOMING, 'source_unique', 'wide_2508x627'), cols: 4, cellW: 627, cellH: 627 },
    { dir: path.join(INCOMING, 'source_unique', 'other') },
  ]

  for (const spec of wideDirs) {
    if (!fs.existsSync(spec.dir)) continue
    const files = fs.readdirSync(spec.dir).filter(f => f.endsWith('.png'))
    const relDir = path.relative(path.join(INCOMING, 'source_unique'), spec.dir)
    
    console.log(`\n${relDir} (${files.length} files)` + (spec.cols ? ` → ${spec.cols} cells each` : ''))
    
    for (const f of files) {
      const fp = path.join(spec.dir, f)
      const meta = await sharp(fp).metadata()
      const ratio = (meta.width / meta.height).toFixed(2)
      console.log(`  ${f}: ${meta.width}×${meta.height} (${ratio}:1) ${Math.round(fs.statSync(fp).size/1024)}KB`)
      
      if (spec.cols) {
        const inferred = spec.cols
        console.log(`    → Likely ${inferred} individual sprites, ${Math.round(meta.width/inferred)}×${meta.height} each`)
      }
    }
  }

  return wideDirs
}

async function main() {
  await generateClassificationOverview()
  await matchSquareAssets()
  await analyzeWideImages()
}

main().catch(console.error)
