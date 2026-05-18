import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '@core/EventBus'
import { NeedManager } from '@domain/character/NeedManager'
import { NeedType } from '@app-types/priority.types'

describe('NeedManager', () => {
  let eventBus: EventBus
  let manager: NeedManager

  beforeEach(() => {
    eventBus = new EventBus()
    manager = new NeedManager(eventBus)
  })

  describe('initCharacter', () => {
    it('should initialize all needs to 100 for a new character', () => {
      manager.initCharacter('char-1')

      const all = manager.getAll('char-1')
      expect(all).toBeDefined()
      expect(all!.size).toBe(10)

      all!.forEach(need => {
        expect(need.currentValue).toBe(100)
        expect(need.maxValue).toBe(100)
      })
    })

    it('should not reinitialize an existing character', () => {
      manager.initCharacter('char-1')
      const needs = manager.get('char-1', NeedType.HUNGER)!
      needs.currentValue = 50

      manager.initCharacter('char-1')

      expect(manager.get('char-1', NeedType.HUNGER)!.currentValue).toBe(50)
    })
  })

  describe('get', () => {
    it('should return a specific need for a character', () => {
      manager.initCharacter('char-1')

      const hunger = manager.get('char-1', NeedType.HUNGER)

      expect(hunger).toBeDefined()
      expect(hunger!.type).toBe(NeedType.HUNGER)
    })

    it('should return undefined for a non-existent character', () => {
      expect(manager.get('nonexistent', NeedType.HUNGER)).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return all needs for a character', () => {
      manager.initCharacter('char-1')

      const all = manager.getAll('char-1')

      expect(all).toBeDefined()
      expect(all!.size).toBe(10)
    })

    it('should return undefined for a non-existent character', () => {
      expect(manager.getAll('nonexistent')).toBeUndefined()
    })

    it('should return a Map with all need types', () => {
      manager.initCharacter('char-1')
      const all = manager.getAll('char-1')!

      expect(all.has(NeedType.HUNGER)).toBe(true)
      expect(all.has(NeedType.REST)).toBe(true)
      expect(all.has(NeedType.SAFETY)).toBe(true)
      expect(all.has(NeedType.COMFORT)).toBe(true)
    })
  })

  describe('update', () => {
    it('should decay active needs over time', () => {
      manager.initCharacter('char-1')

      manager.update(10000)

      expect(manager.get('char-1', NeedType.HUNGER)!.currentValue).toBeLessThan(100)
      expect(manager.get('char-1', NeedType.REST)!.currentValue).toBeLessThan(100)
    })

    it('should not affect needs with zero decay rate', () => {
      manager.initCharacter('char-1')

      manager.update(10000)

      expect(manager.get('char-1', NeedType.JOY)!.currentValue).toBe(100)
    })

    it('should handle zero delta time', () => {
      manager.initCharacter('char-1')

      manager.update(0)

      expect(manager.get('char-1', NeedType.HUNGER)!.currentValue).toBe(100)
    })

    it('should not let needs go below zero', () => {
      manager.initCharacter('char-1')

      manager.update(10000000)

      expect(manager.get('char-1', NeedType.HUNGER)!.currentValue).toBe(0)
    })

    it('should emit critical events when needs drop below threshold', () => {
      const handler = vi.fn()
      eventBus.on('need:critical', handler)
      manager.initCharacter('char-1')

      manager.update(200000)

      expect(handler).toHaveBeenCalled()
      const call = handler.mock.calls[0][0]
      expect(call).toHaveProperty('characterId', 'char-1')
      expect(call).toHaveProperty('needType')
      expect(call).toHaveProperty('value')
    })
  })

  describe('satisfy', () => {
    it('should restore need value', () => {
      manager.initCharacter('char-1')
      manager.update(200000)
      const before = manager.get('char-1', NeedType.HUNGER)!.currentValue

      manager.satisfy('char-1', NeedType.HUNGER, 20)

      expect(manager.get('char-1', NeedType.HUNGER)!.currentValue).toBe(before + 20)
    })

    it('should not exceed max value', () => {
      manager.initCharacter('char-1')

      manager.satisfy('char-1', NeedType.HUNGER, 200)

      expect(manager.get('char-1', NeedType.HUNGER)!.currentValue).toBe(100)
    })

    it('should do nothing for a non-existent character', () => {
      expect(() => manager.satisfy('nonexistent', NeedType.HUNGER, 50)).not.toThrow()
    })

    it('should emit satisfied event', () => {
      const handler = vi.fn()
      eventBus.on('need:satisfied', handler)
      manager.initCharacter('char-1')
      manager.update(10000)

      manager.satisfy('char-1', NeedType.HUNGER, 50)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ characterId: 'char-1', needType: NeedType.HUNGER })
      )
    })
  })

  describe('getCriticalNeeds', () => {
    it('should return needs below critical threshold', () => {
      manager.initCharacter('char-1')

      manager.update(10000000)

      const critical = manager.getCriticalNeeds('char-1')
      expect(critical.length).toBeGreaterThan(0)
      critical.forEach(need => {
        expect(need.currentValue).toBeLessThanOrEqual(need.criticalThreshold)
      })
    })

    it('should return empty array for a non-existent character', () => {
      expect(manager.getCriticalNeeds('nonexistent')).toEqual([])
    })

    it('should return empty array when no needs are critical', () => {
      manager.initCharacter('char-1')

      expect(manager.getCriticalNeeds('char-1')).toEqual([])
    })
  })

  describe('getMostUrgentNeed', () => {
    it('should return the most urgent need type', () => {
      manager.initCharacter('char-1')

      manager.update(50000)

      const urgent = manager.getMostUrgentNeed('char-1')
      expect(urgent).not.toBeNull()
    })

    it('should return null for a non-existent character', () => {
      expect(manager.getMostUrgentNeed('nonexistent')).toBeNull()
    })
  })

  describe('getAverageMood', () => {
    it('should return 100 for a freshly initialized character', () => {
      manager.initCharacter('char-1')

      expect(manager.getAverageMood('char-1')).toBe(100)
    })

    it('should decrease as needs decay', () => {
      manager.initCharacter('char-1')

      manager.update(50000)

      expect(manager.getAverageMood('char-1')).toBeLessThan(100)
    })

    it('should return 100 for a non-existent character', () => {
      expect(manager.getAverageMood('nonexistent')).toBe(100)
    })
  })

  describe('removeCharacter', () => {
    it('should remove character needs', () => {
      manager.initCharacter('char-1')
      expect(manager.get('char-1', NeedType.HUNGER)).toBeDefined()

      manager.removeCharacter('char-1')

      expect(manager.get('char-1', NeedType.HUNGER)).toBeUndefined()
    })
  })

  describe('serialization', () => {
    it('should serialize and deserialize correctly (roundtrip)', () => {
      manager.initCharacter('char-1')
      manager.update(10000)
      manager.satisfy('char-1', NeedType.HUNGER, 30)

      const data = manager.serialize()
      const newManager = new NeedManager(new EventBus())
      newManager.deserialize(data)

      const original = manager.get('char-1', NeedType.HUNGER)!
      const restored = newManager.get('char-1', NeedType.HUNGER)!
      expect(restored.currentValue).toBe(original.currentValue)
      expect(restored.maxValue).toBe(original.maxValue)
    })

    it('should serialize empty state correctly', () => {
      const data = manager.serialize()

      expect(Object.keys(data)).toHaveLength(0)
    })
  })

  describe('decay multiplier and livability', () => {
    it('should use custom decay multiplier', () => {
      const fastDecay = new NeedManager(eventBus, () => 2)
      fastDecay.initCharacter('char-1')

      fastDecay.update(10000)
      manager.initCharacter('char-1')
      manager.update(10000)

      expect(fastDecay.get('char-1', NeedType.HUNGER)!.currentValue)
        .toBeLessThan(manager.get('char-1', NeedType.HUNGER)!.currentValue)
    })

    it('should use passive recovery from livability', () => {
      const managerWithRecovery = new NeedManager(
        eventBus,
        () => 0.5,
        () => 100
      )
      managerWithRecovery.initCharacter('char-1')

      managerWithRecovery.update(10000)

      const safety = managerWithRecovery.get('char-1', NeedType.SAFETY)!
      expect(safety.currentValue).toBeGreaterThan(0)
    })
  })
})
