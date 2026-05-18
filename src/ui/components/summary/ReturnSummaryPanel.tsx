import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import type { SessionSummary } from '@app-types/session.types'
import { ResourceType } from '@app-types/map.types'
import './ReturnSummaryPanel.css'

const RESOURCE_LABELS: Partial<Record<ResourceType, string>> = {
  [ResourceType.WOOD]: '木材',
  [ResourceType.STONE]: '石材',
  [ResourceType.FOOD]: '食物',
  [ResourceType.GOLD]: '金币',
  [ResourceType.CORE_PARTS]: '核心零件',
}

const RESOURCE_ICONS: Partial<Record<ResourceType, string>> = {
  [ResourceType.WOOD]: '🪵',
  [ResourceType.STONE]: '🪨',
  [ResourceType.FOOD]: '🍖',
  [ResourceType.GOLD]: '💰',
  [ResourceType.CORE_PARTS]: '⚙️',
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainMinutes = minutes % 60
    return `${hours} 小时 ${remainMinutes} 分钟`
  }
  return `${minutes} 分钟 ${seconds} 秒`
}

interface ReturnSummaryPanelProps {
  onClose: () => void
}

export function ReturnSummaryPanel({ onClose }: ReturnSummaryPanelProps) {
  const getPendingSessionSummary = useGameStore(state => state.getPendingSessionSummary)
  const dismissSessionSummary = useGameStore(state => state.dismissSessionSummary)
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  useEffect(() => {
    const s = getPendingSessionSummary()
    setSummary(s)
  }, [getPendingSessionSummary])

  if (!summary) return null

  const handleDismiss = () => {
    dismissSessionSummary()
    onClose()
  }

  const durationMinutes = Math.floor(summary.durationMs / 60000)
  if (durationMinutes < 1) return null

  return (
    <div className="return-summary-overlay" onClick={handleDismiss}>
      <div className="return-summary-panel" onClick={e => e.stopPropagation()}>
        <div className="return-summary-header">
          <h2>📍 回归报告</h2>
          <span className="return-summary-duration">
            离开 {formatDuration(summary.durationMs)}
          </span>
        </div>

        {summary.newUnlocks.length > 0 && (
          <section className="summary-section">
            <h3>✨ 新解锁</h3>
            <ul className="summary-unlock-list">
              {summary.newUnlocks.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {summary.resourcesGained.length > 0 && (
          <section className="summary-section">
            <h3>📦 资源变化</h3>
            <div className="summary-resource-grid">
              {summary.resourcesGained.map((r, i) => (
                <div key={i} className="summary-resource-item">
                  <span className="summary-resource-icon">
                    {RESOURCE_ICONS[r.type] || '📦'}
                  </span>
                  <span className="summary-resource-label">
                    {RESOURCE_LABELS[r.type] || r.type}
                  </span>
                  <span className="summary-resource-amount">
                    +{r.amount}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {summary.buildingsCompleted.length > 0 && (
          <section className="summary-section">
            <h3>🏗️ 建筑完工</h3>
            <ul className="summary-list">
              {summary.buildingsCompleted.map((b, i) => (
                <li key={i}>
                  {b.name}（Lv.{b.level}）
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.researchCompleted.length > 0 && (
          <section className="summary-section">
            <h3>🔬 研究完成</h3>
            <ul className="summary-list">
              {summary.researchCompleted.map((r, i) => (
                <li key={i}>{r.name}</li>
              ))}
            </ul>
          </section>
        )}

        {summary.bossBattles.length > 0 && (
          <section className="summary-section">
            <h3>⚔️ Boss 战斗</h3>
            <ul className="summary-list">
              {summary.bossBattles.map((b, i) => (
                <li key={i}>
                  {b.won ? '✅' : '❌'} {b.bossName} Lv.{b.bossLevel}
                  {b.won && b.essenceEarned > 0 && `（+${b.essenceEarned} 核心零件）`}
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.bottlenecks.length > 0 && (
          <section className="summary-section summary-bottleneck">
            <h3>⚠️ 当前瓶颈</h3>
            <ul className="summary-list">
              {summary.bottlenecks.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>
        )}

        <button className="summary-dismiss-button" onClick={handleDismiss}>
          我知道了
        </button>
      </div>
    </div>
  )
}
