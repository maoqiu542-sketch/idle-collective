import { useState } from 'react'
import { useResourceStore } from '@ui/stores/resourceStore'
import { TerrainType } from '@app-types/map.types'
import './TerrainEditor.css'

type TerrainTool = 'raise' | 'lower' | 'flatten' | 'paint' | 'water'

const TERRAIN_TOOLS: { id: TerrainTool; name: string; icon: string; description: string }[] = [
  { id: 'raise', name: '升高', icon: '🔺', description: '提升地形高度' },
  { id: 'lower', name: '降低', icon: '🔻', description: '降低地形高度' },
  { id: 'flatten', name: '平整', icon: '➖', description: '平整选定区域' },
  { id: 'paint', name: '涂抹', icon: '🎨', description: '改变地形材质' },
  { id: 'water', name: '水体', icon: '💧', description: '添加或移除水' },
]

const TERRAIN_TYPES: { type: TerrainType; name: string; icon: string; color: string }[] = [
  { type: TerrainType.GRASS, name: '草地', icon: '🌿', color: '#7CBA5F' },
  { type: TerrainType.FOREST, name: '森林', icon: '🌲', color: '#2D5A27' },
  { type: TerrainType.MOUNTAIN, name: '山地', icon: '⛰️', color: '#8B7355' },
  { type: TerrainType.SAND, name: '沙地', icon: '🏖️', color: '#E8D4A8' },
  { type: TerrainType.SNOW, name: '雪地', icon: '❄️', color: '#F5F5F5' },
]

interface TerrainEditorProps {
  onClose: () => void
}

export function TerrainEditor({ onClose }: TerrainEditorProps) {
  const { resources } = useResourceStore()
  const [activeTool, setActiveTool] = useState<TerrainTool>('paint')
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>(TerrainType.GRASS)
  const [brushSize, setBrushSize] = useState(1)
  const [isEditing, setIsEditing] = useState(false)

  const gold = resources.get('gold' as any) || 0

  const toolCosts: Record<TerrainTool, number> = {
    raise: 1,
    lower: 1,
    flatten: 0.5,
    paint: 0.2,
    water: 2,
  }

  const currentCost = toolCosts[activeTool]

  const handleToolClick = (tool: TerrainTool) => {
    setActiveTool(tool)
    setIsEditing(false)
  }

  const handleStartEdit = () => {
    if (gold < currentCost) {
      alert(`金币不足！需要 ${currentCost} 金币`)
      return
    }
    setIsEditing(true)
    alert(`地形编辑模式已开启！\n工具: ${TERRAIN_TOOLS.find(t => t.id === activeTool)?.name}\n点击地图进行编辑\nESC退出`)
  }

  const handleStopEdit = () => {
    setIsEditing(false)
  }

  return (
    <div className="terrain-editor-overlay" onClick={onClose}>
      <div className="terrain-editor" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h2>🏗️ 地形改造</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="editor-content">
          <div className="tools-section">
            <h3>工具</h3>
            <div className="tools-grid">
              {TERRAIN_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                  onClick={() => handleToolClick(tool.id)}
                  title={tool.description}
                >
                  <span className="tool-icon">{tool.icon}</span>
                  <span className="tool-name">{tool.name}</span>
                  <span className="tool-cost">💰{toolCosts[tool.id]}/格</span>
                </button>
              ))}
            </div>
          </div>

          {activeTool === 'paint' && (
            <div className="terrain-section">
              <h3>地形材质</h3>
              <div className="terrain-grid">
                {TERRAIN_TYPES.map((terrain) => (
                  <button
                    key={terrain.type}
                    className={`terrain-btn ${selectedTerrain === terrain.type ? 'active' : ''}`}
                    onClick={() => setSelectedTerrain(terrain.type)}
                    style={{ borderColor: selectedTerrain === terrain.type ? terrain.color : 'transparent' }}
                  >
                    <span className="terrain-icon">{terrain.icon}</span>
                    <span className="terrain-name">{terrain.name}</span>
                    <span 
                      className="terrain-color" 
                      style={{ backgroundColor: terrain.color }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="brush-section">
            <h3>画笔大小</h3>
            <div className="brush-sizes">
              {[1, 2, 3, 5].map((size) => (
                <button
                  key={size}
                  className={`brush-btn ${brushSize === size ? 'active' : ''}`}
                  onClick={() => setBrushSize(size)}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>

          <div className="cost-info">
            <span>💰 当前消耗: {currentCost} 金币/格</span>
          </div>

          <div className="editor-actions">
            <button 
              className="start-btn"
              onClick={handleStartEdit}
              disabled={gold < currentCost}
            >
              {isEditing ? '编辑中... (点击地图)' : '开始编辑'}
            </button>
            {isEditing && (
              <button className="stop-btn" onClick={handleStopEdit}>
                停止编辑
              </button>
            )}
          </div>

          <div className="editor-tip">
            <p>💡 提示：地形编辑需要消耗金币</p>
            <p>💡 在地图上点击或拖动来编辑地形</p>
            <p>💡 按 ESC 键退出编辑模式</p>
          </div>
        </div>
      </div>
    </div>
  )
}
