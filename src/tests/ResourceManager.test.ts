import { describe, expect, it } from 'vitest'
import { EventBus } from '@core/EventBus'
import { ResourceManager } from '@domain/resource/ResourceManager'
import { ResourceType } from '@app-types/map.types'

describe('ResourceManager', () => {
  describe('initialization', () => {
    it('should start with correct initial resource values', () => {
      const manager = new ResourceManager(new EventBus())

      expect(manager.get(ResourceType.WOOD)).toBe(180)
      expect(manager.get(ResourceType.STONE)).toBe(120)
      expect(manager.get(ResourceType.FOOD)).toBe(90)
      expect(manager.get(ResourceType.GOLD)).toBe(260)
      expect(manager.get(ResourceType.CORE_PARTS)).toBe(0)
    })
  })

  describe('add', () => {
    it('should increase resource amount', () => {
      const manager = new ResourceManager(new EventBus())

      manager.add(ResourceType.WOOD, 50)

      expect(manager.get(ResourceType.WOOD)).toBe(230)
    })

    it('should handle adding zero', () => {
      const manager = new ResourceManager(new EventBus())

      manager.add(ResourceType.WOOD, 0)

      expect(manager.get(ResourceType.WOOD)).toBe(180)
    })
  })

  describe('consume', () => {
    it('should decrease resource amount when sufficient', () => {
      const manager = new ResourceManager(new EventBus())

      const result = manager.consume(ResourceType.WOOD, 30)

      expect(result).toBe(true)
      expect(manager.get(ResourceType.WOOD)).toBe(150)
    })

    it('should return false and not change amount when insufficient', () => {
      const manager = new ResourceManager(new EventBus())

      const result = manager.consume(ResourceType.WOOD, 9999)

      expect(result).toBe(false)
      expect(manager.get(ResourceType.WOOD)).toBe(180)
    })

    it('should consume exact amount leaving zero', () => {
      const manager = new ResourceManager(new EventBus())

      const result = manager.consume(ResourceType.WOOD, 180)

      expect(result).toBe(true)
      expect(manager.get(ResourceType.WOOD)).toBe(0)
    })

    it('should handle consuming from empty resource', () => {
      const manager = new ResourceManager(new EventBus())

      const result = manager.consume(ResourceType.CORE_PARTS, 5)

      expect(result).toBe(false)
      expect(manager.get(ResourceType.CORE_PARTS)).toBe(0)
    })
  })

  describe('canAfford', () => {
    it('should return true when sufficient resources exist', () => {
      const manager = new ResourceManager(new EventBus())

      expect(manager.canAfford(ResourceType.WOOD, 100)).toBe(true)
    })

    it('should return false when insufficient resources exist', () => {
      const manager = new ResourceManager(new EventBus())

      expect(manager.canAfford(ResourceType.WOOD, 9999)).toBe(false)
    })

    it('should return false for empty resource', () => {
      const manager = new ResourceManager(new EventBus())

      expect(manager.canAfford(ResourceType.CORE_PARTS, 1)).toBe(false)
    })
  })

  describe('canAffordMultiple', () => {
    it('should return true when all costs are affordable', () => {
      const manager = new ResourceManager(new EventBus())

      const result = manager.canAffordMultiple([
        [ResourceType.WOOD, 50],
        [ResourceType.STONE, 50],
      ])

      expect(result).toBe(true)
    })

    it('should return false when any cost is not affordable', () => {
      const manager = new ResourceManager(new EventBus())

      const result = manager.canAffordMultiple([
        [ResourceType.WOOD, 50],
        [ResourceType.CORE_PARTS, 1],
      ])

      expect(result).toBe(false)
    })

    it('should return true for empty costs', () => {
      const manager = new ResourceManager(new EventBus())

      expect(manager.canAffordMultiple([])).toBe(true)
    })
  })

  describe('consumeMultiple', () => {
    it('should consume all resources when all are affordable', () => {
      const manager = new ResourceManager(new EventBus())

      const result = manager.consumeMultiple([
        [ResourceType.WOOD, 30],
        [ResourceType.STONE, 20],
      ])

      expect(result).toBe(true)
      expect(manager.get(ResourceType.WOOD)).toBe(150)
      expect(manager.get(ResourceType.STONE)).toBe(100)
    })

    it('should not consume any resource when not all are affordable', () => {
      const manager = new ResourceManager(new EventBus())

      const result = manager.consumeMultiple([
        [ResourceType.WOOD, 30],
        [ResourceType.CORE_PARTS, 1],
      ])

      expect(result).toBe(false)
      expect(manager.get(ResourceType.WOOD)).toBe(180)
      expect(manager.get(ResourceType.CORE_PARTS)).toBe(0)
    })
  })

  describe('getAll', () => {
    it('should return a copy of all resources', () => {
      const manager = new ResourceManager(new EventBus())
      const all = manager.getAll()

      expect(all.get(ResourceType.WOOD)).toBe(180)
      expect(all.get(ResourceType.STONE)).toBe(120)
      expect(all.get(ResourceType.FOOD)).toBe(90)
      expect(all.get(ResourceType.GOLD)).toBe(260)
      expect(all.get(ResourceType.CORE_PARTS)).toBe(0)
    })

    it('should not be affected by changes to the returned map', () => {
      const manager = new ResourceManager(new EventBus())
      const all = manager.getAll()
      all.set(ResourceType.WOOD, 9999)

      expect(manager.get(ResourceType.WOOD)).toBe(180)
    })
  })

  describe('setResources', () => {
    it('should replace all resources with the provided map', () => {
      const manager = new ResourceManager(new EventBus())
      const newResources = new Map<ResourceType, number>([
        [ResourceType.WOOD, 500],
        [ResourceType.GOLD, 1000],
      ])

      manager.setResources(newResources)

      expect(manager.get(ResourceType.WOOD)).toBe(500)
      expect(manager.get(ResourceType.GOLD)).toBe(1000)
      expect(manager.get(ResourceType.STONE)).toBe(0)
    })
  })

  describe('serialization', () => {
    it('should serialize and deserialize correctly (roundtrip)', () => {
      const manager = new ResourceManager(new EventBus())
      manager.add(ResourceType.WOOD, 20)
      manager.consume(ResourceType.STONE, 10)

      const data = manager.serialize()
      const newManager = new ResourceManager(new EventBus())
      newManager.deserialize(data)

      expect(newManager.get(ResourceType.WOOD)).toBe(200)
      expect(newManager.get(ResourceType.STONE)).toBe(110)
      expect(newManager.get(ResourceType.FOOD)).toBe(90)
      expect(newManager.get(ResourceType.GOLD)).toBe(260)
      expect(newManager.get(ResourceType.CORE_PARTS)).toBe(0)
    })
  })

  describe('event integration', () => {
    it('should add harvested resources when the collected event is emitted', () => {
      const eventBus = new EventBus()
      const manager = new ResourceManager(eventBus)
      const before = manager.get(ResourceType.WOOD)

      eventBus.emit('resource:collected', {
        characterId: 'char-1',
        type: ResourceType.WOOD,
        amount: 5,
      })

      expect(manager.get(ResourceType.WOOD)).toBe(before + 5)
    })

    it('should consume food when character eats', () => {
      const eventBus = new EventBus()
      const manager = new ResourceManager(eventBus)
      const before = manager.get(ResourceType.FOOD)

      eventBus.emit('character:ate', {
        characterId: 'char-1',
        amount: 10,
      })

      expect(manager.get(ResourceType.FOOD)).toBe(before - 1)
    })

    it('should not reduce food below zero when character eats with no food', () => {
      const eventBus = new EventBus()
      const manager = new ResourceManager(eventBus)
      manager.consume(ResourceType.FOOD, 90)

      eventBus.emit('character:ate', {
        characterId: 'char-1',
        amount: 10,
      })

      expect(manager.get(ResourceType.FOOD)).toBe(0)
    })
  })
})
