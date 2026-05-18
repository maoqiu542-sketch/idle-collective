import { create } from 'zustand'
import { OnlineClient } from '@net/OnlineClient'
import { parseOnlineInvite } from '@net/OnlineInvite'
import { ResourceType } from '@app-types/map.types'
import type {
  OnlineConnectionStatus,
  OnlineFullSnapshot,
  OnlineMessage,
  OnlinePlayerAction,
  OnlinePlayerPublicState,
  OnlineSpeedState,
  OnlineTickSnapshot,
} from '@app-types/online.types'
import { useBuildingStore } from './buildingStore'
import { useCharacterStore } from './characterStore'
import { useGameStore } from './gameStore'
import { useResourceStore } from './resourceStore'

const DEFAULT_SPEED: OnlineSpeedState = {
  multiplier: 1,
  lastActivityAt: null,
  idleSinceMs: null,
  acceptedPulseCount: 0,
}

const CREDENTIALS_STORAGE_KEY = 'idle_collective_online_credentials'
const SERVER_URL_STORAGE_KEY = 'idle_collective_online_server_url'

interface OnlineCredentials {
  roomCode: string
  playerId: string
  playerSecret: string
}

interface OnlineStoreState {
  mode: 'offline' | 'connecting' | 'online'
  connectionStatus: OnlineConnectionStatus
  serverUrl: string
  roomCode: string | null
  playerId: string | null
  playerSecret: string | null
  displayName: string
  error: string | null
  speed: OnlineSpeedState
  players: OnlinePlayerPublicState[]
  lastFullSnapshot: OnlineFullSnapshot | null
  lastTickSnapshot: OnlineTickSnapshot | null
  inviteCode: string | null
  inviteServerUrl: string | null
  setServerUrl: (serverUrl: string) => void
  connectCreateRoom: (displayName: string) => Promise<void>
  connectJoinInvite: (inviteText: string, displayName: string) => Promise<void>
  connectJoinRoom: (roomCode: string, displayName: string) => Promise<void>
  resumeLastRoom: () => Promise<void>
  disconnect: () => void
  sendAction: (action: OnlinePlayerAction) => void
  sendActivityPulse: (count: number) => void
}

let client: OnlineClient | null = null
let unsubscribeMessages: (() => void) | null = null

function getDefaultServerUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8787'
  }

  const { protocol, hostname } = window.location
  const resolvedHost = hostname || 'localhost'
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProtocol}//${resolvedHost}:8787`
}

function normalizeServerUrl(serverUrl: string): string {
  const trimmed = serverUrl.trim()
  if (!trimmed) {
    return getDefaultServerUrl()
  }

  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `ws://${trimmed}`
}

function saveServerUrl(serverUrl: string): void {
  localStorage.setItem(SERVER_URL_STORAGE_KEY, serverUrl)
}

function loadServerUrl(): string {
  try {
    const raw = localStorage.getItem(SERVER_URL_STORAGE_KEY)
    return normalizeServerUrl(raw || getDefaultServerUrl())
  } catch {
    return getDefaultServerUrl()
  }
}

function teardownClient(): void {
  unsubscribeMessages?.()
  unsubscribeMessages = null
  client?.disconnect()
  client = null
}

function getClient(serverUrl: string): OnlineClient {
  if (!client) {
    client = new OnlineClient(serverUrl)
    unsubscribeMessages = client.onMessage(handleMessage)
  }
  return client
}

function saveCredentials(credentials: OnlineCredentials): void {
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
}

function loadCredentials(): OnlineCredentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OnlineCredentials) : null
  } catch {
    return null
  }
}

function resetConnectionState(message: string): void {
  teardownClient()
  useOnlineStore.setState({
    mode: 'offline',
    connectionStatus: 'disconnected',
    roomCode: null,
    playerId: null,
    playerSecret: null,
    error: message,
  })
}

