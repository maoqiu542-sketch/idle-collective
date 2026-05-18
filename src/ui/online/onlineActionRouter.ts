import { findAreaByWorldPosition } from '@domain/online/OnlineRoomLayout'
import type { MapData } from '@app-types/map.types'
import type { OnlineAreaLayout, OnlinePlayerAction } from '@app-types/online.types'

export interface RoutedActionResult {
  success: boolean
  delegated?: boolean
  message?: string
  amount?: number
}

interface OnlineDispatchOptions<TAction extends OnlinePlayerAction, TResult extends RoutedActionResult> {
  mode: 'offline' | 'online' | 'connecting'
  sendAction: (action: TAction) => void
  action: TAction
  runLocal: () => TResult
}

interface OnlineManualHarvestOptions<TResult extends RoutedActionResult> {
  mode: 'offline' | 'online' | 'connecting'
  playerId: string | null
  layout: OnlineAreaLayout[]
  mapData: MapData | null
  sendAction: (action: Extract<OnlinePlayerAction, { type: 'manualHarvest' }>) => void
  tryLocalHarvest: (x: number, y: number) => TResult
}

export function dispatchOnlineAction<TAction extends OnlinePlayerAction, TResult extends RoutedActionResult>(
  options: OnlineDispatchOptions<TAction, TResult>,
): RoutedActionResult {
  if (options.mode === 'online') {
    options.sendAction(options.action)
    return { success: true, delegated: true }
  }

  return options.runLocal()
}

export function dispatchOnlineManualHarvest<TResult extends RoutedActionResult>(
  options: OnlineManualHarvestOptions<TResult>,
  worldX: number,
  worldY: number,
): RoutedActionResult {
  if (options.mode !== 'online') {
    return options.tryLocalHarvest(worldX, worldY)
  }

  const tile = options.mapData?.tiles[worldY]?.[worldX]
  if (!tile?.resource) {
    return { success: false, message: '该地块不可采集' }
  }

  const area = findAreaByWorldPosition(options.layout, { x: worldX, y: worldY })
  if (!area || !options.playerId || area.playerId !== options.playerId) {
    return { success: false, message: '不能操作其他玩家区域' }
  }

  options.sendAction({ type: 'manualHarvest', worldX, worldY })
  return { success: true, delegated: true }
}
