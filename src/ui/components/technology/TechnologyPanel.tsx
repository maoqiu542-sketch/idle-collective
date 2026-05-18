import { useMemo, useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { useTechStore } from '@ui/stores/techStore'
import { TechBranch, TechStatus } from '@app-types/technology.types'
import './TechnologyPanel.css'

const BRANCH_INFO: Record<TechBranch, { name: string; icon: string; color: string }> = {
  [TechBranch.BUILDING]: { name: '生存科技', icon: '🏠', color: '#4caf50' },
  [TechBranch.PRODUCTION]: { name: '生产科技', icon: '⚒️', color: '#2196f3' },
  [TechBranch.COMBAT]: { name: '战备科技', icon: '🛡️', color: '#f44336' },
  [TechBranch.CIVILIAN]: { name: '民生科技', icon: '✨', color: '#ff9800' },
}

const V1_BRANCHES: TechBranch[] = [TechBranch.BUILDING, TechBranch.PRODUCTION, TechBranch.COMBAT]

interface TechnologyPanelProps {
  onClose: () => void
}

export function TechnologyPanel({ onClose }: TechnologyPanelProps) {
  const { game } = useGameStore()
  const { techPoints, completedTechs } = useTechStore()
  const [selectedBranch, setSelectedBranch] = useState<TechBranch>(TechBranch.BUILDING)

  const techManager = game?.getTechnologyManager()
  const techConfigs = techManager?.getAllTechConfigs() || []
  const branchTechs = techConfigs.filter(tech => tech.branch === selectedBranch)
  const settlementState = game?.getSettlementState()
  const researchDeskState = settlementState?.researchDeskState

  const nextResearchPreview = useMemo(() => {
    if (!researchDeskState || researchDeskState.totalLevel <= 0) {
      return null
    }

    return {
      outputMultiplier: Math.min(1.6, 1 + (researchDeskState.totalLevel + 1) * 0.12),
      workerCapacity: researchDeskState.workerCapacity + 1,
    }
  }, [researchDeskState])

  const getTechStatus = (techId: string): TechStatus => {
    if (completedTechs.includes(techId)) return TechStatus.COMPLETED
    return techManager?.getTechProgress(techId)?.status || TechStatus.LOCKED
  }

  const canResearch = (techId: string): boolean => {
    if (!techManager) return false
    return techManager.canResearch(techId).canUnlock
  }

  const hasResearchDesk = (researchDeskState?.totalLevel || 0) > 0

  const handleResearch = (techId: string) => {
    if (!techManager) return
    const result = techManager.startResearch(techId)
    if (!result.success) {
      alert(result.message || '研究失败')
    }
  }

  return (
    <div className="technology-overlay" onClick={onClose}>
      <div className="technology-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <h2>科技研究</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tech-points">
          <span className="points-icon">⚙️</span>
          <span className="points-amount">{Math.floor(techPoints)}</span>
          <span className="points-label">科技点</span>
        </div>

        <div className="research-bonus-panel">
          <div className="research-bonus-card">
            <span className="research-bonus-label">研究台总等级</span>
            <strong>{researchDeskState?.totalLevel || 0}</strong>
          </div>
          <div className="research-bonus-card">
            <span className="research-bonus-label">研究倍率</span>
            <strong>x{(researchDeskState?.outputMultiplier || 1).toFixed(2)}</strong>
          </div>
          <div className="research-bonus-card">
            <span className="research-bonus-label">自动研究席位</span>
            <strong>{researchDeskState?.assignedWorkers || 0}/{researchDeskState?.workerCapacity || 0}</strong>
          </div>
        </div>

        {researchDeskState && researchDeskState.totalLevel > 0 && nextResearchPreview && (
          <div className="research-upgrade-preview">
            <div className="research-upgrade-title">下一等级研究台预期收益</div>
            <div>研究倍率：x{researchDeskState.outputMultiplier.toFixed(2)} → x{nextResearchPreview.outputMultiplier.toFixed(2)}</div>
            <div>自动研究席位：{researchDeskState.workerCapacity} → {nextResearchPreview.workerCapacity}</div>
          </div>
        )}

        {(!researchDeskState || researchDeskState.totalLevel === 0) && (
          <div className="research-upgrade-preview">
            建造研究台后，研究员会自动产出科技点；升级研究台会提高研究倍率并增加自动研究席位。
          </div>
        )}

        <div className="tech-points-help">
          <details>
            <summary>科技点来源</summary>
            <div className="help-content">
              <div className="help-item">
                <span className="help-icon">🔬</span>
                <span className="help-text">研究台和研究员会持续产出科技点。</span>
              </div>
              <div className="help-item">
                <span className="help-icon">👹</span>
                <span className="help-text">击败 Boss 可以获得额外科技点。</span>
              </div>
            </div>
          </details>
        </div>

        <div className="branch-tabs">
          {V1_BRANCHES.map(branch => {
            const info = BRANCH_INFO[branch]
            return (
              <button
                key={branch}
                className={`branch-tab ${selectedBranch === branch ? 'active' : ''}`}
                onClick={() => setSelectedBranch(branch)}
                style={{ borderColor: selectedBranch === branch ? info.color : 'transparent' }}
              >
                <span className="branch-icon">{info.icon}</span>
                <span className="branch-name">{info.name}</span>
              </button>
            )
          })}
        </div>

        <div className="tech-list">
          {branchTechs.map(tech => {
            const status = getTechStatus(tech.id)
            const canStart = canResearch(tech.id)

            return (
              <div key={tech.id} className={`tech-card ${status}`} style={{ borderColor: BRANCH_INFO[tech.branch].color }}>
                <div className="tech-header">
                  <span className="tech-level">Lv.{tech.level}</span>
                  <span className="tech-status">
                    {status === TechStatus.COMPLETED && '已完成'}
                    {status === TechStatus.AVAILABLE && '可研究'}
                    {status === TechStatus.LOCKED && '未解锁'}
                    {status === TechStatus.RESEARCHING && '研究中'}
                  </span>
                </div>

                <h3 className="tech-name">{tech.name}</h3>
                <p className="tech-description">{tech.description}</p>

                <div className="tech-cost">
                  <span className="cost-label">消耗</span>
                  <span className="cost-value">⚙️ {tech.essenceCost}</span>
                </div>

                <div className="tech-unlocks">
                  <span className="unlocks-label">解锁内容</span>
                  <div className="unlocks-list">
                    {tech.unlocks.map(unlock => (
                      <span key={unlock} className="unlock-tag">{unlock}</span>
                    ))}
                  </div>
                </div>

                {status !== TechStatus.COMPLETED && (
                  <button
                    className="research-btn"
                    onClick={() => handleResearch(tech.id)}
                    disabled={!canStart || techPoints < tech.essenceCost}
                    style={{ backgroundColor: BRANCH_INFO[tech.branch].color }}
                  >
                    {!hasResearchDesk ? '需要研究台' : status === TechStatus.LOCKED ? '需要前置科技' : '开始研究'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
