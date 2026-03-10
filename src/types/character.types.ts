/**
 * 角色相关类型定义
 * @module types/character.types
 */

import { Position } from './map.types'
import { SixDimensionStats } from './six-dimension.types'
import { EquipmentSlot } from './equipment.types'

/** 职业类型 */
export enum ProfessionType {
  GATHERER = 'gatherer',
  BUILDER = 'builder',
  FARMER = 'farmer',
  WARRIOR = 'warrior',
}

/** 技能类型 */
export enum SkillType {
  GATHERING = 'gathering',
  MINING = 'mining',
  BUILDING = 'building',
  COOKING = 'cooking',
  COMBAT = 'combat',
}

/** 角色状态 */
export enum CharacterState {
  IDLE = 'idle',
  MOVING = 'moving',
  WORKING = 'working',
  RESTING = 'resting',
  EATING = 'eating',
}

/** 天赋等级 */
export interface TalentLevel {
  level: number
  experience: number
  experienceToNext: number
}

/** 角色属性 */
export interface CharacterStats {
  health: number
  maxHealth: number
  mood: number
  maxMood: number
  speed?: number
  gatheringSpeed?: number
  buildSpeed?: number
  craftSpeed?: number
  workEfficiency?: number
}

/** 角色需求 */
export interface CharacterNeeds {
  hunger?: number
  energy?: number
  social?: number
  comfort?: number
  joy?: number
}

/** 角色性格 */
export interface CharacterPersonality {
  diligence: number
  extroversion: number
  bravery: number
}

/** 背包物品 */
export interface InventoryItem {
  type: string
  amount: number
}

/** 装备槽位映射 */
export type EquipmentSlots = {
  [key in EquipmentSlot]?: string
}

/** 角色数据 */
export interface Character {
  id: string
  name: string
  profession: ProfessionType
  position: Position
  state: CharacterState
  stats: CharacterStats
  needs?: CharacterNeeds
  personality?: CharacterPersonality
  sixDimensions?: SixDimensionStats
  talents: Map<SkillType, TalentLevel>
  currentTask?: string
  inventory: InventoryItem[]
  equipmentSlots: EquipmentSlots
  createdAt: number
}

/** 角色配置 */
export interface CharacterConfig {
  profession?: ProfessionType
  name: string
  position: Position
  baseStats?: CharacterStats
  talents?: Map<SkillType, number>
}

/** 职业配置 */
export interface ProfessionConfig {
  type: ProfessionType
  name: string
  description: string
  primarySkills: SkillType[]
  baseStats: CharacterStats
}
