import { createHash, randomBytes } from 'crypto'
import type WebSocket from 'ws'
import type { MapData, Tile } from '../../src/types/map.types'
import {
  ONLINE_SAVE_VERSION,
  type InputActivityPulsePayload,
  type OnlineAreaLayout,
  type OnlineErrorPayload,
  type OnlineFullSnapshot,
  type OnlineMessage,
  type OnlinePlayerAction,
  type OnlineRoomSave,
  type OnlineTickSnapshot,
} from '../../src/types/online.types'
import { OnlineSpeedController } from '../../src/domain/online/OnlineSpeedController'
import {
  appendPlayerArea,
  findAreaByWorldPosition,
  worldToLocalPosition,
} from '../../src/domain/online/OnlineRoomLayout'
import { RoomStore } from '../persistence/RoomStore'
import { createEmptyMergedTile, PlayerWorldSession } from './PlayerWorldSession'

interface ConnectedClient {
  socket: WebSocket
  playerId: string
}

export class OnlineRoomSession {
  readonly roomCode: string
  private readonly store: RoomStore
  private readonly players = new Map<string, PlayerWorldSession>()
  private readonly secrets = new Map<string, string>()
  private readonly clients = new Map<WebSocket, ConnectedClient>()
  private layout: OnlineAreaLayout[] = []
  private speedController = new OnlineSpeedController({ maxPulsesPerPlayerPerSecond: 20 })
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private snapshotTimer: ReturnType<typeof setInterval> | null = null
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private lastUpdateAt = Date.now()
  private createdAt = Date.now()

  constructor(roomCode: string, store: RoomStore) {
    this.roomCode = roomCode
    this.store = store
  }

  async loadFromSave(save: OnlineRoomSave): Promise<void> {
    this.layout = save.layout
    this.createdAt = save.createdAt
    for (const playerSave of Object.values(save.players)) {
      const player = await PlayerWorldSession.fromSave(playerSave)
      this.players.set(player.playerId, player)
      this.secrets.set(player.playerId, playerSave.secretHash)
    }
  }

  async addNewPlayer(displayName: string): Promise<{ playerId: string; playerSecret: string }> {
    const playerId = `player_${randomBytes(6).toString('hex')}`
    const playerSecret = randomBytes(18).toString('hex')
    const player = await PlayerWorldSession.createNew(playerId, displayName || `玩家${this.players.size + 1}`)
    const mapData = player.getMapData()

    this.layout = appendPlayerArea(this.layout, playerId, mapData.width, mapData.height)
    this.players.set(playerId, player)
    this.secrets.set(playerId, hashSecret(playerSecret))
    await this.persist()

    return { playerId, playerSecret }
  }

  canResume(playerId: string, playerSecret: string): boolean {
    return this.secrets.get(playerId) === hashSecret(playerSecret)
  }

  attachClient(socket: WebSocket, playerId: string): void {
    this.clients.set(socket, { socket, playerId })
    this.players.get(playerId)!.lastSeenAt = Date.now()
    this.ensureStarted()
    this.send(socket, 'room:fullSnapshot', this.createFullSnapshot())
    this.broadcast('room:playerJoined', { playerId })
  }

  detachClient(socket: WebSocket): void {
    const client = this.clients.get(socket)
    if (client) {
      this.players.get(client.playerId)!.lastSeenAt = Date.now()
      this.clients.delete(socket)
      this.broadcast('room:playerLeft', { playerId: client.playerId })
      this.stopIfIdle()
    }
  }

  handlePlayerAction(playerId: string, action: OnlinePlayerAction): { success: boolean; message?: string; buildingId?: string; newLevel?: number } {
    const player = this.players.get(playerId)
    if (!player) return { success: false, message: '玩家不存在' }

    if (action.type === 'manualHarvest') {
      const area = findAreaByWorldPosition(this.layout, { x: action.worldX, y: action.worldY })
      if (!area) return { success: false, message: '目标坐标不在房间区域内' }
      if (area.playerId !== playerId) return { success: false, message: '不能操作其他玩家区域' }
      const local = worldToLocalPosition(area, { x: action.worldX, y: action.worldY })
      return player.tryManualHarvest(local.x, local.y)
    }

    if (action.type === 'placeBuilding') {
      const area = findAreaByWorldPosition(this.layout, { x: action.worldX, y: action.worldY })
      if (!area) return { success: false, message: '目标坐标不在房间区域内。' }
      if (area.playerId !== playerId) return { success: false, message: '不能操作其他玩家区域' }
      const local = worldToLocalPosition(area, { x: action.worldX, y: action.worldY })
      return player.placeBuilding(action.buildingType, local.x, local.y)
    }

    if (action.type === 'upgradeBuilding') {
      return player.upgradeBuilding(action.buildingId)
    }

    if (action.type === 'setTradeEnabled') {
      player.setTradeEnabled(action.enabled)
      return { success: true }
    }

    if (action.type === 'refreshRecruitmentShop') {
      return player.refreshRecruitmentShop()
    }

    if (action.type === 'purchaseCharacter') {
      return player.purchaseCharacter(action.slotId)
    }

    return { success: false, message: '暂不支持该在线操作' }
  }

