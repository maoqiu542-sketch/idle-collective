import { BossReward } from '@app-types/combat.types'
import './SettlementPanel.css'

interface SettlementPanelProps {
  isVictory: boolean
  rewards?: BossReward[]
  restingCharacters?: string[]
  onConfirm: () => void
}

export function SettlementPanel({ isVictory, rewards, restingCharacters, onConfirm }: SettlementPanelProps) {
  return (
    <div className="settlement-panel">
      <div className={`settlement-header ${isVictory ? 'victory' : 'defeat'}`}>
        {isVictory ? '🎉 战斗胜利!' : '💀 战斗失败'}
      </div>

      <div className="settlement-content">
        {isVictory && rewards && (
          <div className="rewards-section">
            <h3>获得奖励</h3>
            <div className="rewards-list">
              {rewards.map((reward, index) => (
                <div key={index} className="reward-item">
                  {reward.type === 'gold' && <span className="reward-icon">💰</span>}
                  {reward.type === 'equipment' && <span className="reward-icon">⚔️</span>}
                  {reward.type === 'exp' && <span className="reward-icon">⭐</span>}
                  <span className="reward-text">
                    {reward.type === 'gold' && `金币 × ${reward.amount}`}
                    {reward.type === 'equipment' && reward.itemId}
                    {reward.type === 'exp' && `六维经验 × ${reward.amount}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isVictory && restingCharacters && restingCharacters.length > 0 && (
          <div className="resting-section">
            <h3>参战角色需要休息恢复</h3>
            <div className="resting-list">
              {restingCharacters.map((name, index) => (
                <div key={index} className="resting-item">
                  <span className="character-name">{name}</span>
                  <span className="resting-status">休息中 (15:00)</span>
                </div>
              ))}
            </div>
            <p className="resting-note">BOSS仍可再次挑战</p>
          </div>
        )}
      </div>

      <button className="confirm-btn" onClick={onConfirm}>
        确认
      </button>
    </div>
  )
}
