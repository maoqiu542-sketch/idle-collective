import { CharacterQuality } from '@app-types/character-shop.types'
import { ResourceType } from '@app-types/map.types'
import { TradeReserve } from '@app-types/settlement.types'

export const DEFAULT_TRADE_RESERVE: TradeReserve = {
  wood: 120,
  stone: 80,
  food: 100,
}

export const TRADE_RESOURCE_PRICES: Record<ResourceType, number> = {
  [ResourceType.WOOD]: 1.0,
  [ResourceType.STONE]: 1.1,
  [ResourceType.FOOD]: 0.5,
  [ResourceType.GOLD]: 0,
  [ResourceType.CORE_PARTS]: 0,
}

export const TRADE_CYCLE_INTERVAL_MS = 20 * 1000
export const TRADE_BASE_CYCLE_CAP = 20

export const RECRUIT_MANUAL_REFRESH_COST = 50
export const RECRUIT_PRICE_RANGES: Record<CharacterQuality, { min: number; max: number }> = {
  [CharacterQuality.COMMON]: { min: 50, max: 100 },
  [CharacterQuality.RARE]: { min: 150, max: 300 },
  [CharacterQuality.EPIC]: { min: 400, max: 800 },
  [CharacterQuality.LEGENDARY]: { min: 1000, max: 2000 },
}

export const EQUIPMENT_INSTANT_REFRESH_COST = 100
export const EQUIPMENT_PRICE_RANGE = {
  min: 75,
  max: 4000,
}
