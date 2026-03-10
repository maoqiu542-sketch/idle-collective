import { useState } from 'react'
import { Character, CharacterState } from '@app-types/character.types'
import { SixDimensionType } from '@app-types/six-dimension.types'
import { EquipmentPanel } from '@ui/components/equipment/EquipmentPanel'
import './CharacterPanel.css'

const SIX_DIMENSION_NAMES: Record<SixDimensionType, string> = {
  [SixDimensionType.ATK]: '攻击力',
  [SixDimensionType.DEF]: '防御力',
  [SixDimensionType.HP]: '生命值',
  [SixDimensionType.CRIT_RATE]: '暴击率',
  [SixDimensionType.CRIT_DMG]: '暴击伤害',
  [SixDimensionType.ATK_SPD]: '攻击速度',
}

interface CharacterPanelProps {
  character: Character
  onClose: () => void
}

export function CharacterPanel({ character, onClose }: CharacterPanelProps) {
  const [showEquipment, setShowEquipment] = useState(false)
  const dimensions = character.sixDimensions
  const needs = character.needs

  const getStateLabel = (state: CharacterState): string => {
    const labels: Record<CharacterState, string> = {
      [CharacterState.IDLE]: '空闲',
      [CharacterState.MOVING]: '移动中',
      [CharacterState.WORKING]: '工作中',
      [CharacterState.RESTING]: '休息中',
      [CharacterState.EATING]: '进食中',
    }
    return labels[state] || state
  }

  const getProfessionLabel = (profession: string): string => {
    const labels: Record<string, string> = {
      gatherer: '采集者',
      builder: '建造者',
      farmer: '农夫',
      warrior: '战士',
    }
    return labels[profession] || profession
  }

  const calculatePower = (): number => {
    if (!dimensions) return 0
    return Math.floor(
      (dimensions.atk || 10) * 2 +
      (dimensions.def || 5) * 1.5 +
      (dimensions.hp || 100) * 0.1 +
      (dimensions.critRate || 5) * 10 +
      (dimensions.critDmg || 150) * 5 +
      (dimensions.atkSpd || 1) * 50
    )
  }

  const getEquippedCount = (): number => {
    return Object.values(character.equipmentSlots || {}).filter(Boolean).length
  }

  if (showEquipment) {
    return <EquipmentPanel character={character} onClose={() => setShowEquipment(false)} />
  }

  return (
    <div className="character-panel">
      <div className="panel-header">
        <h2>{character.name}</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        <div className="character-basic">
          <div className="avatar">👤</div>
          <div className="basic-info">
            <div className="profession">{getProfessionLabel(character.profession)}</div>
            <div className="state">{getStateLabel(character.state)}</div>
          </div>
        </div>

        <div className="section">
          <h3>六维属性</h3>
          <div className="dimensions-grid">
            {dimensions && Object.entries(dimensions).map(([key, value]) => {
              const type = key as SixDimensionType
              const name = SIX_DIMENSION_NAMES[type]
              const displayValue = type === SixDimensionType.CRIT_RATE || type === SixDimensionType.CRIT_DMG
                ? `${value}%`
                : type === SixDimensionType.ATK_SPD
                  ? value.toFixed(2)
                  : value
              return (
                <div key={type} className="dimension-item">
                  <span className="dimension-name">{name}</span>
                  <span className="dimension-value">{displayValue}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="section">
          <h3>需求状态</h3>
          <div className="needs-grid">
            {needs && (
              <>
                <div className="need-item">
                  <span className="need-name">饥饿</span>
                  <div className="need-bar">
                    <div className="need-fill" style={{ width: `${needs.hunger || 100}%` }}></div>
                  </div>
                  <span className="need-value">{Math.floor(needs.hunger || 100)}%</span>
                </div>
                <div className="need-item">
                  <span className="need-name">精力</span>
                  <div className="need-bar">
                    <div className="need-fill" style={{ width: `${needs.energy || 100}%` }}></div>
                  </div>
                  <span className="need-value">{Math.floor(needs.energy || 100)}%</span>
                </div>
                <div className="need-item">
                  <span className="need-name">社交</span>
                  <div className="need-bar">
                    <div className="need-fill" style={{ width: `${needs.social || 100}%` }}></div>
                  </div>
                  <span className="need-value">{Math.floor(needs.social || 100)}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="section">
          <button className="equipment-btn" onClick={() => setShowEquipment(true)}>
            <span className="equipment-icon">⚔️</span>
            <span>装备栏</span>
            <span className="equipment-count">({getEquippedCount()}/5)</span>
          </button>
        </div>

        <div className="power-display">
          <span className="power-label">战力</span>
          <span className="power-value">{calculatePower()}</span>
        </div>
      </div>
    </div>
  )
}
