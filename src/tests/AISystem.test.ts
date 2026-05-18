import { describe, expect, it } from 'vitest'
import { EventBus } from '@core/EventBus'
import { AISystem } from '@domain/ai/AISystem'
import { CharacterManager } from '@domain/character/CharacterManager'
import { ProductionBuildingManager } from '@domain/building/ProductionBuildingManager'
import { PlayerInterventionManager } from '@domain/intervention/PlayerInterventionManager'
import { CharacterState, ProfessionType } from '@app-types/character.types'
import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import { ResourceType, TerrainType } from '@app-types/map.types'
import { TaskType } from '@app-types/priority.types'

describe('AISystem', () => {
  it('does not assign a staffed builder to a gather task in the same tick', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)

    buildingManager.loadConfigs([
      {
        id: ProductionBuildingType.RECRUITMENT_STATION,
        type: ProductionBuildingType.RECRUITMENT_STATION,
        name: '招募站',
        description: '测试建筑',
        size: { width: 2, height: 2 },
        cost: { wood: 10, stone: 5, gold: 0 },
        buildTime: 5000,
      },
    ])

    const building = buildingManager.createBuilding(ProductionBuildingType.RECRUITMENT_STATION, { x: 5, y: 5 })
    expect(building?.status).toBe(BuildingStatus.BUILDING)

    const engineer = characterManager.createCharacter({
      name: '工程师1',
      profession: ProfessionType.ENGINEER,
      position: { x: 1, y: 1 },
    })

    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, (_, y) =>
          Array.from({ length: 10 }, (_, x) => ({
            terrain: TerrainType.GRASS,
            resource: x === 2 && y === 2 ? { type: ResourceType.WOOD, amount: 10 } : undefined,
          }))
        ),
      }),
      harvestResource: () => ({ type: ResourceType.WOOD, amount: 5 }),
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager)
    aiSystem.update(100)

    expect(buildingManager.getBuilding(building!.id)?.state.workerId).toBe(engineer.id)
    expect(aiSystem.getActiveTasks().has(engineer.id)).toBe(false)
  })

  it('does not complete a newly assigned gather task in the same large-delta tick', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)

    const hunter = characterManager.createCharacter({
      name: '猎人1',
      profession: ProfessionType.HUNTER,
      position: { x: 0, y: 0 },
    })

    let harvestCalled = false
    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, (_, y) =>
          Array.from({ length: 10 }, (_, x) => ({
            terrain: TerrainType.GRASS,
            resource: x === 5 && y === 5 ? { type: ResourceType.WOOD, amount: 10 } : undefined,
          }))
        ),
      }),
      harvestResource: () => {
        harvestCalled = true
        return { type: ResourceType.WOOD, amount: 5 }
      },
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager)
    aiSystem.update(60000)

    const character = characterManager.get(hunter.id)
    expect(character?.state).not.toBe(CharacterState.IDLE)
    expect(aiSystem.getActiveTasks().has(hunter.id)).toBe(true)
    expect(harvestCalled).toBe(false)
  })

  it('moves and completes on later ticks instead of first assignment tick', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)

    const hunter = characterManager.createCharacter({
      name: '猎人1',
      profession: ProfessionType.HUNTER,
      position: { x: 0, y: 0 },
    })

    let harvestCalled = false
    let resourceDepleted = false
    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, (_, y) =>
          Array.from({ length: 10 }, (_, x) => ({
            terrain: TerrainType.GRASS,
            resource: x === 5 && y === 5 && !resourceDepleted
              ? { type: ResourceType.WOOD, amount: 10 }
              : undefined,
          }))
        ),
      }),
      harvestResource: () => {
        harvestCalled = true
        resourceDepleted = true
        return { type: ResourceType.WOOD, amount: 5 }
      },
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager)

    aiSystem.update(100)

    let character = characterManager.get(hunter.id)
    expect(character?.state).toBe(CharacterState.MOVING)
    expect(character?.position).toEqual({ x: 0, y: 0 })

    aiSystem.update(800)

    character = characterManager.get(hunter.id)
    expect(character?.position).toEqual({ x: 5, y: 5 })
    expect(character?.state).toBe(CharacterState.GATHERING)

    aiSystem.update(20000)

    character = characterManager.get(hunter.id)
    expect(character?.state).toBe(CharacterState.IDLE)
    expect(harvestCalled).toBe(true)
    expect(aiSystem.getActiveTasks().has(hunter.id)).toBe(false)
  })

  it('does not keep or assign operational workers to auto buildings like houses and warehouses', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)

    buildingManager.loadConfigs([
      {
        id: ProductionBuildingType.HOUSE,
        type: ProductionBuildingType.HOUSE,
        name: '房屋',
        description: '测试建筑',
        size: { width: 2, height: 2 },
        cost: { wood: 10, stone: 5, gold: 0 },
        buildTime: 1000,
      },
      {
        id: ProductionBuildingType.WAREHOUSE,
        type: ProductionBuildingType.WAREHOUSE,
        name: '仓库',
        description: '测试建筑',
        size: { width: 2, height: 2 },
        cost: { wood: 10, stone: 5, gold: 0 },
        buildTime: 1000,
      },
      {
        id: ProductionBuildingType.FARM,
        type: ProductionBuildingType.FARM,
        name: '农场',
        description: '测试建筑',
        size: { width: 2, height: 2 },
        cost: { wood: 10, stone: 5, gold: 0 },
        buildTime: 1000,
        outputResource: ResourceType.FOOD,
        outputAmount: 5,
      },
    ])

    const engineer = characterManager.createCharacter({
      name: '工程师',
      profession: ProfessionType.ENGINEER,
      position: { x: 1, y: 1 },
    })
    const farmer = characterManager.createCharacter({
      name: '农夫',
      profession: ProfessionType.FARMER,
      position: { x: 2, y: 2 },
    })
    characterManager.createCharacter({
      name: '猎人',
      profession: ProfessionType.HUNTER,
      position: { x: 3, y: 3 },
    })
    characterManager.createCharacter({
      name: '战士',
      profession: ProfessionType.WARRIOR,
      position: { x: 4, y: 4 },
    })

    buildingManager.deserialize([
      {
        id: 'house-1',
        configId: ProductionBuildingType.HOUSE,
        type: ProductionBuildingType.HOUSE,
        name: '房屋',
        position: { x: 5, y: 5 },
        level: 1,
        status: BuildingStatus.OPERATIONAL,
        state: {
          currentProduction: 0,
          productionProgress: 0,
          hasWorker: true,
          workerId: engineer.id,
          buildProgress: 1000,
          isActive: true,
        },
        createdAt: Date.now(),
      },
      {
        id: 'warehouse-1',
        configId: ProductionBuildingType.WAREHOUSE,
        type: ProductionBuildingType.WAREHOUSE,
        name: '仓库',
        position: { x: 6, y: 5 },
        level: 1,
        status: BuildingStatus.OPERATIONAL,
        state: {
          currentProduction: 0,
          productionProgress: 0,
          hasWorker: false,
          workerId: null,
          buildProgress: 1000,
          isActive: true,
        },
        createdAt: Date.now(),
      },
      {
        id: 'farm-1',
        configId: ProductionBuildingType.FARM,
        type: ProductionBuildingType.FARM,
        name: '农场',
        position: { x: 7, y: 5 },
        level: 1,
        status: BuildingStatus.OPERATIONAL,
        state: {
          currentProduction: 0,
          productionProgress: 0,
          hasWorker: false,
          workerId: null,
          buildProgress: 1000,
          isActive: true,
        },
        createdAt: Date.now(),
      },
    ])

    characterManager.setState(engineer.id, CharacterState.WORKING)

    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, () =>
          Array.from({ length: 10 }, () => ({
            terrain: TerrainType.GRASS,
          }))
        ),
      }),
      harvestResource: () => ({ type: ResourceType.WOOD, amount: 5 }),
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager)
    aiSystem.update(100)

    expect(buildingManager.getBuilding('house-1')?.state.hasWorker).toBe(false)
    expect(buildingManager.getBuilding('warehouse-1')?.state.hasWorker).toBe(false)
    expect(characterManager.get(engineer.id)?.state).toBe(CharacterState.IDLE)
    expect(buildingManager.getBuilding('farm-1')?.state.workerId).toBe(farmer.id)
  })

  it('moves construction workers into working state after auto-staffed buildings complete', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)

    buildingManager.loadConfigs([
      {
        id: ProductionBuildingType.FARM,
        type: ProductionBuildingType.FARM,
        name: '农场',
        description: '测试建筑',
        size: { width: 2, height: 2 },
        cost: { wood: 10, stone: 5, gold: 0 },
        buildTime: 1000,
        outputResource: ResourceType.FOOD,
        outputAmount: 5,
      },
    ])

    const building = buildingManager.createBuilding(ProductionBuildingType.FARM, { x: 5, y: 5 })
    const farmer = characterManager.createCharacter({
      name: '农夫',
      profession: ProfessionType.FARMER,
      position: { x: 2, y: 2 },
    })

    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, () =>
          Array.from({ length: 10 }, () => ({
            terrain: TerrainType.GRASS,
          }))
        ),
      }),
      harvestResource: () => ({ type: ResourceType.WOOD, amount: 5 }),
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager)
    aiSystem.update(100)
    expect(characterManager.get(farmer.id)?.state).toBe(CharacterState.BUILDING)

    buildingManager.update(1000)
    aiSystem.update(100)

    expect(buildingManager.getBuilding(building!.id)?.status).toBe(BuildingStatus.OPERATIONAL)
    expect(buildingManager.getBuilding(building!.id)?.state.workerId).toBe(farmer.id)
    expect(characterManager.get(farmer.id)?.state).toBe(CharacterState.WORKING)
  })

  it('does not assign disabled task types from character intervention rules', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)
    const interventionManager = new PlayerInterventionManager(eventBus)

    const hunter = characterManager.createCharacter({
      name: '猎人1',
      profession: ProfessionType.HUNTER,
      position: { x: 0, y: 0 },
    })
    interventionManager.initCharacter(hunter.id)
    interventionManager.disableTask(hunter.id, TaskType.GATHER)

    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, (_, y) =>
          Array.from({ length: 10 }, (_, x) => ({
            terrain: TerrainType.GRASS,
            resource: x === 5 && y === 5 ? { type: ResourceType.WOOD, amount: 10 } : undefined,
          }))
        ),
      }),
      harvestResource: () => ({ type: ResourceType.WOOD, amount: 5 }),
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager, interventionManager)
    aiSystem.update(100)

    expect(characterManager.get(hunter.id)?.state).toBe(CharacterState.IDLE)
    expect(aiSystem.getActiveTasks().has(hunter.id)).toBe(false)
  })

  it('cancels the current active task when that task type is disabled', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)
    const interventionManager = new PlayerInterventionManager(eventBus)

    const hunter = characterManager.createCharacter({
      name: '猎人1',
      profession: ProfessionType.HUNTER,
      position: { x: 0, y: 0 },
    })
    interventionManager.initCharacter(hunter.id)

    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, (_, y) =>
          Array.from({ length: 10 }, (_, x) => ({
            terrain: TerrainType.GRASS,
            resource: x === 5 && y === 5 ? { type: ResourceType.WOOD, amount: 10 } : undefined,
          }))
        ),
      }),
      harvestResource: () => ({ type: ResourceType.WOOD, amount: 5 }),
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager, interventionManager)
    aiSystem.update(100)
    expect(aiSystem.getActiveTasks().has(hunter.id)).toBe(true)

    interventionManager.disableTask(hunter.id, TaskType.GATHER)

    expect(characterManager.get(hunter.id)?.state).toBe(CharacterState.IDLE)
    expect(aiSystem.getActiveTasks().has(hunter.id)).toBe(false)
  })

  it('uses player task priorities when choosing among suitable tasks', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)
    const interventionManager = new PlayerInterventionManager(eventBus)

    const hunter = characterManager.createCharacter({
      name: '鐚庝汉1',
      profession: ProfessionType.HUNTER,
      position: { x: 0, y: 0 },
    })
    interventionManager.initCharacter(hunter.id)
    interventionManager.setTaskPriority(hunter.id, TaskType.GATHER, 5)
    interventionManager.setTaskPriority(hunter.id, TaskType.MOVE, 1)

    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, () =>
          Array.from({ length: 10 }, () => ({
            terrain: TerrainType.GRASS,
          }))
        ),
      }),
      harvestResource: () => ({ type: ResourceType.WOOD, amount: 5 }),
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager, interventionManager)
    aiSystem.addTask({
      id: 'manual-gather',
      type: TaskType.GATHER,
      priority: 2,
      status: 'pending' as any,
      position: { x: 0, y: 0 },
      targetPosition: { x: 0, y: 0 },
      utility: 30,
      createdAt: Date.now(),
    })
    aiSystem.addTask({
      id: 'manual-move',
      type: TaskType.MOVE,
      priority: 2,
      status: 'pending' as any,
      position: { x: 0, y: 0 },
      targetPosition: { x: 0, y: 0 },
      utility: 30,
      createdAt: Date.now(),
    })

    aiSystem.update(100)

    expect(aiSystem.getActiveTasks().get(hunter.id)?.task.type).toBe(TaskType.MOVE)
  })

  it('does not assign builders to construction when build is disabled', () => {
    const eventBus = new EventBus()
    const characterManager = new CharacterManager(eventBus)
    const buildingManager = new ProductionBuildingManager(eventBus)
    const interventionManager = new PlayerInterventionManager(eventBus)

    buildingManager.loadConfigs([
      {
        id: ProductionBuildingType.HOUSE,
        type: ProductionBuildingType.HOUSE,
        name: '鎴垮眿',
        description: '娴嬭瘯寤虹瓚',
        size: { width: 2, height: 2 },
        cost: { wood: 10, stone: 5, gold: 0 },
        buildTime: 1000,
      },
    ])

    const building = buildingManager.createBuilding(ProductionBuildingType.HOUSE, { x: 5, y: 5 })
    const engineer = characterManager.createCharacter({
      name: '宸ョ▼甯?',
      profession: ProfessionType.ENGINEER,
      position: { x: 1, y: 1 },
    })
    interventionManager.initCharacter(engineer.id)
    interventionManager.disableTask(engineer.id, TaskType.BUILD)

    const mapSystem = {
      getMapData: () => ({
        width: 10,
        height: 10,
        tiles: Array.from({ length: 10 }, () =>
          Array.from({ length: 10 }, () => ({
            terrain: TerrainType.GRASS,
          }))
        ),
      }),
      harvestResource: () => ({ type: ResourceType.WOOD, amount: 5 }),
    }

    const aiSystem = new AISystem(characterManager, mapSystem as any, eventBus, buildingManager, interventionManager)
    aiSystem.update(100)

    expect(buildingManager.getBuilding(building!.id)?.state.workerId).toBeNull()
    expect(characterManager.get(engineer.id)?.state).toBe(CharacterState.IDLE)
  })
})
