/**
 * 事件总线 - 实现发布订阅模式
 * @module core/EventBus
 */

import { GameEvents as GameEventsMap } from '@app-types/event.types'

type EventHandler<T = unknown> = (data: T) => void

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()

  on<K extends keyof GameEventsMap>(event: K, handler: (data: GameEventsMap[K]) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler)
  }

  off<K extends keyof GameEventsMap>(event: K, handler: (data: GameEventsMap[K]) => void): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.delete(handler as EventHandler)
    }
  }

  emit<K extends keyof GameEventsMap>(event: K, data: GameEventsMap[K]): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  once<K extends keyof GameEventsMap>(event: K, handler: (data: GameEventsMap[K]) => void): void {
    const onceHandler = (data: GameEventsMap[K]) => {
      this.off(event, onceHandler)
      handler(data)
    }
    this.on(event, onceHandler)
  }

  clear(): void {
    this.handlers.clear()
  }
}

export default EventBus
