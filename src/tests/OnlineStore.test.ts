import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

const connect = vi.fn<[], Promise<void>>()
const createRoom = vi.fn<[string], void>()
const joinRoom = vi.fn<[string, string], void>()
const resumeRoom = vi.fn<[string, string, string], void>()
const disconnect = vi.fn<[], void>()
const onMessage = vi.fn<[(message: unknown) => void], () => void>(() => () => {})
const constructorUrls: string[] = []

vi.mock('@net/OnlineClient', () => ({
  OnlineClient: class MockOnlineClient {
    constructor(serverUrl?: string) {
      constructorUrls.push(serverUrl ?? 'ws://localhost:8787')
    }

    connect = connect
    createRoom = createRoom
    joinRoom = joinRoom
    resumeRoom = resumeRoom
    disconnect = disconnect
    onMessage = onMessage
    sendAction = vi.fn()
    sendActivityPulse = vi.fn()
    requestFullSnapshot = vi.fn()
  },
}))

describe('onlineStore', () => {
  beforeEach(() => {
    vi.resetModules()
    connect.mockReset()
    createRoom.mockReset()
    joinRoom.mockReset()
    resumeRoom.mockReset()
    disconnect.mockReset()
    onMessage.mockReset()
    onMessage.mockImplementation(() => () => {})
    constructorUrls.length = 0
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    })
  })

  afterEach(async () => {
    const { useOnlineStore } = await import('@ui/stores/onlineStore')
    useOnlineStore.getState().disconnect()
  })

  it('returns to offline state with a readable error when room creation cannot connect', async () => {
    connect.mockRejectedValueOnce(new Error('无法连接联机服务'))
    const { useOnlineStore } = await import('@ui/stores/onlineStore')

    await expect(useOnlineStore.getState().connectCreateRoom('玩家')).resolves.toBeUndefined()

    expect(useOnlineStore.getState()).toMatchObject({
      mode: 'offline',
      connectionStatus: 'disconnected',
      error: '无法连接联机服务',
    })
    expect(createRoom).not.toHaveBeenCalled()
  })

  it('creates the client with the configured server url', async () => {
    connect.mockResolvedValueOnce()
    const { useOnlineStore } = await import('@ui/stores/onlineStore')

    useOnlineStore.getState().setServerUrl('ws://192.168.1.23:8787')
    await useOnlineStore.getState().connectCreateRoom('玩家')

    expect(constructorUrls).toContain('ws://192.168.1.23:8787')
    expect(createRoom).toHaveBeenCalledWith('玩家')
  })
})
