const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const INCOMING = path.join(__dirname, '..', '..', 'art-pipeline', 'incoming')
const SOURCE_UNIQUE = path.join(INCOMING, 'source_unique')
const GAME_ASSETS = path.join(__dirname, '..', '..', 'public', 'textures')

const SIZES = [{ name: '128', w: 128, h: 128 }, { name: '64', w: 64, h: 64 }, { name: '32', w: 32, h: 32 }]

const SQUARE_MAP = [
  ['terrain_grass',        'terrain_water',       'terrain_water_b',     'terrain_water_c',
   'terrain_sand',         'terrain_sand_b',      'terrain_sand_c',      'terrain_snow'],
  ['terrain_snow_b',       'terrain_snow_c',      'building_house',      'building_lumber_mill',
   'building_quarry',      'building_farm',       'building_house_v2',   'building_warehouse'],
  ['building_trade_station','building_kitchen',    'building_house_v3',   'building_recruitment_station',
   'resource_wood',        'resource_stone',      'resource_food',       'resource_gold'],
  ['ui_gear_default',      'resource_tree',       'resource_rock',       'resource_crop',
   'resource_ore',         'resource_tree_b',     'resource_rock_b',     'resource_crop_b'],
  ['resource_rock_c',      'resource_tree_c',     'resource_rock_d',     'resource_crop_c',
   'resource_ore_b',       'ui_equipment_sword',  'ui_equipment_helmet', 'ui_equipment_armor'],
  ['ui_equipment_boots',   'ui_equipment_amulet', 'resource_tree_d',     'resource_rock_e',
   'resource_crop_d',      'resource_ore_c',      'ui_tool_axe',        'ui_tool_hammer'],
  ['resource_crop_e',      'ui_equipment_shield', 'ui_equipment_bow',    'ui_gear_wrench',
   'ui_item_pot',          'ui_item_herb',        'ui_item_book',        'ui_equipment_sword_b'],
  ['boss_portrait_01',     'boss_portrait_02',    'boss_portrait_03',    'boss_portrait_04',
   'boss_portrait_05',     'character_portrait_farmer','character_portrait_hunter','character_portrait_warrior'],
  ['character_portrait_engineer','character_portrait_cook','character_portrait_doctor','character_portrait_scholar']
]

const WIDE3_CHAR_MAP = [
  { sheetIdx: 0, charId: 'character_farmer' },
  { sheetIdx: 1, charId: 'character_hunter' },
  { sheetIdx: 2, charId: 'character_warrior' },
  { sheetIdx: 3, charId: 'character_engineer' },
  { sheetIdx: 4, charId: 'character_cook' },
  { sheetIdx: 5, charId: 'character_doctor' },
  { sheetIdx: 6, charId: 'character_scholar' },
  { sheetIdx: 7, charId: 'character_builder' },
  { sheetIdx: 8, charId: 'character_gatherer' },
  { sheetIdx: 9, charId: 'character_researcher' },
  { sheetIdx: 10, charId: 'boss_goblin' },
  { sheetIdx: 11, charId: 'boss_minotaur' }
]

const WIDE4_UI_MAP = [
  { sheetIdx: 0, uiSet: 'equipment_weapons' },
  { sheetIdx: 1, uiSet: 'equipment_armor' },
  { sheetIdx: 2, uiSet: 'resources_icons' },
  { sheetIdx: 3, uiSet: 'tools_icons' },
  { sheetIdx: 4, uiSet: 'items_consumables' },
  { sheetIdx: 5, uiSet: 'profession_icons' }
]

async function getFilesSorted(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort()
}

async function exportSizes(srcPath, assetId, targetBase) {
  const assetDir = path.join(targetBase, assetId)
  fs.mkdirSync(assetDir, { recursive: true })
  for (const s of SIZES) {
    await sharp(srcPath)
      .resize(s.w, s.h, { fit: 'cover' })
      .png()
      .toFile(path.join(assetDir, `${assetId}__${s.name}.png`))
  }
}

