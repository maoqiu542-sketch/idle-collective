import type { Position } from '@app-types/map.types'
import type { OnlineAreaLayout } from '@app-types/online.types'

export function appendPlayerArea(
  layout: OnlineAreaLayout[],
  playerId: string,
  width: number,
  height: number
): OnlineAreaLayout[] {
  const offsetX = layout.reduce((sum, area) => sum + area.width, 0)
  const nextArea: OnlineAreaLayout = {
    playerId,
    areaIndex: layout.length,
    offsetX,
    offsetY: 0,
    width,
    height,
  }

  return [...layout, nextArea]
}

export function localToWorldPosition(area: OnlineAreaLayout, position: Position): Position {
  return {
    x: position.x + area.offsetX,
    y: position.y + area.offsetY,
  }
}

export function worldToLocalPosition(area: OnlineAreaLayout, position: Position): Position {
  return {
    x: position.x - area.offsetX,
    y: position.y - area.offsetY,
  }
}

export function findAreaByWorldPosition(layout: OnlineAreaLayout[], position: Position): OnlineAreaLayout | null {
  return layout.find(area =>
    position.x >= area.offsetX &&
    position.x < area.offsetX + area.width &&
    position.y >= area.offsetY &&
    position.y < area.offsetY + area.height
  ) ?? null
}

