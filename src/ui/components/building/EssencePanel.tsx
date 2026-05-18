import { useResourceStore } from '@ui/stores/resourceStore'
import { BossLevel } from '@app-types/building-essence.types'
import './EssencePanel.css'

const BOSS_INFO: Record<BossLevel, { name: string; drops: string }> = {
  [BossLevel.LEVEL_1]: { name: '森林守护者', drops: '5-10' },
  [BossLevel.LEVEL_2]: { name: '岩石巨人', drops: '15-25' },
  [BossLevel.LEVEL_3]: { name: '风暴领主', drops: '40-60' },
  [BossLevel.LEVEL_4]: { name: '深渊巨兽', drops: '80-120' },
  [BossLevel.LEVEL_5]: { name: '世界之主', drops: '200-300' },
}

interface EssencePanelProps {
  onClose: () => void
}

export function EssencePanel({ onClose }: EssencePanelProps) {
  const { coreParts, corePartsCapacity } = useResourceStore()
  
  const percentage = corePartsCapacity > 0 ? (coreParts / corePartsCapacity) * 100 : 0

  return (
    <div className="essence-overlay" onClick={onClose}>
      <div className="essence-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>⚙️ 核心零件</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="essence-storage">
          <div className="essence-display">
              <span className="essence-icon">⚙️</span>
              <span className="essence-amount">{coreParts}</span>
              <span className="essence-max">/ {corePartsCapacity}</span>
          </div>
          <div className="essence-bar">
            <div className="essence-fill" style={{ width: `${percentage}%` }}></div>
          </div>
        </div>

        <div className="boss-drops">
          <h3>👹 Boss掉落</h3>
          <div className="boss-list">
            {Object.entries(BOSS_INFO).map(([level, info]) => (
              <div key={level} className="boss-item">
                <span className="boss-level">Lv.{level}</span>
                <span className="boss-name">{info.name}</span>
                <span className="boss-drops">+{info.drops}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="essence-tip">
              <p>💡 击败 Boss 可获得核心零件</p>
              <p>💡 核心零件用于关键建筑升级和科技突破</p>
        </div>
      </div>
    </div>
  )
}
