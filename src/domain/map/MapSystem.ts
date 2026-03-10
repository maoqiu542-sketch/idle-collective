/**
 * 地图系统 - 管理地图数据和地形
 * @module domain/map/MapSystem
 */

import { SimplexNoise } from '@utils/noise'
import {
  MapData,
  Tile,
  TerrainType,
  ResourceType,
  Position,
} from '@app-types/map.types'
import { EventBus } from '@core/EventBus'

interface ResourceCluster {
  type: ResourceType
  positions: Position[]
}

export class MapSystem {
  private mapData: MapData | null = null
  private noise: SimplexNoise
  private eventBus: EventBus
  private width: number
  private height: number
  private resourceClusters: ResourceCluster[] = []

  constructor(eventBus: EventBus, width: number = 100, height: number = 100) {
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

    this.generateResourceClusters()
    this.placeClusteredResources(tiles)

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
    const terrain = this.determineTerrain(x, y)
    
    return {
      position: { x, y },
      terrain,
      resource: undefined,
      isPassable: terrain !== TerrainType.WATER,
      movementCost: this.getMovementCost(terrain),
    }
  }

  private determineTerrain(x: number, y: number): TerrainType {
    const scale1 = 0.08
    const scale2 = 0.25
    const scale3 = 0.5

    const noise1 = this.noise.noise2D(x * scale1 + 1000, y * scale1 + 1000)
    const noise2 = this.noise.noise2D(x * scale2 + 2000, y * scale2 + 2000)
    const noise3 = this.noise.noise2D(x * scale3 + 3000, y * scale3 + 3000)

    const combined = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2

    if (combined < -0.5) return TerrainType.WATER
    if (combined < -0.2) return TerrainType.SAND
    if (combined < 0.3) return TerrainType.GRASS
    if (combined < 0.6) return TerrainType.FOREST
    if (combined < 0.8) return TerrainType.MOUNTAIN
    return TerrainType.SNOW
  }

  private generateResourceClusters(): void {
    this.resourceClusters = []

    const clusterCount = Math.max(5, Math.floor((this.width * this.height) / 80))

    for (let i = 0; i < clusterCount; i++) {
      const centerX = Math.floor(Math.random() * this.width)
      const centerY = Math.floor(Math.random() * this.height)
      const radius = 3 + Math.floor(Math.random() * 5)
      
      const random = Math.random() * 100

      let resourceType: ResourceType
      if (random < 15) {
        resourceType = ResourceType.GOLD
      } else if (random < 35) {
        resourceType = ResourceType.FOOD
      } else if (random < 65) {
        resourceType = ResourceType.WOOD
      } else {
        resourceType = ResourceType.STONE
      }
      
      const positions: Position[] = []
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = centerX + dx
          const py = centerY + dy
          
          if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist <= radius && Math.random() < 0.7) {
              positions.push({ x: px, y: py })
            }
          }
        }
      }
      
      if (positions.length > 0) {
        this.resourceClusters.push({ type: resourceType, positions })
      }
    }
  }

  private placeClusteredResources(tiles: Tile[][]): void {
    for (const cluster of this.resourceClusters) {
      let maxAmount = 0
      switch (cluster.type) {
        case ResourceType.WOOD: maxAmount = 50; break
        case ResourceType.STONE: maxAmount = 30; break
        case ResourceType.FOOD: maxAmount = 15; break
        case ResourceType.GOLD: maxAmount = 10; break
        case ResourceType.LEATHER: maxAmount = 8; break
      }
      
      for (const pos of cluster.positions) {
        const tile = tiles[pos.y][pos.x]
        
        if (tile.terrain === TerrainType.WATER) continue
        
        const isCompatible = this.isResourceTerrainCompatible(cluster.type, tile.terrain)

        if (isCompatible && Math.random() < 0.6) {
          tile.resource = {
            type: cluster.type,
            amount: Math.floor(maxAmount * (0.5 + Math.random() * 0.5)),
            maxAmount,
            respawnable: true,
            respawnTime: 5 * 60 * 1000,
          }
        }
      }
    }
  }

  private isResourceTerrainCompatible(resourceType: ResourceType, terrain: TerrainType): boolean {
    switch (resourceType) {
      case ResourceType.WOOD:
        return terrain === TerrainType.FOREST
      case ResourceType.STONE:
        return terrain === TerrainType.MOUNTAIN
      case ResourceType.FOOD:
        return terrain === TerrainType.GRASS
      case ResourceType.GOLD:
        return terrain === TerrainType.MOUNTAIN || terrain === TerrainType.SAND
      case ResourceType.LEATHER:
        return terrain === TerrainType.GRASS || terrain === TerrainType.FOREST
      default:
        return false
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
      [ResourceType.LEATHER]: 0,
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
    
    console.log('[MapSystem] 资源分布统计:')
    const total = this.width * this.height
    for (const [resource, count] of Object.entries(stats)) {
      const percent = ((count / total) * 100).toFixed(1)
      console.log(`  ${resource}: ${count} (${percent}%)`)
    }
    console.log(`  总资源格子: ${totalResources}/${total} (${((totalResources/total)*100).toFixed(1)}%)`)
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
    if (!tile) {
      console.log(`[MapSystem] harvestResource failed: tile not found at (${x}, ${y})`)
      return null
    }
    if (!tile.resource) {
      console.log(`[MapSystem] harvestResource failed: no resource at (${x}, ${y})`)
      return null
    }
    if (tile.resource.amount <= 0) {
      console.log(`[MapSystem] harvestResource failed: resource depleted at (${x}, ${y})`)
      return null
    }

    const harvestAmount = Math.min(5, tile.resource.amount)
    const resourceType = tile.resource.type
    const beforeAmount = tile.resource.amount
    tile.resource.amount -= harvestAmount

    console.log(`[MapSystem] Harvested ${harvestAmount} ${resourceType} at (${x}, ${y}), remaining: ${tile.resource.amount}/${beforeAmount}`)

    if (tile.resource.amount <= 0 && !tile.resource.respawnable) {
      tile.resource = undefined
    }

    return { type: resourceType, amount: harvestAmount }
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
}
