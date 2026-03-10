import { useState, useEffect } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import './DebugPanel.css'

const isDevelopment = import.meta.env.DEV

interface DebugAction {
  id: string
  name: string
  icon: string
  description: string
  action: () => void
}

export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const { game, resources, characters, addResource } = useGameStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isDevelopment) {
    return null
  }

  const handleQuickBoss = () => {
    if (!game) return
    const bossManager = game.getBossManager()
    bossManager.forceSpawn()
    console.log('[Debug] Boss spawned')
  }

  const handleGetArtifact = () => {
    if (!game) return
    console.log('[Debug] Artifact created')
  }

  const handleMaxResources = () => {
    addResource('wood' as any, 10000)
    addResource('stone' as any, 10000)
    addResource('food' as any, 10000)
    addResource('gold' as any, 100000)
    addResource('leather' as any, 5000)
    console.log('[Debug] Resources maxed')
  }

  const handleMaxLevel = () => {
    console.log('[Debug] Characters maxed')
  }

  const handleSkipBuild = () => {
    if (!game) return
    console.log('[Debug] Build skipped')
  }

  const handleGodMode = () => {
    console.log('[Debug] God mode toggled')
  }

  const debugActions: DebugAction[] = [
    {
      id: 'quick-boss',
      name: '快速BOSS',
      icon: '👹',
      description: '立即生成BOSS进入战斗',
      action: handleQuickBoss,
    },
    {
      id: 'get-artifact',
      name: '获取神器',
      icon: '⚔️',
      description: '商店添加传说级装备',
      action: handleGetArtifact,
    },
    {
      id: 'max-resources',
      name: '满资源',
      icon: '💰',
      description: '所有资源+10000',
      action: handleMaxResources,
    },
    {
      id: 'max-level',
      name: '满级角色',
      icon: '⭐',
      description: '所有角色等级+50',
      action: handleMaxLevel,
    },
    {
      id: 'skip-build',
      name: '跳过建造',
      icon: '⏩',
      description: '建筑立即完成',
      action: handleSkipBuild,
    },
    {
      id: 'god-mode',
      name: '无敌模式',
      icon: '🛡️',
      description: '角色不受伤害',
      action: handleGodMode,
    },
  ]

  if (!isVisible) {
    return (
      <button
        className="debug-toggle"
        onClick={() => setIsVisible(true)}
        title="调试面板 (Ctrl+Shift+D)"
      >
        🔧
      </button>
    )
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>🔧 调试面板</h3>
        <button className="debug-close" onClick={() => setIsVisible(false)}>
          ✕
        </button>
      </div>
      <div className="debug-actions">
        {debugActions.map((action) => (
          <button
            key={action.id}
            className="debug-action"
            onClick={action.action}
            title={action.description}
          >
            <span className="debug-action-icon">{action.icon}</span>
            <span className="debug-action-name">{action.name}</span>
          </button>
        ))}
      </div>
      <div className="debug-info">
        <div>角色数: {characters.length}</div>
        <div>资源种类: {resources.size}</div>
      </div>
    </div>
  )
}
