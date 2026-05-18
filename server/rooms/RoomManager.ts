import { randomBytes } from 'crypto'
import { RoomStore } from '../persistence/RoomStore'
import { OnlineRoomSession } from './OnlineRoomSession'

export class RoomManager {
  private readonly store: RoomStore
  private readonly rooms = new Map<string, OnlineRoomSession>()

  constructor(dataDir?: string) {
    this.store = new RoomStore(dataDir)
  }

  async createRoom(displayName: string): Promise<{ room: OnlineRoomSession; playerId: string; playerSecret: string }> {
    const roomCode = this.createRoomCode()
    const room = new OnlineRoomSession(roomCode, this.store)
    this.rooms.set(roomCode, room)
    const credentials = await room.addNewPlayer(displayName)
    return { room, ...credentials }
  }

  async getRoom(roomCode: string): Promise<OnlineRoomSession | null> {
    const safeRoomCode = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const existing = this.rooms.get(safeRoomCode)
    if (existing) return existing

    const save = await this.store.load(safeRoomCode)
    if (!save) return null

    const room = new OnlineRoomSession(safeRoomCode, this.store)
    await room.loadFromSave(save)
    this.rooms.set(safeRoomCode, room)
    return room
  }

  private createRoomCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += alphabet[randomBytes(1)[0] % alphabet.length]
    }
    if (this.rooms.has(code)) return this.createRoomCode()
    return code
  }
}

