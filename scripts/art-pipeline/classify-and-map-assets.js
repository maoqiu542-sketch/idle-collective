const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const INCOMING = path.join(__dirname, '..', '..', 'art-pipeline', 'incoming')
const SOURCE_UNIQUE = path.join(INCOMING, 'source_unique')
const GAME_ASSETS = path.join(__dirname, '..', '..', 'public', 'textures')

const SIZES = [{ name: '128', w: 128, h: 128 }, { name: '64', w: 64, h: 64 }, { name: '32', w: 32, h: 32 }]

const CATALOG = {
  terrain: ['terrain_grass','terrain_grass_b','terrain_grass_c','terrain_grass_d','terrain_grass_e',
    'terrain_forest','terrain_forest_b','terrain_forest_c',
    'terrain_mountain','terrain_mountain_b','terrain_mountain_c',
    'terrain_water','terrain_water_b','terrain_water_c',
    'terrain_sand','terrain_sand_b','terrain_sand_c',
    'terrain_snow','terrain_snow_b','terrain_snow_c'],
  building_map: ['building_lumber_mill','building_quarry','building_farm','building_warehouse',
    'building_kitchen','building_house','building_trade_station','building_barracks',
    'building_recruitment_station','building_research_desk'],
  resource_node: ['resource_tree','resource_rock','resource_crop','resource_ore'],
  character_portrait: ['character_portrait_farmer','character_portrait_hunter','character_portrait_warrior',
    'character_portrait_engineer','character_portrait_cook','character_portrait_doctor','character_portrait_scholar'],
  boss_portrait: ['boss_portrait_01','boss_portrait_02','boss_portrait_03','boss_portrait_04','boss_portrait_05'],
  ui_icon_fallback: ['ui_resource_wood','ui_resource_stone','ui_resource_food','ui_resource_gold',
    'ui_resource_core_parts','ui_character_default','ui_boss_default','ui_profession_gatherer',
    'ui_profession_builder','ui_profession_farmer','ui_profession_warrior','ui_profession_researcher',
    'ui_building_default','ui_resource_default','ui_terrain_default']
}

async function getFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort()
}

async function computeFeatures(filePath) {
  const meta = await sharp(filePath).metadata()
  const stats = await sharp(filePath).removeAlpha().stats()
  const avg = stats.channels[0].mean

  const rawData = await sharp(filePath).removeAlpha().resize(32, 32, { fit: 'fill' }).raw().toBuffer()

  let minBright = 255, maxBright = 0, totalBright = 0
  const nPixels = rawData.length / 3
  for (let i = 0; i < rawData.length; i += 3) {
    const b = (rawData[i] + rawData[i + 1] + rawData[i + 2]) / 3
    totalBright += b
    if (b < minBright) minBright = b
    if (b > maxBright) maxBright = b
  }
  const meanBright = totalBright / nPixels

  let colorVar = 0
  for (let i = 0; i < rawData.length; i += 3) {
    const b = (rawData[i] + rawData[i + 1] + rawData[i + 2]) / 3
    colorVar += (b - meanBright) ** 2
  }
  const contrast = Math.sqrt(colorVar / nPixels)

  const edgeBuf = await sharp(filePath).removeAlpha().resize(32, 32, { fit: 'fill' })
    .convolve({ width: 3, height: 3, kernel: [-1,-1,-1,-1,8,-1,-1,-1,-1] }).raw().toBuffer()
  let edgeSum = 0
  for (let i = 0; i < edgeBuf.length; i++) edgeSum += Math.abs(edgeBuf[i] - 128)
  const edgeIntensity = edgeSum / edgeBuf.length

  return {
    width: meta.width, height: meta.height,
    meanBrightness: Math.round(meanBright),
    contrast: Math.round(contrast),
    edgeIntensity: Math.round(edgeIntensity * 10) / 10
  }
}

