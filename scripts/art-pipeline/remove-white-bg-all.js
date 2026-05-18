const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const GAME_ASSETS = path.join(__dirname, '..', '..', 'public', 'textures')

async function hasWhiteBackground(filePath, threshold = 220) {
  try {
    const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true })
    const channels = info.channels || 4

    let whiteEdgeCount = 0
    let totalEdge = 0
    const step = Math.max(1, Math.floor(Math.max(info.width, info.height) / 30))

    for (let x = 0; x < info.width; x += step) {
      for (let y of [0, info.height - 1]) {
        const idx = (y * info.width + x) * channels
        totalEdge++
        if (channels >= 3 && data[idx] > threshold && data[idx+1] > threshold && data[idx+2] > threshold) {
          whiteEdgeCount++
        }
      }
    }
    for (let y = 0; y < info.height; y += step) {
      for (let x of [0, info.width - 1]) {
        const idx = (y * info.width + x) * channels
        if (channels >= 3 && data[idx] > threshold && data[idx+1] > threshold && data[idx+2] > threshold) {
          whiteEdgeCount++
        }
      }
    }

    return totalEdge > 0 && (whiteEdgeCount / totalEdge) > 0.5
  } catch { return false }
}

function removeWhiteBg(rawData, channels) {
  const out = Buffer.alloc(rawData.length)
  const tol = 35, thresh = 210
  for (let i = 0; i < rawData.length; i += channels) {
    const r = rawData[i], g = rawData[i+1], b = rawData[i+2]
    const a = channels >= 4 ? rawData[i+3] : 255
    const isWhite = r > thresh && g > thresh && b > thresh &&
      Math.abs(r-g) <= tol && Math.abs(g-b) <= tol && Math.abs(r-b) <= tol
    out[i] = r; out[i+1] = g; out[i+2] = b
    out[i+3] = (isWhite && a > 200) ? 0 : a
  }
  return out
}

async function processAsset(assetDir, id) {
  const src128 = path.join(assetDir, `${id}__128.png`)
  if (!fs.existsSync(src128)) return { ok: false, reason: 'no_128' }

  const isWhite = await hasWhiteBackground(src128)
  if (!isWhite) return { ok: true, skipped: true, reason: 'no_white_bg' }

  const { data, info } = await sharp(src128).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels || 4
  const cleaned = removeWhiteBg(data, ch)

  const baseImg = sharp(cleaned, { raw: { width: info.width, height: info.height, channels: 4 } })

  for (const s of [{n:'128',w:128},{n:'64',w:64},{n:'32',w:32}]) {
    await baseImg.clone().resize(s.w, s.h, { fit: 'cover' }).png()
      .toFile(path.join(assetDir, `${id}__${s.n}.png`))
  }

  return { ok: true, processed: true }
}

async function main() {
  console.log('=== Full White Background Scan & Remove ===\n')

  const categories = fs.readdirSync(GAME_ASSETS).filter(f => {
    const fp = path.join(GAME_ASSETS, f)
    return fs.statSync(fp).isDirectory() && f !== 'manifests'
  })

  let total = 0, processed = 0, skipped = 0, errors = 0
  const results = []

  for (const cat of categories) {
    const catDir = path.join(GAME_ASSETS, cat)
    const subdirs = fs.readdirSync(catDir).filter(s => {
      const sp = path.join(catDir, s)
      return fs.statSync(sp).isDirectory() && !s.includes('_frame') && !s.includes('_sheet')
    })

    for (const sub of subdirs) {
      total++
      try {
        const r = await processAsset(path.join(catDir, sub), sub)
        if (r.processed) { processed++; process.stdout.write('T') }
        else if (r.skipped) { skipped++; process.stdout.write('.') }
        else { errors++; process.stdout.write('x') }
        results.push({ cat, id: sub, ...r })
      } catch(e) {
        errors++; process.stdout.write('E')
        results.push({ cat, id: sub, ok: false, error: e.message })
      }
    }
  }

  console.log(`\n\nTotal: ${total} | Processed(white→transparent): ${processed} | Skipped(already OK): ${skipped} | Errors: ${errors}`)

  console.log('\n--- Processed Assets (white bg removed) ---')
  for (const r of results.filter(r => r.processed)) {
    console.log(`  ${r.cat}/${r.id}`)
  }

  console.log('\n--- Verification: random sample ---')
  const processedList = results.filter(r => r.processed)
  for (const r of processedList.slice(0, 8)) {
    const p = path.join(GAME_ASSETS, r.cat, r.id, `${r.id}__128.png`)
    const m = await sharp(p).metadata()
    console.log(`  ${r.id}: ${m.channels}ch alpha=${!!m.hasAlpha}`)
  }

  fs.writeFileSync(
    path.join(GAME_ASSETS, 'manifests', 'white-bg-removal-report.json'),
    JSON.stringify({ total, processed, skipped, errors, results }, null, 2)
  )
}

main().catch(console.error)
