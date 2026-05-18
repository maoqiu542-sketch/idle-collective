const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const crypto = require('crypto')

const SOURCE_DIR = 'D:\\GameDesign\\Projects\\资源包'
const TARGET_BASE = path.join(__dirname, '..', '..', 'art-pipeline', 'incoming')
const EXPORT_BASE = path.join(__dirname, '..', '..', 'public', 'textures')

const EXPORT_SIZES = [
  { name: '128', width: 128, height: 128 },
  { name: '64', width: 64, height: 64 },
  { name: '32', width: 32, height: 32 }
]

async function computeFingerprint(filePath) {
  const { data } = await sharp(filePath)
    .resize(32, 32, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return crypto.createHash('md5').update(data).digest('hex')
}

async function deduplicateAndCopy() {
  console.log('=== Phase 1: Deduplication ===')
  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'))
  const seen = new Map()
  const uniqueFiles = []

  for (const file of files) {
    const fp = await computeFingerprint(path.join(SOURCE_DIR, file))
    if (!seen.has(fp)) {
      seen.set(fp, { file, copies: [file] })
      uniqueFiles.push({ file, fingerprint: fp })
    } else {
      seen.get(fp).copies.push(file)
    }
    process.stdout.write('.')
  }

  const duplicates = [...seen.values()].filter(g => g.copies.length > 1)
  console.log(`\nTotal: ${files.length} files, Unique: ${uniqueFiles.length}, Duplicate groups: ${duplicates.length}`)

  const dedupDir = path.join(TARGET_BASE, 'source_unique')
  fs.mkdirSync(dedupDir, { recursive: true })

  const squareDir = path.join(TARGET_BASE, 'source_unique', 'square_1254')
  const wide2172Dir = path.join(TARGET_BASE, 'source_unique', 'wide_2172x724')
  const wide2508Dir = path.join(TARGET_BASE, 'source_unique', 'wide_2508x627')
  const otherDir = path.join(TARGET_BASE, 'source_unique', 'other')

  for (const d of [squareDir, wide2172Dir, wide2508Dir, otherDir]) {
    fs.mkdirSync(d, { recursive: true })
  }

  const mapping = []
  for (const { file, fingerprint } of uniqueFiles) {
    const src = path.join(SOURCE_DIR, file)
    const meta = await sharp(src).metadata()
    let destDir
    if (meta.width === 1254 && meta.height === 1254) destDir = squareDir
    else if (meta.width === 2172 && meta.height === 724) destDir = wide2172Dir
    else if (meta.width === 2508 && meta.height === 627) destDir = wide2508Dir
    else destDir = otherDir

    const safeName = file.replace(/[^\w\-\.\(\)\u4e00-\u9fff]/g, '_')
    const dest = path.join(destDir, safeName)
    fs.copyFileSync(src, dest)

    mapping.push({
      original: file,
      fingerprint: fingerprint.slice(0, 16),
      width: meta.width,
      height: meta.height,
      destDir: path.relative(TARGET_BASE, destDir)
    })
  }

  fs.writeFileSync(
    path.join(TARGET_BASE, 'source_unique', 'mapping.json'),
    JSON.stringify(mapping, null, 2)
  )

  console.log(`Square (1254x1254): ${mapping.filter(m => m.width === 1254).length} files`)
  console.log(`Wide (2172x724): ${mapping.filter(m => m.width === 2172).length} files`)
  console.log(`Wide (2508x627): ${mapping.filter(m => m.width === 2508).length} files`)
  console.log(`Other: ${mapping.filter(m => m.width !== 1254 && m.width !== 2172 && m.width !== 2508).length} files`)

  return mapping
}

async function generatePreviews(mapping) {
  console.log('\n=== Phase 2: Generating Previews ===')
  const previewDir = path.join(TARGET_BASE, 'previews')
  fs.mkdirSync(previewDir, { recursive: true })

  const squareFiles = mapping.filter(m => m.width === 1254)
  for (let i = 0; i < squareFiles.length; i++) {
    const m = squareFiles[i]
    const src = path.join(TARGET_BASE, m.destDir, m.original.replace(/[^\w\-\.\(\)\u4e00-\u9fff]/g, '_'))
    const previewPath = path.join(previewDir, `sq_${String(i + 1).padStart(3, '0')}.png`)

    await sharp(src)
      .resize(128, 128, { fit: 'cover' })
      .png()
      .toFile(previewPath)

    m.previewFile = path.relative(TARGET_BASE, previewPath)
    m.sqIndex = i + 1
    process.stdout.write('.')
  }

  const wideFiles = mapping.filter(m => m.width === 2172 || m.width === 2508)
  for (let i = 0; i < wideFiles.length; i++) {
    const m = wideFiles[i]
    const src = path.join(TARGET_BASE, m.destDir, m.original.replace(/[^\w\-\.\(\)\u4e00-\u9fff]/g, '_'))
    const previewPath = path.join(previewDir, `wide_${String(i + 1).padStart(3, '0')}.png`)

    const targetH = 128
    const ratio = m.width / m.height
    const targetW = Math.round(targetH * ratio)

    await sharp(src)
      .resize(targetW, targetH, { fit: 'inside' })
      .png()
      .toFile(previewPath)

    m.previewFile = path.relative(TARGET_BASE, previewPath)
    m.wideIndex = i + 1
    process.stdout.write('.')
  }

  console.log(`\nGenerated ${squareFiles.length + wideFiles.length} previews`)

  fs.writeFileSync(
    path.join(TARGET_BASE, 'source_unique', 'mapping.json'),
    JSON.stringify(mapping, null, 2)
  )

  return mapping
}

async function generateContactSheets() {
  console.log('\n=== Phase 3: Generating Contact Sheets ===')
  const previewDir = path.join(TARGET_BASE, 'previews')
  const files = fs.readdirSync(previewDir).filter(f => f.startsWith('sq_'))

  const COLS = 8
  const CELL = 132
  const ROWS = Math.ceil(files.length / COLS)
  const W = COLS * CELL
  const H = ROWS * CELL

  const composites = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c
      if (idx < files.length) {
        composites.push({
          input: path.join(previewDir, files[idx]),
          top: r * CELL + 2,
          left: c * CELL + 2
        })
      }
    }
  }

  if (composites.length > 0) {
    await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 40, g: 40, b: 40, alpha: 1 } }
    })
      .composite(composites)
      .png()
      .toFile(path.join(TARGET_BASE, 'contact_sheet_square.png'))
    console.log(`Square contact sheet: ${COLS}×${ROWS} grid (${files.length} images)`)
  }

  const wideFiles = fs.readdirSync(previewDir).filter(f => f.startsWith('wide_'))
  if (wideFiles.length > 0) {
    const wideDir = path.join(TARGET_BASE, 'previews')
    const wideComposites = []
    let yOffset = 4
    for (const wf of wideFiles) {
      const meta = await sharp(path.join(wideDir, wf)).metadata()
      wideComposites.push({
        input: path.join(wideDir, wf),
        top: yOffset,
        left: 4
      })
      yOffset += meta.height + 4
    }

    await sharp({
      create: { width: 600, height: yOffset + 4, channels: 4, background: { r: 40, g: 40, b: 40, alpha: 1 } }
    })
      .composite(wideComposites)
      .png()
      .toFile(path.join(TARGET_BASE, 'contact_sheet_wide.png'))
    console.log(`Wide contact sheet: ${wideFiles.length} images`)
  }
}

