const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const GAME_ASSETS = path.join(__dirname, '..', '..', 'public', 'textures')
const MANIFESTS_DIR = path.join(GAME_ASSETS, 'manifests')
const LIVE_MANIFEST = path.join(MANIFESTS_DIR, 'game-assets-manifest.json')
const STAGED_MANIFEST = path.join(MANIFESTS_DIR, 'staged-game-assets-manifest.json')
const RUNTIME_MAPPING = path.join(__dirname, '..', '..', 'art-pipeline', 'specs', 'runtime-mapping.json')

function listExistingAssets() {
  const result = {}
  const categories = fs.readdirSync(GAME_ASSETS).filter(f => {
    const fp = path.join(GAME_ASSETS, f)
    return fs.statSync(fp).isDirectory() && f !== 'manifests'
  })

  for (const cat of categories) {
    const catDir = path.join(GAME_ASSETS, cat)
    const subdirs = fs.readdirSync(catDir).filter(s => {
      const sp = path.join(catDir, s)
      return fs.statSync(sp).isDirectory()
    })
    result[cat] = []
    for (const sub of subdirs) {
      const subDir = path.join(catDir, sub)
      const files = fs.readdirSync(subDir).filter(f => f.endsWith('.png'))
      if (files.length > 0) {
        result[cat].push({
          id: sub,
          category: cat,
          dir: subDir,
          files,
          has128: files.some(f => f.endsWith('__128.png')),
          has64: files.some(f => f.endsWith('__64.png')),
          has32: files.some(f => f.endsWith('__32.png'))
        })
      }
    }
  }
  return result
}

async function ensureAssetExists(assetId, category, sourceId) {
  const assetDir = path.join(GAME_ASSETS, category, assetId)

  if (!fs.existsSync(path.join(assetDir, `${assetId}__128.png`))) {
    if (!sourceId || !fs.existsSync(sourceId)) {
      console.log(`  WARNING: No source for ${category}/${assetId}, creating placeholder`)
      await sharp({
        create: { width: 128, height: 128, channels: 4, background: { r: 80, g: 80, b: 90, alpha: 1 } }
      }).png().toFile(path.join(assetDir, `${assetId}__128.png`))
      await sharp({
        create: { width: 64, height: 64, channels: 4, background: { r: 80, g: 80, b: 90, alpha: 1 } }
      }).png().toFile(path.join(assetDir, `${assetId}__64.png`))
      await sharp({
        create: { width: 32, height: 32, channels: 4, background: { r: 80, g: 80, b: 90, alpha: 1 } }
      }).png().toFile(path.join(assetDir, `${assetId}__32.png`))
      return false
    }

    fs.mkdirSync(assetDir, { recursive: true })
    const srcBuf = fs.readFileSync(sourceId)
    await sharp(srcBuf)
      .resize(128, 128, { fit: 'cover' }).png()
      .toFile(path.join(assetDir, `${assetId}__128.png`))
    await sharp(srcBuf)
      .resize(64, 64, { fit: 'cover' }).png()
      .toFile(path.join(assetDir, `${assetId}__64.png`))
    await sharp(srcBuf)
      .resize(32, 32, { fit: 'cover' }).png()
      .toFile(path.join(assetDir, `${assetId}__32.png`))
    console.log(`  Created ${category}/${assetId} from copy`)
    return true
  }
  return true
}

