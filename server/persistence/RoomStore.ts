import * as fs from 'fs/promises'
import * as path from 'path'
import type { OnlineRoomSave } from '../../src/types/online.types'

export class RoomStore {
  constructor(private readonly dataDir = process.env.IDLE_ONLINE_DATA_DIR || path.join(process.cwd(), 'server-data', 'rooms')) {}

  async load(roomCode: string): Promise<OnlineRoomSave | null> {
    try {
      const raw = await fs.readFile(this.resolvePath(roomCode), 'utf-8')
      return JSON.parse(raw) as OnlineRoomSave
    } catch {
      return null
    }
  }

  async save(data: OnlineRoomSave): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true })
    await fs.writeFile(this.resolvePath(data.roomCode), JSON.stringify(data, null, 2), 'utf-8')
  }

  private resolvePath(roomCode: string): string {
    const safeRoomCode = roomCode.replace(/[^A-Z0-9]/g, '')
    return path.join(this.dataDir, `${safeRoomCode}.json`)
  }
}