function handleMessage(message: OnlineMessage): void {
  const state = useOnlineStore.getState()

  if (message.type === 'room:created' || message.type === 'room:joined') {
    const payload = message.payload as OnlineCredentials
    saveCredentials(payload)
    const storeState = useOnlineStore.getState()
    useOnlineStore.setState({
      mode: 'online',
      connectionStatus: 'connected',
      roomCode: payload.roomCode,
      playerId: payload.playerId,
      playerSecret: payload.playerSecret,
      error: null,
      inviteCode: message.type === 'room:created'
        ? (storeState.inviteServerUrl
          ? `IC1:${payload.roomCode}@${storeState.inviteServerUrl}`
          : `IC1:${payload.roomCode}@${storeState.serverUrl.replace(/^wss?:\/\//, '')}`)
        : storeState.inviteCode,
    })
    return
  }

  if (message.type === 'room:resumed') {
    useOnlineStore.setState({
      mode: 'online',
      connectionStatus: 'connected',
      error: null,
    })
    return
  }

  if (message.type === 'room:fullSnapshot') {
    applyFullSnapshot(message.payload as OnlineFullSnapshot)
    return
  }

  if (message.type === 'room:tickSnapshot') {
    applyTickSnapshot(message.payload as OnlineTickSnapshot)
    return
  }

  if (message.type === 'room:speedChanged') {
    useOnlineStore.setState({ speed: message.payload as OnlineSpeedState })
    return
  }

  if (message.type === 'room:error') {
    const nextError = (message.payload as { message?: string } | undefined)?.message || '联机出错了'
    if (state.mode === 'online') {
      useOnlineStore.setState({ error: nextError })
    } else {
      resetConnectionState(nextError)
    }
    return
  }

  if (message.type === 'player:actionAccepted' && state.roomCode && state.playerId) {
    getClient(state.serverUrl).requestFullSnapshot(state.roomCode, state.playerId)
  }
}

function applyFullSnapshot(snapshot: OnlineFullSnapshot): void {
  const me = snapshot.players.find((player) => player.playerId === useOnlineStore.getState().playerId)
  useOnlineStore.setState({
    lastFullSnapshot: snapshot,
    players: snapshot.players,
    speed: snapshot.speed,
  })
  useGameStore.setState({
    mapData: snapshot.mapData,
    settlementLivability: me?.settlementLivability ?? 0,
    settlementDevelopment: me?.settlementDevelopment ?? 0,
    recruitmentStationState: me?.recruitmentStationState ?? useGameStore.getState().recruitmentStationState,
    tradeState: me?.tradeState ?? useGameStore.getState().tradeState,
  })
  useCharacterStore.getState().setCharacters(snapshot.characters)
  useBuildingStore.getState().setBuildings(snapshot.buildings)
  useCharacterStore.getState().setShopCharacters(me?.shopCharacters ?? [])
  if (me?.resources) {
    useResourceStore.getState().setResources(new Map(Object.entries(me.resources) as [ResourceType, number][]))
  }
}

function applyTickSnapshot(snapshot: OnlineTickSnapshot): void {
  const me = snapshot.players.find((player) => player.playerId === useOnlineStore.getState().playerId)
  useOnlineStore.setState({
    lastTickSnapshot: snapshot,
    players: snapshot.players,
    speed: snapshot.speed,
  })
  useCharacterStore.getState().setCharacters(snapshot.characters)
  useBuildingStore.getState().setBuildings(snapshot.buildings)
  useGameStore.setState({
    recruitmentStationState: me?.recruitmentStationState ?? useGameStore.getState().recruitmentStationState,
    tradeState: me?.tradeState ?? useGameStore.getState().tradeState,
  })
  useCharacterStore.getState().setShopCharacters(me?.shopCharacters ?? [])
  if (me?.resources) {
    useResourceStore.getState().setResources(new Map(Object.entries(me.resources) as [ResourceType, number][]))
  }
}

