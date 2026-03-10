/**
 * 存档相关类型定义
 * @module types/save.types
 */

import { Character } from './character.types'
import { ProductionBuilding } from './production-building.types'
import { Equipment } from './equipment.types'
import { ResourceType } from './map.types'

/** 存档元数据 */
export interface SaveMetadata {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  playTime: number
  version: string
  screenshot?: string
}

/** 存档数据 */
export interface SaveData {
  metadata: SaveMetadata
  game: {
    tick: number
    gameTime: number
    isPaused: boolean
  }
  characters: Character[]
  buildings: ProductionBuilding[]
  equipments: Equipment[]
  resources: [ResourceType, number][]
  settings: GameSettings
}

/** 游戏设置 */
export interface GameSettings {
  autoSaveInterval: number
  soundEnabled: boolean
  musicEnabled: boolean
  language: string
}

/** 存档槽位 */
export interface SaveSlot {
  index: number
  save: SaveMetadata | null
}

/** 存档结果 */
export interface SaveResult {
  success: boolean
  message?: string
  saveId?: string
}

/** 读档结果 */
export interface LoadResult {
  success: boolean
  message?: string
  data?: SaveData
}
