import { useEffect, useState } from 'react'
import { useGameStore } from './stores/gameStore'
import { MapView } from './components/map/MapView'
import { BottomPanel } from './components/panel/BottomPanel'
import { ShopPanel } from './components/shop/ShopPanel'
import { CharacterPanel } from './components/character/CharacterPanel'
import { BossButton } from './components/boss/BossButton'
import { BossPanel } from './components/boss/BossPanel'
import { CombatPanel } from './components/combat/CombatPanel'
import { SettlementPanel } from './components/combat/SettlementPanel'
import { DebugPanel } from './components/debug/DebugPanel'
import { ProfessionType, Character } from '@app-types/character.types'
import { Boss, BossReward } from '@app-types/combat.types'
import './App.css'

function App() {
  const { init, start, isInitialized, isPaused, pause, resume, createCharacter, characters, game } = useGameStore()
  const [showAddCharacter, setShowAddCharacter] = useState(false)
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newCharacterProfession, setNewCharacterProfession] = useState<ProfessionType>(ProfessionType.GATHERER)
  
  const [showShop, setShowShop] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  
  const [availableBoss, setAvailableBoss] = useState<Boss | null>(null)
  const [showBossPanel, setShowBossPanel] = useState(false)
  const [inCombat, setInCombat] = useState(false)
  const [combatCharacters, setCombatCharacters] = useState<Character[]>([])
  const [showSettlement, setShowSettlement] = useState(false)
  const [isVictory, setIsVictory] = useState(false)
  const [rewards, setRewards] = useState<BossReward[]>([])

  useEffect(() => {
    const initGame = async () => {
      await init()
      start()
    }
    initGame()
  }, [init, start])

  useEffect(() => {
    if (game) {
      const bossManager = game.getBossManager()
      const bosses = bossManager.getAvailableBosses()
      if (bosses.length > 0) {
        setAvailableBoss(bosses[0])
      }
    }
  }, [game, characters])

  const handleAddCharacter = () => {
    if (newCharacterName.trim()) {
      createCharacter(newCharacterName.trim(), newCharacterProfession)
      setNewCharacterName('')
      setShowAddCharacter(false)
    }
  }

  const handleStartCombat = (selectedChars: Character[]) => {
    setCombatCharacters(selectedChars)
    setShowBossPanel(false)
    setInCombat(true)
  }

  const handleCombatEnd = (victory: boolean) => {
    setIsVictory(victory)
    if (victory && availableBoss) {
      setRewards([
        { type: 'gold', amount: availableBoss.level * 50, dropRate: 1 },
        { type: 'exp', amount: availableBoss.level * 10, dropRate: 1 },
      ])
    }
    setInCombat(false)
    setShowSettlement(true)
  }

  const handleSettlementConfirm = () => {
    setShowSettlement(false)
    setAvailableBoss(null)
    setRewards([])
  }

  if (!isInitialized) {
    return (
      <div className="app-loading">
        <h1>加载中...</h1>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Idle Collective</h1>
        <div className="controls">
          <button onClick={isPaused ? resume : pause}>
            {isPaused ? '继续' : '暂停'}
          </button>
          <button onClick={() => setShowShop(true)}>商店</button>
          <button onClick={() => setShowAddCharacter(!showAddCharacter)}>
            添加角色
          </button>
        </div>
      </header>

      {showAddCharacter && (
        <div className="add-character-modal">
          <div className="modal-content">
            <h2>添加新角色</h2>
            <input
              type="text"
              placeholder="角色名称"
              value={newCharacterName}
              onChange={(e) => setNewCharacterName(e.target.value)}
            />
            <select
              value={newCharacterProfession}
              onChange={(e) => setNewCharacterProfession(e.target.value as ProfessionType)}
            >
              <option value={ProfessionType.GATHERER}>采集者</option>
              <option value={ProfessionType.BUILDER}>建造者</option>
              <option value={ProfessionType.FARMER}>农夫</option>
              <option value={ProfessionType.WARRIOR}>战士</option>
            </select>
            <div className="modal-buttons">
              <button onClick={handleAddCharacter}>确认</button>
              <button onClick={() => setShowAddCharacter(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {showShop && <ShopPanel onClose={() => setShowShop(false)} />}

      {selectedCharacter && (
        <CharacterPanel 
          character={selectedCharacter} 
          onClose={() => setSelectedCharacter(null)} 
        />
      )}

      {availableBoss && !showBossPanel && !inCombat && (
        <BossButton 
          boss={availableBoss} 
          onClick={() => setShowBossPanel(true)} 
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
          onCombatEnd={handleCombatEnd}
        />
      )}

      {showSettlement && (
        <SettlementPanel
          isVictory={isVictory}
          rewards={rewards}
          restingCharacters={isVictory ? undefined : combatCharacters.map(c => c.name)}
          onConfirm={handleSettlementConfirm}
        />
      )}

      <main className="app-main">
        <MapView onCharacterClick={(char) => setSelectedCharacter(char)} />
      </main>

      <footer className="app-footer">
        <BottomPanel onCharacterDoubleClick={(char) => setSelectedCharacter(char)} />
      </footer>

      <DebugPanel />
    </div>
  )
}

export default App