export const useOnlineStore = create<OnlineStoreState>((set, get) => ({
  mode: 'offline',
  connectionStatus: 'idle',
  serverUrl: loadServerUrl(),
  roomCode: null,
  playerId: null,
  playerSecret: null,
  displayName: '玩家',
  error: null,
  speed: DEFAULT_SPEED,
  players: [],
  lastFullSnapshot: null,
  lastTickSnapshot: null,
  inviteCode: null,
  inviteServerUrl: null,

  setServerUrl: (serverUrl: string) => {
    const normalized = normalizeServerUrl(serverUrl)
    saveServerUrl(normalized)
    if (normalized !== get().serverUrl) {
      teardownClient()
    }
    set({ serverUrl: normalized })
  },

  connectCreateRoom: async (displayName: string) => {
    set({ mode: 'connecting', connectionStatus: 'connecting', displayName, error: null, inviteCode: null })

    let connectServerUrl = get().serverUrl

    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : undefined
    if (electronAPI?.ensureOnlineServer) {
      try {
        const result = await electronAPI.ensureOnlineServer()
        if (!result.ok) {
          resetConnectionState(result.error || '启动联机服务失败')
          return
        }
        connectServerUrl = result.localServerUrl
        if (result.inviteServerUrl) {
          set({ inviteServerUrl: result.inviteServerUrl })
        }
      } catch (err: any) {
        resetConnectionState(err?.message || '无法启动联机服务')
        return
      }
    }

    try {
      const onlineClient = getClient(connectServerUrl)
      await onlineClient.connect()
      onlineClient.createRoom(displayName)
    } catch (error) {
      resetConnectionState(error instanceof Error ? error.message : '无法连接联机服务')
    }
  },

  connectJoinInvite: async (inviteText: string, displayName: string) => {
    set({ mode: 'connecting', connectionStatus: 'connecting', displayName, error: null })

    const parsed = parseOnlineInvite(inviteText, get().serverUrl)
    if ('error' in parsed) {
      set({ mode: 'offline', connectionStatus: 'disconnected', error: parsed.error })
      return
    }

    if (parsed.serverUrl !== get().serverUrl) {
      set({ serverUrl: parsed.serverUrl, inviteServerUrl: `${parsed.serverHost}:${parsed.serverPort}` })
      teardownClient()
    }

    try {
      const onlineClient = getClient(parsed.serverUrl)
      await onlineClient.connect()
      onlineClient.joinRoom(parsed.roomCode, displayName)
    } catch (error) {
      resetConnectionState(error instanceof Error ? error.message : '无法连接联机服务')
    }
  },

  connectJoinRoom: async (roomCode: string, displayName: string) => {
    set({ mode: 'connecting', connectionStatus: 'connecting', displayName, error: null })
    try {
      const onlineClient = getClient(get().serverUrl)
      await onlineClient.connect()
      onlineClient.joinRoom(roomCode.trim().toUpperCase(), displayName)
    } catch (error) {
      resetConnectionState(error instanceof Error ? error.message : '无法连接联机服务')
    }
  },

  resumeLastRoom: async () => {
    const credentials = loadCredentials()
    if (!credentials) {
      set({ error: '没有可重连的房间。' })
      return
    }

    set({ mode: 'connecting', connectionStatus: 'connecting', ...credentials, error: null })
    try {
      const onlineClient = getClient(get().serverUrl)
      await onlineClient.connect()
      onlineClient.resumeRoom(credentials.roomCode, credentials.playerId, credentials.playerSecret)
    } catch (error) {
      resetConnectionState(error instanceof Error ? error.message : '无法连接联机服务')
    }
  },

  disconnect: () => {
    teardownClient()
    set({
      mode: 'offline',
      connectionStatus: 'disconnected',
      roomCode: null,
      playerId: null,
      playerSecret: null,
      error: null,
      speed: DEFAULT_SPEED,
      players: [],
      lastFullSnapshot: null,
      lastTickSnapshot: null,
      inviteCode: null,
      inviteServerUrl: null,
    })
  },

  sendAction: (action: OnlinePlayerAction) => {
    const { roomCode, playerId, serverUrl } = get()
    if (!roomCode || !playerId) return
    getClient(serverUrl).sendAction(roomCode, playerId, action)
  },

  sendActivityPulse: (count: number) => {
    const { roomCode, playerId, mode, serverUrl } = get()
    if (mode !== 'online' || !roomCode || !playerId || count <= 0) return
    getClient(serverUrl).sendActivityPulse(roomCode, playerId, count)
  },
}))
