import { describe, expect, it } from 'vitest'
import { EventBus } from '@core/EventBus'
import { ProductionBuildingManager } from '@domain/building/ProductionBuildingManager'
import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import { ResourceType } from '@app-types/map.types'

describe('ProductionBuildingManager', () => {
  it('should require a worker to finish construction and increase output when staffed', () => {
    const eventBus = new EventBus()
    const manager = new ProductionBuildingManager(eventBus, undefined, () => 1.5)
    const producedEvents: Array<{ buildingId: string; resource: ResourceType; amount: number }> = []

    eventBus.on('building:produced', event => {
      producedEvents.push(event)
    })

    manager.loadConfigs([
      {
        id: ProductionBuildingType.LUMBER_MILL,
        type: ProductionBuildingType.LUMBER_MILL,
        name: '伐木场',
        description: '测试配置',
        size: { width: 2, height: 2 },
        cost: { wood: 10, stone: 5, gold: 0 },
        buildTime: 1000,
        productionInterval: 1000,
        outputResource: ResourceType.WOOD,
        outputAmount: 10,
      },
    ])

    const building = manager.createBuilding(ProductionBuildingType.LUMBER_MILL, { x: 2, y: 3 })
    expect(building).not.toBeNull()

    manager.update(2000)
    expect(manager.getBuilding(building!.id)?.status).toBe(BuildingStatus.BUILDING)

    expect(manager.assignWorker(building!.id, 'builder-1')).toBe(true)
    manager.update(2000)
    const created = manager.getBuilding(building!.id)
    expect(created?.status).toBe(BuildingStatus.OPERATIONAL)
    expect(created?.state.hasWorker).toBe(true)

    const upgraded = manager.upgradeBuilding(building!.id)
    expect(upgraded).toBe(true)
    expect(manager.getBuilding(building!.id)?.level).toBe(2)

    manager.update(2000)
    expect(producedEvents).toHaveLength(2)
    expect(producedEvents[0].resource).toBe(ResourceType.WOOD)
    expect(producedEvents[0].amount).toBe(30)
    expect(producedEvents[1].amount).toBe(30)
  })

  it('should release the construction worker after a recruitment station completes', () => {
    const eventBus = new EventBus()
    const manager = new ProductionBuildingManager(eventBus)

    manager.loadConfigs([
      {
        id: ProductionBuildingType.RECRUITMENT_STATION,
        type: ProductionBuildingType.RECRUITMENT_STATION,
        name: '招募站',
        description: '测试配置',
        size: { width: 2, height: 2 },
        cost: { wood: 10, stone: 5, gold: 0 },
        buildTime: 1000,
        workerSkill: null,
      },
    ])

    const building = manager.createBuilding(ProductionBuildingType.RECRUITMENT_STATION, { x: 5, y: 5 })
    expect(building).not.toBeNull()

    expect(manager.assignWorker(building!.id, 'builder-2')).toBe(true)
    manager.update(1500)

    const completed = manager.getBuilding(building!.id)
    expect(completed?.status).toBe(BuildingStatus.OPERATIONAL)
    expect(completed?.state.hasWorker).toBe(false)
    expect(completed?.state.workerId).toBeNull()
  })
})
