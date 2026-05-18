import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '@core/EventBus'
import { CharacterShopManager } from '@domain/shop/CharacterShopManager'

describe('CharacterShopManager recruitment bonuses', () => {
  it('should expose recruitment station bonuses through state and slot count', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const manager = new CharacterShopManager(
      new EventBus(),
      () => 1000,
      () => true,
      () => {},
      () => 40,
      () => 30,
      () => true,
      () => true,
      () => ({
        stationLevel: 3,
        maxCandidates: 5,
        manualRefreshCost: 35,
        refreshIntervalMs: 20 * 60 * 1000,
        qualityBonus: 8,
      })
    )

    manager.init()

    const state = manager.getRecruitmentStationState()
    expect(state.stationLevel).toBe(3)
    expect(state.maxCandidates).toBe(5)
    expect(state.manualRefreshCost).toBe(35)
    expect(state.refreshIntervalMs).toBe(20 * 60 * 1000)
    expect(state.candidateCount).toBe(4)
    expect(manager.getAvailableCharacters()).toHaveLength(4)

    randomSpy.mockRestore()
  })
})
