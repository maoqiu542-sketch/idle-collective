import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '@core/EventBus'
import { SaveManager } from '@domain/save/SaveManager'
import { ResourceType } from '@app-types/map.types'
import { Character, CharacterState, ProfessionType, SkillType } from '@app-types/character.types'
import { Equipment, EquipmentQuality, EquipmentSlot } from '@app-types/equipment.types'
import { ProductionBuilding, ProductionBuildingType, BuildingStatus } from '@app-types/production-building.types'

function createCharacter(id = 'char-1'): Character {
  return {
    id,
    name: '测试角色',
    profession: ProfessionType.FARMER,
    position: { x: 1, y: 2 },
    state: CharacterState.IDLE,
    stats: {
      health: 80,
      maxHealth: 100,
      mood: 90,
      maxMood: 100,
    },
    talents: new Map([[SkillType.FARMING, { level: 2, experience: 10, experienceToNext: 100 }]]),
    skillPriorities: new Map([[SkillType.FARMING, 1]]),
    inventory: [],
    equipmentSlots: {},
    createdAt: 1700000000000,
  }
}

function createBuilding(): ProductionBuilding {
  return {
    id: 'building-1',
    configId: 'house',
    type: ProductionBuildingType.HOUSE,
    name: '房屋',
    position: { x: 4, y: 5 },
    level: 1,
    status: BuildingStatus.OPERATIONAL,
    state: {
      hasWorker: false,
      workerId: null,
      buildProgress: 1,
      isActive: true,
      productionProgress: 0,
      currentProduction: 0,
    },
    createdAt: 1700000000000,
  }
}

function createEquipment(): Equipment {
  return {
    id: 'eq-1',
    configId: 'sword',
    name: '测试剑',
    slot: EquipmentSlot.WEAPON,
    quality: EquipmentQuality.RARE,
    level: 1,
    stats: { atk: 5, hp: 10 },
    basePrice: 100,
    createdAt: 1700000000000,
  }
}

describe('SaveManager', () => {
  let manager: SaveManager
  let storage: Map<string, string>

  beforeEach(() => {
    storage = new Map()
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, String(value))
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => storage.clear(),
    }

    vi.stubGlobal('localStorage', localStorageMock as unknown as Storage)
    manager = new SaveManager(new EventBus())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should create, save, and load a versioned save file', () => {
    const save = manager.createSave(
      'Demo Slot',
      { tick: 42, gameTime: 12345, isPaused: false },
      [createCharacter()],
      [createBuilding()],
      [createEquipment()],
      new Map([[ResourceType.WOOD, 120], [ResourceType.GOLD, 88]])
    )

    expect(save.metadata.version).toBe('2.1.0')
    expect(save.saveVersion).toBe('2.1.0')
    expect(save.metadata.name).toBe('Demo Slot')

    const result = manager.saveToSlot(0, save)
    expect(result.success).toBe(true)

    const loaded = manager.loadFromSlot(0)
    expect(loaded.success).toBe(true)
    expect(loaded.data?.metadata.version).toBe('2.1.0')
    expect(loaded.data?.saveVersion).toBe('2.1.0')
    expect(loaded.data?.characters).toHaveLength(1)
    expect(loaded.data?.buildings).toHaveLength(1)
    expect(loaded.data?.equipments).toHaveLength(1)
    expect(loaded.data?.resources).toContainEqual([ResourceType.WOOD, 120])
  })

  it('should reject invalid save slots', () => {
    const save = manager.createSave(
      'Demo Slot',
      { tick: 0, gameTime: 0, isPaused: true },
      [],
      [],
      [],
      new Map()
    )

    expect(manager.saveToSlot(-1, save).success).toBe(false)
    expect(manager.loadFromSlot(99).success).toBe(false)
  })

  it('should list save metadata for occupied slots', () => {
    const save = manager.createSave(
      'Occupied Slot',
      { tick: 1, gameTime: 2, isPaused: false },
      [],
      [],
      [],
      new Map()
    )

    manager.saveToSlot(2, save)
    const slots = manager.getSaveSlots()

    expect(slots[2]?.name).toBe('Occupied Slot')
    expect(slots.filter(Boolean)).toHaveLength(1)
  })

  it('should reject incompatible save versions with a clear message', () => {
    const save = manager.createSave(
      'Old Slot',
      { tick: 1, gameTime: 2, isPaused: false },
      [],
      [],
      [],
      new Map()
    )

    save.saveVersion = '1.0.0'
    save.metadata.saveVersion = '1.0.0'
    save.metadata.version = '1.0.0'

    manager.saveToSlot(1, save)
    const loaded = manager.loadFromSlot(1)

    expect(loaded.success).toBe(false)
    expect(loaded.message).toContain('版本')
  })
})
