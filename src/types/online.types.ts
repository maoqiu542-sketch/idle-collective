import type { Character } from './character.types'
import type { ShopCharacter } from './character-shop.types'
import type { MapData, Position, ResourceType } from './map.types'
import type { ProductionBuilding, ProductionBuildingType } from './production-building.types'
import type { SaveData } from './save.types'
import type { RecruitmentStationState, TradeStateSnapshot } from './settlement.types'

export const ONLINE_PROTOCOL_VERSION = 1
export const ONLINE_SAVE_VERSION = 'online-1.0.0'

export type OnlineConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'

export interface OnlineAreaLayout {
  playerId: string
  areaIndex: number
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export interface OnlineSpeedState {
  multiplier: number
  lastActivityAt: number | null
  idleSinceMs: number | null
  acceptedPulseCount: number
}

export interface OnlinePlayerPublicState {
  playerId: string
  displayName: string
  areaIndex: number
  online: boolean
  settlementLivability: number
  settlementDevelopment: number
  resources: Partial<Record<ResourceType, number>>
  characterCount: number
  lastSeenAt: number
  recruitmentStationState: RecruitmentStationState
  tradeState: TradeStateSnapshot
  shopCharacters: ShopCharacter[]
}

export interface OnlineCharacterSnapshot extends Character {
  ownerPlayerId: string
  ownerDisplayName: string
  localPosition: Position
}

export interface OnlineBuildingSnapshot extends ProductionBuilding {
  ownerPlayerId: string
  ownerDisplayName: string
  localPosition: Position
  upgradePreview?: {
    nextLevel: number | null
    canUpgrade: boolean
    reason?: string
    essenceCost: number
    resources: Record<string, number>
    staffingStatus: string
    staffingEffect: string
    efficiencyLabel: string
  } | null
}

export interface OnlineFullSnapshot {
  roomCode: string
  layout: OnlineAreaLayout[]
  mapData: MapData
  players: OnlinePlayerPublicState[]
  characters: OnlineCharacterSnapshot[]
  buildings: OnlineBuildingSnapshot[]
  speed: OnlineSpeedState
  serverTime: number
}

export interface OnlineTickSnapshot {
  roomCode: string
  tick: number
  gameTime: number
  players: OnlinePlayerPublicState[]
  characters: OnlineCharacterSnapshot[]
  buildings: OnlineBuildingSnapshot[]
  speed: OnlineSpeedState
  serverTime: number
}

export interface OnlineRoomSave {
  onlineSaveVersion: typeof ONLINE_SAVE_VERSION
  roomCode: string
  createdAt: number
  updatedAt: number
  layout: OnlineAreaLayout[]
  players: Record<string, OnlinePlayerSave>
}

export interface OnlinePlayerSave {
  playerId: string
  displayName: string
  secretHash: string
  joinedAt: number
  lastSeenAt: number
  areaIndex: number
  saveData: SaveData
}

export interface OnlineMessage<T = unknown> {
  protocolVersion: typeof ONLINE_PROTOCOL_VERSION
  type: string
  requestId?: string
  roomCode?: string
  playerId?: string
  clientTime?: number
  payload: T
}

export interface OnlineErrorPayload {
  code: string
  message: string
}

export type OnlinePlayerAction =
  | { type: 'manualHarvest'; worldX: number; worldY: number }
  | { type: 'placeBuilding'; buildingType: ProductionBuildingType; worldX: number; worldY: number }
  | { type: 'upgradeBuilding'; buildingId: string }
  | { type: 'setTradeEnabled'; enabled: boolean }
  | { type: 'refreshRecruitmentShop' }
  | { type: 'purchaseCharacter'; slotId: number }

export interface InputActivityPulsePayload {
  count: number
}
