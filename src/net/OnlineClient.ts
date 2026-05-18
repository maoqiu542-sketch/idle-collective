import { ONLINE_PROTOCOL_VERSION, type OnlineMessage, type OnlinePlayerAction } from '@app-types/online.types'

type OnlineMessageHandler = (message: OnlineMessage) => void

export class OnlineClient {
  private socket: WebSocket | null = null
  private handlers = new Set<OnlineMessageHandler>()

  constructor(private readonly serverUrl: string = 'ws://localhost:8787') {}

  connect(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.serverUrl)
      this.socket = socket

      socket.addEventListener('open', () => resolve(), { once: true })
      socket.addEventListener('error', () => {
        if (this.socket === socket) {
          this.socket = null
        }
        reject(new Error('无法连接联机服务'))
      }, { once: true })
      socket.addEventListener('close', () => {
        if (this.socket === socket) {
          this.socket = null
        }
      })
      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(String(event.data)) as OnlineMessage
          if (message.protocolVersion === ONLINE_PROTOCOL_VERSION) {
            this.handlers.forEach((handler) => handler(message))
          }
        } catch {
          // Ignore malformed server messages.
        }
      })
    })
  }

  disconnect(): void {
    this.socket?.close()
    this.socket = null
  }

  onMessage(handler: OnlineMessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  createRoom(displayName: string): void {
    this.send('room:create', { displayName })
  }

  joinRoom(roomCode: string, displayName: string): void {
    this.send('room:join', { roomCode, displayName }, roomCode)
  }

  resumeRoom(roomCode: string, playerId: string, playerSecret: string): void {
    this.send('room:resume', { roomCode, playerId, playerSecret }, roomCode, playerId)
  }

  sendAction(roomCode: string, playerId: string, action: OnlinePlayerAction): void {
    this.send('player:action', action, roomCode, playerId)
  }

  sendActivityPulse(roomCode: string, playerId: string, count: number): void {
    this.send('input:activityPulse', { count }, roomCode, playerId)
  }

  requestFullSnapshot(roomCode: string, playerId: string): void {
    this.send('room:requestFullSnapshot', {}, roomCode, playerId)
  }

  private send(type: string, payload: unknown, roomCode?: string, playerId?: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    const message: OnlineMessage = {
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      type,
      roomCode,
      playerId,
      clientTime: Date.now(),
      payload,
    }
    this.socket.send(JSON.stringify(message))
  }
}
