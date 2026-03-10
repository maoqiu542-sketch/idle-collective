/**
 * 地图诊断脚本 - 分析地形和资源分布
 */

// 简化的SimplexNoise实现
class SimplexNoise {
  constructor() {
    this.perm = []
    this.gradP = []
    this.grad3 = [
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: -1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]
    this.seed(Date.now())
  }

  seed(seed) {
    const p = []
    for (let i = 0; i < 256; i++) {
      p[i] = i
    }

    let n = Math.abs(Math.floor(seed))
    if (n === 0) n = 1

    for (let i = 255; i > 0; i--) {
      n = (n * 16807) % 2147483647
      const j = Math.abs(n) % (i + 1)
      ;[p[i], p[j]] = [p[j], p[i]]
    }

    this.perm = [...p, ...p]
    this.gradP = []
    for (let i = 0; i < this.perm.length; i++) {
      this.gradP[i] = this.grad3[this.perm[i] % 8]
    }
  }

  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1)
    const G2 = (3 - Math.sqrt(3)) / 6

    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)

    const t = (i + j) * G2
    const X0 = i - t
    const Y0 = j - t
    const x0 = x - X0
    const y0 = y - Y0

    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1

    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2

    const ii = i & 255
    const jj = j & 255

    let n0 = 0, n1 = 0, n2 = 0

    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 >= 0) {
      const idx0 = ii + this.perm[jj]
      const gi0 = this.gradP[idx0]
      if (gi0) {
        t0 *= t0
        n0 = t0 * t0 * (gi0.x * x0 + gi0.y * y0)
      }
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 >= 0) {
      const idx1 = ii + i1 + this.perm[jj + j1]
      const gi1 = this.gradP[idx1]
      if (gi1) {
        t1 *= t1
        n1 = t1 * t1 * (gi1.x * x1 + gi1.y * y1)
      }
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 >= 0) {
      const idx2 = ii + 1 + this.perm[jj + 1]
      const gi2 = this.gradP[idx2]
      if (gi2) {
        t2 *= t2
        n2 = t2 * t2 * (gi2.x * x2 + gi2.y * y2)
      }
    }

    return 70 * (n0 + n1 + n2)
  }
}

// 地形类型
const TerrainType = {
  GRASS: 'grass',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
  SAND: 'sand',
  SNOW: 'snow',
}

// 资源类型
const ResourceType = {
  WOOD: 'wood',
  STONE: 'stone',
  FOOD: 'food',
  GOLD: 'gold',
}

// 地形判定（复制自MapSystem.ts）
function determineTerrain(noiseValue) {
  const normalized = noiseValue / 70
  if (normalized < -0.5) return TerrainType.WATER
  if (normalized < -0.2) return TerrainType.SAND
  if (normalized < 0.3) return TerrainType.GRASS
  if (normalized < 0.6) return TerrainType.FOREST
  if (normalized < 0.8) return TerrainType.MOUNTAIN
  return TerrainType.SNOW
}

// 资源生成（复制自MapSystem.ts）
function generateResource(terrain, x, y, noise) {
  const resourceNoise = noise.noise2D(x * 0.2 + 1000, y * 0.2 + 1000)
  const normalized = resourceNoise / 70

  if (normalized > -0.3) {
    let resourceType = undefined
    let maxAmount = 0

    switch (terrain) {
      case TerrainType.FOREST:
        resourceType = ResourceType.WOOD
        maxAmount = 50
        break
      case TerrainType.MOUNTAIN:
        resourceType = ResourceType.STONE
        maxAmount = 30
        break
      case TerrainType.GRASS:
        resourceType = ResourceType.FOOD
        maxAmount = 20
        break
      case TerrainType.SAND:
        resourceType = ResourceType.GOLD
        maxAmount = 10
        break
    }

    if (resourceType) {
      return {
        type: resourceType,
        amount: Math.floor(maxAmount * (0.5 + Math.abs(normalized) * 0.5)),
      }
    }
  }

  return undefined
}

