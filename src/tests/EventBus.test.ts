import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '@core/EventBus'
import { ResourceType } from '@app-types/map.types'
import { NeedType } from '@app-types/priority.types'

describe('EventBus', () => {
  describe('on / emit', () => {
    it('should call registered handler when event is emitted', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('game:started', handler)
      bus.emit('game:started', {})

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({})
    })

    it('should pass emitted data to the handler', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('resource:collected', handler)
      bus.emit('resource:collected', { characterId: 'char-1', type: ResourceType.WOOD, amount: 10 })

      expect(handler).toHaveBeenCalledWith({ characterId: 'char-1', type: ResourceType.WOOD, amount: 10 })
    })

    it('should call multiple handlers registered on the same event', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('game:started', handler1)
      bus.on('game:started', handler2)
      bus.emit('game:started', {})

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should do nothing when emitting an event with no handlers', () => {
      const bus = new EventBus()

      expect(() => bus.emit('game:started', {})).not.toThrow()
    })

    it('should call handlers each time the event is emitted', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('game:started', handler)
      bus.emit('game:started', {})
      bus.emit('game:started', {})

      expect(handler).toHaveBeenCalledTimes(2)
    })

    it('should isolate errors in one handler from affecting other handlers', () => {
      const bus = new EventBus()
      const throwingHandler = vi.fn().mockImplementation(() => { throw new Error('handler error') })
      const safeHandler = vi.fn()

      bus.on('game:started', throwingHandler)
      bus.on('game:started', safeHandler)

      expect(() => bus.emit('game:started', {})).not.toThrow()
      expect(safeHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('off', () => {
    it('should stop a handler from being called after unsubscription', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('game:started', handler)
      bus.off('game:started', handler)
      bus.emit('game:started', {})

      expect(handler).not.toHaveBeenCalled()
    })

    it('should not affect other handlers when removing one', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('game:started', handler1)
      bus.on('game:started', handler2)
      bus.off('game:started', handler1)
      bus.emit('game:started', {})

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should do nothing when unsubscribing a non-existent handler', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('game:started', handler)
      expect(() => bus.off('game:started', vi.fn())).not.toThrow()
      bus.emit('game:started', {})
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should do nothing when unsubscribing from an event with no handlers', () => {
      const bus = new EventBus()
      expect(() => bus.off('game:started', vi.fn())).not.toThrow()
    })
  })

  describe('once', () => {
    it('should call the handler only once', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.once('game:started', handler)
      bus.emit('game:started', {})
      bus.emit('game:started', {})

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should call the handler with the emitted data', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.once('resource:collected', handler)
      bus.emit('resource:collected', { characterId: 'char-1', type: ResourceType.WOOD, amount: 10 })

      expect(handler).toHaveBeenCalledWith({ characterId: 'char-1', type: ResourceType.WOOD, amount: 10 })
    })
  })

  describe('clear', () => {
    it('should remove all handlers for all events', () => {
      const bus = new EventBus()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      bus.on('game:started', handler1)
      bus.on('resource:collected', handler2)
      bus.clear()
      bus.emit('game:started', {})
      bus.emit('resource:collected', { characterId: 'c1', type: ResourceType.WOOD, amount: 5 })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should allow new subscriptions after clear', () => {
      const bus = new EventBus()
      const handler = vi.fn()

      bus.on('game:started', vi.fn())
      bus.clear()
      bus.on('game:started', handler)
      bus.emit('game:started', {})

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('type safety', () => {
    it('should handle different event signatures correctly', () => {
      const bus = new EventBus()
      const resourceHandler = vi.fn()
      const needHandler = vi.fn()

      bus.on('resource:collected', resourceHandler)
      bus.on('need:critical', needHandler)

      bus.emit('resource:collected', { characterId: 'c1', type: ResourceType.WOOD, amount: 10 })
      bus.emit('need:critical', { characterId: 'c1', needType: NeedType.HUNGER, value: 15 })

      expect(resourceHandler).toHaveBeenCalledWith({ characterId: 'c1', type: ResourceType.WOOD, amount: 10 })
      expect(needHandler).toHaveBeenCalledWith({ characterId: 'c1', needType: NeedType.HUNGER, value: 15 })
    })
  })
})
