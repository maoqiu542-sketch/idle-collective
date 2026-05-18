/**
 * CSV to JSON Config Sync Script
 * 将CSV配置表同步转换为JSON格式
 * 
 * 使用方法: node scripts/sync-config.js
 */

const fs = require('fs')
const path = require('path')

const CSV_DIR = path.join(__dirname, '../public/data/source/csv')
const JSON_DIR = path.join(__dirname, '../public/data')

function parseCSV(content) {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  
  return lines.slice(1).map(line => {
    const values = []
    let currentValue = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim())
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())
    
    const obj = {}
    headers.forEach((header, i) => {
      let value = values[i] || ''
      
      if (value === 'TRUE') value = true
      else if (value === 'FALSE') value = false
      else if (!isNaN(value) && value !== '') value = Number(value)
      
      obj[header] = value
    })
    return obj
  })
}

function syncGameConfig() {
  const csv = fs.readFileSync(path.join(CSV_DIR, 'game_settings.csv'), 'utf-8')
  const rows = parseCSV(csv)
  
  const config = {
    version: '1.0.0',
    map: {},
    character: {},
    economy: {},
    game: {}
  }
  
  rows.forEach(row => {
    if (row.category === 'map') {
      if (row.key.includes('_')) {
        const [parent, child] = row.key.split('_')
        config[parent] = config[parent] || {}
        config[parent][child] = row.value
      } else {
        config.map[row.key] = row.value
      }
    } else if (row.category === 'character') {
      if (row.key.includes('_')) {
        const [parent, child] = row.key.split('_')
        config.character = config.character || {}
        config.character[parent] = config.character[parent] || {}
        config.character[parent][child] = row.value
      } else if (row.key === 'maxCount') {
        config.character[row.key] = row.value
      } else if (row.key === 'moodDecayRate' || row.key === 'healthRegenRate') {
        config.character[row.key] = row.value
      }
    } else if (row.category === 'economy') {
      config.economy[row.key] = row.value
    } else if (row.category === 'game') {
      config.game[row.key] = row.value
    }
  })
  
  fs.writeFileSync(
    path.join(JSON_DIR, 'game-config.json'),
    JSON.stringify(config, null, 2)
  )
  console.log('✅ game-config.json synced')
}

function syncProfessions() {
  const csv = fs.readFileSync(path.join(CSV_DIR, 'professions.csv'), 'utf-8')
  const rows = parseCSV(csv)
  
  const professions = {}
  rows.forEach(row => {
    professions[row.type] = {
      type: row.type,
      name: row.name,
      description: row.description,
      bonusSkills: row.bonusSkills.split(',').map(s => s.trim()),
      baseEfficiency: row.baseEfficiency
    }
  })
  
  const talentsCsv = fs.readFileSync(path.join(CSV_DIR, 'talents.csv'), 'utf-8')
  const talentRows = parseCSV(talentsCsv)
  
  const talents = {}
  talentRows.forEach(row => {
    talents[row.type] = {
      name: row.name,
      maxLevel: row.maxLevel,
      expMultiplier: row.expMultiplier
    }
  })
  
  const expCsv = fs.readFileSync(path.join(CSV_DIR, 'exp_table.csv'), 'utf-8')
  const expRows = parseCSV(expCsv)
  const expTable = expRows.map(row => row.required_exp)
  
  const config = { professions, talents, expTable }
  
  fs.writeFileSync(
    path.join(JSON_DIR, 'character-config.json'),
    JSON.stringify(config, null, 2)
  )
  console.log('✅ character-config.json synced')
}

function syncBuildings() {
  const csv = fs.readFileSync(path.join(CSV_DIR, 'buildings.csv'), 'utf-8')
  const rows = parseCSV(csv)
  
  const buildings = {}
  rows.forEach(row => {
    buildings[row.type] = {
      type: row.type,
      name: row.name,
      description: row.description,
      size: { width: row.width, height: row.height },
      cost: { wood: row.cost_wood, stone: row.cost_stone }
    }
    if (row.capacity > 0) buildings[row.type].capacity = row.capacity
    if (row.efficiencyBonus > 0) buildings[row.type].efficiencyBonus = row.efficiencyBonus
  })
  
  fs.writeFileSync(
    path.join(JSON_DIR, 'building-config.json'),
    JSON.stringify({ buildings }, null, 2)
  )
  console.log('✅ building-config.json synced')
}

