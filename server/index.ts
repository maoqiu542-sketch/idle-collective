import { WebSocketServer, type WebSocket } from 'ws'
import type { Server } from 'http'
import type { OnlineMessage } from '../src/types/online.types'
import { resolveAttachedSession } from './connection/resolveAttachedSession'
import { RoomManager } from './rooms/RoomManager'

export interface OnlineServerOptions {
  port?: number
  dataDir?: string
}

export interface OnlineServerInstance {
  wss: WebSocketServer
  httpServer: Server
  port: number
  stop: () => Promise<void>
}

export async function startOnlineServer(options: OnlineServerOptions = {}): Promise<OnlineServerInstance> {
  const port = options.port ?? Number(process.env.IDLE_ONLINE_PORT || 8787)
  const dataDir = options.dataDir ?? process.env.IDLE_ONLINE_DATA_DIR

  const rooms = new RoomManager(dataDir)
  const wss = new WebSocketServer({ port, maxPayload: 1024 * 1024 })

  setupWebSocketHandlers(wss, rooms)

  return new Promise((resolve, reject) => {
    wss.on('listening', () => {
      console.log(`[Idle Online] WebSocket server listening on ws://localhost:${port}`)
      if (typeof process.send === 'function') {
        process.send('online-server-ready')
      }
      resolve({
        wss,
        httpServer: wss.options.server as Server,
        port,
        stop: async () => {
          wss.close()
        },
      })
    })

    wss.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`端口 ${port} 已被占用`))
      } else {
        reject(err)
      }
    })
  })
}

function setupWebSocketHandlers(wss: WebSocketServer, rooms: RoomManager): void {
  wss.on('connection', (socket) => {
    let attachedRoomCode: string | null = null
    let attachedPlayerId: string | null = null

    socket.on('message', async (raw) => {
      const message = parseMessage(raw as Buffer)
      if (!message) {
        send(socket, 'room:error', { code: 'BAD_MESSAGE', message: '消息格式无效' })
        return
      }

      if (message.type === 'room:create') {
        const displayName = String((message.payload as any)?.displayName || '玩家')
        const { room, playerId, playerSecret } = await rooms.createRoom(displayName)
        attachedRoomCode = room.roomCode
        attachedPlayerId = playerId
        send(socket, 'room:created', { roomCode: room.roomCode, playerId, playerSecret }, room.roomCode, playerId)
        room.attachClient(socket, playerId)
        return
      }

      if (message.type === 'room:join') {
        const roomCode = String((message.payload as any)?.roomCode || message.roomCode || '')
        const room = await rooms.getRoom(roomCode)
        if (!room) {
          send(socket, 'room:error', { code: 'ROOM_NOT_FOUND', message: '房间不存在' })
          return
        }
        const displayName = String((message.payload as any)?.displayName || '玩家')
        const { playerId, playerSecret } = await room.addNewPlayer(displayName)
        attachedRoomCode = room.roomCode
        attachedPlayerId = playerId
        send(socket, 'room:joined', { roomCode: room.roomCode, playerId, playerSecret }, room.roomCode, playerId)
        room.attachClient(socket, playerId)
        return
      }

      if (message.type === 'room:resume') {
        const roomCode = String((message.payload as any)?.roomCode || message.roomCode || '')
        const playerId = String((message.payload as any)?.playerId || message.playerId || '')
        const playerSecret = String((message.payload as any)?.playerSecret || '')
        const room = await rooms.getRoom(roomCode)
        if (!room || !room.canResume(playerId, playerSecret)) {
          send(socket, 'room:error', { code: 'RESUME_FAILED', message: '重连身份无效' })
          return
        }
        attachedRoomCode = room.roomCode
        attachedPlayerId = playerId
        send(socket, 'room:resumed', { roomCode: room.roomCode, playerId }, room.roomCode, playerId)
        room.attachClient(socket, playerId)
        return
      }

      const attachedSession = resolveAttachedSession(message, {
        roomCode: attachedRoomCode,
        playerId: attachedPlayerId,
      })
      if (!attachedSession) {
        send(socket, 'room:error', { code: 'NOT_IN_ROOM', message: '尚未加入房间' })
        return
      }

      const room = await rooms.getRoom(attachedSession.roomCode)
      if (!room) {
        send(socket, 'room:error', { code: 'NOT_IN_ROOM', message: '尚未加入房间' })
        return
      }

      if (message.type === 'player:action') {
        const result = room.handlePlayerAction(attachedSession.playerId, message.payload as any)
        if (!result.success) {
          room.sendError(socket, 'ACTION_REJECTED', result.message || '操作被拒绝')
        } else {
          send(socket, 'player:actionAccepted', result, room.roomCode, attachedSession.playerId)
        }
        return
      }

      if (message.type === 'input:activityPulse') {
        room.handleActivityPulse(attachedSession.playerId, message.payload as any)
        return
      }

      if (message.type === 'room:requestFullSnapshot') {
        send(socket, 'room:fullSnapshot', room.createFullSnapshot(), room.roomCode, attachedSession.playerId)
        return
      }

      if (message.type === 'room:heartbeat') {
        send(socket, 'room:heartbeat', { serverTime: Date.now() }, room.roomCode, attachedSession.playerId)
      }
    })

    socket.on('close', async () => {
      if (!attachedRoomCode) return
      const room = await rooms.getRoom(attachedRoomCode)
      room?.detachClient(socket)
      await room?.persist()
    })
  })
}

function send(socket: WebSocket, type: string, payload: unknown, roomCode?: string, playerId?: string): void {
  socket.send(JSON.stringify({
    protocolVersion: 1,
    type,
    roomCode,
    playerId,
    payload,
  } satisfies OnlineMessage))
}

function parseMessage(raw: Buffer): OnlineMessage | null {
  try {
    const parsed = JSON.parse(raw.toString('utf-8')) as OnlineMessage
    return parsed?.protocolVersion === 1 && typeof parsed.type === 'string' ? parsed : null
  } catch {
    return null
  }
}

if (require.main === module || process.argv[1]?.includes('server/index')) {
  startOnlineServer().catch((err) => {
    console.error('[Idle Online] Failed to start:', err.message)
    process.exit(1)
  })
}
