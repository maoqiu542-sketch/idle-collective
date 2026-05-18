import { beforeEach, describe, expect, it, vi } from 'vitest'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

describe('gameStore initialization', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    })
  })

  it('waits for an in-flight initialization so a second caller can start the created game', async () => {
    const { useGameStore } = await import('@ui/stores/gameStore')

    const firstInit = useGameStore.getState().init()
    const secondInit = useGameStore.getState().init()

    await secondInit

    expect(useGameStore.getState().game).not.toBeNull()

    await firstInit
  })
})
