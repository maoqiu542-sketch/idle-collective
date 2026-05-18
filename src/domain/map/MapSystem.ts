import { SimplexNoise } from '@utils/noise'
import {
  MapData,
  Tile,
  TerrainType,
  ResourceType,
  Position,
} from '@app-types/map.types'
import { EventBus } from '@core/EventBus'

interface TerrainCluster {
  type: TerrainType
  center: Position
  coreRadius: number
  transitionRadius: number
}

interface ResourcePoint {
  type: ResourceType
  position: Position
  amount: number
  maxAmount: number
  respawnable: boolean
  respawnTime: number
}

const RESOURCE_POINT_TYPES: Record<string, { resource: ResourceType; terrain: TerrainType[]; icon: string; name: string }> = {
  tree: { resource: ResourceType.WOOD, terrain: [TerrainType.FOREST], icon: '🌲', name: '树木' },
  rock: { resource: ResourceType.STONE, terrain: [TerrainType.MOUNTAIN], icon: '🪨', name: '石头' },
  crop: { resource: ResourceType.FOOD, terrain: [TerrainType.GRASS, TerrainType.FOREST], icon: '🌾', name: '野生作物' },
  ore: { resource: ResourceType.GOLD, terrain: [TerrainType.MOUNTAIN, TerrainType.SAND], icon: '💎', name: '矿石' },
}

export class MapSystem {
  private mapData: MapData | null = null
  private noise: SimplexNoise
  private eventBus: EventBus
  private width: number
  private height: number
  private terrainClusters: TerrainCluster[] = []
  private resourcePoints: ResourcePoint[] = []

  constructor(eventBus: EventBus, width: number = 50, height: number = 50) {
    this.noise = new SimplexNoise(12345)
    this.eventBus = eventBus
    this.width = width
    this.height = height
  }

  generateMap(seed?: number): MapData {
    if (seed !== undefined) {
      this.noise.seed(seed)
    } else {
      this.noise.seed(12345)
    }

    const tiles: Tile[][] = []
    
    for (let y = 0; y < this.height; y++) {
      tiles[y] = []
      for (let x = 0; x < this.width; x++) {
        tiles[y][x] = this.generateTile(x, y)
      }
    }

    this.generateTerrainClusters()
    this.applyTerrainClusters(tiles)
    this.generateResourcePoints(tiles)

    this.mapData = {
      width: this.width,
      height: this.height,
      tiles,
      seed,
    }

    this.logTerrainStats(tiles)
    this.logResourceStats(tiles)

    this.eventBus.emit('map:generated', { width: this.width, height: this.height })
    return this.mapData
  }

  private generateTile(x: number, y: number): Tile {
    return {
      position: { x, y },
      terrain: TerrainType.GRASS,
      resource: undefined,
      isPassable: true,
      movementCost: 1,
    }
  }

  private generateTerrainClusters(): void {
    this.terrainClusters = []

    const clusterConfigs: { type: TerrainType; count: number; minCore: number; maxCore: number }[] = [
      { type: TerrainType.FOREST, count: 3, minCore: 4, maxCore: 7 },
      { type: TerrainType.MOUNTAIN, count: 2, minCore: 3, maxCore: 5 },
      { type: TerrainType.WATER, count: 2, minCore: 3, maxCore: 6 },
      { type: TerrainType.SAND, count: 1, minCore: 2, maxCore: 4 },
      { type: TerrainType.SNOW, count: 1, minCore: 2, maxCore: 3 },
    ]

    for (const config of clusterConfigs) {
      for (let i = 0; i < config.count; i++) {
        const centerX = 5 + Math.floor(Math.random() * (this.width - 10))
        const centerY = 5 + Math.floor(Math.random() * (this.height - 10))
        const coreRadius = config.minCore + Math.floor(Math.random() * (config.maxCore - config.minCore))
        const transitionRadius = coreRadius + 2 + Math.floor(Math.random() * 2)

        this.terrainClusters.push({
          type: config.type,
          center: { x: centerX, y: centerY },
          coreRadius,
          transitionRadius,
        })
      }
    }
  }

  private applyTerrainClusters(tiles: Tile[][]): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = tiles[y][x]
        let bestTerrain: TerrainType = TerrainType.GRASS
        let bestWeight = 0