function syncTerrain() {
  const terrainCsv = fs.readFileSync(path.join(CSV_DIR, 'terrains.csv'), 'utf-8')
  const terrainRows = parseCSV(terrainCsv)
  
  const terrains = {}
  terrainRows.forEach(row => {
    terrains[row.type] = {
      type: row.type,
      name: row.name,
      color: row.color,
      passable: row.passable,
      movementCost: row.movementCost
    }
    if (row.resources) {
      terrains[row.type].resources = [row.resources]
    }
  })
  
  const resourceCsv = fs.readFileSync(path.join(CSV_DIR, 'resources.csv'), 'utf-8')
  const resourceRows = parseCSV(resourceCsv)
  
  const resources = {}
  resourceRows.forEach(row => {
    resources[row.type] = {
      type: row.type,
      name: row.name,
      baseAmount: row.baseAmount,
      respawnable: row.respawnable,
      respawnTime: row.respawnTime
    }
  })
  
  fs.writeFileSync(
    path.join(JSON_DIR, 'terrain-config.json'),
    JSON.stringify({ terrains, resources }, null, 2)
  )
  console.log('✅ terrain-config.json synced')
}

function syncProductionBuildings() {
  const csvPath = path.join(CSV_DIR, 'production_buildings.csv')
  if (!fs.existsSync(csvPath)) return
  
  const csv = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csv)
  
  const productionBuildings = {}
  rows.forEach(row => {
    productionBuildings[row.type] = {
      type: row.type,
      name: row.name,
      description: row.description,
      size: { width: row.width, height: row.height },
      cost: { 
        wood: row.cost_wood, 
        stone: row.cost_stone,
        gold: row.cost_gold 
      },
      buildTime: row.build_time,
      production: {
        interval: row.production_interval,
        type: row.production_type,
        amount: row.production_amount
      },
      workerSkill: row.worker_skill
    }
  })
  
  fs.writeFileSync(
    path.join(JSON_DIR, 'production-building-config.json'),
    JSON.stringify({ productionBuildings }, null, 2)
  )
  console.log('✅ production-building-config.json synced')
}

function syncEquipments() {
  const csvPath = path.join(CSV_DIR, 'equipments.csv')
  if (!fs.existsSync(csvPath)) return
  
  const csv = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csv)
  
  const equipments = {}
  rows.forEach(row => {
    equipments[row.id] = {
      id: row.id,
      name: row.name,
      type: row.type,
      quality: row.quality,
      stats: {
        atk: row.atk,
        def: row.def,
        hp: row.hp,
        critRate: row.crit_rate,
        critDmg: row.crit_dmg,
        atkSpd: row.atk_spd
      },
      price: {
        min: row.price_min,
        max: row.price_max
      }
    }
  })
  
  fs.writeFileSync(
    path.join(JSON_DIR, 'equipment-config.json'),
    JSON.stringify({ equipments }, null, 2)
  )
  console.log('✅ equipment-config.json synced')
}

function syncBosses() {
  const csvPath = path.join(CSV_DIR, 'bosses.csv')
  if (!fs.existsSync(csvPath)) return
  
  const csv = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csv)
  
  const bosses = {}
  rows.forEach(row => {
    bosses[row.id] = {
      id: row.id,
      name: row.name,
      level: row.level,
      stats: {
        hp: row.hp,
        atk: row.atk,
        def: row.def
      },
      drops: {
        qualityMin: row.drop_quality_min,
        qualityMax: row.drop_quality_max
      },
      rewards: {
        gold: row.gold_reward,
        exp: row.exp_reward
      }
    }
  })
  
  fs.writeFileSync(
    path.join(JSON_DIR, 'boss-config.json'),
    JSON.stringify({ bosses }, null, 2)
  )
  console.log('✅ boss-config.json synced')
}

function syncSixDimensions() {
  const csvPath = path.join(CSV_DIR, 'six_dimensions.csv')
  if (!fs.existsSync(csvPath)) return
  
  const csv = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csv)
  
  const sixDimensions = {}
  rows.forEach(row => {
    sixDimensions[row.id] = {
      id: row.id,
      name: row.name,
      baseValue: row.base_value,
      growthRate: row.growth_rate,
      expFormula: row.exp_formula
    }
  })
  
  fs.writeFileSync(
    path.join(JSON_DIR, 'six-dimension-config.json'),
    JSON.stringify({ sixDimensions }, null, 2)
  )
  console.log('✅ six-dimension-config.json synced')
}

console.log('🔄 Syncing CSV to JSON...')
syncGameConfig()
syncProfessions()
syncBuildings()
syncTerrain()
syncProductionBuildings()
syncEquipments()
syncBosses()
syncSixDimensions()
console.log('✅ All configs synced!')
