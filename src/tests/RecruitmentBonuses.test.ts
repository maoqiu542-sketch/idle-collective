import { describe, expect, it } from 'vitest'
import { EventBus } from '@core/EventBus'
import { CharacterShopManager } from '@domain/shop/CharacterShopManager'

describe('CharacterShopManager recruitment bonuses', () => {
  it('should expose slot and refresh bonuses from the recruitment station', () => {
    const manager = new CharacterShopManager(
      new EventBus(),
      () => 999,
      () => true,
      () => {},
      () => 20,
      () => 20,
      () => true,
      () => true,
      () => ({
        maxCandidates: 5,
        manualRefreshCost: 40,
        refreshIntervalMs: 30 * 60 * 1000,
        qualityBonus: 8,
        stationLevel: 3,
      })
    )

    manager.init()

    const summary = manager.getRecruitmentBonusesSummary()
    expect(summary.totalSlots).toBe(5)
    expect(summary.qualityBonus).toBe(8)
    expect(manager.getManualRefreshCost()).toBe(40)
    expect(manager.getAllSlots()).toHaveLength(5)
  })
})