        for (const cluster of this.terrainClusters) {
          const dist = Math.sqrt(
            Math.pow(x - cluster.center.x, 2) + 
            Math.pow(y - cluster.center.y, 2)
          )

          if (dist <= cluster.coreRadius) {
            bestTerrain = cluster.type
            bestWeight = 1.0
          } else if (dist <= cluster.transitionRadius) {
            const transitionWeight = 1 - (dist - cluster.coreRadius) / (cluster.transitionRadius - cluster.coreRadius)
            if (transitionWeight > bestWeight) {
              bestWeight = transitionWeight
              const noiseValue = this.noise.noise2D(x * 0.3, y * 0.3)
              if (noiseValue > 0) {
                bestTerrain = cluster.type
              }
            }
          }
        }

        tile.terrain = bestTerrain
        tile.isPassable = bestTerrain !== TerrainType.WATER
        tile.movementCost = this.getMovementCost(bestTerrain)
      }
    }
  }

  private generateResourcePoints(tiles: Tile[][]): void {
    this.resourcePoints = []
    const resourcePointConfigs: { type: string; count: number; minAmount: number; maxAmount: number }[] = [
      { type: 'tree', count: 15, minAmount: 500, maxAmount: 1000 },
      { type: 'rock', count: 10, minAmount: 300, maxAmount: 600 },
      { type: 'crop', count: 8, minAmount: 200, maxAmount: 400 },
      { type: 'ore', count: 5, minAmount: 100, maxAmount: 200 },
    ]

    for (const config of resourcePointConfigs) {
      const pointInfo = RESOURCE_POINT_TYPES[config.type]
      if (!pointInfo) continue

      let placed = 0
      let attempts = 0
      const maxAttempts = config.count * 10

      while (placed < config.count && attempts < maxAttempts) {
        attempts++
        const x = Math.floor(Math.random() * this.width)
        const y = Math.floor(Math.random() * this.height)
        const tile = tiles[y][x]

        if (!pointInfo.terrain.includes(tile.terrain)) continue
        if (tile.resource) continue

        const amount = config.minAmount + Math.floor(Math.random() * (config.maxAmount - config.minAmount))
        
        tile.resource = {
          type: pointInfo.resource,
          amount,
          maxAmount: amount,
          respawnable: true,
          respawnTime: 5 * 60 * 1000,
        }

        this.resourcePoints.push({
          type: pointInfo.resource,
          position: { x, y },
          amount,
          maxAmount: amount,
          respawnable: true,
          respawnTime: 5 * 60 * 1000,
        })

        placed++
      }
    }
  }

  private getMovementCost(terrain: TerrainType): number {
    const costs: Record<TerrainType, number> = {
      [TerrainType.GRASS]: 1,
      [TerrainType.FOREST]: 2,
      [TerrainType.MOUNTAIN]: 3,
      [TerrainType.WATER]: 999,
      [TerrainType.SAND]: 2,
      [TerrainType.SNOW]: 3,
    }
    return costs[terrain]
  }

  private logTerrainStats(tiles: Tile[][]): void {
    const stats: Record<TerrainType, number> = {
      [TerrainType.GRASS]: 0,
      [TerrainType.FOREST]: 0,
      [TerrainType.MOUNTAIN]: 0,
      [TerrainType.WATER]: 0,
      [TerrainType.SAND]: 0,
      [TerrainType.SNOW]: 0,
    }
    
    for (const row of tiles) {
      for (const tile of row) {
        stats[tile.terrain]++
      }
    }
    
    console.log('[MapSystem] 地形分布统计:')
    const total = this.width * this.height
    for (const [terrain, count] of Object.entries(stats)) {
      const percent = ((count / total) * 100).toFixed(1)
      console.log(`  ${terrain}: ${count} (${percent}%)`)
    }
  }

  private logResourceStats(tiles: Tile[][]): void {
    const stats: Record<ResourceType, number> = {
      [ResourceType.WOOD]: 0,
      [ResourceType.STONE]: 0,
      [ResourceType.FOOD]: 0,
      [ResourceType.GOLD]: 0,
      [ResourceType.CORE_PARTS]: 0,
    }
    
    let totalResources = 0
    for (const row of tiles) {
      for (const tile of row) {
        if (tile.resource) {
          stats[tile.resource.type]++
          totalResources++
        }
      }
    }
    
    console.log('[MapSystem] 资源点分布统计:')
    const total = this.width * this.height
    for (const [resource, count] of Object.entries(stats)) {
      const percent = ((count / total) * 100).toFixed(1)
      console.log(`  ${resource}: ${count}个资源点 (${percent}%)`)
    }
    console.log(`  总资源点: ${totalResources}个`)
  }

  getMapData(): MapData | null {
    return this.mapData
  }

  getWidth(): number {
    return this.width
  }

  getHeight(): number {
    return this.height
  }

  getTile(x: number, y: number): Tile | null {
    if (!this.mapData) return null
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null
    return this.mapData.tiles[y][x]
  }

  isPassable(x: number, y: number): boolean {
    const tile = this.getTile(x, y)
    return tile?.isPassable ?? false
  }

  harvestResource(x: number, y: number): { type: ResourceType; amount: number } | null {
    const tile = this.getTile(x, y)
    if (!tile || !tile.resource || tile.resource.amount <= 0) return null

    const harvestAmount = Math.min(5, tile.resource.amount)
    tile.resource.amount -= harvestAmount

    if (tile.resource.amount <= 0 && !tile.resource.respawnable) {
      tile.resource = undefined
    }

    return { type: tile.resource!.type, amount: harvestAmount }
  }

  canPlaceBuilding(x: number, y: number): boolean {
    const tile = this.getTile(x, y)
    if (!tile) return false
    if (!tile.isPassable) return false
    if (tile.resource) return false
    return true
  }

  placeBuilding(x: number, y: number): boolean {
    if (!this.canPlaceBuilding(x, y)) return false
    const tile = this.getTile(x, y)
    if (tile) {
      tile.isPassable = false
    }
    return true
  }

  removeBuilding(x: number, y: number): void {
    const tile = this.getTile(x, y)
    if (tile) {
      tile.isPassable = true
    }
  }

  findPath(start: Position, end: Position): Position[] {
    if (!this.mapData) return []

    const openSet: Position[] = [start]
    const closedSet: Set<string> = new Set()
    const cameFrom: Map<string, Position> = new Map()
    const gScore: Map<string, number> = new Map()
    const fScore: Map<string, number> = new Map()

    const key = (p: Position) => `${p.x},${p.y}`
    const heuristic = (a: Position, b: Position) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

    gScore.set(key(start), 0)
    fScore.set(key(start), heuristic(start, end))

    while (openSet.length > 0) {
      openSet.sort((a, b) => (fScore.get(key(a)) || Infinity) - (fScore.get(key(b)) || Infinity))
      const current = openSet.shift()!

      if (current.x === end.x && current.y === end.y) {
        const path: Position[] = [current]
        let curr = current
        while (cameFrom.has(key(curr))) {
          curr = cameFrom.get(key(curr))!
          path.unshift(curr)
        }
        return path
      }

      closedSet.add(key(current))

      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ]

      for (const neighbor of neighbors) {
        if (closedSet.has(key(neighbor))) continue
        if (!this.isPassable(neighbor.x, neighbor.y)) continue

        const tile = this.getTile(neighbor.x, neighbor.y)
        const tentativeG = (gScore.get(key(current)) || 0) + (tile?.movementCost || 1)

        if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor)
        } else if (tentativeG >= (gScore.get(key(neighbor)) || Infinity)) {
          continue
        }

        cameFrom.set(key(neighbor), current)
        gScore.set(key(neighbor), tentativeG)
        fScore.set(key(neighbor), tentativeG + heuristic(neighbor, end))
      }
    }

    return []
  }

  serialize(): { width: number; height: number; tiles: Tile[][]; seed?: number } | null {
    if (!this.mapData) return null
    return {
      width: this.mapData.width,
      height: this.mapData.height,
      tiles: this.mapData.tiles.map(row =>
        row.map(tile => ({
          position: { ...tile.position },
          terrain: tile.terrain,
          resource: tile.resource ? { ...tile.resource } : undefined,
          isPassable: tile.isPassable,
          movementCost: tile.movementCost,
        }))
      ),
      seed: this.mapData.seed,
    }
  }

  deserialize(data: { width: number; height: number; tiles: Tile[][]; seed?: number }): void {
    this.width = data.width
    this.height = data.height
    this.mapData = {
      width: data.width,
      height: data.height,
      tiles: data.tiles.map(row =>
        row.map(tile => ({
          position: { ...tile.position },
          terrain: tile.terrain,
          resource: tile.resource ? { ...tile.resource } : undefined,
          isPassable: tile.isPassable,
          movementCost: tile.movementCost,
        }))
      ),
      seed: data.seed,
    }
    this.eventBus.emit('map:loaded', { width: this.width, height: this.height })
  }
}
