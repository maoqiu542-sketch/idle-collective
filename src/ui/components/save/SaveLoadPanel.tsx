import { useCallback, useEffect, useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { useResourceStore } from '@ui/stores/resourceStore'
import { useCharacterStore } from '@ui/stores/characterStore'
import { useBuildingStore } from '@ui/stores/buildingStore'
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

  const { saveGameToSlot, loadGameFromSlot, deleteSaveSlot, getSaveSlots } = useGameStore()
  const { resources } = useResourceStore()
  const { characters, equipments } = useCharacterStore()
  const { buildings } = useBuildingStore()

  const loadSaveSlots = useCallback(() => {
    const slots = getSaveSlots()
    const normalized: (SaveMetadata | null)[] = Array.from({ length: 5 }, (_, index) => slots[index] ?? null)
    setSaveSlots(normalized)
  }, [getSaveSlots])

  useEffect(() => {
    loadSaveSlots()
  }, [loadSaveSlots])

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
    const name = saveName.trim() || `存档 ${slotIndex + 1}`
    const result = saveGameToSlot(slotIndex, name)

    if (result.success) {
      setMessage({ type: 'success', text: '存档成功' })
      loadSaveSlots()
      setSelectedSlot(null)
      setSaveName('')
      return
    }

    setMessage({ type: 'error', text: result.message || '存档失败' })
  }

  const handleLoad = (slotIndex: number) => {
    const result = loadGameFromSlot(slotIndex)
    if (!result.success) {
      setMessage({ type: 'error', text: result.message || '读取失败' })
      return
    }

    setMessage({ type: 'success', text: '读取成功' })
    loadSaveSlots()
    setTimeout(() => {
      onClose()
    }, 800)
  }

  const handleDelete = (slotIndex: number) => {
    if (!confirm('确定要删除这个存档吗？')) return
    deleteSaveSlot(slotIndex)
    setMessage({ type: 'success', text: '存档已删除' })
    loadSaveSlots()
  }

  return (
    <div className="save-load-panel">
      <div className="panel-header">
        <h2>{mode === 'save' ? '保存游戏' : '读取存档'}</h2>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="panel-content">
        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        {mode === 'save' && selectedSlot !== null && (
          <div className="save-name-input">
            <input
              type="text"
              placeholder="输入存档名称..."
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
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
                    <span>游玩时长：{formatPlayTime(save.playTime)}</span>
                  </div>
                  {mode === 'load' && (
                    <button
                      className="delete-btn"
                      onClick={(event) => {
                        event.stopPropagation()
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
            <span>角色：{characters.length}</span>
            <span>建筑：{buildings.length}</span>
            <span>装备：{equipments.length}</span>
            <span>资源种类：{resources.size}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
