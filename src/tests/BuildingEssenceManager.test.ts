import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '@core/EventBus'
import { BuildingEssenceManager } from '@domain/building/BuildingEssenceManager'
import { BossLevel } from '@app-types/building-essence.types'

describe('BuildingEssenceManager', () => {
  let eventBus: EventBus
  let manager: BuildingEssenceManager
  let consumedResources: Record<string, number> | null

  beforeEach(() => {
    eventBus = new EventBus()
    consumedResources = null
    manager = new BuildingEssenceManager(
      eventBus,
      () => true,
      (resources) => {
        consumedResources = resources
        return true
      }
    )
  })

  it('should drop core growth material from boss defeat and include the first-clear bonus', () => {
    const earned: number[] = []
    eventBus.on('essence:earned', event => earned.push(event.amount))

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const result = manager.onBossDefeated('boss-1', BossLevel.LEVEL_1)

    expect(result.success).toBe(true)
    expect(result.totalAmount).toBe(10)
    expect(earned).toEqual([10])
    randomSpy.mockRestore()
  })

  it('should not repeat the first-clear bonus for the same boss', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    const first = manager.onBossDefeated('boss-1', BossLevel.LEVEL_1)
    const second = manager.onBossDefeated('boss-1', BossLevel.LEVEL_1)

    expect(first.totalAmount).toBe(10)
    expect(second.totalAmount).toBe(5)

    randomSpy.mockRestore()
  })

  it('should spend essence and resources when upgrading buildings', () => {
    manager.addEssence(100)

    const result = manager.upgradeBuilding(1)

    expect(result.success).toBe(true)
    expect(result.essenceSpent).toBe(10)
    expect(result.newLevel).toBe(2)
    expect(consumedResources).toEqual({ wood: 20, stone: 10 })
  })

  it('should reject upgrades without enough essence', () => {
    const result = manager.upgradeBuilding(1)

    expect(result.success).toBe(false)
    expect(result.message).toContain('核心零件不足')
  })

  it('should allow storage capacity sync from buildings', () => {
    manager.setStorageCapacity(800)

    expect(manager.getStorageCapacity()).toEqual({ current: 0, max: 800 })
  })
})
