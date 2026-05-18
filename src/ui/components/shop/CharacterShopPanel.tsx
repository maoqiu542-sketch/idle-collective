import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { useResourceStore } from '@ui/stores/resourceStore'
import { useCharacterStore } from '@ui/stores/characterStore'
import type { CSSProperties } from 'react'
import { CharacterProfession, CharacterQuality } from '@app-types/character-shop.types'
import { ResourceType } from '@app-types/map.types'
import { getCharacterPortraitAssetPath, getResourceUiAssetPath, getUiIconAssetPath } from '@data/assets/artAssets'
import { useOnlineStore } from '@ui/stores/onlineStore'
import { dispatchOnlineAction } from '@ui/online/onlineActionRouter'
import './CharacterShopPanel.css'

const QUALITY_COLORS: Record<CharacterQuality, string> = {
  [CharacterQuality.COMMON]: '#9e9e9e',
  [CharacterQuality.RARE]: '#2196f3',
  [CharacterQuality.EPIC]: '#9c27b0',
  [CharacterQuality.LEGENDARY]: '#ff9800',
}

const QUALITY_NAMES: Record<CharacterQuality, string> = {
  [CharacterQuality.COMMON]: '普通',
  [CharacterQuality.RARE]: '稀有',
  [CharacterQuality.EPIC]: '史诗',
  [CharacterQuality.LEGENDARY]: '传说',
}

const PROFESSION_NAMES: Record<CharacterProfession, string> = {
  [CharacterProfession.GATHERER]: '采集者',
  [CharacterProfession.BUILDER]: '建造者',
  [CharacterProfession.FARMER]: '农夫',
  [CharacterProfession.WARRIOR]: '战士',
  [CharacterProfession.RESEARCHER]: '研究员',
}

function ProfessionIcon({ profession }: { profession: CharacterProfession }) {
  const professionToAsset: Record<CharacterProfession, string> = {
    [CharacterProfession.GATHERER]: 'character_portrait_hunter',
    [CharacterProfession.BUILDER]: 'character_portrait_engineer',
    [CharacterProfession.FARMER]: 'character_portrait_farmer',
    [CharacterProfession.WARRIOR]: 'character_portrait_warrior',
    [CharacterProfession.RESEARCHER]: 'character_portrait_scholar',
  }
  
  const assetPath = getUiIconAssetPath(professionToAsset[profession], '32')
  if (assetPath) return <img src={assetPath} alt={profession} className="profession-icon-img" />
  
  const fallbackMap: Record<CharacterProfession, string> = {
    [CharacterProfession.GATHERER]: '🪓',
    [CharacterProfession.BUILDER]: '🏗️',
    [CharacterProfession.FARMER]: '🌾',
    [CharacterProfession.WARRIOR]: '⚔️',
    [CharacterProfession.RESEARCHER]: '🔬',
  }
  
  return <span>{fallbackMap[profession]}</span>
}

interface CharacterShopPanelProps {
  onClose: () => void
  onOpenBuild?: () => void
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function buildAvatarStyle(variableName: string, assetPath: string | null): CSSProperties | undefined {
  if (!assetPath) {
    return undefined
  }

  return {
    [variableName]: `url("${assetPath}")`
  } as CSSProperties
}

export function CharacterShopPanel({ onClose, onOpenBuild }: CharacterShopPanelProps) {
  const { purchaseCharacter, refreshShop, game, recruitmentStationState } = useGameStore()
  const { resources } = useResourceStore()
  const { shopCharacters } = useCharacterStore()
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0)
  const onlineMode = useOnlineStore(state => state.mode)
  const sendOnlineAction = useOnlineStore(state => state.sendAction)

  const gold = resources.get(ResourceType.GOLD) || 0
  const isStationActive = recruitmentStationState.stationLevel > 0
  const goldIconPath = getResourceUiAssetPath(ResourceType.GOLD, '32')

