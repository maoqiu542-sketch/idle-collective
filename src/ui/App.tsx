import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react'

import { useGameStore } from './stores/gameStore'
import { useResourceStore } from './stores/resourceStore'
import { useCharacterStore } from './stores/characterStore'
import { MapView } from './components/map/MapView'
import { BottomPanel } from './components/panel/BottomPanel'
import { ShopPanel } from './components/shop/ShopPanel'
import { CharacterShopPanel } from './components/shop/CharacterShopPanel'
import { CharacterPanel } from './components/character/CharacterPanel'
import { CharacterStatusPanel } from './components/character/CharacterStatusPanel'
import { GuidePanel } from './components/guide/GuidePanel'
import { BossButton } from './components/boss/BossButton'
import { BossPanel } from './components/boss/BossPanel'
import { CombatPanel } from './components/combat/CombatPanel'
import { SettlementPanel } from './components/combat/SettlementPanel'
import { DebugPanel } from './components/debug/DebugPanel'
import { TechnologyPanel } from './components/technology/TechnologyPanel'
import { FloatWindow } from './components/float/FloatWindow'
import { OnlinePanel } from './components/online/OnlinePanel'
import { Character } from '@app-types/character.types'
import { Boss, BossReward } from '@app-types/combat.types'
import { ResourceType } from '@app-types/map.types'
import type { OnlineSpeedState } from '@app-types/online.types'
import { OnlineSpeedController } from '@domain/online/OnlineSpeedController'
import { ReturnSummaryPanel } from './components/summary/ReturnSummaryPanel'
import { DevelopmentMilestone } from './components/milestone/DevelopmentMilestone'
import {
  getCharacterAssetPath,
  getCharacterPortraitAssetPath,
  getResourceUiAssetPath,
  getUiIconAssetPath
} from '@data/assets/artAssets'
import { useOnlineStore } from './stores/onlineStore'

function TabIcon({ icon, fallback }: { icon: string; fallback: string }) {
  const assetPath = getUiIconAssetPath(icon, '32')
  if (!assetPath) return <span>{fallback}</span>
  return <img src={assetPath} alt={icon} className="tab-icon-img" />
}

function ResourceIcon({ type, size = '32' }: { type: ResourceType | string; size?: '32' | '64' }) {
  const resourceToNode: Record<string, string> = {
    wood: 'resource_tree',
    stone: 'resource_rock',
    food: 'resource_crop',
    gold: 'resource_ore',
    core_parts: 'ui_resource_core_parts',
  }

  const assetId = resourceToNode[type] || `ui_resource_${type}`
  const assetPath = getUiIconAssetPath(assetId, size)

  const fallbackMap: Record<string, string> = {
    wood: '🌲',
    stone: '🪨',
    food: '🌾',
    gold: '💰',
    core_parts: '⚙️',
  }
  if (!assetPath) return <span>{fallbackMap[type] || '?'}</span>
  return <img src={assetPath} alt={type} className="resource-icon-img" style={{ width: size === '64' ? 20 : 16, height: size === '64' ? 20 : 16 }} />
}

const TAB_ICONS: Record<string, { icon: string; fallback: string }> = {
  characters: { icon: 'character_portrait_farmer', fallback: '角' },
  recruit: { icon: 'character_portrait_warrior', fallback: '招' },
  shop: { icon: 'building_lumber_mill', fallback: 'B' },
  technology: { icon: 'character_portrait_scholar', fallback: '科' },
  boss: { icon: 'boss_portrait_01', fallback: 'Boss' }
}
import './App.css'

type TabType = 'characters' | 'recruit' | 'shop' | 'technology' | 'boss'

const RESOURCE_NAMES: Record<ResourceType, string> = {
  [ResourceType.WOOD]: '木材',
  [ResourceType.STONE]: '石材',
  [ResourceType.FOOD]: '食物',
  [ResourceType.GOLD]: '金币',
  [ResourceType.CORE_PARTS]: '核心零件',
}

function buildCssVariableStyle(variableName: string, assetPath: string | null): CSSProperties | undefined {
  if (!assetPath) {
    return undefined
  }

  return {
    [variableName]: `url("${assetPath}")`
  } as CSSProperties
}

