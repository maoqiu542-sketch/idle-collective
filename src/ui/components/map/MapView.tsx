import { useState, useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { TerrainType, ResourceType } from '@app-types/map.types'
import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import { STATE_DISPLAY_NAMES, STATE_COLORS } from '@app-types/state-machine.types'
import { Character } from '@app-types/character.types'
import './MapView.css'

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

const BUILDING_ICONS: Record<ProductionBuildingType, string> = {
  [ProductionBuildingType.LUMBER_MILL]: '🪵',
  [ProductionBuildingType.QUARRY]: '🪨',
  [ProductionBuildingType.RANCH]: '🐄',
}

const TILE_SIZE = 32

interface TileData {
  terrain: TerrainType
  resource?: {
    type: string
    amount: number
  }
}

interface MapViewProps {
  onCharacterClick?: (character: Character) => void
}

export function MapView({ onCharacterClick }: MapViewProps) {
  const { mapData, characters, buildings, buildingPlacementMode, selectedBuildingType, placementError, placeBuilding, cancelBuildingPlacement, floatingTexts } = useGameStore()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 400 })

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
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const visibleTilesX = Math.ceil(viewportSize.width / TILE_SIZE) + 2
  const visibleTilesY = Math.ceil(viewportSize.height / TILE_SIZE) + 2

  const startTileX = Math.max(0, Math.floor(viewport.x / TILE_SIZE))
  const startTileY = Math.max(0, Math.floor(viewport.y / TILE_SIZE))
  const endTileX = Math.min(mapData?.width || 0, startTileX + visibleTilesX)
  const endTileY = Math.min(mapData?.height || 0, startTileY + visibleTilesY)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (buildingPlacementMode) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
  }, [buildingPlacementMode, viewport])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    const maxX = ((mapData?.width || 0) * TILE_SIZE) - viewportSize.width
    const maxY = ((mapData?.height || 0) * TILE_SIZE) - viewportSize.height
    setViewport({
      x: Math.max(-viewportSize.width / 2, Math.min(maxX + viewportSize.width / 2, newX)),
      y: Math.max(-viewportSize.height / 2, Math.min(maxY + viewportSize.height / 2, newY)),
    })
  }, [isDragging, dragStart, mapData, viewportSize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 50 : -50
    setViewport(prev => ({
      x: prev.x,
      y: Math.max(-viewportSize.height / 2, Math.min(((mapData?.height || 0) * TILE_SIZE), prev.y + delta)),
    }))
  }, [mapData, viewportSize])

  if (!mapData) {
    return <div className="map-loading">加载地图...</div>
  }

  const getTileColor = (tile: TileData) => {
    const terrain = tile.terrain as TerrainType
    return TERRAIN_COLORS[terrain] || '#7CBA5F'
  }

  const getResourceIcon = (tile: TileData) => {
    if (!tile.resource) return null
    const icons: Record<string, string> = {
      [ResourceType.WOOD]: '🌲',
      [ResourceType.STONE]: '🪨',
      [ResourceType.FOOD]: '🌾',
      [ResourceType.GOLD]: '💰',
    }
    return icons[tile.resource.type] || '📦'
  }

  const getTerrainName = (tile: TileData) => {
    const terrain = tile.terrain as TerrainType
    return TERRAIN_NAMES[terrain] || tile.terrain
  }

  const handleTileClick = (x: number, y: number) => {
    if (buildingPlacementMode && selectedBuildingType) {
      placeBuilding(x, y)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && buildingPlacementMode) {
      cancelBuildingPlacement()
    }
  }

  return (
    <div 
      ref={containerRef}
      className="map-container" 
      onKeyDown={handleKeyDown} 
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : (buildingPlacementMode ? 'crosshair' : 'grab') }}
    >
      {buildingPlacementMode && (
        <div className="placement-mode-indicator">
          <span>放置模式: {selectedBuildingType && BUILDING_ICONS[selectedBuildingType]} {selectedBuildingType}</span>
          <button onClick={cancelBuildingPlacement}>取消 (ESC)</button>
        </div>
      )}
      
      {placementError && (
        <div className="placement-error">
          {placementError}
        </div>
      )}

      <div className="viewport-info">
        位置: ({Math.floor(-viewport.x / TILE_SIZE)}, {Math.floor(-viewport.y / TILE_SIZE)}) | 
        可见: {visibleTilesX}x{visibleTilesY} | 
        拖动移动 | 滚轮上下
      </div>

      <div 
        className={`map-grid ${buildingPlacementMode ? 'placement-mode' : ''}`}
        style={{
          width: mapData.width * TILE_SIZE,
          height: mapData.height * TILE_SIZE,
          transform: `translate(${-viewport.x}px, ${-viewport.y}px)`,
        }}
      >
        {(mapData.tiles as TileData[][]).slice(startTileY, endTileY).map((row, rowIndex) =>
          row.slice(startTileX, endTileX).map((tile, colIndex) => {
            const x = startTileX + colIndex
            const y = startTileY + rowIndex
            return (
              <div
                key={`${x}-${y}`}
                className={`map-tile ${buildingPlacementMode ? 'placeable' : ''}`}
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  backgroundColor: getTileColor(tile),
                  left: x * TILE_SIZE,
                  top: y * TILE_SIZE,
                }}
                title={`${getTerrainName(tile)} (${x}, ${y})`}
                onClick={() => handleTileClick(x, y)}
              >
                {getResourceIcon(tile) && (
                  <span className="resource-icon">{getResourceIcon(tile)}</span>
                )}
              </div>
            )
          })
        )}

        {buildings.map((building) => (
          <div
            key={building.id}
            className={`building ${building.status === BuildingStatus.BUILDING ? 'under-construction' : ''}`}
            style={{
              left: building.position.x * TILE_SIZE,
              top: building.position.y * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
            title={`${building.name} - ${building.status === BuildingStatus.BUILDING ? '建造中' : '生产中'}`}
          >
            <div className="building-icon">
              {BUILDING_ICONS[building.type] || '🏠'}
            </div>
            {building.status === BuildingStatus.BUILDING && (
              <div className="construction-progress">
                <div 
                  className="progress-bar"
                  style={{ width: `${building.state.buildProgress * 100 / 60}%` }}
                />
              </div>
            )}
            {building.status === BuildingStatus.OPERATIONAL && (
              <div className="production-progress">
                <div 
                  className="progress-bar production"
                  style={{ width: `${building.state.productionProgress * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}

        {characters.map((character) => (
          <div
            key={character.id}
            className="character"
            style={{
              left: character.position.x * TILE_SIZE,
              top: character.position.y * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE,
              cursor: 'pointer',
            }}
            title={`${character.name} - ${STATE_DISPLAY_NAMES[character.state]} (点击查看详情)`}
            onClick={(e) => {
              e.stopPropagation()
              onCharacterClick?.(character)
            }}
          >
            <div className="character-icon">👤</div>
            <div className="character-state-floating" style={{ color: STATE_COLORS[character.state] }}>
              {STATE_DISPLAY_NAMES[character.state]}
            </div>
          </div>
        ))}

        {floatingTexts.map((ft) => (
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
