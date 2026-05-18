import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnlineRoomSession } from '../../server/rooms/OnlineRoomSession'
import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import { ResourceType } from '@app-types/map.types'

function findPlacementTile(player: any, game: any, buildingType: ProductionBuildingType) {
  const mapData = player.getMapData()
  const config = game
    .getConfigManager()
    .getProductionBuildingConfigs()
    .find((item: any) => item.id === buildingType)
  const size = config?.size ?? { width: 1, height: 1 }

  for (let y = 0; y <= mapData.height - size.height; y++) {
    for (let x = 0; x <= mapData.width - size.width; x++) {
      let canPlace = true
      for (let dx = 0; dx < size.width && canPlace; dx++) {
        for (let dy = 0; dy < size.height; dy++) {
          if (!mapData.tiles[y + dy]?.[x + dx]?.isPassable) {
            canPlace = false
            break
          }
        }
      }

      if (canPlace) {
        return { x, y }
      }
    }
  }

  return null
}

describe('OnlineRoomSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops background timers after the last client disconnects', async () => {
    const store = {
      save: vi.fn().mockResolvedValue(undefined),
    }
    const room = new OnlineRoomSession('ROOM01', store as any)
    const { playerId } = await room.addNewPlayer('Alpha')
    const socket = { send: vi.fn() } as any

    room.attachClient(socket, playerId)
    room.detachClient(socket)
    await vi.advanceTimersByTimeAsync(31_000)

    expect(store.save).toHaveBeenCalledTimes(1)
  })

  it('allows placing a building inside the local player area online', async () => {
    const store = {
      save: vi.fn().mockResolvedValue(undefined),
    }
    const room = new OnlineRoomSession('ROOM01', store as any)
    const { playerId } = await room.addNewPlayer('Alpha')
    const player = (room as any).players.get(playerId)
    const game = (player as any).game
    const area = room.createFullSnapshot().layout.find(item => item.playerId === playerId)
    const localTile = findPlacementTile(player, game, ProductionBuildingType.LUMBER_MILL)

    game.getResourceManager().add(ResourceType.WOOD, 200)
    game.getResourceManager().add(ResourceType.STONE, 200)
    game.getResourceManager().add(ResourceType.GOLD, 200)

    expect(area).toBeTruthy()
    expect(localTile).toBeTruthy()

    const result = room.handlePlayerAction(playerId, {
      type: 'placeBuilding',
      buildingType: ProductionBuildingType.LUMBER_MILL,
      worldX: area!.offsetX + localTile!.x,
      worldY: area!.offsetY + localTile!.y,
    })

    expect(result.success).toBe(true)
    expect(room.createFullSnapshot().buildings.some(building =>
      building.ownerPlayerId === playerId &&
      building.type === ProductionBuildingType.LUMBER_MILL
    )).toBe(true)
  })

  it('rejects placing a building inside another player area online', async () => {
    const store = {
      save: vi.fn().mockResolvedValue(undefined),
    }
    const room = new OnlineRoomSession('ROOM01', store as any)
    const { playerId: alphaId } = await room.addNewPlayer('Alpha')
    const { playerId: betaId } = await room.addNewPlayer('Beta')
    const betaPlayer = (room as any).players.get(betaId)
    const betaGame = (betaPlayer as any).game
    const betaArea = room.createFullSnapshot().layout.find(item => item.playerId === betaId)
    const localTile = findPlacementTile(betaPlayer, betaGame, ProductionBuildingType.LUMBER_MILL)

    expect(betaArea).toBeTruthy()
    expect(localTile).toBeTruthy()

    const result = room.handlePlayerAction(alphaId, {
      type: 'placeBuilding',
      buildingType: ProductionBuildingType.LUMBER_MILL,
      worldX: betaArea!.offsetX + localTile!.x,
      worldY: betaArea!.offsetY + localTile!.y,
    })

    expect(result.success).toBe(false)
    expect(room.createFullSnapshot().buildings).toHaveLength(0)
  })

  it('upgrades an operational building through the online room action path', async () => {
    const store = {
      save: vi.fn().mockResolvedValue(undefined),
    }
    const room = new OnlineRoomSession('ROOM01', store as any)
    const { playerId } = await room.addNewPlayer('Alpha')
    const player = (room as any).players.get(playerId)
    const game = (player as any).game
    const area = room.createFullSnapshot().layout.find(item => item.playerId === playerId)
    const localTile = findPlacementTile(player, game, ProductionBuildingType.LUMBER_MILL)

    game.getResourceManager().add(ResourceType.WOOD, 200)
    game.getResourceManager().add(ResourceType.STONE, 200)
    game.getResourceManager().add(ResourceType.GOLD, 200)

    room.handlePlayerAction(playerId, {
      type: 'placeBuilding',
      buildingType: ProductionBuildingType.LUMBER_MILL,
      worldX: area!.offsetX + localTile!.x,
      worldY: area!.offsetY + localTile!.y,
    })

    const building = game.getProductionBuildingManager().getAllBuildings()[0]
    building.status = BuildingStatus.OPERATIONAL
    building.state.isActive = true
    game.getBuildingEssenceManager().addEssence(100)
    game.getResourceManager().add(ResourceType.WOOD, 200)
    game.getResourceManager().add(ResourceType.STONE, 200)
    game.getResourceManager().add(ResourceType.GOLD, 200)

    const result = room.handlePlayerAction(playerId, {
      type: 'upgradeBuilding',
      buildingId: building.id,
    })

    expect(result.success).toBe(true)
    expect(building.level).toBe(2)
  })
})