  handleActivityPulse(playerId: string, payload: InputActivityPulsePayload): void {
    if (!this.players.has(playerId)) {
      return
    }

    const pulseCount = Number.isFinite(payload.count) ? Math.floor(payload.count) : 0
    const result = this.speedController.recordActivity(playerId, Date.now(), Math.min(20, Math.max(0, pulseCount)))
    if (result.acceptedPulses > 0) {
      this.broadcast('room:speedChanged', result.state)
    }
  }

  createFullSnapshot(): OnlineFullSnapshot {
    const now = Date.now()
    return {
      roomCode: this.roomCode,
      layout: this.layout,
      mapData: this.createMergedMapData(),
      players: this.createPlayerStates(),
      characters: this.createCharacterSnapshots(),
      buildings: this.createBuildingSnapshots(),
      speed: this.speedController.getState(now),
      serverTime: now,
    }
  }

  createTickSnapshot(): OnlineTickSnapshot {
    const now = Date.now()
    const firstPlayer = [...this.players.values()][0]
    const state = firstPlayer ? firstPlayer.getRuntimeState() : { tick: 0, gameTime: 0 }
    return {
      roomCode: this.roomCode,
      tick: state?.tick ?? 0,
      gameTime: state?.gameTime ?? 0,
      players: this.createPlayerStates(),
      characters: this.createCharacterSnapshots(),
      buildings: this.createBuildingSnapshots(),
      speed: this.speedController.getState(now),
      serverTime: now,
    }
  }

  async persist(): Promise<void> {
    const now = Date.now()
    const players: OnlineRoomSave['players'] = {}
    for (const [playerId, player] of this.players) {
      const area = this.layout.find(item => item.playerId === playerId)
      players[playerId] = player.createSave(this.secrets.get(playerId) || '', area?.areaIndex ?? 0)
    }

    await this.store.save({
      onlineSaveVersion: ONLINE_SAVE_VERSION,
      roomCode: this.roomCode,
      createdAt: this.createdAt,
      updatedAt: now,
      layout: this.layout,
      players,
    })
  }

  private ensureStarted(): void {
    if (!this.tickTimer) {
      this.lastUpdateAt = Date.now()
      this.tickTimer = setInterval(() => this.tick(), 100)
    }
    if (!this.snapshotTimer) {
      this.snapshotTimer = setInterval(() => this.broadcast('room:tickSnapshot', this.createTickSnapshot()), 500)
    }
    if (!this.saveTimer) {
      this.saveTimer = setInterval(() => void this.persist(), 30000)
    }
  }

  private tick(): void {
    const now = Date.now()
    const delta = now - this.lastUpdateAt
    this.lastUpdateAt = now
    const speed = this.speedController.getState(now).multiplier
    for (const player of this.players.values()) {
      player.advance(delta, speed)
    }
  }

  private stopIfIdle(): void {
    if (this.clients.size > 0) {
      return
    }

    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer)
      this.snapshotTimer = null
    }
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
  }

  private createPlayerStates() {
    return this.layout
      .map(area => this.players.get(area.playerId)?.getPublicState(area.areaIndex))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }

  private createCharacterSnapshots() {
    return this.layout.flatMap(area => this.players.get(area.playerId)?.getCharacters(area) ?? [])
  }

  private createBuildingSnapshots() {
    return this.layout.flatMap(area => this.players.get(area.playerId)?.getBuildings(area) ?? [])
  }

  private createMergedMapData(): MapData {
    const width = this.layout.reduce((sum, area) => sum + area.width, 0)
    const height = this.layout.reduce((max, area) => Math.max(max, area.height), 0)
    const tiles: Tile[][] = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => createEmptyMergedTile(x, y))
    )

    for (const area of this.layout) {
      const playerMap = this.players.get(area.playerId)?.getMapData()
      if (!playerMap) continue
      for (let y = 0; y < playerMap.height; y++) {
        for (let x = 0; x < playerMap.width; x++) {
          const source = playerMap.tiles[y][x]
          const worldX = x + area.offsetX
          const worldY = y + area.offsetY
          tiles[worldY][worldX] = {
            ...source,
            position: { x: worldX, y: worldY },
            resource: source.resource ? { ...source.resource } : undefined,
          }
        }
      }
    }

    return { width, height, tiles }
  }

  private broadcast(type: string, payload: unknown): void {
    for (const client of this.clients.values()) {
      this.send(client.socket, type, payload)
    }
  }

  private send(socket: WebSocket, type: string, payload: unknown): void {
    const message: OnlineMessage = {
      protocolVersion: 1,
      type,
      roomCode: this.roomCode,
      payload,
    }
    socket.send(JSON.stringify(message))
  }

  sendError(socket: WebSocket, code: string, message: string): void {
    this.send(socket, 'room:error', { code, message } satisfies OnlineErrorPayload)
  }
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}
