import { useEffect, useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { useCharacterStore } from '@ui/stores/characterStore'
import { SkillType, TalentLevel } from '@app-types/character.types'
import { GlobalStrategyPreset } from '@app-types/settlement.types'
import { getUiIconAssetPath } from '@data/assets/artAssets'
import './BottomPanel.css'

const SKILL_TYPES: SkillType[] = [
  SkillType.FARMING,
  SkillType.HUNTING,
  SkillType.GATHERING,
  SkillType.COMBAT,
  SkillType.ENGINEERING,
  SkillType.BUILDING,
  SkillType.COOKING,
  SkillType.MEDICINE,
  SkillType.RESEARCH,
]

const SKILL_NAMES: Record<SkillType, string> = {
  [SkillType.FARMING]: '耕种',
  [SkillType.HUNTING]: '狩猎',
  [SkillType.GATHERING]: '采集',
  [SkillType.COMBAT]: '战斗',
  [SkillType.ENGINEERING]: '工程',
  [SkillType.BUILDING]: '建造',
  [SkillType.COOKING]: '烹饪',
  [SkillType.MEDICINE]: '医疗',
  [SkillType.RESEARCH]: '研究',
}

const SKILL_ICONS: Record<SkillType, string> = {
  [SkillType.FARMING]: '耕',
  [SkillType.HUNTING]: '猎',
  [SkillType.GATHERING]: '采',
  [SkillType.COMBAT]: '战',
  [SkillType.ENGINEERING]: 'E',
  [SkillType.BUILDING]: 'B',
  [SkillType.COOKING]: '烹',
  [SkillType.MEDICINE]: '医',
  [SkillType.RESEARCH]: '研',
}

function SkillIcon({ skill }: { skill: SkillType }) {
  const skillToAsset: Partial<Record<SkillType, string>> = {
    [SkillType.FARMING]: 'character_portrait_farmer',
    [SkillType.GATHERING]: 'character_portrait_hunter',
    [SkillType.COMBAT]: 'character_portrait_warrior',
    [SkillType.BUILDING]: 'character_portrait_engineer',
    [SkillType.RESEARCH]: 'character_portrait_scholar',
  }

  const assetId = skillToAsset[skill]
  if (assetId) {
    const assetPath = getUiIconAssetPath(assetId, '32')
    if (assetPath) return <img src={assetPath} alt={skill} className="skill-icon-img" />
  }

  return <span>{SKILL_ICONS[skill] || '?'}</span>
}

interface PriorityMap {
  [characterId: string]: {
    [skill in SkillType]?: number
  }
}

interface BottomPanelProps {
  isCollapsed: boolean
  onToggleCollapsed: () => void
}

function getTalentLevel(talents: Map<SkillType, TalentLevel> | Record<string, TalentLevel>, skill: SkillType): number {
  if (talents instanceof Map) {
    return talents.get(skill)?.level || 1
  }
  return (talents as Record<string, TalentLevel>)[skill as string]?.level || 1
}

function getGoldBrightness(level: number): string {
  const brightness = Math.round(255 - (level - 1) * (155 / 9))
  return `rgb(${brightness}, ${Math.round(brightness * 0.84)}, 0)`
}

export function BottomPanel({ isCollapsed, onToggleCollapsed }: BottomPanelProps) {
  const {
    setSkillPriority,
    applyGlobalStrategyPreset,
    clearGlobalStrategyPreset,
    globalStrategyPreset,
    priorityMode,
    settlementLivability,
    settlementDevelopment,
    tradeState,
    developmentBreakdown,
    recruitmentStationState,
  } = useGameStore()
  const { characters } = useCharacterStore()
  const [priorities, setPriorities] = useState<PriorityMap>({})
  const TRADE_RECOMMENDATIONS: Record<Exclude<GlobalStrategyPreset, 'none'>, {
  text: string
  color: string
}> = {
  survival: { text: '食物保底，木材/石材适量出售，金币优先保障招募', color: '#4caf50' },
  expand: { text: '保留木材/石材，少量出售食物换取基础金币', color: '#ff9800' },
  research: { text: '出售木材/石材支持刷新招募和装备，金币优先科技', color: '#9c27b0' },
  boss: { text: '保留食物/石材备战，出售木材换取装备升级金币', color: '#f44336' },
 }
 const presets: Array<{ value: Exclude<GlobalStrategyPreset, 'none'>; label: string }> = [
    { value: 'survival', label: '生存稳态' },
    { value: 'expand', label: '扩张建造' },
    { value: 'research', label: '科研冲刺' },
    { value: 'boss', label: '备战 Boss' },
  ]

  useEffect(() => {
    const initialPriorities: PriorityMap = {}
    characters.forEach((character) => {
      initialPriorities[character.id] = {}
      SKILL_TYPES.forEach((skill) => {
        const skillPriorities = character.skillPriorities instanceof Map
          ? character.skillPriorities
          : new Map(Object.entries(character.skillPriorities || {}))
        const savedPriority = skillPriorities.get(skill as any) as number | undefined
        initialPriorities[character.id][skill] = savedPriority ?? 5
      })
    })
    setPriorities(initialPriorities)
  }, [characters])

  const handlePriorityClick = (
    characterId: string,
    skill: SkillType,
    increase: boolean,
    event: React.MouseEvent
  ) => {
    event.preventDefault()
    if (priorityMode === 'preset') return

    setPriorities((prev) => {
      const charPriorities = prev[characterId] || {}
      const currentPriority = charPriorities[skill] || 5
      const newPriority = increase
        ? Math.max(1, currentPriority - 1)
        : Math.min(10, currentPriority + 1)

      setSkillPriority(characterId, skill, newPriority)

      return {
        ...prev,
        [characterId]: {
          ...charPriorities,
          [skill]: newPriority,
        },
      }
    })
  }

  return (
    <div className={`bottom-panel rimworld-style ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="bottom-panel-toolbar">
        <div className="settlement-metrics">
          <span>宜居度：{settlementLivability}</span>
          <span>发展度：{settlementDevelopment}</span>
          <span>
            发展来源：研 {developmentBreakdown.research} / 建 {developmentBreakdown.building} / 核 {developmentBreakdown.coreParts} / 战 {developmentBreakdown.combat}
          </span>
          <span>贸易：{tradeState.enabled ? `开启（约 ${tradeState.estimatedGoldPerMinute}/分钟）` : '关闭'}</span>
          <span>候选成员：{recruitmentStationState.candidateCount}</span>
        </div>
        <div className="toolbar-actions">
          <div className="strategy-controls">
            <button className={priorityMode === 'manual' ? 'active' : ''} onClick={clearGlobalStrategyPreset}>
              手动优先级
            </button>
            {presets.map((preset) => (
              <button
                key={preset.value}
                className={globalStrategyPreset === preset.value ? 'active' : ''}
                onClick={() => applyGlobalStrategyPreset(preset.value)}
              >
                {preset.label}
              </button>
            ))}
            {globalStrategyPreset !== 'none' && globalStrategyPreset in TRADE_RECOMMENDATIONS && (
              <div className="preset-trade-hint" style={{ color: TRADE_RECOMMENDATIONS[globalStrategyPreset].color }}>
                贸易：{TRADE_RECOMMENDATIONS[globalStrategyPreset].text}
              </div>
            )}
          </div>
          <button
            className="panel-toggle-btn"
            onClick={onToggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? '展开优先级面板' : '收起优先级面板'}
            title={isCollapsed ? '展开优先级面板' : '收起优先级面板'}
          >
            {isCollapsed ? '展开面板' : '收起面板'}
          </button>
        </div>
      </div>

      {!isCollapsed && priorityMode === 'preset' && (
        <div className="preset-lock-banner">
          当前已启用全局策略预设，角色技能优先级已锁定。切回手动优先级后可单独调整。
        </div>
      )}

      {!isCollapsed ? (
        <>
          <div className="skills-table">
            <table>
              <thead>
                <tr>
                  <th className="corner-cell">角色 / 技能</th>
                  {SKILL_TYPES.map((skill) => (
                    <th key={skill} className="skill-header">
                      <span className="skill-icon"><SkillIcon skill={skill} /></span>
                      <span className="skill-name">{SKILL_NAMES[skill]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {characters.map((character) => (
                  <tr key={character.id} className="character-row">
                    <td className="character-cell">
                      <div className="character-info">
                        <span className="char-name">{character.name}</span>
                        <span className="char-level">Lv.{Math.floor(character.stats.health / 10)}</span>
                      </div>
                    </td>
                    {SKILL_TYPES.map((skill) => {
                      const talentLevel = getTalentLevel(character.talents, skill)
                      const priority = priorities[character.id]?.[skill] ?? 5

                      return (
                        <td key={skill} className="priority-cell">
                          <button
                            className="priority-btn"
                            style={{ color: getGoldBrightness(priority) }}
                            onClick={(event) => handlePriorityClick(character.id, skill, true, event)}
                            onContextMenu={(event) => handlePriorityClick(character.id, skill, false, event)}
                            disabled={priorityMode === 'preset'}
                            title={`左键：提高优先级（1 为最高）| 右键：降低优先级 | 天赋：${talentLevel}级`}
                          >
                            <span className="priority-value">{priority}</span>
                            <span className="talent-indicator" style={{ color: getGoldBrightness(talentLevel) }}>
                              ★{talentLevel}
                            </span>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {characters.length === 0 && <div className="no-characters">暂无角色</div>}
        </>
      ) : (
        <div className="collapsed-strip">
          <span>优先级面板已收起</span>
          <span>模式：{priorityMode === 'preset' ? '预设' : '手动'}</span>
          <span>角色：{characters.length}</span>
        </div>
      )}
    </div>
  )
}
