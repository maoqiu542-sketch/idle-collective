import { useCharacterStore } from '@ui/stores/characterStore'
import { useGameStore } from '@ui/stores/gameStore'
import type { CSSProperties } from 'react'
import { CharacterState } from '@app-types/character.types'
import { getProfessionAssetPath, getUiIconAssetPath } from '@data/assets/artAssets'
import './CharacterStatusPanel.css'

const STATE_ICONS: Record<CharacterState, string> = {
  [CharacterState.IDLE]: '😴',
  [CharacterState.MOVING]: '🚶',
  [CharacterState.WORKING]: '⚒️',
  [CharacterState.GATHERING]: '🪓',
  [CharacterState.FARMING]: '🌾',
  [CharacterState.HUNTING]: '🏹',
  [CharacterState.BUILDING]: '🔨',
  [CharacterState.CRAFTING]: '🔧',
  [CharacterState.COOKING]: '🍳',
  [CharacterState.HEALING]: '💊',
  [CharacterState.RESEARCHING]: '📚',
  [CharacterState.RESTING]: '💤',
  [CharacterState.EATING]: '🍖',
  [CharacterState.SLEEPING]: '🛏️',
  [CharacterState.FIGHTING]: '⚔️',
  [CharacterState.SOCIALIZING]: '💬',
}

function ProfessionIcon({ profession }: { profession: string }) {
  const professionToAsset: Record<string, string> = {
    'gatherer': 'character_portrait_hunter',
    'builder': 'character_portrait_engineer',
    'farmer': 'character_portrait_farmer',
    'warrior': 'character_portrait_warrior',
    'scholar': 'character_portrait_scholar',
    'hunter': 'character_portrait_hunter',
    'engineer': 'character_portrait_engineer',
    'doctor': 'character_portrait_doctor',
    'chef': 'character_portrait_cook',
  }
  
  const assetId = professionToAsset[profession]
  if (assetId) {
    const assetPath = getUiIconAssetPath(assetId, '32')
    if (assetPath) return <img src={assetPath} alt={profession} className="profession-icon-img" />
  }
  
  const fallbackMap: Record<string, string> = {
    'gatherer': '🪓',
    'builder': '🔨',
    'farmer': '🌾',
    'warrior': '⚔️',
    'hunter': '🏹',
    'engineer': '🔧',
    'doctor': '💊',
    'scholar': '📚',
    'chef': '🍳',
  }
  
  return <span>{fallbackMap[profession] || '❓'}</span>
}

function buildProfessionStyle(assetPath: string | null): CSSProperties | undefined {
  if (!assetPath) {
    return undefined
  }

  return {
    ['--status-profession-art' as string]: `url("${assetPath}")`
  } as CSSProperties
}

export function CharacterStatusPanel() {
  const { characters } = useCharacterStore()
  const { getTaskProgress } = useGameStore()

  const activeCharacters = characters.filter(c => c.state !== CharacterState.IDLE)
  const idleCharacters = characters.filter(c => c.state === CharacterState.IDLE)

  return (
    <div className="character-status-panel">
      <div className="status-header">
        <span className="status-icon">👥</span>
        <span className="status-title">角色</span>
        <span className="status-count">{characters.length}</span>
      </div>
      
      <div className="status-summary">
        <div className="summary-item active">
          <span className="summary-icon">⚡</span>
          <span className="summary-value">{activeCharacters.length}</span>
          <span className="summary-label">工作</span>
        </div>
        <div className="summary-item idle">
          <span className="summary-icon">💤</span>
          <span className="summary-value">{idleCharacters.length}</span>
          <span className="summary-label">空闲</span>
        </div>
      </div>

      <div className="status-list">
        {characters.slice(0, 5).map(char => {
          const taskProgress = getTaskProgress(char.id)
          const progress = taskProgress?.progress || 0
          const isIdle = char.state === CharacterState.IDLE
          const professionAssetPath = getProfessionAssetPath(char.profession, '32')
          
          return (
            <div
              key={char.id}
              className={`status-item ${isIdle ? 'idle' : 'active'} ${professionAssetPath ? 'status-item--art' : ''}`}
              style={buildProfessionStyle(professionAssetPath)}
            >
              <span className="item-profession">
                <ProfessionIcon profession={char.profession} />
              </span>
              <span className="item-name">{char.name}</span>
              <span className="item-state-icon">{STATE_ICONS[char.state]}</span>
              {progress > 0 && progress < 1 && (
                <div className="item-progress">
                  <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
                </div>
              )}
            </div>
          )
        })}
        {characters.length > 5 && (
          <div className="status-more">
            +{characters.length - 5} 更多
          </div>
        )}
      </div>
    </div>
  )
}