async function sliceSheet(srcPath, cols, outDir, prefix) {
  fs.mkdirSync(outDir, { recursive: true })
  const meta = await sharp(srcPath).metadata()
  const cellW = Math.floor(meta.width / cols)
  const cells = []
  for (let col = 0; col < cols; col++) {
    const cellPath = path.join(outDir, `${prefix}_c${col + 1}.png`)
    await sharp(srcPath).extract({ left: col * cellW, top: 0, width: cellW, height: meta.height }).png().toFile(cellPath)
    cells.push({ path: cellPath, col, w: cellW, h: meta.height })
  }
  return cells
}

async function exportSizes(srcPath, assetId, targetBase) {
  const assetDir = path.join(targetBase, assetId)
  fs.mkdirSync(assetDir, { recursive: true })
  for (const s of SIZES) {
    await sharp(srcPath).resize(s.w, s.h, { fit: 'cover' }).png()
      .toFile(path.join(assetDir, `${assetId}__${s.name}.png`))
  }
}

async function generateContactSheet(assetList, outPath, cols = 8) {
  const CELL = 136, PAD = 4, LABEL = 18
  const rows = Math.ceil(assetList.length / cols)
  const W = cols * CELL + PAD * 2
  const H = rows * (CELL + LABEL) + PAD * 2

  const composites = []
  for (let i = 0; i < assetList.length; i++) {
    const a = assetList[i]
    const row = Math.floor(i / cols)
    const col = i % cols
    const x = PAD + col * CELL + 4
    const y = PAD + row * (CELL + LABEL) + LABEL

    if (fs.existsSync(a.path)) {
      const thumbBuf = await sharp(a.path).resize(128, 128, { fit: 'cover' }).png().toBuffer()
      composites.push({ input: thumbBuf, top: y + 4, left: x + 4 })
    }

    const svgText = Buffer.from(
      `<svg width="${CELL - 8}" height="${LABEL}">
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)"/>
        <text x="${(CELL-8)/2}" y="${LABEL-5}" text-anchor="middle" fill="#ddd" font-size="8" font-family="monospace">${a.label}</text>
      </svg>`
    )
    composites.push({ input: svgText, top: y - LABEL + 4, left: x + 4 })
  }

  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 40, g: 40, b: 45, alpha: 1 } }
  }).composite(composites).png().toFile(outPath)

  return outPath
}

