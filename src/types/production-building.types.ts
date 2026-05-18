/**
 * 生产建筑相关类型定义
 * @module types/production-building.types
 */

/** 生产建筑类型 */
export enum ProductionBuildingType {
  LUMBER_MILL = 'lumber_mill',
  QUARRY = 'quarry',
  RANCH = 'ranch',
  FARM = 'farm',
  FISHERY = 'fishery',
  APIARY = 'apiary',
  WAREHOUSE = 'warehouse',
  WORKBENCH = 'workbench',
  KITCHEN = 'kitchen',
  HOUSE = 'house',
  TAVERN = 'tavern',
  CLINIC = 'clinic',
  BARRACKS = 'barracks',
  TRADE_STATION = 'trade_station',
  WATCHTOWER = 'watchtower',
  WALL = 'wall',
  ARMORY = 'armory',
  TRAINING_FIELD = 'training_field',
  RESEARCH_DESK = 'research_desk',
  RECRUITMENT_STATION = 'recruitment_station',
  LIBRARY = 'library',
  LABORATORY = 'laboratory',
  OBSERVATORY = 'observatory',
  FOUNTAIN = 'fountain',
  STATUE = 'statue',
  POND = 'pond',
  ROCK_GARDEN = 'rock_garden',
  FLOWERBED = 'flowerbed',
  STREET_LAMP = 'street_lamp',
  BENCH = 'bench',
  FENCE = 'fence',
  WINDMILL = 'windmill',
  SCARECROW = 'scarecrow',
  WELL = 'well',
  BUSH = 'bush',
  TREE = 'tree',
  BANNER = 'banner',
  CART = 'cart',
  BARREL = 'barrel',
  CRATE = 'crate',
  SIGN = 'sign',
  BRIDGE = 'bridge',
  GATE = 'gate',
}

/** 建筑状态 */
export enum BuildingStatus {
  PLANNED = 'planned',
  BUILDING = 'building',
  OPERATIONAL = 'operational',
  DAMAGED = 'damaged',
  DESTROYED = 'destroyed',
}

/** 生产建筑运行时状态 */
export interface ProductionBuildingState {
  hasWorker: boolean
  workerId: string | null
  buildProgress: number
  isActive: boolean
  productionProgress: number
  currentProduction: number
}

/** 生产建筑实例 */
export interface ProductionBuilding {
  id: string
  configId: string
  type: ProductionBuildingType
  name: string
  position: { x: number; y: number }
  level: number
  status: BuildingStatus
  state: ProductionBuildingState
  builtAt?: number
  createdAt?: number
}

/** 生产建筑配置 */
export interface ProductionBuildingConfig {
  id: string
  type: ProductionBuildingType
  name: string
  description: string
  size: { width: number; height: number }
  cost: { wood: number; stone: number; gold: number }
  buildTime: number
  productionInterval?: number
  outputResource?: string
  outputAmount?: number
  production?: {
    interval?: number
    type?: string
    amount?: number
  }
  workerSkill?: string | null
  requiresTech?: string
}
