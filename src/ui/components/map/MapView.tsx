import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import type { CSSProperties } from 'react'
import { useResourceStore } from '@ui/stores/resourceStore'
import { useCharacterStore } from '@ui/stores/characterStore'
import { useBuildingStore } from '@ui/stores/buildingStore'
import { Character, CharacterState } from '@app-types/character.types'
import { ResourceType, TerrainType } from '@app-types/map.types'
import type { OnlineBuildingSnapshot } from '@app-types/online.types'
import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import { STATE_COLORS, STATE_DISPLAY_NAMES } from '@app-types/state-machine.types'
import { SettlementBuildingEffects } from '@app-types/settlement.types'
import { useOnlineStore } from '@ui/stores/onlineStore'
import { dispatchOnlineAction, dispatchOnlineManualHarvest } from '@ui/online/onlineActionRouter'
import {
  getBuildingAssetPath,
  getProfessionAssetPath,
  getResourceNodeAssetPath,
  getTerrainAssetPath,
  toBackgroundImage
} from '@data/assets/artAssets'
import './MapView.css'

const TILE_SIZE = 32

const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.GRASS]: '#7CBA5F',
  [TerrainType.FOREST]: '#2D5A27',
  [TerrainType.MOUNTAIN]: '#8B7355',
  [TerrainType.WATER]: '#4A90D9',
  [TerrainType.SAND]: '#E8D4A8',
  [TerrainType.SNOW]: '#F5F5F5',
}

const TERRAIN_NAMES: Record<TerrainType, string> = {
  [TerrainType.GRASS]: '草地',
  [TerrainType.FOREST]: '森林',
  [TerrainType.MOUNTAIN]: '山地',
  [TerrainType.WATER]: '水域',
  [TerrainType.SAND]: '沙地',
  [TerrainType.SNOW]: '雪地',
}

const RESOURCE_ICONS: Record<string, string> = {
  [ResourceType.WOOD]: 'W',
  [ResourceType.STONE]: 'S',
  [ResourceType.FOOD]: 'F',
  [ResourceType.GOLD]: 'G',
  [ResourceType.CORE_PARTS]: 'C',
}

const BUILDING_ICONS: Record<string, string> = {
  [ProductionBuildingType.LUMBER_MILL]: 'L',
  [ProductionBuildingType.QUARRY]: 'Q',
  [ProductionBuildingType.FARM]: 'F',
  [ProductionBuildingType.WAREHOUSE]: 'W',
  [ProductionBuildingType.KITCHEN]: 'K',
  [ProductionBuildingType.HOUSE]: 'H',
  [ProductionBuildingType.TRADE_STATION]: 'T',
  [ProductionBuildingType.BARRACKS]: 'B',
  [ProductionBuildingType.RECRUITMENT_STATION]: 'R',
  [ProductionBuildingType.RESEARCH_DESK]: 'S',
}


const AUTO_OPERATIONAL_LABEL_BUILDINGS = new Set<ProductionBuildingType>([
  ProductionBuildingType.HOUSE,
  ProductionBuildingType.WAREHOUSE,
  ProductionBuildingType.RECRUITMENT_STATION,
  ProductionBuildingType.TRADE_STATION,
])

interface TileData {
  terrain: TerrainType
  resource?: {
    type: string
    amount: number
  }
}

interface BuildingUpgradePreview {
  buildingId: string
  name: string
  level: number
  status: BuildingStatus
  staffingStatus: string
  staffingEffect: string
  efficiencyLabel: string
  nextLevel: number | null
  canUpgrade: boolean
  reason?: string
  essenceCost: number
  resources: Record<string, number>
}

function isOnlineBuildingSnapshot(building: unknown): building is OnlineBuildingSnapshot {
  return typeof building === 'object' && building !== null && 'ownerPlayerId' in building
}