async function main() {
  console.log('=== Asset Organization: Visual Clustering & Mapping ===\n')

  const outputDir = path.join(INCOMING, 'organized')
  const sheetsDir = path.join(outputDir, 'contact_sheets')
  const slicedDir = path.join(outputDir, 'sliced_cells')
  fs.mkdirSync(sheetsDir, { recursive: true })

  const allAssets = []

  console.log('1. Processing square assets (1254x1254)...')
  const sqFiles = await getFiles(path.join(SOURCE_UNIQUE, 'square_1254'))
  for (let i = 0; i < sqFiles.length; i++) {
    const fp = path.join(SOURCE_UNIQUE, 'square_1254', sqFiles[i])
    const feats = await computeFeatures(fp)
    allAssets.push({
      id: `sq_${String(i + 1).padStart(3, '0')}`,
      path: fp, source: 'square', index: i,
      label: `SQ${String(i+1).padStart(3,'0')}`, ...feats
    })
    process.stdout.write('.')
  }
  console.log(`\n   ${sqFiles.length} square assets`)

  console.log('\n2. Slicing wide sprite sheets...')
  const w3Files = await getFiles(path.join(SOURCE_UNIQUE, 'wide_2172x724'))
  for (let i = 0; i < w3Files.length; i++) {
    const src = path.join(SOURCE_UNIQUE, 'wide_2172x724', w3Files[i])
    const prefix = `W3S${String(i+1).padStart(2,'0')}`
    const cells = await sliceSheet(src, 3, path.join(slicedDir, prefix), prefix)
    for (let c = 0; c < cells.length; c++) {
      const feats = await computeFeatures(cells[c].path)
      allAssets.push({
        id: `${prefix}C${c+1}`, path: cells[c].path, source: 'wide3',
        sheetIndex: i, cellIndex: c, label: `${prefix}C${c+1}`, ...feats
      })
    }
    process.stdout.write('.')
  }

  const w4Files = await getFiles(path.join(SOURCE_UNIQUE, 'wide_2508x627'))
  for (let i = 0; i < w4Files.length; i++) {
    const src = path.join(SOURCE_UNIQUE, 'wide_2508x627', w4Files[i])
    const prefix = `W4S${String(i+1).padStart(2,'0')}`
    const cells = await sliceSheet(src, 4, path.join(slicedDir, prefix), prefix)
    for (let c = 0; c < cells.length; c++) {
      const feats = await computeFeatures(cells[c].path)
      allAssets.push({
        id: `${prefix}C${c+1}`, path: cells[c].path, source: 'wide4',
        sheetIndex: i, cellIndex: c, label: `${prefix}C${c+1}`, ...feats
      })
    }
    process.stdout.write('.')
  }

  console.log(`\n   Total: ${allAssets.length} assets (${sqFiles.length} + ${w3Files.length*3} + ${w4Files.length*4})`)

  console.log('\n3. Clustering squares by brightness...')
  const squares = allAssets.filter(a => a.source === 'square').sort((a,b) => a.meanBrightness - b.meanBrightness)
  const bright = squares.filter(a => a.meanBrightness >= 190)
  const light = squares.filter(a => a.meanBrightness >= 170 && a.meanBrightness < 190)
  const mid = squares.filter(a => a.meanBrightness >= 140 && a.meanBrightness < 170)
  const dark = squares.filter(a => a.meanBrightness < 140)

  console.log(`   Bright(>=190): ${bright.length} | Light(170-189): ${light.length} | Mid(140-169): ${mid.length} | Dark(<140): ${dark.length}`)

  const w3all = allAssets.filter(a => a.source === 'wide3')
  const w4all = allAssets.filter(a => a.source === 'wide4')
  console.log(`   wide3 cells: ${w3all.length} | wide4 cells: ${w4all.length}`)

  console.log('\n4. Generating contact sheets...')
  const sheets = [
    { file: '01_bright_squares.png', assets: bright, label: 'Bright (>190)' },
    { file: '02_light_squares.png', assets: light, label: 'Light (170-189)' },
    { file: '03_mid_squares.png', assets: mid, label: 'Mid (140-169)' },
    { file: '04_dark_squares.png', assets: dark, label: 'Dark (<140)' },
    { file: '05_wide3_cells.png', assets: w3all, label: 'Wide 3-col cells' },
    { file: '06_wide4_cells.png', assets: w4all, label: 'Wide 4-col cells' },
  ]

  for (const s of sheets) {
    if (s.assets.length > 0) {
      await generateContactSheet(s.assets, path.join(sheetsDir, s.file), 
        s.file.includes('wide3') ? 6 : 8)
      console.log(`   ${s.file}: ${s.label} (${s.assets.length} images)`)
    }
  }

  console.log('\n5. Generating mapping template...')
  const rows = ['asset_label,visual_group,proposed_category,proposed_asset_id,meanBright,contrast,edgeIntensity']

  const terrainIds = [...CATALOG.terrain]
  const buildingIds = [...CATALOG.building_map]
  const resourceIds = [...CATALOG.resource_node]
  const charIds = [...CATALOG.character_portrait]
  const bossIds = [...CATALOG.boss_portrait]
  const uiIds = [...CATALOG.ui_icon_fallback]

  for (const a of bright) {
    const id = terrainIds.shift() || `extra_bright_${bright.indexOf(a)}`
    rows.push(`${a.label},bright,terrain,${id},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
  }

  const remainingTerrain = [...bright.map(() => null), ...light].length <= terrainIds.length + buildingIds.length ? 0 : 0

  for (const a of light) {
    if (terrainIds.length > 0) {
      rows.push(`${a.label},light,terrain,${terrainIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else if (buildingIds.length > 0) {
      rows.push(`${a.label},light,building_map,${buildingIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else {
      rows.push(`${a.label},light,uncategorized,unassigned_${light.indexOf(a)},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    }
  }

  for (const a of mid) {
    const idx = mid.indexOf(a)
    if (resourceIds.length > 0) {
      rows.push(`${a.label},mid,resource_node,${resourceIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else if (buildingIds.length > 0) {
      rows.push(`${a.label},mid,building_map,${buildingIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else if (charIds.length > 0) {
      rows.push(`${a.label},mid,character_portrait,${charIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else {
      rows.push(`${a.label},mid,uncategorized,unassigned_${idx},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    }
  }

  for (const a of dark) {
    const idx = dark.indexOf(a)
    if (bossIds.length > 0) {
      rows.push(`${a.label},dark,boss_portrait,${bossIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else if (charIds.length > 0) {
      rows.push(`${a.label},dark,character_portrait,${charIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else if (buildingIds.length > 0) {
      rows.push(`${a.label},dark,building_map,${buildingIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else {
      rows.push(`${a.label},dark,uncategorized,unassigned_${idx},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    }
  }

  for (const a of w3all) {
    const idx = w3all.indexOf(a)
    if (charIds.length > 0) {
      rows.push(`${a.label},wide3,character_portrait,${charIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else if (bossIds.length > 0) {
      rows.push(`${a.label},wide3,boss_portrait,${bossIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else if (buildingIds.length > 0) {
      rows.push(`${a.label},wide3,building_map,${buildingIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else {
      rows.push(`${a.label},wide3,uncategorized,unassigned_${idx},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    }
  }

  for (const a of w4all) {
    const idx = w4all.indexOf(a)
    if (uiIds.length > 0) {
      rows.push(`${a.label},wide4,ui_icon_fallback,${uiIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else if (buildingIds.length > 0) {
      rows.push(`${a.label},wide4,building_map,${buildingIds.shift()},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    } else {
      rows.push(`${a.label},wide4,uncategorized,unassigned_${idx},${a.meanBrightness},${a.contrast},${a.edgeIntensity}`)
    }
  }

  const csvPath = path.join(outputDir, 'mapping.csv')
  fs.writeFileSync(csvPath, '\ufeff' + rows.join('\n'), 'utf8')

  console.log(`   ${rows.length - 1} mapping entries`)
  console.log(`   Remaining unassigned catalog slots:`)
  console.log(`     terrain: ${terrainIds.length} (${terrainIds.join(', ')})`)
  console.log(`     building_map: ${buildingIds.length} (${buildingIds.join(', ')})`)
  console.log(`     resource_node: ${resourceIds.length} (${resourceIds.join(', ')})`)
  console.log(`     character_portrait: ${charIds.length} (${charIds.join(', ')})`)
  console.log(`     boss_portrait: ${bossIds.length} (${bossIds.join(', ')})`)
  console.log(`     ui_icon_fallback: ${uiIds.length} (${uiIds.join(', ')})`)

  console.log('\n6. Exporting all assets to 32/64/128 into textures (staged)...')
  const stagedBase = path.join(GAME_ASSETS, 'staged')
  fs.mkdirSync(stagedBase, { recursive: true })

  let exported = 0
  for (const row of rows.slice(1)) {
    const parts = row.split(',')
    const label = parts[0]
    const category = parts[2]
    const assetId = parts[3]

    if (category === 'uncategorized' || assetId.startsWith('unassigned')) continue

    const asset = allAssets.find(a => a.label === label)
    if (!asset) continue

    await exportSizes(asset.path, assetId, path.join(stagedBase, category))
    exported++
    process.stdout.write('.')
  }
  console.log(`\n   Exported ${exported} assets to textures/staged`)

  console.log('\n=== Complete ===')
  console.log(`Contact sheets: ${path.relative(process.cwd(), sheetsDir)}`)
  console.log(`Mapping CSV: ${path.relative(process.cwd(), csvPath)}`)
  console.log(`Staged assets: ${path.relative(process.cwd(), stagedBase)}`)
  console.log('\n⚠️  IMPORTANT: Review contact sheets to verify correctness.')
  console.log('Edit mapping.csv if needed, then re-run for final placement.')
}

main().catch(console.error)
