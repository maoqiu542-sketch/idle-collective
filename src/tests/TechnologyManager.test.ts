import { describe, expect, it } from 'vitest'
import { EventBus } from '@core/EventBus'
import { TechnologyManager } from '@domain/technology/TechnologyManager'

describe('TechnologyManager research output multiplier', () => {
  it('should scale station output with the provided building multiplier', () => {
    const manager = new TechnologyManager(
      new EventBus(),
      () => ({ intelligence: 20 }),
      () => 1.5
    )

    manager.init()
    const station = manager.getResearchStations()[0]
    expect(station).toBeDefined()

    manager.assignWorkerToStation(station.id, 'worker-1')
    manager.update(60 * 1000)

    expect(manager.getPoints()).toBeCloseTo(1.65)
    expect(manager.getAssignedWorkerCount()).toBe(1)
    expect(manager.getCurrentOutputMultiplier()).toBe(1.5)
  })

  it('should require a research desk before creating stations or starting research', () => {
    const manager = new TechnologyManager(
      new EventBus(),
      () => ({ intelligence: 20 }),
      () => 1,
      () => 0,
      () => false
    )

    manager.init()

    expect(manager.getResearchStations()).toHaveLength(0)
    expect(manager.startResearch('building_tech_1')).toEqual({
      success: false,
      message: '需要先建造并启用研究台。',
    })
  })
})
