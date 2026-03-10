/**
 * 地图相关类型定义
 * @module types/map.types
 */

/** 位置接口 */
export interface Position {
  x: number
  y: number
}

/** 地形类型 */
export enum TerrainType {
  GRASS = 'grass',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  WATER = 'water',
  SAND = 'sand',
  SNOW = 'snow',
}

/** 资源类型 */
export enum ResourceType {
  WOOD = 'wood',
  STONE = 'stone',
  FOOD = 'food',
  GOLD = 'gold',
  LEATHER = 'leather',
}

/** 资源节点 */
export interface ResourceNode {
  type: ResourceType
  amount: number
  maxAmount: number
  respawnable: boolean
  respawnTime?: number
}

/** 地图格子 */
export interface Tile {
  position: Position
  terrain: TerrainType
  resource?: ResourceNode
  building?: string
  isPassable: boolean
  movementCost: number
}

/** 地图数据 */
export interface MapData {
  width: number
  height: number
  tiles: Tile[][]
  seed?: number
}

/** 地形配置 */
export interface TerrainConfig {
  type: TerrainType
  name: string
  color: string
  isPassable: boolean
  movementCost: number
  resourceType?: ResourceType
}

/** 地图生成选项 */
export interface MapGenerationOptions {
  width: number
  height: number
  seed?: number
  defaultTerrain?: TerrainType
}
