import { useState, useEffect } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { SaveMetadata } from '@app-types/save.types'
import './SaveLoadPanel.css'

interface SaveLoadPanelProps {
  mode: 'save' | 'load'
  onClose: () => void
}

export function SaveLoadPanel({ mode, onClose }: SaveLoadPanelProps) {
  const [saveSlots, setSaveSlots] = useState<(SaveMetadata | null)[]>([])
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [saveName, setSaveName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { game, characters, buildings, equipments, resources } = useGameStore()

  useEffect(() => {
    loadSaveSlots()
  }, [])

  const loadSaveSlots = () => {
    const slots: (SaveMetadata | null)[] = []
    for (let i = 0; i < 5; i++) {
      const key = `idle_collective_save_${i}`
      const json = localStorage.getItem(key)
      if (json) {
        try {
          const data = JSON.parse(json)
          slots.push(data.metadata)
        } catch {
          slots.push(null)
        }
      } else {
        slots.push(null)
      }
    }
    setSaveSlots(slots)
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPlayTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`
    }
    if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`
    }
    return `${seconds}秒`
  }

  const handleSave = (slotIndex: number) => {
    if (!game) return

    const name = saveName.trim() || `存档 ${slotIndex + 1}`
    const now = Date.now()

    const saveData = {
      metadata: {
        id: `save_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        createdAt: now,
        updatedAt: now,
        playTime: 0,
        version: '1.0.0',
      },
      game: {
        tick: 0,
        gameTime: 0,
        isPaused: false,
      },
      characters: characters.map(c => ({
        ...c,
        talents: Object.fromEntries(c.talents) as any,
      })),
      buildings,
      equipments,
      resources: Array.from(resources.entries()),
      settings: {
        autoSaveInterval: 60000,
        soundEnabled: true,
        musicEnabled: true,
        language: 'zh-CN',
      },
    }

    try {
      const key = `idle_collective_save_${slotIndex}`
      localStorage.setItem(key, JSON.stringify(saveData))
      setMessage({ type: 'success', text: '存档成功！' })
      loadSaveSlots()
      setSelectedSlot(null)
      setSaveName('')
    } catch (error) {
      setMessage({ type: 'error', text: '存档失败：存储空间不足' })
    }
  }

  const handleLoad = (slotIndex: number) => {
    const key = `idle_collective_save_${slotIndex}`
    const json = localStorage.getItem(key)

    if (!json) {
      setMessage({ type: 'error', text: '该槽位没有存档' })
      return
    }

    try {
      const saveData = JSON.parse(json)
      console.log('[SaveLoadPanel] Loading save:', saveData.metadata.name)
      setMessage({ type: 'success', text: '读档成功！' })
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      setMessage({ type: 'error', text: '读档失败：存档数据损坏' })
    }
  }

  const handleDelete = (slotIndex: number) => {
    if (!confirm('确定要删除这个存档吗？')) return

    const key = `idle_collective_save_${slotIndex}`
    localStorage.removeItem(key)
    setMessage({ type: 'success', text: '存档已删除' })
    loadSaveSlots()
  }

  return (
    <div className="save-load-panel">
      <div className="panel-header">
        <h2>{mode === 'save' ? '保存游戏' : '读取存档'}</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {mode === 'save' && selectedSlot !== null && (
          <div className="save-name-input">
            <input
              type="text"
              placeholder="输入存档名称..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              maxLength={20}
            />
            <button className="confirm-btn" onClick={() => handleSave(selectedSlot)}>
              确认保存
            </button>
            <button className="cancel-btn" onClick={() => setSelectedSlot(null)}>
              取消
            </button>
          </div>
        )}

        <div className="save-slots">
          {saveSlots.map((save, index) => (
            <div
              key={index}
              className={`save-slot ${save ? 'has-save' : 'empty'} ${selectedSlot === index ? 'selected' : ''}`}
              onClick={() => {
                if (mode === 'save') {
                  setSelectedSlot(index)
                  if (save) {
                    setSaveName(save.name)
                  }
                } else if (save) {
                  handleLoad(index)
                }
              }}
            >
              <div className="slot-index">槽位 {index + 1}</div>
              {save ? (
                <div className="slot-info">
                  <div className="save-name">{save.name}</div>
                  <div className="save-details">
                    <span>{formatDate(save.updatedAt)}</span>
                    <span>游玩时间: {formatPlayTime(save.playTime)}</span>
                  </div>
                  {mode === 'load' && (
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(index)
                      }}
                    >
                      删除
                    </button>
                  )}
                </div>
              ) : (
                <div className="empty-slot">
                  <span>{mode === 'save' ? '点击保存' : '空槽位'}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="panel-footer">
          <div className="current-status">
            <span>当前角色: {characters.length}</span>
            <span>建筑: {buildings.length}</span>
            <span>装备: {equipments.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