// 生成地图并统计
function diagnoseMap(width = 100, height = 100) {
  console.log('='.repeat(70))
  console.log('地图诊断报告')
  console.log('='.repeat(70))
  console.log(`地图大小: ${width}x${height} (共${width * height}个格子)`)
  console.log('')

  const noise = new SimplexNoise()

  // 统计数据
  const terrainCount = {}
  const resourceCount = {}
  let totalTiles = 0
  let tilesWithResource = 0

  // 生成地图
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      totalTiles++

      // 生成地形
      const noiseValue = noise.noise2D(x * 0.1, y * 0.1)
      const terrain = determineTerrain(noiseValue)

      terrainCount[terrain] = (terrainCount[terrain] || 0) + 1

      // 生成资源
      const resource = generateResource(terrain, x, y, noise)
      if (resource) {
        tilesWithResource++
        resourceCount[resource.type] = (resourceCount[resource.type] || 0) + 1
      }
    }
  }

  // 输出地形统计
  console.log('【地形分布统计】')
  console.log('-'.repeat(70))
  Object.entries(terrainCount).forEach(([terrain, count]) => {
    const percentage = (count / totalTiles * 100).toFixed(2)
    const bar = '█'.repeat(Math.floor(percentage / 2))
    console.log(`${terrain.padEnd(10)} | ${count.toString().padStart(5)} (${percentage.padStart(6)}%) ${bar}`)
  })
  console.log('')

  // 输出资源统计
  console.log('【资源分布统计】')
  console.log('-'.repeat(70))
  console.log(`有资源的格子: ${tilesWithResource} / ${totalTiles} (${(tilesWithResource / totalTiles * 100).toFixed(2)}%)`)
  console.log('')
  Object.entries(resourceCount).forEach(([resource, count]) => {
    const percentage = (count / totalTiles * 100).toFixed(2)
    const percentageOfResource = (count / tilesWithResource * 100).toFixed(2)
    const bar = '█'.repeat(Math.floor(percentage / 2))
    console.log(`${resource.padEnd(10)} | ${count.toString().padStart(5)} (占总格子${percentage.padStart(6)}%, 占资源格${percentageOfResource.padStart(6)}%) ${bar}`)
  })
  console.log('')

  // 问题诊断
  console.log('【问题诊断】')
  console.log('-'.repeat(70))

  const grassPercentage = (terrainCount[TerrainType.GRASS] || 0) / totalTiles * 100
  const foodPercentage = (resourceCount[ResourceType.FOOD] || 0) / totalTiles * 100
  const resourcePercentage = tilesWithResource / totalTiles * 100

  if (grassPercentage > 40) {
    console.log(`⚠️  草地占比过高 (${grassPercentage.toFixed(2)}%)，建议调整地形生成阈值`)
  }

  if (foodPercentage > 20) {
    console.log(`⚠️  食物资源过多 (${foodPercentage.toFixed(2)}%)，可能导致"每格均为食物"的感觉`)
  }

  if (resourcePercentage > 50) {
    console.log(`⚠️  资源密度过高 (${resourcePercentage.toFixed(2)}%)，建议降低资源生成概率`)
  }

  const terrainVariety = Object.keys(terrainCount).length
  if (terrainVariety < 4) {
    console.log(`⚠️  地形多样性不足 (只有${terrainVariety}种地形)，建议调整噪声参数`)
  }

  console.log('')
  console.log('【建议】')
  console.log('-'.repeat(70))
  console.log('1. 调整地形生成阈值，增加森林和山地的占比')
  console.log('2. 降低资源生成概率（当前阈值 normalized > -0.3）')
  console.log('3. 实现资源聚集逻辑，而不是每个格子独立判断')
  console.log('4. 增加噪声频率或使用多层噪声，增加地形变化')
  console.log('')
  console.log('='.repeat(70))
}

// 运行诊断
diagnoseMap(100, 100)
