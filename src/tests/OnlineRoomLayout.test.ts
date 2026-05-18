import { describe, expect, it } from 'vitest'
import {
  appendPlayerArea,
  findAreaByWorldPosition,
  localToWorldPosition,
  worldToLocalPosition,
} from '@domain/online/OnlineRoomLayout'
import type { OnlineAreaLayout } from '@app-types/online.types'

describe('OnlineRoomLayout', () => {
  it('places player areas horizontally in join order', () => {
    let layout: OnlineAreaLayout[] = []

    layout = appendPlayerArea(layout, 'player-a', 50, 50)
    layout = appendPlayerArea(layout, 'player-b', 50, 50)
    layout = appendPlayerArea(layout, 'player-c', 30, 50)

    expect(layout).toEqual([
      { playerId: 'player-a', areaIndex: 0, offsetX: 0, offsetY: 0, width: 50, height: 50 },
      { playerId: 'player-b', areaIndex: 1, offsetX: 50, offsetY: 0, width: 50, height: 50 },
      { playerId: 'player-c', areaIndex: 2, offsetX: 100, offsetY: 0, width: 30, height: 50 },
    ])
  })

  it('converts between local and merged world positions', () => {
    const layout = appendPlayerArea([], 'player-a', 50, 50)
    const nextLayout = appendPlayerArea(layout, 'player-b', 50, 50)
    const playerBArea = nextLayout[1]

    expect(localToWorldPosition(playerBArea, { x: 3, y: 4 })).toEqual({ x: 53, y: 4 })
    expect(worldToLocalPosition(playerBArea, { x: 53, y: 4 })).toEqual({ x: 3, y: 4 })
  })

  it('finds the owning area for a world position', () => {
    const layout = appendPlayerArea(appendPlayerArea([], 'player-a', 50, 50), 'player-b', 50, 50)

    expect(findAreaByWorldPosition(layout, { x: 10, y: 10 })?.playerId).toBe('player-a')
    expect(findAreaByWorldPosition(layout, { x: 60, y: 10 })?.playerId).toBe('player-b')
    expect(findAreaByWorldPosition(layout, { x: 120, y: 10 })).toBeNull()
  })
})
