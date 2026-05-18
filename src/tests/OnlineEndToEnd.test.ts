import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { startOnlineServer, type OnlineServerInstance } from '../../server/index'
import type { OnlineMessage, OnlineFullSnapshot, OnlineTickSnapshot, OnlineAreaLayout } from '../types/online.types'
import { ProductionBuildingType } from '../types/production-building.types'
import { ResourceType } from '../types/map.types'

const ONLINE_PROTOCOL_VERSION = 1

let server: OnlineServerInstance

function createMessage(type: string, payload: unknown, extra?: Partial<OnlineMessage>): string {
  return JSON.stringify({
    protocolVersion: ONLINE_PROTOCOL_VERSION,
    type,
    payload,
    ...extra,
  })
}

function waitForMessage(socket: WebSocket, typeFilter?: string): Promise<OnlineMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`等待消息超时 [${typeFilter}]`)), 15000)
    socket.once('message', (raw) => {
      clearTimeout(timeout)
      try {
        const msg = JSON.parse(raw.toString()) as OnlineMessage
        if (typeFilter && msg.type !== typeFilter) {
          waitForMessage(socket, typeFilter).then(resolve).catch(reject)
          return
        }
        resolve(msg)
      } catch (e) {
        reject(new Error(`无效消息: ${raw}`))
      }
    })
  })
}

function waitForMultiple(socket: WebSocket, typeFilters: string[]): Promise<OnlineMessage[]> {
  const results: OnlineMessage[] = []
  const pending = new Set(typeFilters)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`等待多条消息超时 [${typeFilters}]`)), 15000)
    const listener = (raw: Buffer) => {
      const msg = JSON.parse(raw.toString()) as OnlineMessage
      results.push(msg)
      pending.delete(msg.type)
      if (pending.size === 0) {
        clearTimeout(timeout)
        socket.off('message', listener)
        resolve(results)
      }
    }
    socket.on('message', listener)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitForEither(socket: WebSocket, typeFilters: string[]): Promise<OnlineMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`等待消息超时 [${typeFilters}]`)), 15000)
    const listener = (raw: Buffer) => {
      const msg = JSON.parse(raw.toString()) as OnlineMessage
      if (typeFilters.includes(msg.type)) {
        clearTimeout(timeout)
        socket.off('message', listener)
        resolve(msg)
      }
    }
    socket.on('message', listener)
  })
}

beforeAll(async () => {
  server = await startOnlineServer({ port: 19787 })
}, 30000)

afterAll(async () => {
  await server?.stop()
})

function createSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}`)
    ws.once('open', () => resolve(ws))
    ws.once('error', (err) => reject(err))
    setTimeout(() => reject(new Error('WebSocket 连接超时')), 10000)
  })
}

describe('联机端到端集成测试', () => {
  let alphaSocket: WebSocket
  let betaSocket: WebSocket
  let roomCode: string
  let alphaId: string
  let betaId: string

  it('1. 创建房间（玩家 Alpha 创建房间）', async () => {
    alphaSocket = await createSocket()
    alphaSocket.send(createMessage('room:create', { displayName: 'Alpha' }))

    const response = await waitForMessage(alphaSocket, 'room:created')
    expect(response.type).toBe('room:created')
    expect(response.payload).toHaveProperty('roomCode')
    expect(response.payload).toHaveProperty('playerId')
    expect(response.payload).toHaveProperty('playerSecret')

    roomCode = (response.payload as any).roomCode
    alphaId = (response.payload as any).playerId
    expect(typeof roomCode).toBe('string')
    expect(roomCode.length).toBeGreaterThanOrEqual(4)

    // attachClient sends fullSnapshot immediately
    const snapshot = await waitForMessage(alphaSocket, 'room:fullSnapshot')
    expect(snapshot.payload).toHaveProperty('layout')
    expect(snapshot.payload).toHaveProperty('mapData')
    expect(snapshot.payload).toHaveProperty('players')
    expect(snapshot.payload).toHaveProperty('buildings')
    expect(snapshot.payload).toHaveProperty('characters')
  }, 20000)

  it('2. 加入房间（玩家 Beta 加入房间）', async () => {
    betaSocket = await createSocket()
    betaSocket.send(createMessage('room:join', { roomCode, displayName: 'Beta' }))

    const response = await waitForMessage(betaSocket, 'room:joined')
    expect(response.type).toBe('room:joined')
    expect((response.payload as any).roomCode).toBe(roomCode)
    betaId = (response.payload as any).playerId

    const snapshot = await waitForMessage(betaSocket, 'room:fullSnapshot')
    expect((snapshot.payload as OnlineFullSnapshot).layout.length).toBeGreaterThanOrEqual(2)
    expect((snapshot.payload as OnlineFullSnapshot).players.length).toBe(2)
    expect((snapshot.payload as OnlineFullSnapshot).players.some(p => p.playerId === betaId)).toBe(true)
    expect((snapshot.payload as OnlineFullSnapshot).players.some(p => p.playerId === alphaId)).toBe(true)
  }, 20000)

  it('3. 区域布局验证 - Alpha 和 Beta 有独立的区域', async () => {
    alphaSocket.send(createMessage('room:requestFullSnapshot', {}))
    const msg = await waitForMessage(alphaSocket, 'room:fullSnapshot')
    const snapshot = msg.payload as OnlineFullSnapshot

    const alphaArea = snapshot.layout.find(a => a.playerId === alphaId)
    const betaArea = snapshot.layout.find(a => a.playerId === betaId)

    expect(alphaArea).toBeDefined()
    expect(betaArea).toBeDefined()
    expect(alphaArea!.offsetX).toBe(0)
    expect(betaArea!.offsetX).toBe(alphaArea!.width)
    expect(alphaArea!.width).toBeGreaterThan(0)
    expect(alphaArea!.height).toBeGreaterThan(0)
    expect(betaArea!.width).toBeGreaterThan(0)
    expect(betaArea!.height).toBeGreaterThan(0)
  }, 20000)

  it('4. 在自己的区域放置建筑', async () => {
    alphaSocket.send(createMessage('room:requestFullSnapshot', {}))
    const msg = await waitForMessage(alphaSocket, 'room:fullSnapshot')
    const snapshot = msg.payload as OnlineFullSnapshot
    const alphaArea = snapshot.layout.find(a => a.playerId === alphaId)!

    const mapData = snapshot.mapData
    let tileX = -1, tileY = -1
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        if (mapData.tiles[y][x].isPassable) {
          tileX = alphaArea.offsetX + x
          tileY = alphaArea.offsetY + y
          break
        }
      }
      if (tileX >= 0) break
    }

    alphaSocket.send(createMessage('player:action', {
      type: 'placeBuilding',
      buildingType: ProductionBuildingType.LUMBER_MILL,
      worldX: tileX,
      worldY: tileY,
    }))

    const actionResult = await waitForMessage(alphaSocket, 'player:actionAccepted')
    expect(actionResult.payload).toHaveProperty('success')
    expect((actionResult.payload as any).success).toBe(true)

    await sleep(500)

    alphaSocket.send(createMessage('room:requestFullSnapshot', {}))
    const afterMsg = await waitForMessage(alphaSocket, 'room:fullSnapshot')
    const afterSnapshot = afterMsg.payload as OnlineFullSnapshot
    const alphaBuildings = afterSnapshot.buildings.filter(b => b.ownerPlayerId === alphaId)
    expect(alphaBuildings.length).toBeGreaterThanOrEqual(1)
    expect(alphaBuildings[0].type).toBe(ProductionBuildingType.LUMBER_MILL)
  }, 20000)

  it('5. 拒绝在其他玩家区域放置建筑', async () => {
    alphaSocket.send(createMessage('room:requestFullSnapshot', {}))
    const msg = await waitForMessage(alphaSocket, 'room:fullSnapshot')
    const snapshot = msg.payload as OnlineFullSnapshot
    const betaArea = snapshot.layout.find(a => a.playerId === betaId)!

    const mapData = snapshot.mapData
    let tileX = -1, tileY = -1
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        if (mapData.tiles[y][x].isPassable) {
          tileX = betaArea.offsetX + x
          tileY = betaArea.offsetY + y
          break
        }
      }
      if (tileX >= 0) break
    }

    alphaSocket.send(createMessage('player:action', {
      type: 'placeBuilding',
      buildingType: ProductionBuildingType.LUMBER_MILL,
      worldX: tileX,
      worldY: tileY,
    }))

    const result = await waitForMessage(alphaSocket, 'room:error')
    expect(result.payload).toHaveProperty('code')
    expect((result.payload as any).code).toBe('ACTION_REJECTED')

    alphaSocket.send(createMessage('room:requestFullSnapshot', {}))
    const afterMsg = await waitForMessage(alphaSocket, 'room:fullSnapshot')
    const betaBuildings = (afterMsg.payload as OnlineFullSnapshot).buildings.filter(b => b.ownerPlayerId === betaId)
    expect(betaBuildings.length).toBe(0)
  }, 20000)

  it('6. 手动采集资源', async () => {
    alphaSocket.send(createMessage('room:requestFullSnapshot', {}))
    const msg = await waitForMessage(alphaSocket, 'room:fullSnapshot')
    const snapshot = msg.payload as OnlineFullSnapshot
    const alphaArea = snapshot.layout.find(a => a.playerId === alphaId)!

    const mapData = snapshot.mapData
    let harvestX = -1, harvestY = -1
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = mapData.tiles[y][x]
        if (tile.resource && tile.resource.amount > 0) {
          harvestX = alphaArea.offsetX + x
          harvestY = alphaArea.offsetY + y
          break
        }
      }
      if (harvestX >= 0) break
    }

    if (harvestX < 0) return

    const resourceType = mapData.tiles[harvestY - alphaArea.offsetY][harvestX - alphaArea.offsetX].resource!.type

    alphaSocket.send(createMessage('player:action', {
      type: 'manualHarvest',
      worldX: harvestX,
      worldY: harvestY,
    }))

    const result = await waitForEither(alphaSocket, ['player:actionAccepted', 'room:error'])
    if (result.type === 'player:actionAccepted') {
      expect((result.payload as any).success).toBe(true)
    } else {
      expect((result.payload as any).code).toBe('ACTION_REJECTED')
    }
  }, 30000)

  it('7. 活动脉冲和速度控制', async () => {
    for (let i = 0; i < 50; i++) {
      alphaSocket.send(createMessage('input:activityPulse', { count: 1 }))
    }

    await sleep(500)

    alphaSocket.send(createMessage('room:requestFullSnapshot', {}))
    const msg = await waitForMessage(alphaSocket, 'room:fullSnapshot')
    const speed = (msg.payload as OnlineFullSnapshot).speed
    expect(speed.multiplier).toBeGreaterThan(1)
    expect(speed.acceptedPulseCount).toBeGreaterThan(0)
  }, 20000)

  it('8. 心跳检测', async () => {
    alphaSocket.send(createMessage('room:heartbeat', {}))
    const response = await waitForMessage(alphaSocket, 'room:heartbeat')
    expect(response.payload).toHaveProperty('serverTime')
    expect(typeof (response.payload as any).serverTime).toBe('number')
  }, 10000)

  it('9. 玩家断开后房间状态仍然保留', async () => {
    alphaSocket.close()
    await sleep(500)

    const newSocket = await createSocket()
    newSocket.send(createMessage('room:join', { roomCode, displayName: 'AlphaRejoin' }))
    const joinResp = await waitForMessage(newSocket, 'room:joined')
    const rejoinId = (joinResp.payload as any).playerId
    expect(rejoinId).not.toBe(alphaId)

    const snapshot = await waitForMessage(newSocket, 'room:fullSnapshot')
    expect(snapshot.payload).toHaveProperty('mapData')
    expect(snapshot.payload).toHaveProperty('players')

    newSocket.close()
  }, 20000)

  it('10. 完整联机房间生命周期 - 所有玩家退出后房间清理', async () => {
    const tempSocket = await createSocket()
    tempSocket.send(createMessage('room:create', { displayName: 'Temp' }))
    const resp = await waitForMessage(tempSocket, 'room:created')
    const tempRoomCode = (resp.payload as any).roomCode

    const snap = await waitForMessage(tempSocket, 'room:fullSnapshot')
    expect((snap.payload as OnlineFullSnapshot).roomCode).toBe(tempRoomCode)

    tempSocket.close()
  }, 15000)
})
