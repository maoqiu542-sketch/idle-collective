import { SaveData, SaveMetadata, SaveResult, LoadResult, GameSettings } from '@app-types/save.types'
import { Character } from '@app-types/character.types'
import { ProductionBuilding } from '@app-types/production-building.types'
import { Equipment } from '@app-types/equipment.types'
import { ResourceType } from '@app-types/map.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

const SAVE_VERSION = '1.0.0'
const MAX_SAVE_SLOTS = 5
const STORAGE_KEY_PREFIX = 'idle_collective_save_'

export class SaveManager {
  private eventBus: EventBus
  private logger: Logger
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null
  private playTimeStart: number = Date.now()

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('SaveManager')
  }

  createSave(
    name: string,
    gameData: {
      tick: number
      gameTime: number
      isPaused: boolean
    },
    characters: Character[],
    buildings: ProductionBuilding[],
    equipments: Equipment[],
    resources: Map<ResourceType, number>,
    settings?: Partial<GameSettings>
  ): SaveData {
    const now = Date.now()
    const playTime = now - this.playTimeStart

    const metadata: SaveMetadata = {
      id: `save_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: now,
      updatedAt: now,
      playTime,
      version: SAVE_VERSION,
    }

    const defaultSettings: GameSettings = {
      autoSaveInterval: 60000,
      soundEnabled: true,
      musicEnabled: true,
      language: 'zh-CN',
    }

    const saveData: SaveData = {
      metadata,
      game: gameData,
      characters: this.serializeCharacters(characters),
      buildings,
      equipments,
      resources: Array.from(resources.entries()),
      settings: { ...defaultSettings, ...settings },
    }

    return saveData
  }

  private serializeCharacters(characters: Character[]): Character[] {
    return characters.map(c => ({
      ...c,
      talents: Object.fromEntries(c.talents) as any,
    }))
  }

  private deserializeCharacters(characters: Character[]): Character[] {
    return characters.map(c => {
      const talents = new Map()
      if (c.talents && typeof c.talents === 'object') {
        Object.entries(c.talents as object).forEach(([skill, level]) => {
          talents.set(skill, level)
        })
      }
      return {
        ...c,
        talents,
        equipmentSlots: c.equipmentSlots || {},
      }
    })
  }

  saveToSlot(slotIndex: number, saveData: SaveData): SaveResult {
    if (slotIndex < 0 || slotIndex >= MAX_SAVE_SLOTS) {
      return { success: false, message: '无效的存档槽位' }
    }

    try {
      const key = `${STORAGE_KEY_PREFIX}${slotIndex}`
      const json = JSON.stringify(saveData)
      localStorage.setItem(key, json)

      this.eventBus.emit('save:completed', { timestamp: Date.now() })
      this.logger.info(`Saved to slot ${slotIndex}: ${saveData.metadata.name}`)

      return { success: true, saveId: saveData.metadata.id }
    } catch (error) {
      const message = error instanceof Error ? error.message : '存档失败'
      this.logger.error('Save failed:', error)
      return { success: false, message }
    }
  }

  loadFromSlot(slotIndex: number): LoadResult {
    if (slotIndex < 0 || slotIndex >= MAX_SAVE_SLOTS) {
      return { success: false, message: '无效的存档槽位' }
    }

    try {
      const key = `${STORAGE_KEY_PREFIX}${slotIndex}`
      const json = localStorage.getItem(key)

      if (!json) {
        return { success: false, message: '该槽位没有存档' }
      }

      const saveData = JSON.parse(json) as SaveData
      saveData.characters = this.deserializeCharacters(saveData.characters)

      this.eventBus.emit('load:completed', { timestamp: saveData.metadata.updatedAt })
      this.logger.info(`Loaded from slot ${slotIndex}: ${saveData.metadata.name}`)

      return { success: true, data: saveData }
    } catch (error) {
      const message = error instanceof Error ? error.message : '读档失败'
      this.logger.error('Load failed:', error)
      return { success: false, message }
    }
  }

  deleteSave(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= MAX_SAVE_SLOTS) return false

    try {
      const key = `${STORAGE_KEY_PREFIX}${slotIndex}`
      localStorage.removeItem(key)
      this.logger.info(`Deleted save at slot ${slotIndex}`)
      return true
    } catch (error) {
      this.logger.error('Delete failed:', error)
      return false
    }
  }

  getSaveSlots(): (SaveMetadata | null)[] {
    const slots: (SaveMetadata | null)[] = []

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      try {
        const key = `${STORAGE_KEY_PREFIX}${i}`
        const json = localStorage.getItem(key)

        if (json) {
          const saveData = JSON.parse(json) as SaveData
          slots.push(saveData.metadata)
        } else {
          slots.push(null)
        }
      } catch {
        slots.push(null)
      }
    }

    return slots
  }

  hasSaveInSlot(slotIndex: number): boolean {
    const key = `${STORAGE_KEY_PREFIX}${slotIndex}`
    return localStorage.getItem(key) !== null
  }

  startAutoSave(
    interval: number,
    getSaveData: () => SaveData,
    slotIndex: number = 0
  ): void {
    this.stopAutoSave()

    this.autoSaveInterval = setInterval(() => {
      const saveData = getSaveData()
      this.saveToSlot(slotIndex, saveData)
      this.logger.debug('Auto-saved')
    }, interval)

    this.logger.info(`Auto-save started with interval ${interval}ms`)
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
      this.logger.info('Auto-save stopped')
    }
  }

  formatPlayTime(ms: number): string {
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

  formatDate(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
