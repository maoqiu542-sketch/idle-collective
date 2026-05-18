import { useCallback, useEffect, useState, useMemo } from 'react'
import { Boss } from '@app-types/combat.types'
import { Character } from '@app-types/character.types'
import './CombatPanel.css'

interface CombatLog {
  attacker: string
  target: string
  damage: number
  isCritical: boolean
  time: number
}

interface Combatant {
  id: string
  name: string
  type: 'character' | 'boss'
  hp: number
  maxHp: number
  atk: number
  def: number
  speed: number
  critRate: number
  critDmg: number
  isAlive: boolean
}

interface CombatPanelProps {
  boss: Boss
  characters: Character[]
  combatTrainingMultiplier?: number
  onCombatEnd: (victory: boolean) => void
}

export function CombatPanel({ boss, characters, combatTrainingMultiplier = 1, onCombatEnd }: CombatPanelProps) {
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0)
  const [logs, setLogs] = useState<CombatLog[]>([])
  const [isEnded, setIsEnded] = useState(false)
  const [isVictory, setIsVictory] = useState(false)
  const [combatantHps, setCombatantHps] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    characters.forEach(c => map.set(c.id, c.stats.health))
    map.set(boss.id, boss.state.currentHp)
    return map
  })

  const combatants = useMemo<Combatant[]>(() => {
    const chars: Combatant[] = characters.map(c => ({
      id: c.id,
      name: c.name,
      type: 'character' as const,
      hp: c.stats.health,
      maxHp: c.stats.maxHealth,
      atk: Math.round((c.sixDimensions?.atk || 10) * combatTrainingMultiplier),
      def: Math.round((c.sixDimensions?.def || 5) * combatTrainingMultiplier),
      speed: c.sixDimensions?.atkSpd || 1,
      critRate: c.sixDimensions?.critRate || 5,
      critDmg: c.sixDimensions?.critDmg || 150,
      isAlive: true,
    }))

    const bossCombatant: Combatant = {
      id: boss.id,
      name: boss.name,
      type: 'boss',
      hp: boss.state.currentHp,
      maxHp: boss.stats.maxHp,
      atk: boss.stats.atk,
      def: boss.stats.def,
      speed: boss.stats.speed || 1.5,
      critRate: 0,
      critDmg: 150,
      isAlive: true,
    }

    return [...chars, bossCombatant].sort((a, b) => b.speed - a.speed)
  }, [boss, characters, combatTrainingMultiplier])

  const actionOrder = useMemo(() => {
    return combatants.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      speed: c.speed,
    }))
  }, [combatants])

  const getAliveCombatants = useCallback((type?: 'character' | 'boss') => {
    return combatants.filter(c => {
      const hp = combatantHps.get(c.id) || 0
      const isAlive = hp > 0
      if (type) return isAlive && c.type === type
      return isAlive
    })
  }, [combatants, combatantHps])

  const calculateDamage = (attacker: Combatant, defender: Combatant): { damage: number; isCritical: boolean } => {
    const isCritical = Math.random() * 100 < attacker.critRate
    const baseDamage = attacker.atk * (isCritical ? attacker.critDmg / 100 : 1)
    const defense = defender.def
    const damage = Math.max(1, Math.floor(baseDamage * (1 - defense / (defense + 100))))
    return { damage, isCritical }
  }

  useEffect(() => {
    if (isEnded) return

    const interval = setInterval(() => {
      const now = Date.now()
      
      const aliveCharacters = getAliveCombatants('character')
      const aliveBoss = getAliveCombatants('boss')
      
      if (aliveCharacters.length === 0) {
        setIsEnded(true)
        setIsVictory(false)
        return
      }

      if (aliveBoss.length === 0) {
        setIsEnded(true)
        setIsVictory(true)
        return
      }

      const sortedAlive = combatants
        .filter(c => (combatantHps.get(c.id) || 0) > 0)
        .sort((a, b) => b.speed - a.speed)

      if (sortedAlive.length === 0) return

      const currentAttacker = sortedAlive[currentTurnIndex % sortedAlive.length]
      
      if (currentAttacker.type === 'character') {
        const { damage, isCritical } = calculateDamage(currentAttacker, combatants.find(c => c.id === boss.id)!)
        
        setCombatantHps(prev => {
          const newMap = new Map(prev)
          const currentHp = newMap.get(boss.id) || 0
          newMap.set(boss.id, Math.max(0, currentHp - damage))
          return newMap
        })

        setLogs(prev => [...prev.slice(-9), {
          attacker: currentAttacker.name,
          target: boss.name,
          damage,
          isCritical,
          time: now
        }])
      } else {
        const targetChar = aliveCharacters[Math.floor(Math.random() * aliveCharacters.length)]
        const { damage } = calculateDamage(currentAttacker, targetChar)
        
        setCombatantHps(prev => {
          const newMap = new Map(prev)
          const currentHp = newMap.get(targetChar.id) || 0
          newMap.set(targetChar.id, Math.max(0, currentHp - damage))
          return newMap
        })

        setLogs(prev => [...prev.slice(-9), {
          attacker: boss.name,
          target: targetChar.name,
          damage,
          isCritical: false,
          time: now
        }])
      }

      setCurrentTurnIndex(prev => (prev + 1) % sortedAlive.length)
    }, 800)

    return () => clearInterval(interval)
  }, [combatantHps, combatants, boss, isEnded, currentTurnIndex, getAliveCombatants])

  useEffect(() => {
    if (isEnded) {
      setTimeout(() => onCombatEnd(isVictory), 1500)
    }
  }, [isEnded, isVictory, onCombatEnd])

  const getHpPercent = (id: string) => {
    const combatant = combatants.find(c => c.id === id)
    if (!combatant) return 0
    const hp = combatantHps.get(id) || 0
    return (hp / combatant.maxHp) * 100
  }

  const getHp = (id: string) => {
    return combatantHps.get(id) || 0
  }

  return (
    <div className="combat-panel">
      <div className="combat-header">
        <h2>⚔️ 战斗中</h2>
      </div>

      <div className="action-order-bar">
        <span className="action-order-label">行动顺序:</span>
        {actionOrder.map((c, index) => (
          <div 
            key={c.id} 
            className={`action-order-item ${c.type} ${currentTurnIndex % actionOrder.length === index ? 'current' : ''}`}
            title={`速度: ${c.speed.toFixed(2)}`}
          >
            {c.type === 'boss' ? '👹' : '👤'}
          </div>
        ))}
      </div>

      <div className="combat-arena">
        <div className="boss-section">
          <div className="combatant boss">
            <div className="combatant-avatar">👹</div>
            <div className="combatant-name">{boss.name}</div>
            <div className="combatant-speed">⚡ {boss.stats.speed?.toFixed(2) || '1.50'}</div>
            <div className="hp-bar">
              <div 
                className="hp-fill boss-hp" 
                style={{ width: `${getHpPercent(boss.id)}%` }}
              ></div>
            </div>
            <div className="hp-text">{getHp(boss.id)} / {boss.stats.maxHp}</div>
          </div>
        </div>

        <div className="vs-divider">VS</div>

        <div className="characters-section">
          {characters.map(character => {
            const combatant = combatants.find(c => c.id === character.id)
            const isDead = getHp(character.id) <= 0
            return (
              <div key={character.id} className={`combatant character ${isDead ? 'dead' : ''}`}>
                <div className="combatant-avatar">👤</div>
                <div className="combatant-name">{character.name}</div>
                <div className="combatant-speed">⚡ {combatant?.speed.toFixed(2) || '1.00'}</div>
                <div className="hp-bar">
                  <div 
                    className="hp-fill char-hp" 
                    style={{ width: `${getHpPercent(character.id)}%` }}
                  ></div>
                </div>
                <div className="hp-text">{getHp(character.id)} / {character.stats.maxHealth}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="combat-logs">
        <h3>战斗日志</h3>
        <div className="logs-content">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.isCritical ? 'critical' : ''}`}>
              <span className="attacker">{log.attacker}</span>
              <span className="action">攻击</span>
              <span className="target">{log.target}</span>
              <span className="damage">
                {log.isCritical && '💥'}
                {log.damage}伤害
              </span>
            </div>
          ))}
        </div>
      </div>

      {isEnded && (
        <div className={`combat-result ${isVictory ? 'victory' : 'defeat'}`}>
          {isVictory ? '🎉 胜利!' : '💀 失败'}
        </div>
      )}
    </div>
  )
}