function App() {
  const searchParams = new URLSearchParams(window.location.search)
  const isFloatView = searchParams.get('view') === 'float'

  const { init, start, game } = useGameStore()
  const initRef = useRef(init)
  const startRef = useRef(start)
  initRef.current = init
  startRef.current = start
  const { resources } = useResourceStore()
  const { characters } = useCharacterStore()
  const onlineMode = useOnlineStore(state => state.mode)
  const onlineSpeed = useOnlineStore(state => state.speed)
  const sendActivityPulse = useOnlineStore(state => state.sendActivityPulse)

  const [activeTab, setActiveTab] = useState<TabType>('characters')
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [isFloatMode, setIsFloatMode] = useState(false)
  const [availableBoss, setAvailableBoss] = useState<Boss | null>(null)
  const [showBossPanel, setShowBossPanel] = useState(false)
  const [inCombat, setInCombat] = useState(false)
  const [combatCharacters, setCombatCharacters] = useState<Character[]>([])
  const [showSettlement, setShowSettlement] = useState(false)
  const [isVictory, setIsVictory] = useState(false)
  const [isPriorityPanelCollapsed, setIsPriorityPanelCollapsed] = useState(false)
  const [rewards, setRewards] = useState<BossReward[]>([])
  const [gameTime, setGameTime] = useState(0)
  const [showOnlinePanel, setShowOnlinePanel] = useState(false)
  const [showReturnSummary, setShowReturnSummary] = useState(false)
  const localSpeedControllerRef = useRef(new OnlineSpeedController({ maxPulsesPerPlayerPerSecond: 20 }))
  const [localSpeed, setLocalSpeed] = useState<OnlineSpeedState>(() => localSpeedControllerRef.current.getState())
  const activeSpeed = onlineMode === 'online' ? onlineSpeed : localSpeed
  const pausedBeforeOnlineRef = useRef(false)
  const pausedForOnlineRef = useRef(false)

  useEffect(() => {
    if (isFloatView) return

    let cancelled = false
    const initGame = async () => {
      await initRef.current()
      if (cancelled) return
      startRef.current()
    }

    void initGame()

    return () => {
      cancelled = true
    }
  }, [isFloatView])

  useEffect(() => {
    const electronAPI = (window as any).electronAPI
    const emitActivityPulse = (count: number = 1) => {
      if (onlineMode === 'online') {
        sendActivityPulse(count)
        return
      }

      setLocalSpeed(localSpeedControllerRef.current.recordActivity('local-player', Date.now(), count).state)
    }

    let usingRendererFallback = false
    const emitRendererActivity = () => {
      if (usingRendererFallback) {
        emitActivityPulse(1)
      }
    }

    const enableRendererFallback = () => {
      usingRendererFallback = true
      window.addEventListener('keydown', emitRendererActivity)
      window.addEventListener('pointerdown', emitRendererActivity)
    }

    if (electronAPI?.startGlobalActivityMonitor) {
      electronAPI.startGlobalActivityMonitor().catch(enableRendererFallback)
    } else {
      enableRendererFallback()
    }

    const unsubscribe = electronAPI?.onGlobalActivity?.((activity: { count?: number }) => {
      emitActivityPulse(activity.count ?? 1)
    })

    return () => {
      unsubscribe?.()
      window.removeEventListener('keydown', emitRendererActivity)
      window.removeEventListener('pointerdown', emitRendererActivity)
      electronAPI?.stopGlobalActivityMonitor?.()
    }
  }, [onlineMode, sendActivityPulse])

  useEffect(() => {
    if (onlineMode === 'online') return

    const interval = setInterval(() => {
      setLocalSpeed(localSpeedControllerRef.current.getState())
    }, 1000)

    return () => clearInterval(interval)
  }, [onlineMode])

  useEffect(() => {
    game?.setSimulationSpeedMultiplier(activeSpeed.multiplier)
  }, [game, activeSpeed.multiplier])

  useEffect(() => {
    if (!game || isFloatView) return
    const checkSummary = () => {
      const summary = useGameStore.getState().getPendingSessionSummary()
      if (summary) {
        setShowReturnSummary(true)
      }
    }
    checkSummary()
    const eventBus = game.getEventBus()
    eventBus.on('game:resume', checkSummary)
    eventBus.on('game:started', checkSummary)
    return () => {
      eventBus.off('game:resume', checkSummary)
      eventBus.off('game:started', checkSummary)
    }
  }, [game, isFloatView])

  useEffect(() => {
    if (!game) return

    if (onlineMode === 'online') {
      if (!pausedForOnlineRef.current) {
        pausedBeforeOnlineRef.current = game.getState().isPaused
        game.pause()
        pausedForOnlineRef.current = true
      }
      return
    }

    if (!pausedForOnlineRef.current) return

    if (pausedBeforeOnlineRef.current) {
      game.pause()
    } else {
      game.resume()
    }

    pausedForOnlineRef.current = false
    const gameState = useGameStore.getState()
    gameState.updateCharacters()
    gameState.updateResources()
    gameState.updateMapData()
    gameState.updateBuildings()
    gameState.updateEquipments()
    gameState.updateShopItems()
    gameState.updateShopCharacters()
    gameState.updateEssence()
    gameState.updateTechPoints()
    gameState.updateSettlementState()
  }, [game, onlineMode])

  useEffect(() => {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI?.onFloatModeChanged) return
    return electronAPI.onFloatModeChanged((val: boolean) => setIsFloatMode(val))
  }, [])

  const handleToggleFloat = useCallback(async () => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.toggleFloatMode) {
      await electronAPI.toggleFloatMode()
    }
  }, [])

  useEffect(() => {
    if (!game) return

    const bossManager = game.getBossManager()
    const eventBus = game.getEventBus()

    const syncAvailableBoss = () => {
      const bosses = bossManager.getAvailableBosses()
      setAvailableBoss(bosses.length > 0 ? bosses[0] : null)
    }

    const handleBossDefeated = (event: { rewards: BossReward[] }) => {
      setRewards(event.rewards)
      syncAvailableBoss()
    }

    syncAvailableBoss()
    eventBus.on('boss:spawned', syncAvailableBoss)
    eventBus.on('boss:defeated', handleBossDefeated)
    eventBus.on('boss:fled', syncAvailableBoss)
    eventBus.on('boss:removed', syncAvailableBoss)

    const interval = setInterval(() => {
      setGameTime(game.getState().gameTime)
    }, 1000)

    return () => {
      clearInterval(interval)
      eventBus.off('boss:spawned', syncAvailableBoss)
      eventBus.off('boss:defeated', handleBossDefeated)
      eventBus.off('boss:fled', syncAvailableBoss)
      eventBus.off('boss:removed', syncAvailableBoss)
    }
  }, [game])

  const formatGameTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    return `${hours.toString().padStart(2, '0')}:${(minutes % 60)
      .toString()
      .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const handleStartCombat = useCallback(
    (selectedChars: Character[]) => {
      if (game && availableBoss) {
        game.getBossManager().engageBoss(availableBoss.id, 'party')
      }

      setCombatCharacters(selectedChars)
      setShowBossPanel(false)
      setInCombat(true)
    },
    [availableBoss, game]
  )

  const handleCombatEnd = useCallback(
    (victory: boolean) => {
      setIsVictory(victory)

      if (game && availableBoss) {
        const bossManager = game.getBossManager()
        if (victory) {
          bossManager.dealDamage(
            availableBoss.id,
            availableBoss.stats.maxHp + availableBoss.stats.def + availableBoss.stats.atk,
            'party'
          )
        } else {
          bossManager.flee(availableBoss.id, 'party')
        }
      }

      setInCombat(false)
      setShowSettlement(true)
    },
    [availableBoss, game]
  )

  const handleSettlementConfirm = useCallback(() => {
    setShowSettlement(false)
    setAvailableBoss(null)
    setRewards([])
  }, [])

  if (isFloatView) {
    return (
      <div className="app">
        <FloatWindow initialSnapshot={null} />
      </div>
    )
  }

  if (!useGameStore.getState().isInitialized) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>正在加载游戏...</p>
      </div>
    )
  }

  if (isFloatMode) {
    const firstChar = characters[0]
    const foodAmount = resources.get(ResourceType.FOOD) ?? 0
    const floatAvatarPath = firstChar
      ? getCharacterPortraitAssetPath(firstChar.profession, '64')
      : getCharacterAssetPath('64')

    return (
      <div className="app app--float" onClick={handleToggleFloat} title="点击展开完整界面">
        <div
          className={`float-pet ${floatAvatarPath ? 'float-pet--art' : ''}`}
          style={buildCssVariableStyle('--float-avatar-image', floatAvatarPath)}
        >
          <div className="float-avatar">{firstChar ? '🧑' : '🏠'}</div>
          <div className="float-info">
            <div className="float-chars">{characters.length}人</div>
            <div className="float-food">🌾{foodAmount}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="game-title">Idle Collective</h1>
        </div>

        <div className="header-center">
          <div className="resource-bar">
            {Array.from(resources.entries()).map(([type, amount]) => {
              const resourceAssetPath = getResourceUiAssetPath(type, '32')

              return (
                <div
                  key={type}
                  className={`resource-item ${resourceAssetPath ? 'resource-item--art' : ''}`}
                  style={buildCssVariableStyle('--resource-art-image', resourceAssetPath)}
                >
                  <span className="resource-icon"><ResourceIcon type={type} /></span>
                  <span className="resource-amount">{amount}</span>
                  <span className="resource-name">{RESOURCE_NAMES[type]}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="header-right">
          <div className="game-time">
            <span className="time-icon">T</span>
            <span className="time-value">{formatGameTime(gameTime)}</span>
          </div>
          <button className="online-toggle-btn" onClick={() => setShowOnlinePanel(prev => !prev)} title="联机房间">
            {onlineMode === 'online' ? '联机' : '加速'} x{activeSpeed.multiplier.toFixed(2)}
          </button>
          <button className="float-toggle-btn" onClick={handleToggleFloat} title="切换悬浮窗">
            F
          </button>
        </div>
      </header>

      {showOnlinePanel && <OnlinePanel displaySpeed={activeSpeed} onClose={() => setShowOnlinePanel(false)} />}

      {availableBoss && !showBossPanel && !inCombat && activeTab !== 'boss' && (
        <BossButton
          boss={availableBoss}
          onClick={() => {
            setShowBossPanel(true)
            setActiveTab('boss')
          }}
        />
      )}

      {showBossPanel && availableBoss && (
        <BossPanel
          boss={availableBoss}
          characters={characters}
          onStartCombat={handleStartCombat}
          onClose={() => setShowBossPanel(false)}
        />
      )}

      {inCombat && availableBoss && (
        <CombatPanel
          boss={availableBoss}
          characters={combatCharacters}
          combatTrainingMultiplier={game?.getCombatTrainingMultiplier() ?? 1}
          onCombatEnd={handleCombatEnd}
        />
      )}

      {showSettlement && (
        <SettlementPanel
          isVictory={isVictory}
          rewards={rewards}
          restingCharacters={isVictory ? undefined : combatCharacters.map((character) => character.name)}
          onConfirm={handleSettlementConfirm}
        />
      )}

      <main className="app-main">
        <MapView onCharacterClick={(character) => setSelectedCharacter(character)} />
        <aside className="app-sidebar">
          <DevelopmentMilestone />
          <GuidePanel />
        </aside>
        <CharacterStatusPanel />
      </main>

      <footer className="app-footer">
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>
            <TabIcon icon={TAB_ICONS.characters.icon} fallback={TAB_ICONS.characters.fallback} />
            <span className="tab-label">角色</span>
          </button>
          <button className={`tab-btn ${activeTab === 'recruit' ? 'active' : ''}`} onClick={() => setActiveTab('recruit')}>
            <TabIcon icon={TAB_ICONS.recruit.icon} fallback={TAB_ICONS.recruit.fallback} />
            <span className="tab-label">招募</span>
          </button>
          <button className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>
            <TabIcon icon={TAB_ICONS.shop.icon} fallback={TAB_ICONS.shop.fallback} />
            <span className="tab-label">建造</span>
          </button>
          <button className={`tab-btn ${activeTab === 'technology' ? 'active' : ''}`} onClick={() => setActiveTab('technology')}>
            <TabIcon icon={TAB_ICONS.technology.icon} fallback={TAB_ICONS.technology.fallback} />
            <span className="tab-label">科技</span>
          </button>
          <button className={`tab-btn ${activeTab === 'boss' ? 'active' : ''}`} onClick={() => setActiveTab('boss')}>
            <TabIcon icon={TAB_ICONS.boss.icon} fallback={TAB_ICONS.boss.fallback} />
            <span className="tab-label">Boss</span>
            {availableBoss && <span className="tab-badge alert">!</span>}
          </button>
        </div>

        <div
          className={`tab-content ${activeTab === 'characters' ? 'tab-content--characters' : 'tab-content--overlay'} ${
            activeTab === 'characters' && isPriorityPanelCollapsed ? 'tab-content--collapsed' : ''
          }`}
        >
          {activeTab === 'characters' && (
            <BottomPanel
              isCollapsed={isPriorityPanelCollapsed}
              onToggleCollapsed={() => setIsPriorityPanelCollapsed(prev => !prev)}
            />
          )}
          {activeTab === 'recruit' && (
            <CharacterShopPanel
              onClose={() => setActiveTab('characters')}
              onOpenBuild={() => setActiveTab('shop')}
            />
          )}
          {activeTab === 'shop' && <ShopPanel onClose={() => setActiveTab('characters')} />}
          {activeTab === 'technology' && <TechnologyPanel onClose={() => setActiveTab('characters')} />}
        </div>
      </footer>

      {selectedCharacter && (
        <CharacterPanel character={selectedCharacter} onClose={() => setSelectedCharacter(null)} />
      )}

      <DebugPanel />
      {showReturnSummary && <ReturnSummaryPanel onClose={() => setShowReturnSummary(false)} />}
    </div>
  )
}

export default App
