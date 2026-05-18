/**
 * 角色相关类型定义
 * @module types/character.types
 */

import { Position } from './map.types'
import { SixDimensionStats } from './six-dimension.types'
import { EquipmentSlot } from './equipment.types'

/** 职业类型 */
export enum ProfessionType {
  FARMER = 'farmer',       // 农夫：食物生产
  HUNTER = 'hunter',       // 猎人：采集/狩猎资源
  WARRIOR = 'warrior',     // 战士：BOSS战主力输出
  ENGINEER = 'engineer',   // 工程师：建造建筑、制作装备
  COOK = 'cook',           // 厨师：加工食物、提升效益
  DOCTOR = 'doctor',       // 医生：战斗后回复角色
  SCHOLAR = 'scholar',     // 学者：研究科技（速度与天赋等级相关）
}

/** 技能类型 */
export enum SkillType {
  FARMING = 'farming',       // 农夫主技能
  HUNTING = 'hunting',       // 猎人主技能
  GATHERING = 'gathering',   // 猎人副技能
  COMBAT = 'combat',         // 战士主技能
  ENGINEERING = 'engineering', // 工程师主技能
  COOKING = 'cooking',       // 厨师主技能
  MEDICINE = 'medicine',     // 医生主技能
  RESEARCH = 'research',     // 学者主技能
  BUILDING = 'building',     // 工程师副技能
}

/** 角色状态 */
export enum CharacterState {
  IDLE = 'idle',
  MOVING = 'moving',
  WORKING = 'working',
  GATHERING = 'gathering',
  FARMING = 'farming',
  HUNTING = 'hunting',
  BUILDING = 'building',
  CRAFTING = 'crafting',
  COOKING = 'cooking',
  HEALING = 'healing',
  RESEARCHING = 'researching',
  RESTING = 'resting',
  EATING = 'eating',
  SLEEPING = 'sleeping',
  FIGHTING = 'fighting',
  SOCIALIZING = 'socializing',
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

/**
 * 角色需求 (与 NeedManager 中的 NeedType 对应)
 * 所有字段范围 0-100，值越低需求越紧迫
 */
export interface CharacterNeeds {
  hunger?: number    // HUNGER：饱腹感
  energy?: number    // REST：精力
  safety?: number    // SAFETY：安全感
  comfort?: number   // COMFORT：舒适度
  joy?: number       // JOY：快乐
  beauty?: number    // BEAUTY：美感
  outdoors?: number  // OUTDOORS：户外需求
  social?: number    // SOCIAL：社交需求
  privacy?: number   // PRIVACY：独处需求
  space?: number     // SPACE：空间需求
}

/** 角色性格 */
export interface CharacterPersonality {
  diligence: number
  extroversion: number
  bravery: number
}

/** 角色特殊天赋 */
export interface CharacterTrait {
  id: string
  name: string
  description: string
  /** 影响的技能，值为效率倍率 */
  skillBonus?: Partial<Record<SkillType, number>>
  /** 影响的属性 */
  statBonus?: Partial<CharacterStats>
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
  traits?: CharacterTrait[]
  preferences?: string[]      // 喜好列表
  sixDimensions?: SixDimensionStats
  talents: Map<SkillType, TalentLevel>
  skillPriorities: Map<SkillType, number>
  currentTask?: string
  inventory: InventoryItem[]
  equipmentSlots: EquipmentSlots
  createdAt: number
  /** 是否在BOSS战出战阵容中 */
  inBossTeam?: boolean
  /** 战后休养剩余时间(ms) */
  recoveryTimeRemaining?: number
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
