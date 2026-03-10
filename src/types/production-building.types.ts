/**
 * 生产建筑相关类型定义
 * @module types/production-building.types
 */

/** 生产建筑类型 */
export enum ProductionBuildingType {
  LUMBER_MILL = 'lumber_mill',
  QUARRY = 'quarry',
  RANCH = 'ranch',
}

/** 建筑状态 */
export enum BuildingStatus {
  PLANNED = 'planned',
  BUILDING = 'building',
  OPERATIONAL = 'operational',
  DAMAGED = 'damaged',
  DESTROYED = 'destroyed',
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
  productionInterval: number
  outputResource: string
  outputAmount: number
  workerSkill?: string
}

/** 生产建筑状态 */
export interface ProductionBuildingState {
  currentProduction: number
  productionProgress: number
  hasWorker: boolean
  workerId: string | null
  buildProgress: number
  isActive: boolean
}

/** 生产建筑数据 */
export interface ProductionBuilding {
  id: string
  configId: string
  type: ProductionBuildingType
  name: string
  position: { x: number; y: number }
  level: number
  status: BuildingStatus
  state: ProductionBuildingState
  createdAt: number
}

/** 建筑购买结果 */
export interface BuildingPurchaseResult {
  success: boolean
  message?: string
  buildingId?: string
}
