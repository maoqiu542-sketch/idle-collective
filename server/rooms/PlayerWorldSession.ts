import { Game } from '../../src/core/Game'
import { ResourceType, TerrainType, type MapData, type Tile } from '../../src/types/map.types'
import type {
  OnlineAreaLayout,
  OnlineBuildingSnapshot,
  OnlineCharacterSnapshot,
  OnlinePlayerPublicState,
  OnlinePlayerSave,
} from '../../src/types/online.types'
import type { SaveData } from '../../src/types/save.types'
import { localToWorldPosition } from '../../src/domain/online/OnlineRoomLayout'
import { NodeConfigSource } from '../config/NodeConfigSource'
import { ProductionBuildingType } from '../../src/types/production-building.types'

export class PlayerWorldSession {
  readonly playerId: string
  readonly displayName: string
  readonly joinedAt: number
  lastSeenAt: number
  private readonly game: Game

  private constructor(playerId: string, displayName: string, joinedAt: number, game: Game) {
    this.playerId = playerId
    this.displayName = displayName
    this.joinedAt = joinedAt
    this.lastSeenAt = Date.now()
    this.game = game
  }

  static async createNew(playerId: string, displayName: string): Promise<PlayerWorldSession> {
    const game = new Game({ mapWidth: 50, mapHeight: 50, configSource: new NodeConfigSource() })
    await game.initialize()
    return new PlayerWorldSession(playerId, displayName, Date.now(), game)
  }

  static async fromSave(playerSave: OnlinePlayerSave): Promise<PlayerWorldSession> {
    const game = new Game({ mapWidth: 50, mapHeight: 50, configSource: new NodeConfigSource() })
    await game.initialize()
    game.restoreFromSaveData(playerSave.saveData as SaveData & Record<string, unknown>)
    const session = new PlayerWorldSession(playerSave.playerId, playerSave.displayName, playerSave.joinedAt, game)
    session.lastSeenAt = playerSave.lastSeenAt
    return session
  }

  advance(deltaTimeMs: number, speedMultiplier: number): void {
    this.game.setSimulationSpeedMultiplier(speedMultiplier)
    this.game.advance(deltaTimeMs)
  }

  getRuntimeState(): { tick: number; gameTime: number } {
    const state = this.game.getState()
    return { tick: state.tick, gameTime: state.gameTime }
  }

  createSave(secretHash: string, areaIndex: number): OnlinePlayerSave {
    return {
      playerId: this.playerId,
      displayName: this.displayName,
      secretHash,
      joinedAt: this.joinedAt,
      lastSeenAt: this.lastSeenAt,
      areaIndex,
      saveData: this.game.createSaveData(`${this.displayName} 在线区域`),
    }
  }

  getMapData(): MapData {
    const mapData = this.game.getMapSystem().getMapData()
    if (!mapData) {
      return { width: 0, height: 0, tiles: [] }
    }
    return mapData
  }

  getPublicState(areaIndex: number): OnlinePlayerPublicState {
    const settlement = this.game.getSettlementState()
    return {
      playerId: this.playerId,
      displayName: this.displayName,
      areaIndex,
      online: true,
      settlementLivability: settlement.settlementLivability,
      settlementDevelopment: settlement.settlementDevelopment,
      resources: Object.fromEntries(this.game.getResources()) as Partial<Record<ResourceType, number>>,
      characterCount: this.game.getCharacterManager().getAll().length,
      lastSeenAt: this.lastSeenAt,
      recruitmentStationState: settlement.recruitmentStationState,
      tradeState: settlement.tradeState,
      shopCharacters: this.game.getCharacterShopManager().getAvailableCharacters(),
    }
  }

  getCharacters(area: OnlineAreaLayout): OnlineCharacterSnapshot[] {
    return this.game.getCharacterManager().getAll().map(character => ({
      ...character,
      ownerPlayerId: this.playerId,
      ownerDisplayName: this.displayName,
      localPosition: { ...character.position },
      position: localToWorldPosition(area, character.position),
    }))
  }

  getBuildings(area: OnlineAreaLayout): OnlineBuildingSnapshot[] {
    return this.game.getProductionBuildingManager().getAllBuildings().map(building => {
      const preview = this.game.getBuildingUpgradePreview(building.id)
      return {
        ...building,
        ownerPlayerId: this.playerId,
        ownerDisplayName: this.displayName,
        localPosition: { ...building.position },
        position: localToWorldPosition(area, building.position),
        upgradePreview: preview
          ? {
              nextLevel: preview.nextLevel,
              canUpgrade: preview.canUpgrade,
              reason: preview.reason,
              essenceCost: preview.essenceCost,
              resources: preview.resources,
              staffingStatus: preview.staffingStatus,
              staffingEffect: preview.staffingEffect,
              efficiencyLabel: preview.efficiencyLabel,
            }
          : null,
      }
    })
  }

  tryManualHarvest(localX: number, localY: number): { success: boolean; message?: string } {
    const result = this.game.tryManualHarvest(localX, localY)
    return {
      success: result.success,
      message: result.reason,
    }
  }

  placeBuilding(type: ProductionBuildingType, localX: number, localY: number): { success: boolean; message?: string; buildingId?: string } {
    return this.game.placeBuilding(type, localX, localY)
  }

  upgradeBuilding(buildingId: string): { success: boolean; message?: string; newLevel?: number } {
    return this.game.upgradeBuilding(buildingId)
  }

  setTradeEnabled(enabled: boolean): void {
    this.game.setTradeEnabled(enabled)
  }

  refreshRecruitmentShop(): { success: boolean; message?: string } {
    return this.game.getCharacterShopManager().manualRefresh()
  }

  purchaseCharacter(slotId: number): { success: boolean; message?: string } {
    return this.game.getCharacterShopManager().purchaseCharacter(slotId)
  }
}

export function createEmptyMergedTile(x: number, y: number): Tile {
  return {
    position: { x, y },
    terrain: TerrainType.WATER,
    isPassable: false,
    movementCost: 999,
  }
}
