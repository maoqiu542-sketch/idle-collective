
/**
 * 建筑精华材料系统类型定义
 * @module types/building-essence.types
 */

/** Boss等级 */
export enum BossLevel {
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
  LEVEL_4 = 4,
  LEVEL_5 = 5
}

/** 建筑精华掉落配置 */
export interface EssenceDropConfig {
  bossLevel: BossLevel
  minDrop: number
  maxDrop: number
  firstTimeBonus: number
  cooldownMs: number
}

/** 建筑精华存储 */
export interface EssenceStorage {
  current: number
  maxCapacity: number
  totalEarned: number
  totalSpent: number
}

/** 建筑升级消耗配置 */
export interface BuildingUpgradeCost {
  fromLevel: number
  toLevel: number
  essenceCost: number
  baseResources: Record<string, number>
  techRequired?: string
}

/** Boss击败记录 */
export interface BossDefeatRecord {
  bossId: string
  bossLevel: BossLevel
  defeatedAt: number
  essenceEarned: number
  isFirstDefeat: boolean
}

/** 材料系统状态 */
export interface MaterialSystemState {
  essence: EssenceStorage
  defeatRecords: BossDefeatRecord[]
  lastDefeatByLevel: Map<BossLevel, number>
}

/** 掉落结果 */
export interface DropResult {
  success: boolean
  essenceAmount: number
  bonusAmount: number
  totalAmount: number
  isFirstDefeat: boolean
}

/** 升级结果 */
export interface UpgradeResult {
  success: boolean
  message?: string
  essenceSpent?: number
  newLevel?: number
}
