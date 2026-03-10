/**
 * 装备相关类型定义
 * @module types/equipment.types
 */

/** 装备槽位 */
export enum EquipmentSlot {
  WEAPON = 'weapon',
  HELMET = 'helmet',
  ARMOR = 'armor',
  BOOTS = 'boots',
  ACCESSORY = 'accessory',
}

/** 装备品质 */
export enum EquipmentQuality {
  COMMON = 0,
  UNCOMMON = 1,
  RARE = 2,
  EPIC = 3,
  LEGENDARY = 4,
}

/** 装备属性 */
export interface EquipmentStats {
  atk?: number
  def?: number
  hp?: number
  critRate?: number
  critDmg?: number
  atkSpd?: number
}

/** 装备配置 */
export interface EquipmentConfig {
  id: string
  name: string
  slot: EquipmentSlot
  baseStats: EquipmentStats
  basePrice: number
}

/** 装备数据 */
export interface Equipment {
  id: string
  configId: string
  name: string
  slot: EquipmentSlot
  quality: EquipmentQuality
  level: number
  stats: EquipmentStats
  basePrice: number
  createdAt: number
}

/** 品质颜色 */
export const QUALITY_COLORS: Record<EquipmentQuality, string> = {
  [EquipmentQuality.COMMON]: '#FFFFFF',
  [EquipmentQuality.UNCOMMON]: '#1EFF00',
  [EquipmentQuality.RARE]: '#0070DD',
  [EquipmentQuality.EPIC]: '#A335EE',
  [EquipmentQuality.LEGENDARY]: '#FF8000',
}

/** 品质倍率 */
export const QUALITY_MULTIPLIERS: Record<EquipmentQuality, number> = {
  [EquipmentQuality.COMMON]: 1.0,
  [EquipmentQuality.UNCOMMON]: 1.15,
  [EquipmentQuality.RARE]: 1.3,
  [EquipmentQuality.EPIC]: 1.45,
  [EquipmentQuality.LEGENDARY]: 1.6,
}

/** 槽位类型列表 */
export const SLOT_TYPES: EquipmentSlot[] = [
  EquipmentSlot.WEAPON,
  EquipmentSlot.HELMET,
  EquipmentSlot.ARMOR,
  EquipmentSlot.BOOTS,
  EquipmentSlot.ACCESSORY,
  EquipmentSlot.ACCESSORY,
]