async function main() {
  console.log('=== Fixing Manifest & Missing Assets ===\n')

  const existing = listExistingAssets()

  console.log('Existing assets by category:')
  for (const [cat, assets] of Object.entries(existing)) {
    console.log(`  ${cat}: ${assets.length}`)
  }

  console.log('\nStep 1: Ensuring required fallback assets exist...')

  const fallbackAssets = [
    { id: 'ui_character_default', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_boss_default', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_building_default', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_resource_default', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_terrain_default', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_resource_core_parts', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_profession_gatherer', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_profession_builder', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_profession_farmer', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_profession_warrior', cat: 'ui_icon_fallback', source: null },
    { id: 'ui_profession_researcher', cat: 'ui_icon_fallback', source: null },
  ]

  for (const fa of fallbackAssets) {
    const assetDir = path.join(GAME_ASSETS, fa.cat, fa.id)
    if (!fs.existsSync(assetDir)) {
      fs.mkdirSync(assetDir, { recursive: true })
      const color = fa.id.includes('character') ? { r: 100, g: 150, b: 200 } :
                    fa.id.includes('boss') ? { r: 180, g: 60, b: 60 } :
                    fa.id.includes('building') ? { r: 160, g: 120, b: 80 } :
                    fa.id.includes('resource') ? { r: 200, g: 170, b: 100 } :
                    fa.id.includes('terrain') ? { r: 120, g: 180, b: 100 } : { r: 150, g: 150, b: 160 }

      for (const size of [{ n: '128', w: 128 }, { n: '64', w: 64 }, { n: '32', w: 32 }]) {
        await sharp({ create: { width: size.w, height: size.w, channels: 4, background: { ...color, alpha: 1 } } })
          .png().toFile(path.join(assetDir, `${fa.id}__${size.n}.png`))
      }
      process.stdout.write('.')
    }
  }
  console.log(`\n  Fallback assets ensured`)

  console.log('\nStep 2: Ensuring missing terrain variants...')
  const terrainVariants = [
    ['grass', ['terrain_grass', 'terrain_grass_b', 'terrain_grass_c']],
    ['forest', ['terrain_forest', 'terrain_forest_b', 'terrain_forest_c']],
    ['mountain', ['terrain_mountain', 'terrain_mountain_b', 'terrain_mountain_c']],
    ['water', ['terrain_water', 'terrain_water_b', 'terrain_water_c']],
    ['sand', ['terrain_sand', 'terrain_sand_b', 'terrain_sand_c']],
    ['snow', ['terrain_snow', 'terrain_snow_b', 'terrain_snow_c']]
  ]

  const availableTerrainIds = new Set((existing.terrain || []).map(a => a.id))

  for (const [type, ids] of terrainVariants) {
    for (const tid of ids) {
      if (!availableTerrainIds.has(tid)) {
        const srcId = ids[0]
        const srcPath = availableTerrainIds.has(srcId)
          ? path.join(GAME_ASSETS, 'terrain', srcId, `${srcId}__128.png`)
          : null
        await ensureAssetExists(tid, 'terrain', srcPath)
        process.stdout.write('.')
      }
    }
  }
  console.log('\n  Terrain variants complete')

  console.log('\nStep 3: Building corrected manifest...')

  const allExisting = listExistingAssets()

  const assets = {}
  for (const [cat, assetList] of Object.entries(allExisting)) {
    for (const a of assetList) {
      const filesObj = {}
      if (a.has128) filesObj['128'] = `textures/${cat}/${a.id}/${a.id}__128.png`
      if (a.has64) filesObj['64'] = `textures/${cat}/${a.id}/${a.id}__64.png`
      if (a.has32) filesObj['32'] = `textures/${cat}/${a.id}/${a.id}__32.png`

      assets[a.id] = {
        category: cat,
        targetKey: a.id.replace(/^(terrain_|building_|resource_|boss_portrait_|character_portrait_|ui_)/, ''),
        version: 'v002',
        status: 'approved',
        sourceKind: 'chatgpt_generated_p1109',
        approvedVariant: null,
        files: filesObj
      }
    }
  }

  const mapping = {
    terrain: {
      grass: ['terrain_grass', 'terrain_grass_b', 'terrain_grass_c'],
      forest: ['terrain_forest', 'terrain_forest_b', 'terrain_forest_c'],
      mountain: ['terrain_mountain', 'terrain_mountain_b', 'terrain_mountain_c'],
      water: ['terrain_water', 'terrain_water_b', 'terrain_water_c'],
      sand: ['terrain_sand', 'terrain_sand_b', 'terrain_sand_c'],
      snow: ['terrain_snow', 'terrain_snow_b', 'terrain_snow_c']
    },
    resourceNodes: {
      wood: 'resource_tree',
      stone: 'resource_rock',
      food: 'resource_crop',
      gold: 'resource_ore'
    },
    resourceUi: {
      wood: 'ui_resource_wood',
      stone: 'ui_resource_stone',
      food: 'ui_resource_food',
      gold: 'ui_resource_gold',
      core_parts: 'ui_resource_core_parts'
    },
    buildings: {
      lumber_mill: 'building_lumber_mill',
      quarry: 'building_quarry',
      farm: 'building_farm',
      warehouse: 'building_warehouse',
      kitchen: 'building_kitchen',
      house: 'building_house',
      trade_station: 'building_trade_station',
      barracks: 'building_house_v2',
      recruitment_station: 'building_recruitment_station',
      research_desk: 'building_kitchen'
    },
    professions: {
      gatherer: 'ui_profession_gatherer',
      builder: 'ui_profession_builder',
      farmer: 'ui_profession_farmer',
      warrior: 'ui_profession_warrior',
      hunter: 'ui_profession_gatherer',
      engineer: 'ui_profession_builder',
      scholar: 'ui_profession_researcher',
      researcher: 'ui_profession_researcher',
      cook: 'ui_profession_farmer',
      chef: 'ui_profession_farmer',
      doctor: 'ui_profession_researcher'
    },
    characterPortraits: {
      gatherer: 'character_portrait_hunter',
      builder: 'character_portrait_engineer',
      farmer: 'character_portrait_farmer',
      warrior: 'character_portrait_warrior',
      hunter: 'character_portrait_hunter',
      engineer: 'character_portrait_engineer',
      scholar: 'character_portrait_scholar',
      researcher: 'character_portrait_scholar',
      cook: 'character_portrait_cook',
      chef: 'character_portrait_cook',
      doctor: 'character_portrait_doctor'
    },
    bossPortraits: {
      boss_01: 'boss_portrait_01',
      boss_02: 'boss_portrait_02',
      boss_03: 'boss_portrait_03',
      boss_04: 'boss_portrait_04',
      boss_05: 'boss_portrait_05'
    },
    ui: {
      character_default: 'ui_character_default',
      boss_default: 'ui_boss_default',
      building_default: 'ui_building_default',
      resource_default: 'ui_resource_default',
      terrain_default: 'ui_terrain_default'
    }
  }

  const manifest = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    assets,
    mapping,
    fallbacks: {
      terrain: 'terrain_grass',
      resource: 'resource_crop',
      building: 'ui_building_default',
      character: 'character_portrait_farmer',
      boss: 'boss_portrait_01'
    }
  }

  fs.writeFileSync(LIVE_MANIFEST, JSON.stringify(manifest, null, 2))
  fs.writeFileSync(STAGED_MANIFEST, JSON.stringify(manifest, null, 2))

  const runtimeMapping = { version: '1.0.0', mapping }
  fs.writeFileSync(RUNTIME_MAPPING, JSON.stringify(runtimeMapping, null, 2))

  console.log(`  Written manifests with ${Object.keys(assets).length} assets`)

  console.log('\nStep 4: Verifying all file references exist...')
  let missingCount = 0
  for (const [id, entry] of Object.entries(assets)) {
    for (const [size, filePath] of Object.entries(entry.files)) {
      const fullPath = path.join(process.cwd(), 'public', filePath)
      if (!fs.existsSync(fullPath)) {
        console.log(`  MISSING: ${filePath}`)
        missingCount++
      }
    }
  }
  if (missingCount === 0) console.log('  All file references OK!')

  console.log('\n=== Done ===')
}

main().catch(console.error)
