import { Boss } from '@app-types/combat.types'
import './BossButton.css'

interface BossButtonProps {
  boss: Boss
  onClick: () => void
}

export function BossButton({ boss, onClick }: BossButtonProps) {
  return (
    <button className="boss-button" onClick={onClick}>
      <div className="boss-icon">⚔️</div>
      <div className="boss-info">
        <div className="boss-label">BOSS来袭</div>
        <div className="boss-name">{boss.name}</div>
      </div>
      <div className="pulse-effect"></div>
    </button>
  )
}
