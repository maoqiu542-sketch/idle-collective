
/**
 * 角色商店系统类型定义
 * @module types/character-shop.types
 */

/** 角色品质 */
export enum CharacterQuality {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

/** 角色职业 */
export enum CharacterProfession {
  GATHERER = 'gatherer',
  BUILDER = 'builder',
  FARMER = 'farmer',
  WARRIOR = 'warrior',
  RESEARCHER = 'researcher'
}

/** 商店角色商品 */
export interface ShopCharacter {
  id: string
  slotId: number
  name: string
  profession: CharacterProfession
  quality: CharacterQuality
  baseStats: {
    strength: number
    agility: number
    intelligence: number
    endurance: number
  }
  skills: string[]
  price: number
  createdAt: number
  expiresAt: number
}

/** 商店槽位 */
export interface ShopSlot {
  id: number
  character: ShopCharacter | null
  unlocked: boolean
}

/** 商店配置 */
export interface CharacterShopConfig {
  autoRefreshInterval: number
  manualRefreshCost: number
  initialSlots: number
  maxSlots: number
  qualityWeights: Record<CharacterQuality, number>
  priceRanges: Record<CharacterQuality, { min: number; max: number }>
  expirationDays: number
}

/** 商店状态 */
export interface CharacterShopState {
  slots: ShopSlot[]
  lastRefreshTime: number
  lastManualRefreshTime: number
  totalPurchases: number
  totalSpent: number
}

/** 商店刷新结果 */
export interface ShopRefreshResult {
  success: boolean
  message?: string
  newCharacters?: ShopCharacter[]
}

/** 购买结果 */
export interface PurchaseResult {
  success: boolean
  message?: string
  character?: ShopCharacter
}
