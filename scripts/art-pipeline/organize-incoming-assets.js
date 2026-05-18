const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const crypto = require('crypto')

const SOURCE_DIR = 'D:\\GameDesign\\Projects\\资源包'
const TARGET_BASE = 'D:\\GameDesign\\Projects\\idle-collective\\art-pipeline\\incoming'

const CATEGORY_STRUCTURE = {
  terrain: {
    dir: 'terrain',
    subdirs: ['grass', 'forest', 'mountain', 'water', 'sand', 'snow']
  },
  building_map: {
    dir: 'building_map',
    subdirs: ['farm', 'house', 'kitchen', 'lumber_mill', 'quarry', 'warehouse', 'trade_station', 'barracks', 'recruitment_station', 'research_desk']
  },
  resource_node: {
    dir: 'resource_node',
    subdirs: ['tree', 'rock', 'crop', 'ore']
  },
  character_portrait: {
    dir: 'character_portrait',
    subdirs: ['farmer', 'hunter', 'warrior', 'engineer', 'cook', 'doctor', 'scholar']
  },
  boss_portrait: {
    dir: 'boss_portrait',
    subdirs: ['boss_01', 'boss_02', 'boss_03', 'boss_04', 'boss_05']
  },
  ui_icon: {
    dir: 'ui_icon',
    subdirs: ['wood', 'stone', 'food', 'gold', 'core_parts', 'character_default', 'boss_default', 'building_default', 'resource_default', 'terrain_default', 'gatherer', 'builder', 'farmer', 'warrior', 'researcher']
  },
  other: {
    dir: 'other',
    subdirs: []
  }
}

function createDirs() {
  const dirs = []
  for (const cat of Object.values(CATEGORY_STRUCTURE)) {
    const base = path.join(TARGET_BASE, cat.dir)
    dirs.push(base)
    for (const sub of cat.subdirs) {
      dirs.push(path.join(base, sub))
    }
  }
  dirs.push(path.join(TARGET_BASE, 'unclassified'))
  dirs.push(path.join(TARGET_BASE, 'wide_panels'))
  dirs.push(path.join(TARGET_BASE, 'duplicates'))
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true })
  }
  console.log(`Created ${dirs.length} directories`)
}

async function computeFingerprint(filePath) {
  const { data, info } = await sharp(filePath)
    .resize(32, 32, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const hash = crypto.createHash('md5').update(data).digest('hex')
  return { hash, width: info.width, height: info.height }
}

async function analyzeAll() {
  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'))
  const results = []

  for (const file of files) {
    const fullPath = path.join(SOURCE_DIR, file)
    const stat = fs.statSync(fullPath)
    const meta = await sharp(fullPath).metadata()
    const fp = await computeFingerprint(fullPath)

    results.push({
      originalName: file,
      path: fullPath,
      width: meta.width,
      height: meta.height,
      sizeKB: Math.round(stat.size / 1024),
      fingerprint: fp.hash
    })
    process.stdout.write('.')
  }

  return results
}

function groupByDimension(results) {
  const groups = {}
  for (const r of results) {
    const key = `${r.width}x${r.height}`
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  }
  return groups
}

function groupByFingerprint(results) {
  const groups = {}
  for (const r of results) {
    if (!groups[r.fingerprint]) groups[r.fingerprint] = []
    groups[r.fingerprint].push(r)
  }
  return groups
}

async function main() {
  console.log('Creating directory structure...')
  createDirs()

  console.log('\nAnalyzing 103 images...')
  const results = await analyzeAll()
  console.log(`\n\nTotal: ${results.length} files`)

  const dimGroups = groupByDimension(results)
  console.log('\n=== Dimension Groups ===')
  for (const [dim, items] of Object.entries(dimGroups)) {
    console.log(`  ${dim}: ${items.length} files`)
    const sizeRange = items.map(i => i.sizeKB)
    console.log(`    Size range: ${Math.min(...sizeRange)}KB - ${Math.max(...sizeRange)}KB`)
  }

  const fpGroups = groupByFingerprint(results)
  const uniquePrints = Object.keys(fpGroups).length
  console.log(`\n=== Fingerprint Analysis ===`)
  console.log(`  Unique fingerprints: ${uniquePrints}`)
  console.log(`  Duplicate groups: ${results.length - uniquePrints} duplicates`)

  const dupGroups = Object.entries(fpGroups).filter(([, items]) => items.length > 1)
  if (dupGroups.length > 0) {
    console.log(`\n  Duplicate groups found:`)
    for (const [hash, items] of dupGroups) {
      console.log(`    Fingerprint ${hash.slice(0, 8)}: ${items.length} copies`)
      for (const item of items) {
        console.log(`      - ${item.originalName} (${item.sizeKB}KB)`)
      }
    }
  }

  console.log('\n=== File Size Clusters (1254x1254) ===')
  const sq = dimGroups['1254x1254'] || []
  const sorted = [...sq].sort((a, b) => a.sizeKB - b.sizeKB)
  const clusters = []
  let currentCluster = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].sizeKB - currentCluster[currentCluster.length - 1].sizeKB < 50) {
      currentCluster.push(sorted[i])
    } else {
      clusters.push(currentCluster)
      currentCluster = [sorted[i]]
    }
  }
  clusters.push(currentCluster)

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]
    const sizes = c.map(x => x.sizeKB)
    console.log(`  Cluster ${i + 1}: ${c.length} files, ${Math.min(...sizes)}-${Math.max(...sizes)}KB`)
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalFiles: results.length,
    dimensionGroups: Object.fromEntries(
      Object.entries(dimGroups).map(([dim, items]) => [dim, items.length])
    ),
    uniqueFingerprints: uniquePrints,
    files: results.map(r => ({
      originalName: r.originalName,
      width: r.width,
      height: r.height,
      sizeKB: r.sizeKB,
      fingerprint: r.fingerprint.slice(0, 16)
    }))
  }

  const manifestPath = path.join(TARGET_BASE, 'analysis-manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\nManifest written to: ${manifestPath}`)

  console.log('\n=== Suggested Mapping (1254x1254 files by size clusters) ===')
  const assetCatalog = []
  const catDefs = require('../../art-pipeline/specs/asset-catalog.json')
  if (catDefs && catDefs.assets) {
    const byCategory = {}
    for (const a of catDefs.assets) {
      if (!byCategory[a.category]) byCategory[a.category] = []
      byCategory[a.category].push(a.asset_id)
    }
    for (const [cat, ids] of Object.entries(byCategory)) {
      console.log(`  ${cat}: ${ids.length} assets needed`)
      console.log(`    IDs: ${ids.join(', ')}`)
    }
  }
}

main().catch(console.error)
