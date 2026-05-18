import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '@core/EventBus'
import { CharacterShopManager } from '@domain/shop/CharacterShopManager'

describe('CharacterShopManager refresh candidate range', () => {
  it('should refresh between 2 and 4 candidates and respect the station cap', () => {
    const manager = new CharacterShopManager(
      new EventBus(),
      () => 999,
      () => true,
      () => {},
      () => 40,
      () => 50,
      () => true,
      () => true,
      () => ({
        maxCandidates: 6,
        manualRefreshCost: 50,
        refreshIntervalMs: 30 * 60 * 1000,
        qualityBonus: 0,
        stationLevel: 3,
      })
    )

    const lowRoll = vi.spyOn(Math, 'random').mockReturnValue(0)
    const lowResult = manager.refreshShop()
    expect(lowResult.newCharacters).toHaveLength(2)
    lowRoll.mockRestore()

    const highRoll = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const highResult = manager.refreshShop()
    expect(highResult.newCharacters).toHaveLength(4)
    highRoll.mockRestore()
  })
})
