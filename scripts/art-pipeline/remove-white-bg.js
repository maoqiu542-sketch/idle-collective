const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const GAME_ASSETS = path.join(__dirname, '..', '..', 'public', 'textures')

const WHITE_BG_ASSETS = [
  { cat: 'character_portrait', id: 'character_portrait_cook' },
  { cat: 'character_portrait', id: 'character_portrait_doctor' },
  { cat: 'character_portrait', id: 'character_portrait_engineer' },
  { cat: 'character_portrait', id: 'character_portrait_farmer' },
  { cat: 'character_portrait', id: 'character_portrait_hunter' },
  { cat: 'character_portrait', id: 'character_portrait_scholar' },
  { cat: 'character_portrait', id: 'character_portrait_warrior' },
  { cat: 'boss_portrait', id: 'boss_portrait_01' },
  { cat: 'boss_portrait', id: 'boss_portrait_02' },
  { cat: 'boss_portrait', id: 'boss_portrait_03' },
  { cat: 'boss_portrait', id: 'boss_portrait_04' },
  { cat: 'boss_portrait', id: 'boss_portrait_05' },
  { cat: 'ui_icon_fallback', id: 'ui_boss_default' },
  { cat: 'ui_icon_fallback', id: 'ui_equipment_amulet' },
  { cat: 'ui_icon_fallback', id: 'ui_equipment_armor' },
  { cat: 'ui_icon_fallback', id: 'ui_equipment_boots' },
  { cat: 'ui_icon_fallback', id: 'ui_equipment_bow' },
  { cat: 'ui_icon_fallback', id: 'ui_equipment_helmet' },
  { cat: 'ui_icon_fallback', id: 'ui_equipment_shield' },
  { cat: 'ui_icon_fallback', id: 'ui_equipment_sword' },
  { cat: 'ui_icon_fallback', id: 'ui_equipment_sword_b' },
  { cat: 'ui_icon_fallback', id: 'ui_gear_default' },
  { cat: 'ui_icon_fallback', id: 'ui_gear_wrench' },
  { cat: 'ui_icon_fallback', id: 'ui_item_book' },
  { cat: 'ui_icon_fallback', id: 'ui_item_herb' },
  { cat: 'ui_icon_fallback', id: 'ui_item_pot' },
  { cat: 'ui_icon_fallback', id: 'ui_resource_default' },
  { cat: 'ui_icon_fallback', id: 'ui_resource_gold' },
  { cat: 'ui_icon_fallback', id: 'ui_terrain_default' },
  { cat: 'ui_icon_fallback', id: 'ui_tool_axe' },
  { cat: 'ui_icon_fallback', id: 'ui_tool_hammer' }
]

const SIZES = [
  { name: '128', w: 128, h: 128 },
  { name: '64', w: 64, h: 64 },
  { name: '32', w: 32, h: 32 }
]

function removeWhiteBackgroundRaw(rawData, width, height, channels) {
  const output = Buffer.alloc(rawData.length)
  const tolerance = 35
  const brightnessThreshold = 210

  for (let i = 0; i < rawData.length; i += channels) {
    const r = rawData[i]
    const g = rawData[i + 1]
    const b = rawData[i + 2]
    const a = channels >= 4 ? rawData[i + 3] : 255

    const isNearWhite =
      r > brightnessThreshold &&
      g > brightnessThreshold &&
      b > brightnessThreshold &&
      Math.abs(r - g) <= tolerance &&
      Math.abs(g - b) <= tolerance &&
      Math.abs(r - b) <= tolerance

    if (isNearWhite && a > 200) {
      output[i] = r
      output[i + 1] = g
      output[i + 2] = b
      output[i + 3] = 0
    } else {
      output[i] = r
      output[i + 1] = g
      output[i + 2] = b
      output[i + 3] = a
    }
  }

  return output
}

async function processAsset(cat, id) {
  const assetDir = path.join(GAME_ASSETS, cat, id)
  const src128 = path.join(assetDir, `${id}__128.png`)

  if (!fs.existsSync(src128)) {
    console.log(`  SKIP ${cat}/${id} - no __128.png`)
    return false
  }

  const { data, info } = await sharp(src128).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const channels = info.channels || 4

  const cleanedData = removeWhiteBackgroundRaw(data, info.width, info.height, channels)

  const cleanedBuffer = sharp(cleanedData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })

  for (const size of SIZES) {
    const outPath = path.join(assetDir, `${id}__${size.name}.png`)
    await cleanedBuffer.clone()
      .resize(size.w, size.h, { fit: 'cover' })
      .png()
      .toFile(outPath)
  }

  return true
}

async function main() {
  console.log('=== Removing White Backgrounds → Transparent ===\n')
  console.log(`Processing ${WHITE_BG_ASSETS.length} assets...\n`)

  let successCount = 0
  let failCount = 0

  for (const asset of WHITE_BG_ASSETS) {
    try {
      const ok = await processAsset(asset.cat, asset.id)
      if (ok) {
        successCount++
        process.stdout.write('.')
      } else {
        failCount++
        process.stdout.write('x')
      }
    } catch (e) {
      console.log(`\n  ERROR ${asset.cat}/${asset.id}: ${e.message}`)
      failCount++
    }
  }

  console.log(`\n\nDone: ${successCount} processed, ${failCount} failed`)

  console.log('\nVerifying transparency...')
  let verifiedTransparent = 0
  for (const asset of WHITE_BG_ASSETS.slice(0, 5)) {
    const src128 = path.join(GAME_ASSETS, asset.cat, asset.id, `${asset.assetId || asset.id}__128.png`)
    if (!fs.existsSync(src128)) continue

    const meta = await sharp(src128).metadata()
    const hasAlpha = meta.channels === 4 || meta.hasAlpha

    if (hasAlpha) {
      const { data } = await sharp(src128).ensureAlpha().raw().toBuffer()
      let transparentPixels = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 10) transparentPixels++
      }
      const pct = (transparentPixels / (data.length / 4) * 100).toFixed(1)
      console.log(`  ${asset.id}: alpha=${meta.channels}ch, transparent=${pct}%`)
      verifiedTransparent++
    }
  }

  console.log(`\n=== Complete ===`)
}

main().catch(console.error)
