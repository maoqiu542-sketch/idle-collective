import { useState } from 'react'
import { Boss } from '@app-types/combat.types'
import { Character } from '@app-types/character.types'
import './BossPanel.css'

interface BossPanelProps {
  boss: Boss
  characters: Character[]
  onStartCombat: (selectedCharacters: Character[]) => void
  onClose: () => void
}

export function BossPanel({ boss, characters, onStartCombat, onClose }: BossPanelProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([])
  const availableCharacters = characters.filter(c =>
    c.state === 'idle' || c.state === 'working'
  )

  const toggleCharacter = (character: Character) => {
    if (selectedCharacters.find(c => c.id === character.id)) {
      setSelectedCharacters(selectedCharacters.filter(c => c.id !== character.id))
    } else if (selectedCharacters.length < 3) {
      setSelectedCharacters([...selectedCharacters, character])
    }
  }

  const calculateTotalPower = (): number => {
    return selectedCharacters.reduce((total, c) => {
      const dims = c.sixDimensions
      if (!dims) return total
      return total + Math.floor(
        (dims.atk || 10) * 2 +
        (dims.def || 5) * 1.5 +
        (dims.hp || 100) * 0.1 +
        (dims.critRate || 5) * 10 +
        (dims.critDmg || 150) * 5 +
        (dims.atkSpd || 1) * 50
      )
    }, 0)
  }

  const getRecommendedPower = (): number => {
    // 更合理的推荐战力计算：考虑 boss 的 HP、ATK、DEF
    return Math.floor(
      (boss.stats.maxHp / 10) +
      (boss.stats.atk * 5) +
      (boss.stats.def * 10)
    )
  }

  const getPowerStatus = (): { color: string; label: string } => {
    const power = calculateTotalPower()
    const recommended = getRecommendedPower()
    if (power >= recommended * 1.2) return { color: '#7cba5f', label: '轻松挑战' }
    if (power >= recommended * 0.8) return { color: '#ffd700', label: '正常挑战' }
    return { color: '#ff6b6b', label: '危险挑战' }
  }

  const powerStatus = getPowerStatus()

  const handleStart = () => {
    if (selectedCharacters.length === 0) {
      alert('请至少选择一个角色参战')
      return
    }
    onStartCombat(selectedCharacters)
  }

  return (
    <div className="boss-panel">
      <div className="panel-header">
        <h2>⚔️ BOSS挑战</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        <div className="boss-info">
          <div className="boss-avatar">👹</div>
          <div className="boss-details">
            <div className="boss-name">{boss.name}</div>
            <div className="boss-level">Lv.{boss.level}</div>
            <div className="boss-stats">
              <div className="stat">
                <span className="stat-label">生命</span>
                <span className="stat-value">{boss.stats.maxHp}</span>
              </div>
              <div className="stat">
                <span className="stat-label">攻击</span>
                <span className="stat-value">{boss.stats.atk}</span>
              </div>
              <div className="stat">
                <span className="stat-label">防御</span>
                <span className="stat-value">{boss.stats.def}</span>
              </div>
            </div>
            <div className="recommended-power">
              推荐战力: {getRecommendedPower()}
            </div>
          </div>
        </div>

        <div className="character-selection">
          <h3>选择参战角色 (最多3个)</h3>
          <div className="character-grid">
            {availableCharacters.map(character => {
              const isSelected = selectedCharacters.find(c => c.id === character.id)
              return (
                <div 
                  key={character.id}
                  className={`character-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleCharacter(character)}
                >
                  <div className="card-avatar">👤</div>
                  <div className="card-name">{character.name}</div>
                  {isSelected && <div className="check-mark">✓</div>}
                </div>
              )
            })}
            {availableCharacters.length === 0 && (
              <div className="no-characters">没有可用角色</div>
            )}
          </div>
        </div>

        <div className="combat-summary">
          <div className="power-compare">
            <span>总战力: </span>
            <span style={{ color: powerStatus.color }}>{calculateTotalPower()}</span>
            <span> / 推荐: {getRecommendedPower()}</span>
          </div>
          <div className="power-status" style={{ color: powerStatus.color }}>
            {powerStatus.label}
          </div>
        </div>

        <button 
          className="start-btn"
          onClick={handleStart}
          disabled={selectedCharacters.length === 0}
        >
          开始挑战
        </button>
      </div>
    </div>
  )
}