async function exportMultiResolution(mapping) {
  console.log('\n=== Phase 4: Exporting Multi-Resolution ===')
  const expBase = path.join(TARGET_BASE, 'exported')

  for (const size of EXPORT_SIZES) {
    fs.mkdirSync(path.join(expBase, size.name), { recursive: true })
  }

  for (const m of mapping) {
    const src = path.join(TARGET_BASE, m.destDir, m.original.replace(/[^\w\-\.\(\)\u4e00-\u9fff]/g, '_'))
    const baseName = `asset_${String(m.sqIndex || m.wideIndex || 0).padStart(3, '0')}`

    for (const size of EXPORT_SIZES) {
      const fit = m.width === m.height ? 'cover' : 'inside'
      const outPath = path.join(expBase, size.name, `${baseName}__${size.name}.png`)

      await sharp(src)
        .resize(size.width, size.height, { fit })
        .png()
        .toFile(outPath)
    }
    process.stdout.write('.')
  }

  console.log(`\nExported ${mapping.length} assets × ${EXPORT_SIZES.length} sizes = ${mapping.length * EXPORT_SIZES.length} files`)
}

async function main() {
  console.log('=== Asset Organization Pipeline ===\n')

  const mapping = await deduplicateAndCopy()

  const enrichedMapping = await generatePreviews(mapping)

  await generateContactSheets()

  await exportMultiResolution(enrichedMapping)

  console.log('\n=== Pipeline Complete ===')
  console.log(`Output directory: ${TARGET_BASE}`)
  console.log(`- source_unique/: 87 deduplicated source images`)
  console.log(`- previews/: thumbnail previews`)
  console.log(`- contact_sheet_square.png: visual overview (square)`)
  console.log(`- contact_sheet_wide.png: visual overview (wide)`)
  console.log(`- exported/: 32/64/128 resolution exports`)
}

main().catch(console.error)