  useEffect(() => {
    const updateTimer = () => {
      if (onlineMode === 'online') {
        setTimeUntilRefresh(isStationActive ? Math.max(0, recruitmentStationState.nextRefreshAt - Date.now()) : 0)
        return
      }
      if (!game) return
      const manager = game.getCharacterShopManager()
      if (!manager) return
      setTimeUntilRefresh(isStationActive ? manager.getTimeUntilNextRefresh() : 0)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [game, isStationActive, onlineMode, recruitmentStationState.nextRefreshAt])

  const nextLevelPreview = useMemo(() => {
    const currentLevel = recruitmentStationState.stationLevel
    if (currentLevel <= 0) {
      return null
    }

    return {
      maxCandidates: Math.min(6, 3 + Math.max(0, currentLevel)),
      qualityBonus: recruitmentStationState.qualityBonus + 4,
      manualRefreshCost: Math.max(20, recruitmentStationState.manualRefreshCost - 5),
      refreshIntervalMs: Math.max(10 * 60 * 1000, recruitmentStationState.refreshIntervalMs - 3 * 60 * 1000),
    }
  }, [recruitmentStationState])

  const recruitmentCost = useMemo(() => {
    const config = game
      ?.getConfigManager()
      .getProductionBuildingConfigs()
      .find(item => item.id === 'recruitment_station')

    return config?.cost || { wood: 60, stone: 30, gold: 120 }
  }, [game])

  const handlePurchase = (slotId: number, price: number) => {
    if (gold < price) {
      alert(`金币不足，还需要 ${price - gold} 金币。`)
      return
    }

    const result = dispatchOnlineAction({
      mode: onlineMode,
      sendAction: sendOnlineAction,
      action: { type: 'purchaseCharacter', slotId },
      runLocal: () => ({ success: purchaseCharacter(slotId) }),
    })

    if (!result.success) {
      alert(result.message || '购买失败，请稍后再试。')
    }
  }

  const handleRefresh = () => {
    if (!isStationActive) {
      alert('需要先建造并完工招募站，商队才会开始带来候选成员。')
      return
    }

    if (gold < recruitmentStationState.manualRefreshCost) {
      alert(`金币不足，还需要 ${recruitmentStationState.manualRefreshCost - gold} 金币。`)
      return
    }

    const result = dispatchOnlineAction({
      mode: onlineMode,
      sendAction: sendOnlineAction,
      action: { type: 'refreshRecruitmentShop' },
      runLocal: refreshShop,
    })
    if (!result.success) {
      alert(result.message || '刷新失败，请稍后再试。')
    }
  }

  return (
    <div className="character-shop-overlay" onClick={onClose}>
      <div className="character-shop-panel" onClick={(event) => event.stopPropagation()}>
        <div className="shop-header">
          <h2>招募站</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="shop-info">
          <div
            className={`gold-display ${goldIconPath ? 'gold-display--art' : ''}`}
            style={buildAvatarStyle('--gold-icon-art', goldIconPath)}
          >
            <span className="gold-icon">💰</span>
            <span className="gold-amount">{gold}</span>
          </div>
          <div className="refresh-timer">
            {isStationActive ? `商队刷新：${formatTime(timeUntilRefresh)}` : '商队尚未入驻'}
          </div>
          <div className="refresh-timer">
            {isStationActive
              ? `候选成员：${recruitmentStationState.candidateCount}/${recruitmentStationState.maxCandidates}`
              : '候选成员：未开放'}
          </div>
        </div>

        {!isStationActive ? (
          <div className="shop-tip shop-tip--warning">
            <p>招募站尚未启用。</p>
            <p>先建造并完工招募站，商队才会入驻并带来候选成员。</p>
            <div className="shop-tip-steps">
              <div>1. 打开建造页并放置招募站</div>
              <div>2. 等待施工完成</div>
              <div>3. 商队开始定期刷新候选成员</div>
            </div>
            <div className="shop-tip-cost">
              建造成本：🪵 {recruitmentCost.wood || 0} / 🪨 {recruitmentCost.stone || 0} / 💰 {recruitmentCost.gold || 0}
            </div>
            {onOpenBuild && (
              <button className="build-guide-btn" onClick={onOpenBuild}>
                前往建造页
              </button>
            )}
          </div>
        ) : (
          <div className="station-bonus-panel">
            <div className="station-bonus-card">
              <span className="station-bonus-label">当前等级</span>
              <strong>Lv.{recruitmentStationState.stationLevel}</strong>
            </div>
            <div className="station-bonus-card">
              <span className="station-bonus-label">品质加成</span>
              <strong>+{recruitmentStationState.qualityBonus}</strong>
            </div>
            <div className="station-bonus-card">
              <span className="station-bonus-label">手动刷新</span>
              <strong>{recruitmentStationState.manualRefreshCost} 金币</strong>
            </div>
            <div className="station-bonus-card">
              <span className="station-bonus-label">自动刷新</span>
              <strong>{Math.floor(recruitmentStationState.refreshIntervalMs / 60000)} 分钟</strong>
            </div>
          </div>
        )}

        {isStationActive && nextLevelPreview && (
          <div className="station-upgrade-preview">
            <div className="station-upgrade-title">下一等级预期收益</div>
            <div>候选上限：{recruitmentStationState.maxCandidates} → {nextLevelPreview.maxCandidates}</div>
            <div>品质加成：+{recruitmentStationState.qualityBonus} → +{nextLevelPreview.qualityBonus}</div>
            <div>手动刷新：{recruitmentStationState.manualRefreshCost} → {nextLevelPreview.manualRefreshCost} 金币</div>
            <div>
              自动刷新：{Math.floor(recruitmentStationState.refreshIntervalMs / 60000)} → {Math.floor(nextLevelPreview.refreshIntervalMs / 60000)} 分钟
            </div>
          </div>
        )}

        <div className="shop-actions">
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={!isStationActive || gold < recruitmentStationState.manualRefreshCost}
            title={!isStationActive ? '需要先建造并完工招募站' : undefined}
          >
            手动刷新（{recruitmentStationState.manualRefreshCost} 金币）
          </button>
        </div>

        {isStationActive && (
          <div className="shop-tip">
            金币主要来自贸易站和 Boss 奖励。贸易站会把盈余木材、石材与食物自动转成金币。
          </div>
        )}

        <div className="shop-characters">
          {shopCharacters.length === 0 ? (
            <div className="empty-shop">
              <p>当前没有可招募成员。</p>
              <p>{!isStationActive ? '先建造并完工招募站。' : '等待下一批商队到访，或手动刷新招募站。'}</p>
            </div>
          ) : (
            shopCharacters.map(character => {
              const professionAvatarPath = getCharacterPortraitAssetPath(character.profession, '64')

              return (
              <div
                key={character.id}
                className={`character-card ${professionAvatarPath ? 'character-card--art' : ''}`}
                style={{
                  borderColor: QUALITY_COLORS[character.quality],
                  ...(buildAvatarStyle('--shop-character-avatar', professionAvatarPath) ?? {}),
                }}
              >
                <div className="character-quality" style={{ backgroundColor: QUALITY_COLORS[character.quality] }}>
                  {QUALITY_NAMES[character.quality]}
                </div>

                <div className="character-avatar"><ProfessionIcon profession={character.profession} /></div>

                <div className="character-info">
                  <h3 className="character-name">{character.name}</h3>
                  <p className="character-profession">{PROFESSION_NAMES[character.profession]}</p>
                </div>

                <div className="character-stats">
                  <div className="stat">
                    <span className="stat-label">力量</span>
                    <span className="stat-value">{character.baseStats.strength}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">敏捷</span>
                    <span className="stat-value">{character.baseStats.agility}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">智力</span>
                    <span className="stat-value">{character.baseStats.intelligence}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">耐力</span>
                    <span className="stat-value">{character.baseStats.endurance}</span>
                  </div>
                </div>

                {character.skills.length > 0 && (
                  <div className="character-skills">
                    {character.skills.map(skill => (
                      <span key={skill} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  className="purchase-btn"
                  onClick={() => handlePurchase(character.slotId, character.price)}
                  disabled={gold < character.price}
                  style={{ backgroundColor: gold >= character.price ? QUALITY_COLORS[character.quality] : '#666' }}
                >
                  招募 {character.price} 金币
                </button>
              </div>
            )})
          )}
        </div>
      </div>
    </div>
  )
}
