import { useEffect, useState } from 'react'
import { EquipmentQuality } from '@app-types/equipment.types'
import { ResourceType } from '@app-types/map.types'
import { useGameStore } from '@ui/stores/gameStore'
import { useCharacterStore } from '@ui/stores/characterStore'
import { useResourceStore } from '@ui/stores/resourceStore'
import './DebugPanel.css'

interface DebugAction {
  id: string
  name: string
  icon: string
  description: string
  action: () => void
}

export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const {
    game,
    addResource,
    grantDebugEquipmentPack,
    spawnDebugBoss,
    updateResources,
    updateEssence,
    updateSettlementState,
  } = useGameStore()
  const { characters, equipments } = useCharacterStore()
  const { resources, coreParts, corePartsCapacity } = useResourceStore()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleAddMaterials = () => {
    addResource(ResourceType.WOOD, 500)
    addResource(ResourceType.STONE, 500)
    addResource(ResourceType.FOOD, 500)
    addResource(ResourceType.GOLD, 3000)
  }

  const handleAddCoreParts = () => {
    addResource(ResourceType.CORE_PARTS, 80)
  }

  const handleGrantLegendaryGear = () => {
    const created = grantDebugEquipmentPack(EquipmentQuality.LEGENDARY)
    alert(created > 0 ? `已添加 ${created} 件传奇装备。` : '没有可用的装备配置。')
  }

  const handleQuickBoss = () => {
    if (!game) return
    spawnDebugBoss()
    updateSettlementState()
    alert('已立即刷新一只 Boss。')
  }

  const handleSyncState = () => {
    updateResources()
    updateEssence()
    updateSettlementState()
  }

  const debugActions: DebugAction[] = [
    {
      id: 'materials',
      name: '加基础材料',
      icon: '📦',
      description: '增加木材、石材、食物和金币',
      action: handleAddMaterials,
    },
    {
      id: 'core-parts',
      name: '加核心零件',
      icon: '⚙',
      description: '增加 80 个核心零件',
      action: handleAddCoreParts,
    },
    {
      id: 'legendary-gear',
      name: '传奇装备',
      icon: '🗡',
      description: '添加一组传奇装备',
      action: handleGrantLegendaryGear,
    },
    {
      id: 'quick-boss',
      name: '刷新 Boss',
      icon: '👹',
      description: '立即生成一只 Boss',
      action: handleQuickBoss,
    },
    {
      id: 'sync',
      name: '同步状态',
      icon: '🔄',
      description: '强制同步当前显示状态',
      action: handleSyncState,
    },
  ]

  if (!isVisible) {
    return (
      <button
        className="debug-toggle"
        onClick={() => setIsVisible(true)}
        title="调试面板（Ctrl+Shift+D）"
      >
        🛠
      </button>
    )
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>调试工具</h3>
        <button className="debug-close" onClick={() => setIsVisible(false)}>
          ×
        </button>
      </div>

      <div className="debug-actions">
        {debugActions.map(action => (
          <button
            key={action.id}
            className="debug-action"
            onClick={action.action}
            title={action.description}
          >
            <span className="debug-action-icon">{action.icon}</span>
            <span className="debug-action-name">{action.name}</span>
          </button>
        ))}
      </div>

      <div className="debug-info">
        <div>角色数：{characters.length}</div>
        <div>装备数：{equipments.length}</div>
        <div>资源种类：{resources.size}</div>
        <div>核心零件：{coreParts}/{corePartsCapacity}</div>
      </div>
    </div>
  )
}