async function sliceAndExportWide(srcPath, cols, outBase, prefix, mappingInfo) {
  const meta = await sharp(srcPath).metadata()
  const cellW = Math.floor(meta.width / cols)
  const results = []

  for (let col = 0; col < cols; col++) {
    const cellBuf = await sharp(srcPath)
      .extract({ left: col * cellW, top: 0, width: cellW, height: meta.height })
      .png().toBuffer()

    const cellAssetId = `${prefix}_frame${col + 1}`
    await exportSizes(cellBuf, cellAssetId, outBase)

    results.push({
      id: cellAssetId,
      frameIndex: col,
      width: cellW,
      height: meta.height,
      ...mappingInfo
    })
  }

  const fullSheetId = `${prefix}_sheet`
  await exportSizes(srcPath, fullSheetId, outBase)

  return { cells: results, sheetId: fullSheetId }
}

async function main() {
  console.log('=== Final Integration: Visual-Mapped Asset Export ===\n')

  console.log('Step 1: Backing up current textures...')
  const backupPath = path.join(GAME_ASSETS, '..', 'backup_game_assets_pre_integration')
  if (fs.existsSync(GAME_ASSETS) && !fs.existsSync(backupPath)) {
    fs.cpSync(GAME_ASSETS, backupPath, { recursive: true })
    console.log(`  Backed up to backup_game_assets_pre_integration/`)
  } else {
    console.log('  Backup already exists')
  }

  console.log('\nStep 2: Processing square assets (68 items)...')
  const sqDir = path.join(SOURCE_UNIQUE, 'square_1254')
  const sqFiles = await getFilesSorted(sqDir)
  let exportedCount = 0
  const manifestEntries = {}

  for (let row = 0; row < SQUARE_MAP.length; row++) {
    for (let col = 0; col < SQUARE_MAP[row].length; col++) {
      const idx = row * 8 + col
      if (idx >= sqFiles.length) break

      const srcFile = path.join(sqDir, sqFiles[idx])
      const assetId = SQUARE_MAP[row][col]
      const category = categorizeAsset(assetId)

      await exportSizes(srcFile, assetId, path.join(GAME_ASSETS, category))

      manifestEntries[assetId] = {
        category,
        sourceFile: sqFiles[idx],
        sourceKind: 'chatgpt_square_p1109',
        version: 'v002',
        status: 'approved',
        gridPosition: `R${row+1}C${col+1}`,
        files: SIZES.map(s => ({
          size: s.name,
          path: `textures/${category}/${assetId}/${assetId}__${s.name}.png`
        }))
      }
      exportedCount++
      process.stdout.write('.')
    }
  }
  console.log(`\n  Exported ${exportedCount} square assets`)

  console.log('\nStep 3: Processing wide sprite sheets (3-col character sheets)...')
  const w3Dir = path.join(SOURCE_UNIQUE, 'wide_2172x724')
  const w3Files = await getFilesSorted(w3Dir)
  const charSpriteDir = path.join(GAME_ASSETS, 'character_sprites')

  for (let i = 0; i < w3Files.length; i++) {
    const srcPath = path.join(w3Dir, w3Files[i])
    const mapInfo = WIDE3_CHAR_MAP[i] || { sheetIdx: i, charId: `unknown_char_${i}` }
    const prefix = mapInfo.charId

    const result = await sliceAndExportWide(srcPath, 3, charSpriteDir, prefix, {
      type: 'character_sprite_sheet',
      charId: mapInfo.charId,
      sourceFile: w3Files[i],
      columns: 3
    })

    manifestEntries[result.sheetId] = {
      category: 'character_sprites',
      sourceFile: w3Files[i],
      sourceKind: 'chatgpt_wide3_p1109',
      version: 'v002',
      status: 'approved',
      sheetType: 'character_animation_3frame',
      frames: result.cells.map(c => c.id),
      files: SIZES.map(s => ({
        size: s.name,
        path: `textures/character_sprites/${result.sheetId}/${result.sheetId}__${s.name}.png`
      }))
    }

    process.stdout.write('.')
  }
  console.log(`\n  Processed ${w3Files.length} character sprite sheets`)

  console.log('\nStep 4: Processing wide sprite sheets (4-col UI sheets)...')
  const w4Dir = path.join(SOURCE_UNIQUE, 'wide_2508x627')
  const w4Files = await getFilesSorted(w4Dir)
  const uiSpriteDir = path.join(GAME_ASSETS, 'ui_sprite_sheets')

  for (let i = 0; i < w4Files.length; i++) {
    const srcPath = path.join(w4Dir, w4Files[i])
    const mapInfo = WIDE4_UI_MAP[i] || { sheetIdx: i, uiSet: `unknown_ui_${i}` }
    const prefix = mapInfo.uiSet

    const result = await sliceAndExportWide(srcPath, 4, uiSpriteDir, prefix, {
      type: 'ui_icon_sheet',
      uiSet: mapInfo.uiSet,
      sourceFile: w4Files[i],
      columns: 4
    })

    manifestEntries[result.sheetId] = {
      category: 'ui_sprite_sheets',
      sourceFile: w4Files[i],
      sourceKind: 'chatgpt_wide4_p1109',
      version: 'v002',
      status: 'approved',
      sheetType: 'ui_icon_4frame',
      frames: result.cells.map(c => c.id),
      files: SIZES.map(s => ({
        size: s.name,
        path: `textures/ui_sprite_sheets/${result.sheetId}/${result.sheetId}__${s.name}.png`
      }))
    }

    process.stdout.write('.')
  }
  console.log(`\n  Processed ${w4Files.length} UI icon sheets`)

  console.log('\nStep 5: Processing other assets (1536x1024 main screen)...')
  const otherDir = path.join(SOURCE_UNIQUE, 'other')
  const otherFiles = await getFilesSorted(otherDir)
  for (const f of otherFiles) {
    const srcPath = path.join(otherDir, f)
    await exportSizes(srcPath, 'ui_main_screen', path.join(GAME_ASSETS, 'ui_screens'))
    manifestEntries['ui_main_screen'] = {
      category: 'ui_screens',
      sourceFile: f,
      sourceKind: 'chatgpt_other_p1109',
      version: 'v002',
      status: 'approved'
    }
  }
  if (otherFiles.length > 0) console.log(`  Processed ${otherFiles.length} screen assets`)

  console.log('\nStep 6: Writing final manifest...')
  const manifest = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    integrationSource: 'ChatGPT generated 2026-05-06, visually classified by GLM-5V-Turbo 2026-05-07',
    totalAssets: Object.keys(manifestEntries).length,
    categories: {},
    assets: manifestEntries
  }

  for (const [id, info] of Object.entries(manifestEntries)) {
    const cat = info.category
    if (!manifest.categories[cat]) manifest.categories[cat] = []
    manifest.categories[cat].push(id)
  }

  const manifestDir = path.join(GAME_ASSETS, 'manifests')
  fs.mkdirSync(manifestDir, { recursive: true })
  fs.writeFileSync(path.join(manifestDir, 'assets-manifest-v2.json'), JSON.stringify(manifest, null, 2))

  console.log(`\n=== Integration Complete ===`)
  console.log(`Total assets: ${Object.keys(manifestEntries).length}`)
  for (const [cat, ids] of Object.entries(manifest.categories)) {
    console.log(`  ${cat}: ${ids.length}`)
  }
  console.log(`\nManifest: public/textures/manifests/assets-manifest-v2.json`)
  console.log(`Backup: public/backup_game_assets_pre_integration/`)

  console.log('\n--- Category Breakdown ---')
  console.log(`  terrain: ${SQUARE_MAP[0].length + SQUARE_MAP[1].slice(0,2).length} tiles`)
  console.log(`  building_map: ${SQUARE_MAP[1].slice(2).length + SQUARE_MAP[2].slice(0,4).length} buildings`)
  console.log(`  resource_node: 4 base types (+ variants in rows 4-7)`)
  console.log(`  boss_portrait: 5 bosses`)
  console.log(`  character_portrait: 7 characters`)
  console.log(`  ui_icon_fallback: ~20 icons/equipment/items`)
  console.log(`  character_sprites: ${w3Files.length} animation sheets`)
  console.log(`  ui_sprite_sheets: ${w4Files.length} UI icon sets`)
}

function categorizeAsset(assetId) {
  if (assetId.startsWith('terrain_')) return 'terrain'
  if (assetId.startsWith('building_')) return 'building_map'
  if (assetId.startsWith('resource_')) return 'resource_node'
  if (assetId.startsWith('boss_portrait_')) return 'boss_portrait'
  if (assetId.startsWith('character_portrait_')) return 'character_portrait'
  if (assetId.startsWith('ui_')) return 'ui_icon_fallback'
  return 'extras'
}

main().catch(console.error)
