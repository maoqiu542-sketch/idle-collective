/**
 * 建筑相关类型定义
 * @module types/building.types
 */

import { Position } from './map.types'
import { ResourceType } from './map.types'

/** 建筑类型 */
export enum BuildingType {
  WAREHOUSE = 'warehouse',
  WORKBENCH = 'workbench',
  KITCHEN = 'kitchen',
  HOUSE = 'house',
}

/** 建筑尺寸 */
export interface BuildingSize {
  width: number
  height: number
}

/** 建筑产出 */
export interface BuildingOutput {
  type: ResourceType
  amount: number
  interval: number
}

/** 建筑配置 */
export interface BuildingConfig {
  type: BuildingType
  name: string
  description: string
  size: BuildingSize
  cost: Partial<Record<ResourceType, number>>
  output?: BuildingOutput
  capacity?: number
  efficiencyBonus?: number
}

/** 建筑数据 */
export interface Building {
  id: string
  type: BuildingType
  position: Position
  size: BuildingSize
  level: number
  isActive: boolean
  lastOutputTime?: number
  createdAt: number
}
