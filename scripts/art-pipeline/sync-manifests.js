const fs = require('fs')
const path = require('path')

const V2_MANIFEST_PATH = path.join(__dirname, '..', '..', 'public', 'textures', 'manifests', 'assets-manifest-v2.json')
const LIVE_MANIFEST_PATH = path.join(__dirname, '..', '..', 'public', 'textures', 'manifests', 'game-assets-manifest.json')
const STAGED_MANIFEST_PATH = path.join(__dirname, '..', '..', 'public', 'textures', 'manifests', 'staged-game-assets-manifest.json')
const RUNTIME_MAPPING_PATH = path.join(__dirname, '..', '..', 'art-pipeline', 'specs', 'runtime-mapping.json')

const v2 = JSON.parse(fs.readFileSync(V2_MANIFEST_PATH, 'utf-8'))

function convertFilesToObj(files) {
  if (!files) return {}
  const obj = {}
  if (Array.isArray(files)) {
    for (const f of files) {
      obj[f.size] = f.path
    }
  } else if (typeof files === 'object') {
    Object.assign(obj, files)
  }
  return obj
}

function buildLiveManifest() {
  const assets = {}
  const mapping = {
    terrain: {},
    resourceNodes: {},
    resourceUi: {},
    buildings: {},
    professions: {},
    characterPortraits: {},
    bossPortraits: {},
    ui: {}
  }

  for (const [id, info] of Object.entries(v2.assets)) {
    const cat = info.category

    let targetKey = id
    if (id.startsWith('terrain_')) {
      const base = id.replace(/^terrain_/, '')
      mapping.terrain[base] = [id]
      targetKey = base
    } else if (id.startsWith('building_')) {
      const base = id.replace(/^building_/, '')
      mapping.buildings[base] = id
      targetKey = base
    } else if (id.startsWith('resource_tree') || id.startsWith('resource_rock') || id.startsWith('resource_crop') || id.startsWith('resource_ore') || id === 'resource_wood' || id === 'resource_stone' || id === 'resource_food' || id === 'resource_gold') {
      const typeMap = { resource_wood: 'wood', resource_stone: 'stone', resource_food: 'food', resource_gold: 'gold', resource_tree: 'wood', resource_rock: 'stone', resource_crop: 'food', resource_ore: 'gold' }
      const rType = typeMap[id] || id.replace('resource_', '')
      if (!mapping.resourceNodes[rType]) mapping.resourceNodes[rType] = id
      targetKey = rType
    } else if (id.startsWith('ui_resource_')) {
      const uiType = id.replace('ui_resource_', '')
      mapping.resourceUi[uiType] = id
      targetKey = uiType
    } else if (id.startsWith('boss_portrait_')) {
      const bossId = id.replace('boss_portrait_', 'boss_')
      mapping.bossPortraits[bossId] = id
      targetKey = bossId
    } else if (id.startsWith('character_portrait_')) {
      const charType = id.replace('character_portrait_', '')
      mapping.characterPortraits[charType] = id
      targetKey = charType
    } else if (id.startsWith('ui_profession_')) {
      const prof = id.replace('ui_profession_', '')
      mapping.professions[prof] = id
      targetKey = prof
    } else if (id.startsWith('ui_equipment_') || id.startsWith('ui_tool_') || id.startsWith('ui_item_') || id.startsWith('ui_gear_')) {
      mapping.ui[id] = id
      targetKey = id
    }

    assets[id] = {
      category: cat,
      targetKey,
      version: info.version || 'v002',
      status: info.status || 'approved',
      sourceKind: info.sourceKind || 'chatgpt_generated',
      approvedVariant: null,
      files: convertFilesToObj(info.files)
    }
  }

  const terrainVariants = {}
  for (const [key, val] of Object.entries(mapping.terrain)) {
    if (!Array.isArray(val)) continue
    terrainVariants[key] = val
  }

  Object.assign(mapping.terrain, {
    grass: ['terrain_grass', 'terrain_grass_b', 'terrain_grass_c'],
    forest: ['terrain_forest', 'terrain_forest_b', 'terrain_forest_c'],
    mountain: ['terrain_mountain', 'terrain_mountain_b', 'terrain_mountain_c'],
    water: ['terrain_water', 'terrain_water_b', 'terrain_water_c'],
    sand: ['terrain_sand', 'terrain_sand_b', 'terrain_sand_c'],
    snow: ['terrain_snow', 'terrain_snow_b', 'terrain_snow_c']
  })

  mapping.resourceNodes = {
    wood: 'resource_tree',
    stone: 'resource_rock',
    food: 'resource_crop',
    gold: 'resource_ore'
  }

  mapping.resourceUi = {
    wood: 'ui_resource_wood',
    stone: 'ui_resource_stone',
    food: 'ui_resource_food',
    gold: 'ui_resource_gold',
    core_parts: 'ui_gear_default'
  }

  mapping.buildings = {
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
  }

  mapping.professions = {
    gatherer: 'character_portrait_hunter',
    builder: 'character_portrait_engineer',
    farmer: 'character_portrait_farmer',
    warrior: 'character_portrait_warrior',
    hunter: 'character_portrait_hunter',
    engineer: 'character_portrait_engineer',
    scholar: 'character_portrait_scholar',
    researcher: 'character_portrait_scholar',
    cook: 'character_portrait_cook',
    doctor: 'character_portrait_doctor'
  }

  mapping.characterPortraits = {
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
  }

  mapping.bossPortraits = {
    boss_01: 'boss_portrait_01',
    boss_02: 'boss_portrait_02',
    boss_03: 'boss_portrait_03',
    boss_04: 'boss_portrait_04',
    boss_05: 'boss_portrait_05'
  }

  mapping.ui = {
    character_default: 'character_portrait_farmer',
    boss_default: 'boss_portrait_01',
    building_default: 'building_house',
    resource_default: 'resource_crop',
    terrain_default: 'terrain_grass'
  }

  return {
    version: '2.0.0',
    generatedAt: v2.generatedAt,
    assets,
    mapping,
    fallbacks: {
      terrain: 'terrain_grass',
      resource: 'resource_crop',
      building: 'building_house',
      character: 'character_portrait_farmer',
      boss: 'boss_portrait_01'
    }
  }
}

