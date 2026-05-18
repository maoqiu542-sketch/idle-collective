import { describe, expect, it } from 'vitest'
import { ResourceType } from '@app-types/map.types'
import { DEFAULT_TRADE_RESERVE, resolveTradeCycle } from '@domain/settlement/TradeEconomy'

describe('TradeEconomy', () => {
  it('should preserve reserve stock and only sell surplus resources', () => {
    const result = resolveTradeCycle({
      stationLevel: 1,
      currentResources: {
        [ResourceType.WOOD]: 150,
        [ResourceType.STONE]: 70,
        [ResourceType.FOOD]: 140,
      },
      reserve: { ...DEFAULT_TRADE_RESERVE },
      queuedBuffer: { wood: 0, stone: 0, food: 0 },
      goldRemainder: 0,
    })

    expect(result.sold[ResourceType.WOOD]).toBe(20)
    expect(result.sold[ResourceType.STONE]).toBeUndefined()
    expect(result.sold[ResourceType.FOOD]).toBeUndefined()
    expect(result.goldEarned).toBe(20)
  })

  it('should respect queued buffer and keep fractional gold remainder', () => {
    const result = resolveTradeCycle({
      stationLevel: 1,
      currentResources: {
        [ResourceType.WOOD]: 121,
        [ResourceType.STONE]: 100,
        [ResourceType.FOOD]: 120,
      },
      reserve: { ...DEFAULT_TRADE_RESERVE },
      queuedBuffer: { wood: 1, stone: 10, food: 5 },
      goldRemainder: 0,
    })

    expect(result.sold[ResourceType.WOOD]).toBeUndefined()
    expect(result.sold[ResourceType.STONE]).toBe(10)
    expect(result.sold[ResourceType.FOOD]).toBe(10)
    expect(result.goldEarned).toBe(16)
    expect(result.goldRemainder).toBe(0)
  })

  it('should report a clear reason when every resource is blocked by reserve lines', () => {
    const result = resolveTradeCycle({
      stationLevel: 1,
      currentResources: {
        [ResourceType.WOOD]: 110,
        [ResourceType.STONE]: 60,
        [ResourceType.FOOD]: 90,
      },
      reserve: { ...DEFAULT_TRADE_RESERVE },
      queuedBuffer: { wood: 0, stone: 0, food: 0 },
      goldRemainder: 0.6,
    })

    expect(result.goldEarned).toBe(0)
    expect(result.reason).toBeTruthy()
  })
})
