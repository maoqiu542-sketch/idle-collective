import { describe, expect, it, vi } from 'vitest'
import { ResourceType, TerrainType, type MapData } from '@app-types/map.types'
import type { OnlineAreaLayout, OnlinePlayerAction } from '@app-types/online.types'
import {
  dispatchOnlineAction,
  dispatchOnlineManualHarvest,
} from '@ui/online/onlineActionRouter'

const layout: OnlineAreaLayout[] = [
  { playerId: 'player-a', areaIndex: 0, offsetX: 0, offsetY: 0, width: 3, height: 3 },
  { playerId: 'player-b', areaIndex: 1, offsetX: 3, offsetY: 0, width: 3, height: 3 },
]

const mapData: MapData = {
  width: 6,
  height: 3,
  tiles: Array.from({ length: 3 }, (_, y) =>
    Array.from({ length: 6 }, (_, x) => ({
      position: { x, y },
      terrain: TerrainType.GRASS,
      isPassable: true,
      movementCost: 1,
      ...(x === 1 && y === 1
        ? { resource: { type: ResourceType.WOOD, amount: 10, maxAmount: 10, respawnable: true, respawnTime: 1000 } }
        : {}),
    }))
  ),
}

describe('onlineActionRouter', () => {
  it('uses the local harvest path while offline', () => {
    const sendAction = vi.fn()
    const tryLocalHarvest = vi.fn(() => ({ success: true, amount: 1 }))

    const result = dispatchOnlineManualHarvest({
      mode: 'offline',
      playerId: null,
      layout: [],
      mapData,
      sendAction,
      tryLocalHarvest,
    }, 1, 1)

    expect(result).toEqual({ success: true, amount: 1 })
    expect(tryLocalHarvest).toHaveBeenCalledWith(1, 1)
    expect(sendAction).not.toHaveBeenCalled()
  })

  it('sends a server action when harvesting inside the local player area online', () => {
    const sendAction = vi.fn()
    const tryLocalHarvest = vi.fn()

    const result = dispatchOnlineManualHarvest({
      mode: 'online',
      playerId: 'player-a',
      layout,
      mapData,
      sendAction,
      tryLocalHarvest,
    }, 1, 1)

    expect(result).toEqual({ success: true, delegated: true })
    expect(sendAction).toHaveBeenCalledWith({ type: 'manualHarvest', worldX: 1, worldY: 1 })
    expect(tryLocalHarvest).not.toHaveBeenCalled()
  })

  it('rejects harvesting another player area online before sending the action', () => {
    const sendAction = vi.fn()
    const tryLocalHarvest = vi.fn()

    const result = dispatchOnlineManualHarvest({
      mode: 'online',
      playerId: 'player-a',
      layout,
      mapData,
      sendAction,
      tryLocalHarvest,
    }, 4, 1)

    expect(result.success).toBe(false)
    expect(sendAction).not.toHaveBeenCalled()
    expect(tryLocalHarvest).not.toHaveBeenCalled()
  })

  it('routes generic online actions to the server instead of local state', () => {
    const sendAction = vi.fn()
    const runLocal = vi.fn(() => ({ success: true }))
    const action: OnlinePlayerAction = { type: 'purchaseCharacter', slotId: 2 }

    const result = dispatchOnlineAction({
      mode: 'online',
      sendAction,
      action,
      runLocal,
    })

    expect(result).toEqual({ success: true, delegated: true })
    expect(sendAction).toHaveBeenCalledWith(action)
    expect(runLocal).not.toHaveBeenCalled()
  })
})
