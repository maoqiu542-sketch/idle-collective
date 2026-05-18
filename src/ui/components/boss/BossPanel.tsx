import { useMemo, useState } from 'react'
import { Boss } from '@app-types/combat.types'
import type { CSSProperties } from 'react'
import { Character, CharacterState } from '@app-types/character.types'
import { getBossAssetPath, getCharacterPortraitAssetPath } from '@data/assets/artAssets'
import './BossPanel.css'

interface BossPanelProps {
  boss: Boss
  characters: Character[]
  onStartCombat: (selectedCharacters: Character[]) => void
  onClose: () => void
}

const CHARACTER_STATE_LABELS: Partial<Record<CharacterState, string>> = {
  [CharacterState.IDLE]: '空闲',
  [CharacterState.MOVING]: '移动中',
  [CharacterState.WORKING]: '工作中',
  [CharacterState.GATHERING]: '采集中',
  [CharacterState.FARMING]: '耕种中',
  [CharacterState.HUNTING]: '狩猎中',
  [CharacterState.BUILDING]: '建造中',
  [CharacterState.COOKING]: '烹饪中',
  [CharacterState.RESEARCHING]: '研究中',
  [CharacterState.RESTING]: '休息中',
  [CharacterState.EATING]: '进食中',
  [CharacterState.SLEEPING]: '睡眠中',
  [CharacterState.HEALING]: '治疗中',
}

function getCharacterPower(character: Character): number {
  const dims = character.sixDimensions
  if (!dims) return 0

  return Math.floor(
    (dims.atk || 10) * 2 +
    (dims.def || 5) * 1.5 +
    (dims.hp || 100) * 0.1 +
    (dims.critRate || 5) * 10 +
    (dims.critDmg || 150) * 5 +
    (dims.atkSpd || 1) * 50
  )
}

function isCharacterAvailable(character: Character): boolean {
  return character.state !== CharacterState.FIGHTING &&
    !character.inBossTeam &&
    (character.recoveryTimeRemaining || 0) <= 0
}

function willInterruptWork(character: Character): boolean {
  return [
    CharacterState.WORKING,
    CharacterState.GATHERING,
    CharacterState.FARMING,
    CharacterState.HUNTING,
    CharacterState.BUILDING,
    CharacterState.COOKING,
    CharacterState.RESEARCHING,
  ].includes(character.state)
}

function getInterruptedWorkLabel(character: Character): string {
  switch (character.state) {
    case CharacterState.BUILDING:
      return '施工'
    case CharacterState.RESEARCHING:
      return '研究'
    case CharacterState.COOKING:
      return '烹饪'
    case CharacterState.FARMING:
      return '耕种'
    case CharacterState.HUNTING:
      return '狩猎'
    case CharacterState.GATHERING:
      return '采集'
    case CharacterState.WORKING:
      return '建筑值班'
    default:
      return '当前工作'
  }
}

function buildAvatarStyle(variableName: string, assetPath: string | null): CSSProperties | undefined {
  if (!assetPath) {
    return undefined
  }

  return {
    [variableName]: `url("${assetPath}")`
  } as CSSProperties
}

export function BossPanel({ boss, characters, onStartCombat, onClose }: BossPanelProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([])
  const bossAvatarPath = getBossAssetPath(boss.id, '64')

  const availableCharacters = useMemo(
    () => characters.filter(isCharacterAvailable),
    [characters]
  )

  const toggleCharacter = (character: Character) => {
    if (selectedCharacters.some(item => item.id === character.id)) {
      setSelectedCharacters(selectedCharacters.filter(item => item.id !== character.id))
      return
    }

    if (selectedCharacters.length >= 3) return
    setSelectedCharacters([...selectedCharacters, character])
  }

  const totalPower = useMemo(
    () => selectedCharacters.reduce((sum, character) => sum + getCharacterPower(character), 0),
    [selectedCharacters]
  )

  const recommendedPower = Math.floor(
    (boss.stats.maxHp / 10) +
    (boss.stats.atk * 5) +
    (boss.stats.def * 10)
  )

  const powerStatus = useMemo(() => {
    if (totalPower >= recommendedPower * 1.2) {
      return { color: '#7cba5f', label: '轻松挑战' }
    }
    if (totalPower >= recommendedPower * 0.8) {
      return { color: '#ffd700', label: '正常挑战' }
    }
    return { color: '#ff6b6b', label: '危险挑战' }
  }, [recommendedPower, totalPower])

  const interruptedWorkers = useMemo(
    () => selectedCharacters.filter(willInterruptWork),
    [selectedCharacters]
  )

  const handleStart = () => {
    if (selectedCharacters.length === 0) {
      alert('请至少选择一名角色参战。')
      return
    }

    if (interruptedWorkers.length > 0) {
      const names = interruptedWorkers
        .map(character => `${character.name}（${getInterruptedWorkLabel(character)}）`)
        .join('、')
      const confirmed = window.confirm(`出战将中断这些角色的当前工作：${names}。确定继续吗？`)
      if (!confirmed) {
        return
      }
    }

    onStartCombat(selectedCharacters)
  }

  return (
    <div className="boss-panel">
      <div className="panel-header">
        <h2>Boss 挑战</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div
          className={`boss-info ${bossAvatarPath ? 'boss-info--art' : ''}`}
          style={buildAvatarStyle('--boss-panel-avatar', bossAvatarPath)}
        >
          <div className="boss-avatar">⚔</div>
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
            <div className="recommended-power">推荐战力：{recommendedPower}</div>
          </div>
        </div>

        <div className="character-selection">
          <h3>选择参战角色（最多 3 名）</h3>
          <div className="character-grid">
            {availableCharacters.map(character => {
              const isSelected = selectedCharacters.some(item => item.id === character.id)
              const interruptsWork = willInterruptWork(character)
              const professionAvatarPath = getCharacterPortraitAssetPath(character.profession, '64')

              return (
                <div
                  key={character.id}
                  className={`character-card ${isSelected ? 'selected' : ''} ${professionAvatarPath ? 'character-card--art' : ''}`}
                  style={buildAvatarStyle('--boss-card-avatar', professionAvatarPath)}
                  onClick={() => toggleCharacter(character)}
                >
                  <div className="card-avatar">👤</div>
                  <div className="card-name">{character.name}</div>
                  <div className="card-state">
                    {CHARACTER_STATE_LABELS[character.state] || '可出战'}
                  </div>
                  {interruptsWork && (
                    <div className="card-warning">会中断{getInterruptedWorkLabel(character)}</div>
                  )}
                  <div className="card-power">战力 {getCharacterPower(character)}</div>
                  {isSelected && <div className="check-mark">✓</div>}
                </div>
              )
            })}
            {availableCharacters.length === 0 && (
              <div className="no-characters">当前没有可出战的角色。</div>
            )}
          </div>
        </div>

        <div className="combat-summary">
          <div>
            <div className="power-compare">
              <span>总战力 </span>
              <span style={{ color: powerStatus.color }}>{totalPower}</span>
              <span> / 推荐 {recommendedPower}</span>
            </div>
            {interruptedWorkers.length > 0 && (
              <div className="selection-warning">
                已选 {interruptedWorkers.length} 名角色正在工作：{interruptedWorkers
                  .map(character => `${character.name}(${getInterruptedWorkLabel(character)})`)
                  .join('、')}
              </div>
            )}
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