function main() {
  console.log('=== Converting v2 manifest to project format ===\n')

  const liveManifest = buildLiveManifest()

  fs.writeFileSync(LIVE_MANIFEST_PATH, JSON.stringify(liveManifest, null, 2))
  console.log(`Written: ${path.relative(process.cwd(), LIVE_MANIFEST_PATH)}`)
  console.log(`  Assets: ${Object.keys(liveManifest.assets).length}`)

  fs.writeFileSync(STAGED_MANIFEST_PATH, JSON.stringify(liveManifest, null, 2))
  console.log(`Written: ${path.relative(process.cwd(), STAGED_MANIFEST_PATH)}`)

  const runtimeMapping = {
    version: '1.0.0',
    mapping: liveManifest.mapping
  }
  fs.writeFileSync(RUNTIME_MAPPING_PATH, JSON.stringify(runtimeMapping, null, 2))
  console.log(`Written: ${path.relative(process.cwd(), RUNTIME_MAPPING_PATH)}`)

  console.log('\n=== Manifest Summary ===')
  const cats = {}
  for (const [id, entry] of Object.entries(liveManifest.assets)) {
    const c = entry.category
    if (!cats[c]) cats[c] = []
    cats[c].push(id)
  }
  for (const [c, ids] of Object.entries(cats)) {
    console.log(`  ${c}: ${ids.length} assets`)
  }

  console.log('\nMapping coverage:')
  console.log(`  terrain types: ${Object.keys(liveManifest.mapping.terrain).length}`)
  console.log(`  resource nodes: ${Object.keys(liveManifest.mapping.resourceNodes).length}`)
  console.log(`  buildings: ${Object.keys(liveManifest.mapping.buildings).length}`)
  console.log(`  professions: ${Object.keys(liveManifest.mapping.professions).length}`)
  console.log(`  characters: ${Object.keys(liveManifest.mapping.characterPortraits).length}`)
  console.log(`  bosses: ${Object.keys(liveManifest.mapping.bossPortraits).length}`)
}

main()
