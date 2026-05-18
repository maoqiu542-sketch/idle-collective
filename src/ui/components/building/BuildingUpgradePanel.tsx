import { ResourceType } from '@app-types/map.types'
import { ProductionBuildingType } from '@app-types/production-building.types'
import { useResourceStore } from '@ui/stores/resourceStore'
import './BuildingUpgradePanel.css'

interface BuildingUpgradePreview {
  buildingId: string
  name: string
  type: ProductionBuildingType
  level: number
  nextLevel: number | null
  canUpgrade: boolean
  reason?: string
  essenceCost: number
  resources: Record<string, number>
}

interface BuildingUpgradePanelProps {
  preview: BuildingUpgradePreview
  onConfirm: () => void
  onClose: () => void
}

const RESOURCE_LABELS: Record<string, { icon: string; name: string }> = {
  [ResourceType.WOOD]: { icon: '🪵', name: '木材' },
  [ResourceType.STONE]: { icon: '🪨', name: '石材' },
  [ResourceType.GOLD]: { icon: '💰', name: '金币' },
  [ResourceType.CORE_PARTS]: { icon: '⚙️', name: '核心零件' },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getEffectSummary(type: ProductionBuildingType, level: number): string[] {
  switch (type) {
    case ProductionBuildingType.HOUSE:
      return [`休息恢复 +${level * 8}`, `舒适恢复 +${level * 4}`]
    case ProductionBuildingType.KITCHEN:
      return [`进食恢复 +${level * 10}`, `农场效率 x${clamp(1 + level * 0.15, 1, 1.75).toFixed(2)}`]
    case ProductionBuildingType.WAREHOUSE:
      return [`核心容量 ${500 + level * 250}`, `生产效率 x${clamp(1 + level * 0.08, 1, 1.4).toFixed(2)}`]
    case ProductionBuildingType.BARRACKS:
      return [`战备效率 x${clamp(1 + level * 0.08, 1, 1.4).toFixed(2)}`]
    case ProductionBuildingType.RECRUITMENT_STATION:
      return [
        `候选上限 ${Math.min(6, 3 + Math.max(0, level - 1))}`,
        `刷新花费 ${Math.max(20, 50 - level * 5)}`,
        `品质加成 +${level * 4}`,
      ]
    case ProductionBuildingType.RESEARCH_DESK:
      return [
        `研究倍率 x${clamp(1 + level * 0.12, 1, 1.6).toFixed(2)}`,
        `研究席位 ${level}`,
      ]
    case ProductionBuildingType.LUMBER_MILL:
    case ProductionBuildingType.QUARRY:
    case ProductionBuildingType.FARM:
      return [`基础产量系数 x${level}`]
    default:
      return [`建筑等级 ${level}`]
  }
}

export function BuildingUpgradePanel({ preview, onConfirm, onClose }: BuildingUpgradePanelProps) {
  const { resources, coreParts } = useResourceStore()
  const currentEffects = getEffectSummary(preview.type, preview.level)
  const nextEffects = preview.nextLevel ? getEffectSummary(preview.type, preview.nextLevel) : []

  return (
    <div className="building-upgrade-overlay" onClick={onClose}>
      <div className="building-upgrade-panel" onClick={(event) => event.stopPropagation()}>
        <div className="building-upgrade-header">
          <div>
            <h3>{preview.name}</h3>
            <p>
              Lv.{preview.level}
              {preview.nextLevel ? ` → Lv.${preview.nextLevel}` : ' 已达上限'}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="building-upgrade-section">
          <div>
            <h4>当前效果</h4>
            <ul>
              {currentEffects.map(effect => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>升级后效果</h4>
            <ul>
              {nextEffects.length > 0 ? nextEffects.map(effect => <li key={effect}>{effect}</li>) : <li>当前已达到等级上限</li>}
            </ul>
          </div>
        </div>

        <div className="building-upgrade-costs">
          <h4>升级消耗</h4>
          <div className="building-upgrade-cost-grid">
            <div className={`building-upgrade-cost ${coreParts >= preview.essenceCost ? 'enough' : 'not-enough'}`}>
              <span>⚙️ 核心零件</span>
              <span>
                {preview.essenceCost} / 当前 {coreParts}
              </span>
            </div>
            {Object.entries(preview.resources).map(([type, amount]) => {
              const current = resources.get(type as ResourceType) || 0
              const label = RESOURCE_LABELS[type] || { icon: '📦', name: type }
              return (
                <div key={type} className={`building-upgrade-cost ${current >= amount ? 'enough' : 'not-enough'}`}>
                  <span>
                    {label.icon} {label.name}
                  </span>
                  <span>
                    {amount} / 当前 {current}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {!preview.canUpgrade && <div className="building-upgrade-reason">{preview.reason || '当前无法升级。'}</div>}

        <div className="building-upgrade-actions">
          <button className="secondary-btn" onClick={onClose}>
            取消
          </button>
          <button className="primary-btn" onClick={onConfirm} disabled={!preview.canUpgrade || !preview.nextLevel}>
            确认升级
          </button>
        </div>
      </div>
    </div>
  )
}
