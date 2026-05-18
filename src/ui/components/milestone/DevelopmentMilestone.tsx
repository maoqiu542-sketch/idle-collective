import { useGameStore } from '../../stores/gameStore'
import './DevelopmentMilestone.css'

interface MilestoneTier {
  name: string
  min: number
  max: number
  unlocks: string[]
}

const MILESTONE_TIERS: MilestoneTier[] = [
  { name: '聚落初创', min: 0, max: 15, unlocks: ['基础建筑（房屋、农场、伐木机、采石机）'] },
  { name: '生存成型', min: 15, max: 30, unlocks: ['厨房、研究台、基础科技'] },
  { name: '扩张启动', min: 30, max: 45, unlocks: ['招募站、仓库、中级科技'] },
  { name: '发展阶段', min: 45, max: 60, unlocks: ['兵营、贸易站、中阶 Boss'] },
  { name: '繁荣推进', min: 60, max: 80, unlocks: ['高级科技、建筑 Lv.3+'] },
  { name: 'V1 终局', min: 80, max: 100, unlocks: ['高阶 Boss、建筑 Lv.5'] },
]

function getCurrentTier(development: number): { tier: MilestoneTier; index: number; progress: number } {
  for (let i = 0; i < MILESTONE_TIERS.length; i++) {
    const t = MILESTONE_TIERS[i]
    if (development >= t.min && development < t.max) {
      const range = t.max - t.min
      const progress = range > 0 ? Math.min((development - t.min) / range * 100, 100) : 100
      return { tier: t, index: i, progress }
    }
  }
  const last = MILESTONE_TIERS[MILESTONE_TIERS.length - 1]
  return { tier: last, index: MILESTONE_TIERS.length - 1, progress: 100 }
}

export function DevelopmentMilestone() {
  const development = useGameStore(state => state.settlementDevelopment)

  if (development == null) return null

  const { tier, index, progress } = getCurrentTier(development)
  const nextTier = index < MILESTONE_TIERS.length - 1 ? MILESTONE_TIERS[index + 1] : null
  const prevTier = index > 0 ? MILESTONE_TIERS[index - 1] : null

  const isAtCap = development >= 100

  return (
    <div className="dev-milestone">
      <div className="dev-milestone-header">
        <div className="dev-milestone-stage">
          <span className="dev-milestone-label">发展阶段</span>
          <span className="dev-milestone-name">{tier.name}</span>
        </div>
        <div className="dev-milestone-score">
          <span className="dev-milestone-value">{Math.round(development)}</span>
          <span className="dev-milestone-max">/ 100</span>
        </div>
      </div>

      <div className="dev-milestone-bar-track">
        <div className="dev-milestone-bar-fill" style={{ width: `${progress}%` }} />
        {prevTier && (
          <div className="dev-milestone-marker prev" style={{ left: `${(prevTier.max / 100) * 100}%` }}>
            {prevTier.max}
          </div>
        )}
        {nextTier && (
          <div className="dev-milestone-marker next" style={{ left: `${(nextTier.min / 100) * 100}%` }}>
            {nextTier.min}
          </div>
        )}
      </div>

      {nextTier && !isAtCap && (
        <div className="dev-milestone-next">
          <div className="dev-milestone-next-header">
            <span className="dev-milestone-next-label">下一阶段</span>
            <span className="dev-milestone-next-name">{nextTier.name}</span>
            <span className="dev-milestone-next-need">
              还需 {Math.round(nextTier.min - development)}
            </span>
          </div>
          <div className="dev-milestone-next-unlocks">
            {nextTier.unlocks.map((u, i) => (
              <span key={i} className="dev-milestone-unlock-tag">{u}</span>
            ))}
          </div>
        </div>
      )}

      {isAtCap && (
        <div className="dev-milestone-complete">
          发展度已达上限，挑战最高难度 Boss 并探索 V1 终局内容
        </div>
      )}
    </div>
  )
}