interface MapViewProps {
  onCharacterClick?: (character: Character) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function buildArtStyle(variableName: string, assetPath: string | null): CSSProperties | undefined {
  if (!assetPath) {
    return undefined
  }

  return {
    [variableName]: toBackgroundImage(assetPath)
  } as CSSProperties
}

function getBuildingEffectSummary(type: ProductionBuildingType, effects?: SettlementBuildingEffects): string {
  if (!effects) {
    return '建筑效果数据未同步'
  }

  switch (type) {
    case ProductionBuildingType.HOUSE:
      return `休息恢复 +${effects.houseRestBonus}，舒适度 +${effects.houseComfortBonus}`
    case ProductionBuildingType.KITCHEN:
      return `餐食恢复 +${effects.kitchenMealBonus}，农场效率 x${effects.kitchenFoodProductionMultiplier.toFixed(2)}`
    case ProductionBuildingType.WAREHOUSE:
      return `核心零件容量 ${effects.warehouseCoreCapacity}，生产效率 x${effects.warehouseProductionMultiplier.toFixed(2)}`
    case ProductionBuildingType.TRADE_STATION:
      return `自动卖出盈余资源，贸易站等级 ${effects.tradeStationLevel}`
    case ProductionBuildingType.BARRACKS:
      return `战备训练 x${effects.barracksCombatBonusMultiplier.toFixed(2)}`
    case ProductionBuildingType.RECRUITMENT_STATION:
      return `候选槽位 +${effects.recruitmentSlotBonus}，品质加成 +${effects.recruitmentQualityBonus}`
    case ProductionBuildingType.RESEARCH_DESK:
      return `研究产出 x${effects.researchOutputMultiplier.toFixed(2)}，研究座位 ${effects.researchWorkerCapacity}`
    case ProductionBuildingType.LUMBER_MILL:
      return `自动生产木材，受仓库加成 x${effects.warehouseProductionMultiplier.toFixed(2)}`
    case ProductionBuildingType.QUARRY:
      return `自动生产石材，受仓库加成 x${effects.warehouseProductionMultiplier.toFixed(2)}`
    case ProductionBuildingType.FARM:
      return '自动生产食物'
    default:
      return '建筑正在运作'
  }
}

function getBuildingEffectChip(type: ProductionBuildingType, effects?: SettlementBuildingEffects): string | null {
  if (!effects) {
    return null
  }

  switch (type) {
    case ProductionBuildingType.HOUSE:
      return `休息+${effects.houseRestBonus}`
    case ProductionBuildingType.KITCHEN:
      return `餐食+${effects.kitchenMealBonus}`
    case ProductionBuildingType.WAREHOUSE:
      return `周转x${effects.warehouseProductionMultiplier.toFixed(2)}`
    case ProductionBuildingType.TRADE_STATION:
      return '自动贸易'
    case ProductionBuildingType.BARRACKS:
      return `战备x${effects.barracksCombatBonusMultiplier.toFixed(2)}`
    case ProductionBuildingType.RECRUITMENT_STATION:
      return `招募+${effects.recruitmentQualityBonus}`
    case ProductionBuildingType.RESEARCH_DESK:
      return `研究x${effects.researchOutputMultiplier.toFixed(2)}`
    case ProductionBuildingType.LUMBER_MILL:
      return '自动木材'
    case ProductionBuildingType.QUARRY:
      return '自动石材'
    case ProductionBuildingType.FARM:
      return '自动食物'
    default:
      return null
  }
}

function getUpgradeEffectLines(type: ProductionBuildingType, level: number): string[] {
  switch (type) {
    case ProductionBuildingType.HOUSE:
      return [`休息恢复 +${level * 8}`, `舒适度 +${level * 4}`]
    case ProductionBuildingType.KITCHEN:
      return [
        `餐食恢复 +${level * 10}`,
        `农场效率 x${clamp(1 + level * 0.15, 1, 1.75).toFixed(2)}`,
      ]
    case ProductionBuildingType.WAREHOUSE:
      return [
        `核心零件容量 ${500 + level * 250}`,
        `生产效率 x${clamp(1 + level * 0.08, 1, 1.4).toFixed(2)}`,
      ]
    case ProductionBuildingType.TRADE_STATION:
      return ['自动出售木材、石材和食物盈余', '当前版本暂未开放贸易站升级']
    case ProductionBuildingType.BARRACKS:
      return [`战备训练 x${clamp(1 + level * 0.08, 1, 1.4).toFixed(2)}`]
    case ProductionBuildingType.RECRUITMENT_STATION:
      return [
        `候选槽位 ${3 + Math.max(0, level - 1)}`,
        `手动刷新减免 ${level * 5}`,
        `品质加成 +${level * 4}`,
      ]
    case ProductionBuildingType.RESEARCH_DESK:
      return [
        `研究产出 x${clamp(1 + level * 0.12, 1, 1.6).toFixed(2)}`,
        `研究席位 ${level}`,
      ]
    case ProductionBuildingType.LUMBER_MILL:
    case ProductionBuildingType.QUARRY:
    case ProductionBuildingType.FARM:
      return [`基础产出 x${level}`]
    default:
      return ['升级会提升建筑效果']
  }
}

export function MapView({ onCharacterClick }: MapViewProps) {
  const mapData = useGameStore(state => state.mapData)
  const placeBuilding = useGameStore(state => state.placeBuilding)
  const cancelBuildingPlacement = useGameStore(state => state.cancelBuildingPlacement)
  const getTaskProgress = useGameStore(state => state.getTaskProgress)
  const upgradeBuilding = useGameStore(state => state.upgradeBuilding)
  const setTradeEnabled = useGameStore(state => state.setTradeEnabled)
  const tryManualHarvest = useGameStore(state => state.tryManualHarvest)
  const game = useGameStore(state => state.game)
  const tradeState = useGameStore(state => state.tradeState)
  const floatingTexts = useResourceStore(state => state.floatingTexts)
  const addFloatingText = useResourceStore(state => state.addFloatingText)
  const characters = useCharacterStore(state => state.characters)
  const buildings = useBuildingStore(state => state.buildings)
  const buildingPlacementMode = useBuildingStore(state => state.buildingPlacementMode)
  const selectedBuildingType = useBuildingStore(state => state.selectedBuildingType)
  const placementError = useBuildingStore(state => state.placementError)
  const setPlacementError = useBuildingStore(state => state.setPlacementError)
  const onlineMode = useOnlineStore(state => state.mode)
  const onlinePlayerId = useOnlineStore(state => state.playerId)
  const onlineLayout = useOnlineStore(state => state.lastFullSnapshot?.layout ?? [])
  const sendOnlineAction = useOnlineStore(state => state.sendAction)

  const containerRef = useRef<HTMLDivElement>(null)
  const manualHarvestCooldownsRef = useRef<Map<string, number>>(new Map())
  const viewportRef = useRef({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragFrameRef = useRef<number | null>(null)
  const pendingViewportRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const [viewport, setViewport] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 400 })
  const [upgradePreview, setUpgradePreview] = useState<BuildingUpgradePreview | null>(null)
  const [upgradeBuildingType, setUpgradeBuildingType] = useState<ProductionBuildingType | null>(null)
  const [upgradePosition, setUpgradePosition] = useState<{ x: number; y: number } | null>(null)

  const buildingEffects = useMemo(
    () => game?.getSettlementState().buildingEffects,
    [game]
  )

  const buildingConfigMap = useMemo(() => {
    const configs = game?.getConfigManager().getProductionBuildingConfigs() || []
    return new Map(configs.map(config => [config.id, config]))
  }, [game])

  const buildingByWorkerId = useMemo(() => {
    const map = new Map<string, typeof buildings[number]>()
    for (const building of buildings) {
      if (building.state.workerId) {
        map.set(building.state.workerId, building)
      }
    }
    return map
  }, [buildings])

  const buildingById = useMemo(() => {
    return new Map(buildings.map(building => [building.id, building]))
  }, [buildings])

  const characterNameById = useMemo(() => {
    return new Map(characters.map(character => [character.id, character.name]))
  }, [characters])

  useEffect(() => {
    viewportRef.current = viewport
    pendingViewportRef.current = viewport
  }, [viewport])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 50 : -50
      const mapPixelH = (mapData?.height || 0) * TILE_SIZE
      setViewport(prev => ({
        x: prev.x,
        y: Math.max(-viewportSize.height, Math.min(mapPixelH, prev.y + delta)),
      }))
    }

