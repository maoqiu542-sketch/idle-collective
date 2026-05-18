import { useState } from 'react'
import { Character, CharacterState } from '@app-types/character.types'
import type { CSSProperties } from 'react'
import { SixDimensionType, SixDimensionStats } from '@app-types/six-dimension.types'
import { TaskType } from '@app-types/priority.types'
import { TaskPriorityLevel, TASK_PRIORITY_LABELS, TASK_PRIORITY_ICONS } from '@app-types/task-priority.types'
import { useGameStore } from '@ui/stores/gameStore'
import { EquipmentPanel } from '@ui/components/equipment/EquipmentPanel'
import { getCharacterPortraitAssetPath } from '@data/assets/artAssets'
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
  const [showPriorities, setShowPriorities] = useState(false)
  const {
    setTaskPriority,
    disableTask,
    enableTask,
    resetTaskPriorities,
    getCharacterPriorities,
    getCharacterEquipments,
    priorityMode,
    globalStrategyPreset
  } = useGameStore()
  
  const baseDimensions = character.sixDimensions || { atk: 10, def: 5, hp: 100, critRate: 5, critDmg: 150, atkSpd: 1 }
  const characterEquipments = getCharacterEquipments(character.id)
  const equipmentBonus = characterEquipments.reduce((bonus: SixDimensionStats, equip: any) => {
    if (equip?.stats) {
      return {
        atk: bonus.atk + (equip.stats.atk || 0),
        def: bonus.def + (equip.stats.def || 0),
        hp: bonus.hp + (equip.stats.hp || 0),
        critRate: bonus.critRate + (equip.stats.critRate || 0),
        critDmg: bonus.critDmg + (equip.stats.critDmg || 0),
        atkSpd: bonus.atkSpd + (equip.stats.atkSpd || 0),
      }
    }
    return bonus
  }, { atk: 0, def: 0, hp: 0, critRate: 0, critDmg: 0, atkSpd: 0 })
  const dimensions: SixDimensionStats = {
    atk: (baseDimensions.atk || 0) + equipmentBonus.atk,
    def: (baseDimensions.def || 0) + equipmentBonus.def,
    hp: (baseDimensions.hp || 0) + equipmentBonus.hp,
    critRate: (baseDimensions.critRate || 0) + equipmentBonus.critRate,
    critDmg: (baseDimensions.critDmg || 0) + equipmentBonus.critDmg,
    atkSpd: (baseDimensions.atkSpd || 0) + equipmentBonus.atkSpd,
  }

  const charPriorities = getCharacterPriorities(character.id)
  const needs = character.needs
  const avatarAssetPath = getCharacterPortraitAssetPath(character.profession, '64')
  const avatarStyle = avatarAssetPath
    ? ({
        ['--character-panel-avatar' as string]: `url("${avatarAssetPath}")`
      } as CSSProperties)
    : undefined
  const MANAGEABLE_TASKS = Object.keys(TASK_PRIORITY_LABELS) as TaskType[]

  const getStateLabel = (state: CharacterState): string => {
    const labels: Record<CharacterState, string> = {
      [CharacterState.IDLE]: '空闲',
      [CharacterState.MOVING]: '移动中',
      [CharacterState.WORKING]: '工作中',
      [CharacterState.GATHERING]: '采集中',
      [CharacterState.FARMING]: '耕种中',
      [CharacterState.HUNTING]: '狩猎中',
      [CharacterState.BUILDING]: '建造中',
      [CharacterState.CRAFTING]: '制作中',
      [CharacterState.COOKING]: '烹饪中',
      [CharacterState.HEALING]: '治疗中',
      [CharacterState.RESEARCHING]: '研究中',
      [CharacterState.RESTING]: '休息中',
      [CharacterState.EATING]: '进食中',
      [CharacterState.SLEEPING]: '睡眠中',
      [CharacterState.FIGHTING]: '战斗中',
      [CharacterState.SOCIALIZING]: '社交中',
    }
    return labels[state] || state
  }

  const getProfessionLabel = (profession: string): string => {
    const labels: Record<string, string> = {
      gatherer: '采集者',
      builder: '建造者',
      farmer: '农夫',
      warrior: '战士',
      hunter: '采集者',
      engineer: '建造者',
      scholar: '研究员',
      cook: '厨师',
      doctor: '医生',
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

  if (showPriorities) {
    return (
      <div className="character-panel">
        <div className="panel-header">
          <h2>⚙️ 任务优先级 — {character.name}</h2>
          <button className="close-btn" onClick={() => setShowPriorities(false)}>←</button>
        </div>
        <div className="panel-content">
          <div className="priority-list">
            {MANAGEABLE_TASKS.map(taskType => {
              const label = TASK_PRIORITY_LABELS[taskType] || taskType
              const icon = TASK_PRIORITY_ICONS[taskType] || '•'
              const currentPriority = (charPriorities?.priorities.get(taskType) ?? 3) as TaskPriorityLevel
              const isDisabled = charPriorities?.disabledTasks.includes(taskType) ?? false

              return (
                <div key={taskType} className={`priority-item ${isDisabled ? 'disabled' : ''}`}>
                  <span className="priority-icon">{icon}</span>
                  <span className="priority-label">{label}</span>
                  <div className="priority-controls">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={currentPriority}
                      disabled={isDisabled || priorityMode === 'preset'}
                      onChange={e => setTaskPriority(character.id, taskType, Number(e.target.value) as TaskPriorityLevel)}
                      className="priority-slider"
                    />
                    <span className="priority-value">{currentPriority}</span>
                    <button
                      className={`toggle-btn ${isDisabled ? 'off' : 'on'}`}
                      disabled={priorityMode === 'preset'}
                      onClick={() => isDisabled
                        ? enableTask(character.id, taskType)
                        : disableTask(character.id, taskType)
                      }
                      title={isDisabled ? '启用此任务' : '禁用此任务'}
                    >
                      {isDisabled ? '❌' : '✅'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {priorityMode === 'preset' && (
            <div className="preset-lock-note">
              当前启用了全局策略预设：{globalStrategyPreset}。角色级任务编辑已锁定。
            </div>
          )}
          <button
            className="reset-btn"
            disabled={priorityMode === 'preset'}
            onClick={() => resetTaskPriorities(character.id)}
          >
            🔄 重置默认优先级
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="character-panel">
      <div className="panel-header">
        <h2>{character.name}</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        <div
          className={`character-basic ${avatarAssetPath ? 'character-basic--art' : ''}`}
          style={avatarStyle}
        >
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
                  <span className="need-name">安全</span>
                  <div className="need-bar">
                    <div className="need-fill" style={{ width: `${needs.safety || 100}%` }}></div>
                  </div>
                  <span className="need-value">{Math.floor(needs.safety || 100)}%</span>
                </div>
                <div className="need-item">
                  <span className="need-name">舒适</span>
                  <div className="need-bar">
                    <div className="need-fill" style={{ width: `${needs.comfort || 100}%` }}></div>
                  </div>
                  <span className="need-value">{Math.floor(needs.comfort || 100)}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="section">
          <button className="equipment-btn" onClick={() => setShowEquipment(true)}>
            <span className="equipment-icon">⚔️</span>
            <span>装备栏</span>
            <span className="equipment-count">({getEquippedCount()}/3)</span>
          </button>
          <button className="equipment-btn" onClick={() => setShowPriorities(true)} style={{ marginTop: '8px' }}>
            <span className="equipment-icon">⚙️</span>
            <span>任务优先级</span>
            <span className="equipment-count">
              ({charPriorities?.disabledTasks.length ?? 0} 禁用)
            </span>
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
