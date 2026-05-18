import { ResourceType } from '@app-types/map.types'
import { TradeLastResult, TradeReserve } from '@app-types/settlement.types'
import {
  DEFAULT_TRADE_RESERVE,
  TRADE_BASE_CYCLE_CAP,
  TRADE_CYCLE_INTERVAL_MS,
  TRADE_RESOURCE_PRICES,
} from '@domain/settlement/EconomyBalance'

const TRADEABLE_RESOURCES: ResourceType[] = [
  ResourceType.WOOD,
  ResourceType.STONE,
  ResourceType.FOOD,
]

export {
  DEFAULT_TRADE_RESERVE,
  TRADE_BASE_CYCLE_CAP,
  TRADE_CYCLE_INTERVAL_MS,
  TRADE_RESOURCE_PRICES,
}

export function getTradeableResources(): ResourceType[] {
  return [...TRADEABLE_RESOURCES]
}

export function getTradeReserveValue(reserve: TradeReserve, type: ResourceType): number {
  switch (type) {
    case ResourceType.WOOD:
      return reserve.wood
    case ResourceType.STONE:
      return reserve.stone
    case ResourceType.FOOD:
      return reserve.food
    default:
      return 0
  }
}

export function createEmptyTradeResult(reason?: string): TradeLastResult {
  return {
    timestamp: Date.now(),
    sold: {},
    goldEarned: 0,
    reason,
  }
}

export interface TradeCycleInput {
  stationLevel: number
  currentResources: Partial<Record<ResourceType, number>>
  reserve: TradeReserve
  queuedBuffer: TradeReserve
  goldRemainder: number
}

export interface TradeCycleResult {
  sold: Partial<Record<ResourceType, number>>
  goldEarned: number
  goldRemainder: number
  reason?: string
}

export function resolveTradeCycle(input: TradeCycleInput): TradeCycleResult {
  let remainingCap = TRADE_BASE_CYCLE_CAP * input.stationLevel
  let totalGoldFloat = input.goldRemainder
  let blockedReason = ''
  const sold: Partial<Record<ResourceType, number>> = {}

  for (const resourceType of TRADEABLE_RESOURCES) {
    const current = input.currentResources[resourceType] || 0
    const reserve = getTradeReserveValue(input.reserve, resourceType)
    const buffer = getTradeReserveValue(input.queuedBuffer, resourceType)
    const sellable = Math.max(0, current - reserve - buffer)

    if (sellable <= 0) {
      if (!blockedReason && current <= reserve) {
        blockedReason = '资源已接近保留库存线'
      }
      continue
    }

    if (remainingCap <= 0) {
      blockedReason = '本轮贸易额度已用完'
      break
    }

    const soldAmount = Math.min(remainingCap, sellable)
    sold[resourceType] = soldAmount
    totalGoldFloat += soldAmount * TRADE_RESOURCE_PRICES[resourceType]
    remainingCap -= soldAmount
  }

  const goldEarned = Math.floor(totalGoldFloat)
  return {
    sold,
    goldEarned,
    goldRemainder: Number((totalGoldFloat - goldEarned).toFixed(2)),
    reason: Object.keys(sold).length > 0 ? undefined : (blockedReason || '当前资源都处于保留库存范围内'),
  }
}