    container.addEventListener('wheel', wheelHandler, { passive: false })

    return () => {
      container.removeEventListener('wheel', wheelHandler)
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
      }
    }
  }, [mapData, viewportSize])

  const closeUpgradePreview = useCallback(() => {
    setUpgradePreview(null)
    setUpgradeBuildingType(null)
    setUpgradePosition(null)
  }, [])

  const buildOnlineUpgradePreview = useCallback((building: OnlineBuildingSnapshot): BuildingUpgradePreview | null => {
    const preview = building.upgradePreview
    if (!preview) {
      return null
    }

    const isOwnedByLocalPlayer = building.ownerPlayerId === onlinePlayerId
    return {
      buildingId: building.id,
      name: building.name,
      level: building.level,
      status: building.status,
      staffingStatus: preview.staffingStatus,
      staffingEffect: preview.staffingEffect,
      efficiencyLabel: preview.efficiencyLabel,
      nextLevel: preview.nextLevel,
      canUpgrade: isOwnedByLocalPlayer && preview.canUpgrade,
      reason: isOwnedByLocalPlayer ? preview.reason : '只能升级自己的建筑',
      essenceCost: preview.essenceCost,
      resources: preview.resources,
    }
  }, [onlinePlayerId])

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateSize()
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && containerRef.current
        ? new ResizeObserver(() => updateSize())
        : null
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    window.addEventListener('resize', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
      resizeObserver?.disconnect()
    }
  }, [])

  const alignedViewportX = Math.round(viewport.x)
  const alignedViewportY = Math.round(viewport.y)
  const visibleTilesX = Math.ceil(viewportSize.width / TILE_SIZE) + 2
  const visibleTilesY = Math.ceil(viewportSize.height / TILE_SIZE) + 2
  const startTileX = Math.max(0, Math.floor(alignedViewportX / TILE_SIZE))
  const startTileY = Math.max(0, Math.floor(alignedViewportY / TILE_SIZE))
  const endTileX = Math.min(mapData?.width || 0, startTileX + visibleTilesX)
  const endTileY = Math.min(mapData?.height || 0, startTileY + visibleTilesY)
  const showDetailedDecorations = !isDragging

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (buildingPlacementMode || upgradePreview) return
    isDraggingRef.current = true
    setIsDragging(true)
    const nextDragStart = {
      x: event.clientX - viewportRef.current.x,
      y: event.clientY - viewportRef.current.y,
    }
    dragStartRef.current = nextDragStart
  }, [buildingPlacementMode, upgradePreview])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDraggingRef.current) return

    const newX = event.clientX - dragStartRef.current.x
    const newY = event.clientY - dragStartRef.current.y
    const mapPixelW = (mapData?.width || 0) * TILE_SIZE
    const mapPixelH = (mapData?.height || 0) * TILE_SIZE

    pendingViewportRef.current = {
      x: Math.max(-viewportSize.width, Math.min(mapPixelW, newX)),
      y: Math.max(-viewportSize.height, Math.min(mapPixelH, newY)),
    }

    if (dragFrameRef.current !== null) {
      return
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null
      setViewport(pendingViewportRef.current)
    })
  }, [mapData, viewportSize])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    setIsDragging(false)
  }, [])

  const handleTileClick = useCallback((x: number, y: number) => {
    if (buildingPlacementMode && selectedBuildingType) {
      const result = dispatchOnlineAction({
        mode: onlineMode,
        sendAction: sendOnlineAction,
        action: { type: 'placeBuilding', buildingType: selectedBuildingType, worldX: x, worldY: y },
        runLocal: () => ({ success: placeBuilding(selectedBuildingType, x, y) }),
      })

      if (result.success) {
        cancelBuildingPlacement()
        if (result.delegated) {
          addFloatingText('建造已提交', x, y, 'success')
        }
      } else if (result.message) {
        setPlacementError(result.message)
      }
      return
    }

    const tile = mapData?.tiles[y]?.[x] as TileData | undefined
    if (!tile?.resource) {
      return
    }

    const tileKey = `${x},${y}`
    const now = Date.now()
    const lastHarvestAt = manualHarvestCooldownsRef.current.get(tileKey) ?? 0
    if (now - lastHarvestAt < 1500) {
      return
    }

    const result = dispatchOnlineManualHarvest({
      mode: onlineMode,
      playerId: onlinePlayerId,
      layout: onlineLayout,
      mapData,
      sendAction: sendOnlineAction,
      tryLocalHarvest: tryManualHarvest,
    }, x, y)
    if (result.success) {
      manualHarvestCooldownsRef.current.set(tileKey, now)
    }
  }, [
    addFloatingText,
    buildingPlacementMode,
    cancelBuildingPlacement,
    mapData,
    onlineLayout,
    onlineMode,
    onlinePlayerId,
    placeBuilding,
    selectedBuildingType,
    sendOnlineAction,
    setPlacementError,
    tryManualHarvest,
  ])

  const visibleTileElements = useMemo(() => {
    if (!mapData) {
      return null
    }

    return (mapData.tiles as TileData[][]).slice(startTileY, endTileY).map((row, rowIndex) =>
      row.slice(startTileX, endTileX).map((tile, colIndex) => {
        const x = startTileX + colIndex
        const y = startTileY + rowIndex
        const terrain = tile.terrain as TerrainType
        const terrainAssetPath = getTerrainAssetPath(terrain, '32', { x, y })
        const resourceAssetPath = tile.resource ? getResourceNodeAssetPath(tile.resource.type, '32') : null

        return (
          <div
            key={`${x}-${y}`}
            className={`map-tile ${buildingPlacementMode ? 'placeable' : ''} ${resourceAssetPath ? 'map-tile--resource-art' : ''}`}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              backgroundColor: TERRAIN_COLORS[terrain] || '#7CBA5F',
              backgroundImage: toBackgroundImage(terrainAssetPath),
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
              left: x * TILE_SIZE,
              top: y * TILE_SIZE,
              ...(buildArtStyle('--map-resource-art-image', resourceAssetPath) ?? {}),
            }}
            title={`${TERRAIN_NAMES[terrain] || tile.terrain} (${x}, ${y})`}
            onClick={() => handleTileClick(x, y)}
          >
            {tile.resource && <span className="resource-icon">{RESOURCE_ICONS[tile.resource.type] || '?'}</span>}
          </div>
        )
      })
    )
  }, [buildingPlacementMode, endTileX, endTileY, handleTileClick, mapData, startTileX, startTileY])

  const openUpgradePreview = (buildingId: string, type: ProductionBuildingType, x: number, y: number) => {
    if (onlineMode === 'online') {
      const building = buildingById.get(buildingId)
      if (!building || !isOnlineBuildingSnapshot(building)) {
        addFloatingText('无法读取升级信息', x, y, 'error')
        return
      }

      const preview = buildOnlineUpgradePreview(building)
      if (!preview) {
        addFloatingText('无法读取升级信息', x, y, 'error')
        return
      }

      setUpgradePreview(preview)
      setUpgradeBuildingType(type)
      setUpgradePosition({ x, y })
      return
    }

    const preview = game?.getBuildingUpgradePreview(buildingId)
    if (!preview) {
      addFloatingText('无法读取升级信息', x, y, 'error')
      return
    }

    setUpgradePreview(preview)
    setUpgradeBuildingType(type)
    setUpgradePosition({ x, y })
  }

  const confirmUpgrade = () => {
    if (!upgradePreview || !upgradePosition) return
    if (onlineMode === 'online' && !upgradePreview.canUpgrade) {
      addFloatingText(upgradePreview.reason || '当前无法升级', upgradePosition.x, upgradePosition.y, 'error')
      closeUpgradePreview()
      return
    }

    const result = dispatchOnlineAction({
      mode: onlineMode,
      sendAction: sendOnlineAction,
      action: { type: 'upgradeBuilding', buildingId: upgradePreview.buildingId },
      runLocal: () => upgradeBuilding(upgradePreview.buildingId),
    })

    addFloatingText(
      result.message || (result.delegated ? '升级已提交' : result.success ? '升级成功' : '升级失败'),
      upgradePosition.x,
      upgradePosition.y,
      result.success ? 'success' : 'error',
    )
    closeUpgradePreview()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (upgradePreview) {
        closeUpgradePreview()
        return
      }
      if (buildingPlacementMode) {
        cancelBuildingPlacement()
      }
    }
  }

  if (!mapData) {
    return <div className="map-loading">正在加载地图数据...</div>
  }

  return (
    <div
      ref={containerRef}
      className={`map-container ${isDragging ? 'map-container--dragging' : ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : buildingPlacementMode ? 'crosshair' : 'grab' }}
    >
      {buildingPlacementMode && (
        <div className="placement-mode-indicator">
          <span>
            Place mode: {selectedBuildingType ? BUILDING_ICONS[selectedBuildingType] : '[]'} {selectedBuildingType}
          </span>
          <button onClick={cancelBuildingPlacement}>取消（Esc）</button>
        </div>
      )}

      {placementError && <div className="placement-error">{placementError}</div>}

      {upgradePreview && upgradeBuildingType && (
        <div className="building-upgrade-modal" onClick={closeUpgradePreview}>
          <div className="building-upgrade-card" onClick={event => event.stopPropagation()}>
            <div className="building-upgrade-header">
              <h3>{BUILDING_ICONS[upgradeBuildingType] || '[]'} {upgradePreview.name}</h3>
              <button className="close-btn" onClick={closeUpgradePreview}>x</button>
            </div>
            <div className="building-upgrade-levels">Lv.{upgradePreview.level}{' -> '}{upgradePreview.nextLevel ? `Lv.${upgradePreview.nextLevel}` : 'MAX'}</div>

            <div className="building-upgrade-section">
              <strong>当前状态</strong>
              <div className="building-upgrade-line">状态：{upgradePreview.status === BuildingStatus.BUILDING ? '建造中' : '已运营'}</div>
              <div className="building-upgrade-line">值班：{upgradePreview.staffingStatus}</div>
              <div className="building-upgrade-line">效率：{upgradePreview.efficiencyLabel}</div>
              <div className="building-upgrade-line">{upgradePreview.staffingEffect}</div>
              {buildingEffects && (
                <div className="building-upgrade-line">聚落效果：{getBuildingEffectSummary(upgradeBuildingType, buildingEffects)}</div>
              )}
            </div>

            {upgradeBuildingType === ProductionBuildingType.TRADE_STATION && tradeState && (
              <div className="building-upgrade-section">
                <strong>贸易状态</strong>
                <div className="building-upgrade-line">自动贸易：{tradeState.enabled ? '已开启' : '已关闭'}</div>
                <div className="building-upgrade-line">保留库存：{tradeState.reserve.wood} / {tradeState.reserve.stone} / {tradeState.reserve.food}</div>
                <div className="building-upgrade-line">待出售：{tradeState.queuedBuffer.wood} / {tradeState.queuedBuffer.stone} / {tradeState.queuedBuffer.food}</div>
                <div className="building-upgrade-line">周期：每 {Math.floor(tradeState.cycleIntervalMs / 1000)} 秒，单轮上限 {tradeState.cycleCap}</div>
                <div className="building-upgrade-line">预计收益：每分钟 +{tradeState.estimatedGoldPerMinute} 金币</div>
                <div className="building-upgrade-line">
                  最近结果：{tradeState.lastResult ? tradeState.lastResult.goldEarned > 0 ? `+${tradeState.lastResult.goldEarned} 金币` : tradeState.lastResult.reason || '本轮未成交' : '暂无交易记录'}
                </div>
                {!!tradeState.lastResult && Object.keys(tradeState.lastResult.sold).length > 0 && (
                  <div className="building-upgrade-line">
                    卖出明细：{Object.entries(tradeState.lastResult.sold).map(([resource, amount]) => `${RESOURCE_ICONS[resource] || '[]'} ${amount}`).join(' / ')}
                  </div>
                )}
              </div>
            )}

            <div className="building-upgrade-section">
              <strong>当前效果</strong>
              {getUpgradeEffectLines(upgradeBuildingType, upgradePreview.level).map(line => (
                <div key={`current-${line}`} className="building-upgrade-line">{line}</div>
              ))}
            </div>

            {upgradePreview.nextLevel && (
              <div className="building-upgrade-section">
                <strong>升级后效果</strong>
                {getUpgradeEffectLines(upgradeBuildingType, upgradePreview.nextLevel).map(line => (
                  <div key={`next-${line}`} className="building-upgrade-line next">{line}</div>
                ))}
              </div>
            )}

            <div className="building-upgrade-section">
              <strong>升级消耗</strong>
              <div className="building-upgrade-cost">核心零件 {upgradePreview.essenceCost}</div>
              {Object.entries(upgradePreview.resources).map(([resource, amount]) => (
                <div key={resource} className="building-upgrade-cost">{RESOURCE_ICONS[resource] || '[]'} {amount}</div>
              ))}
            </div>

            {!upgradePreview.canUpgrade && upgradePreview.reason && (
              <div className="building-upgrade-reason">{upgradePreview.reason}</div>
            )}

            <div className="building-upgrade-actions">
              <button className="upgrade-cancel-btn" onClick={closeUpgradePreview}>取消</button>
              {upgradeBuildingType === ProductionBuildingType.TRADE_STATION && tradeState && (
                <button
                  className="upgrade-cancel-btn"
                  onClick={() => {
                    dispatchOnlineAction({
                      mode: onlineMode,
                      sendAction: sendOnlineAction,
                      action: { type: "setTradeEnabled", enabled: !tradeState.enabled },
                      runLocal: () => {
                        setTradeEnabled(!tradeState.enabled)
                        return { success: true }
                      },
                    })
                  }}
                >
                  {tradeState.enabled ? '关闭自动贸易' : '开启自动贸易'}
                </button>
              )}
              <button className="upgrade-confirm-btn" disabled={!upgradePreview.canUpgrade || !upgradePreview.nextLevel} onClick={confirmUpgrade}>确认升级</button>
            </div>
          </div>
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="viewport-info">
          位置：({Math.floor(-viewport.x / TILE_SIZE)}, {Math.floor(-viewport.y / TILE_SIZE)}) | 视野：{visibleTilesX}x{visibleTilesY}
        </div>
      )}

      <div
        className={`map-grid ${buildingPlacementMode ? 'placement-mode' : ''}`}
        style={{
          width: mapData.width * TILE_SIZE,
          height: mapData.height * TILE_SIZE,
          transform: `translate3d(${-alignedViewportX}px, ${-alignedViewportY}px, 0)`,
        }}
      >
        {visibleTileElements}

        {buildings.map(building => {
          const config = buildingConfigMap.get(building.configId)
          const size = config?.size || { width: 1, height: 1 }
          const buildingAssetPath = getBuildingAssetPath(
            building.type,
            size.width > 1 || size.height > 1 ? '128' : '64'
          )
          const effectSummary = getBuildingEffectSummary(building.type, buildingEffects)
          const effectChip = getBuildingEffectChip(building.type, buildingEffects)
          const workerName = building.state.workerId ? characterNameById.get(building.state.workerId) : null
          const progressPercent =
            building.status === BuildingStatus.BUILDING && config?.buildTime
              ? Math.min(100, (building.state.buildProgress / config.buildTime) * 100)
              : 0
          const staffingLabel =
            AUTO_OPERATIONAL_LABEL_BUILDINGS.has(building.type) && building.status === BuildingStatus.OPERATIONAL
              ? '自动运作'
              : building.status === BuildingStatus.BUILDING
              ? (building.state.hasWorker ? '施工中' : '待施工')
              : (building.state.hasWorker ? '已值班' : '空闲')

          return (
            <div
              key={building.id}
              className={`building ${building.status === BuildingStatus.BUILDING ? 'under-construction' : ''} ${buildingAssetPath ? 'building--art' : ''}`}
              style={{
                left: building.position.x * TILE_SIZE,
                top: building.position.y * TILE_SIZE,
                width: size.width * TILE_SIZE,
                height: size.height * TILE_SIZE,
                ...(buildArtStyle('--building-art-image', buildingAssetPath) ?? {}),
              }}
              title={`${building.name} | Lv.${building.level}\n${staffingLabel}\n${effectSummary}\n右键查看升级`}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                openUpgradePreview(building.id, building.type, building.position.x, building.position.y)
              }}
            >
              <div className="building-icon">{BUILDING_ICONS[building.type] || 'B'}</div>
              {showDetailedDecorations && (
                <>
                  <div className="building-name">{building.name}</div>
                  <div className="building-level">Lv.{building.level}</div>
                  <div className="building-status-tag">{staffingLabel}</div>
                  {building.status === BuildingStatus.OPERATIONAL && effectChip && (
                    <div className="building-effect-chip">{effectChip}</div>
                  )}
                  {workerName && building.status === BuildingStatus.BUILDING && (
                    <div className={`building-worker-tag ${building.status === BuildingStatus.BUILDING ? 'building' : 'operational'}`}>
                      {building.status === BuildingStatus.BUILDING ? '建造' : '值班'} {workerName}
                    </div>
                  )}

                  {building.status === BuildingStatus.BUILDING && (
                    <div className="construction-progress">
                      <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
                    </div>
                  )}

                  {building.status === BuildingStatus.OPERATIONAL && config?.outputResource && (
                    <div className="production-progress">
                      <div className="progress-bar production" style={{ width: `${building.state.productionProgress * 100}%` }} />
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}

        {characters.map(character => {
          const taskProgress = getTaskProgress(character.id)
          const assignedBuilding = buildingByWorkerId.get(character.id)
          const characterAssetPath = getProfessionAssetPath(character.profession, '32')
          const showProgress =
            (character.state === CharacterState.GATHERING || character.state === CharacterState.WORKING) && taskProgress

          return (
            <div
              key={character.id}
              className={`character ${assignedBuilding ? 'assigned-to-building' : ''} ${characterAssetPath ? 'character--art' : ''}`}
              style={{
                left: character.position.x * TILE_SIZE,
                top: character.position.y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                cursor: 'pointer',
                ...(buildArtStyle('--character-art-image', characterAssetPath) ?? {}),
              }}
              title={`${character.name} - ${STATE_DISPLAY_NAMES[character.state]}`}
              onClick={(event) => {
                event.stopPropagation()
                onCharacterClick?.(character)
              }}
            >
              <div className="character-icon">人</div>
              {showDetailedDecorations && (
                <>
                  <div className="character-state-floating" style={{ color: STATE_COLORS[character.state] }}>
                    {STATE_DISPLAY_NAMES[character.state]}
                  </div>
                  {assignedBuilding && character.state === CharacterState.BUILDING && (
                    <div className="character-assignment-tag">
                      施工 | {assignedBuilding.name}
                    </div>
                  )}
                  {showProgress && (
                    <div className="gathering-progress">
                      <div className="progress-bar gathering" style={{ width: `${(taskProgress?.progress || 0) * 100}%` }} />
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}

        {showDetailedDecorations && floatingTexts.map(ft => (
          <div
            key={ft.id}
            className={`floating-text ${ft.type}`}
            style={{
              left: ft.x * TILE_SIZE + TILE_SIZE / 2,
              top: ft.y * TILE_SIZE,
            }}
          >
            {ft.text}
          </div>
        ))}
      </div>
    </div>
  )
}
