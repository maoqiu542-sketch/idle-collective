import { useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { ResourceType } from '@app-types/map.types'
import { ProfessionType, Character } from '@app-types/character.types'
import { SaveLoadPanel } from '@ui/components/save/SaveLoadPanel'
import './BottomPanel.css'

const RESOURCE_ICONS: Record<string, string> = {
  [ResourceType.WOOD]: '🪵',
  [ResourceType.STONE]: '🪨',
  [ResourceType.FOOD]: '🍖',
  [ResourceType.GOLD]: '💰',
  [ResourceType.LEATHER]: '🧳',
}

const RESOURCE_NAMES: Record<string, string> = {
  [ResourceType.WOOD]: '木材',
  [ResourceType.STONE]: '石材',
  [ResourceType.FOOD]: '食物',
  [ResourceType.GOLD]: '金币',
  [ResourceType.LEATHER]: '皮革',
}

const PROFESSION_NAMES: Record<ProfessionType, string> = {
  [ProfessionType.GATHERER]: '采集者',
  [ProfessionType.BUILDER]: '建造者',
  [ProfessionType.FARMER]: '农夫',
  [ProfessionType.WARRIOR]: '战士',
}

interface BottomPanelProps {
  onCharacterDoubleClick?: (character: Character) => void
}

export function BottomPanel({ onCharacterDoubleClick }: BottomPanelProps) {
  const { resources, characters } = useGameStore()
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [showSavePanel, setShowSavePanel] = useState(false)
  const [showLoadPanel, setShowLoadPanel] = useState(false)

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId)

  return (
    <div className="bottom-panel">
      <div className="resources-section">
        <h3>资源仓库</h3>
        <div className="resources-list">
          {Array.from(resources.entries()).map(([type, amount]) => (
            <div key={type} className="resource-item">
              <span className="resource-icon">{RESOURCE_ICONS[type] || '📦'}</span>
              <span className="resource-name">{RESOURCE_NAMES[type] || type}</span>
              <span className="resource-amount">{amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="characters-section">
        <h3>角色列表 ({characters.length})</h3>
        <div className="characters-list">
          {characters.map(character => (
            <div
              key={character.id}
              className={`character-item ${selectedCharacterId === character.id ? 'selected' : ''}`}
              onClick={() => setSelectedCharacterId(character.id)}
              onDoubleClick={() => onCharacterDoubleClick?.(character)}
              title="双击查看详细信息"
            >
              <div className="character-name">{character.name}</div>
              <div className="character-profession">
                {PROFESSION_NAMES[character.profession]}
              </div>
              <div className="character-bars">
                <div className="bar health-bar">
                  <div 
                    className="bar-fill"
                    style={{ width: `${(character.stats.health / character.stats.maxHealth) * 100}%` }}
                  />
                </div>
                <div className="bar mood-bar">
                  <div 
                    className="bar-fill"
                    style={{ width: `${(character.stats.mood / character.stats.maxMood) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCharacter && (
        <div className="character-detail">
          <h3>{selectedCharacter.name}</h3>
          <div className="detail-row">
            <span>职业:</span>
            <span>{PROFESSION_NAMES[selectedCharacter.profession]}</span>
          </div>
          <div className="detail-row">
            <span>状态:</span>
            <span>{selectedCharacter.state}</span>
          </div>
          <div className="detail-row">
            <span>生命:</span>
            <span>{selectedCharacter.stats.health}/{selectedCharacter.stats.maxHealth}</span>
          </div>
          <div className="detail-row">
            <span>心情:</span>
            <span>{selectedCharacter.stats.mood}/{selectedCharacter.stats.maxMood}</span>
          </div>
          <div className="talents-section">
            <h4>天赋等级</h4>
            {Array.from(selectedCharacter.talents.entries()).map(([skill, level]) => (
              <div key={skill} className="talent-row">
                <span>{skill}:</span>
                <span>Lv.{level.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="save-load-buttons">
        <button className="save-btn" onClick={() => setShowSavePanel(true)}>
          💾 存档
        </button>
        <button className="load-btn" onClick={() => setShowLoadPanel(true)}>
          📂 读档
        </button>
      </div>

      {showSavePanel && (
        <SaveLoadPanel mode="save" onClose={() => setShowSavePanel(false)} />
      )}

      {showLoadPanel && (
        <SaveLoadPanel mode="load" onClose={() => setShowLoadPanel(false)} />
      )}
    </div>
  )
}
