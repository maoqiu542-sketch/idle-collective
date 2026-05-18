import { SaveData, SaveMetadata, SaveResult, LoadResult, GameSettings } from '@app-types/save.types'
import { Character, SkillType, TalentLevel } from '@app-types/character.types'
import { ProductionBuilding } from '@app-types/production-building.types'
import { Equipment } from '@app-types/equipment.types'
import { ResourceType } from '@app-types/map.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

const SAVE_VERSION = '2.1.0'
const MAX_SAVE_SLOTS = 5
const STORAGE_KEY_PREFIX = 'idle_collective_save_'
const MAX_SAVE_SIZE = 5 * 1024 * 1024
const MAX_STRING_LENGTH = 10000
const MAX_ARRAY_LENGTH = 1000

function isValidSaveData(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>

  if (!obj.metadata || typeof obj.metadata !== 'object') return false
  const meta = obj.metadata as Record<string, unknown>
  if (typeof meta.id !== 'string' || meta.id.length > MAX_STRING_LENGTH) return false
  if (typeof meta.name !== 'string' || meta.name.length > 100) return false
  if (typeof meta.createdAt !== 'number' || meta.createdAt < 0) return false
  if (typeof meta.updatedAt !== 'number' || meta.updatedAt < 0) return false
  if (typeof meta.playTime !== 'number' || meta.playTime < 0) return false
  if (typeof meta.version !== 'string') return false

  if (!obj.game || typeof obj.game !== 'object') return false
  const game = obj.game as Record<string, unknown>
  if (typeof game.tick !== 'number' || game.tick < 0) return false
  if (typeof game.gameTime !== 'number' || game.gameTime < 0) return false
  if (typeof game.isPaused !== 'boolean') return false

  if (!Array.isArray(obj.characters) || obj.characters.length > MAX_ARRAY_LENGTH) return false
  if (!Array.isArray(obj.buildings) || obj.buildings.length > MAX_ARRAY_LENGTH) return false
  if (!Array.isArray(obj.equipments) || obj.equipments.length > MAX_ARRAY_LENGTH) return false
  if (!Array.isArray(obj.resources) || obj.resources.length > 100) return false

  return true
}

function safeJsonParse(json: string): unknown {
  const reviver = (_key: string, value: unknown) => {
    if (value && typeof value === 'object') {
      if (Object.prototype.hasOwnProperty.call(value, '__proto__')) {
        throw new Error('Prototype pollution detected')
      }
      if (Object.prototype.hasOwnProperty.call(value, 'constructor')) {
        throw new Error('Constructor pollution detected')
      }
    }
    return value
  }

  return JSON.parse(json, reviver)
}

function getSaveVersion(payload: { saveVersion?: string; metadata?: { saveVersion?: string; version?: string } }): string {
  return payload.saveVersion || payload.metadata?.saveVersion || payload.metadata?.version || ''
}

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
      name: name.slice(0, 100).replace(/[<>"'\\]/g, ''),
      createdAt: now,
      updatedAt: now,
      playTime,
      version: SAVE_VERSION,
      saveVersion: SAVE_VERSION,
    }

    const defaultSettings: GameSettings = {
      autoSaveInterval: 60000,
      soundEnabled: true,
      musicEnabled: true,
      language: 'zh-CN',
    }

    return {
      metadata,
      saveVersion: SAVE_VERSION,
      game: {
        tick: Math.max(0, gameData.tick),
        gameTime: Math.max(0, gameData.gameTime),
        isPaused: Boolean(gameData.isPaused),
      },
      characters: this.serializeCharacters(characters),
      buildings,
      equipments,
      resources: Array.from(resources.entries()),
      settings: { ...defaultSettings, ...settings },
    }
  }

  private serializeCharacters(characters: Character[]): Character[] {
    return characters.map(c => ({
      ...c,
      talents: Object.fromEntries(c.talents) as any,
      skillPriorities: Object.fromEntries(c.skillPriorities || new Map()) as any,
    })) as Character[]
  }

  private deserializeCharacters(characters: Character[]): Character[] {
    return characters.map(c => {
      const talents = new Map<SkillType, TalentLevel>()
      if (c.talents && typeof c.talents === 'object') {
        Object.entries(c.talents as object).forEach(([skill, level]) => {
          if (typeof skill === 'string' && level && typeof level === 'object') {
            talents.set(skill as SkillType, level as TalentLevel)
          }
        })
      }

      const skillPriorities = new Map<SkillType, number>()
      const rawSkillPriorities = c.skillPriorities instanceof Map
        ? Object.fromEntries(c.skillPriorities)
        : ((c.skillPriorities as unknown as Record<string, number>) || {})
      Object.entries(rawSkillPriorities).forEach(([skill, level]) => {
        if (typeof level === 'number') {
          skillPriorities.set(skill as SkillType, level)
        }
      })

      return {
        ...c,
        name: c.name?.slice(0, 50) || 'Unknown',
        talents,
        skillPriorities,
        equipmentSlots: c.equipmentSlots || {},
      }
    })
  }

  saveToSlot(slotIndex: number, saveData: SaveData): SaveResult {
    if (slotIndex < 0 || slotIndex >= MAX_SAVE_SLOTS) {
      return { success: false, message: '无效的存档槽位' }
    }

    try {
      const json = JSON.stringify(saveData)
      if (json.length > MAX_SAVE_SIZE) {
        return { success: false, message: `存档大小超出限制 (${(json.length / 1024 / 1024).toFixed(2)}MB > 5MB)` }
      }

      const key = `${STORAGE_KEY_PREFIX}${slotIndex}`
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
      if (json.length > MAX_SAVE_SIZE) {
        return { success: false, message: '存档文件过大，可能已损坏' }
      }

      const parsedData = safeJsonParse(json)
      if (!isValidSaveData(parsedData)) {
        this.logger.error('Invalid save data structure')
        return { success: false, message: '存档数据格式无效，可能已损坏' }
      }

      const saveData = parsedData as SaveData
      const version = getSaveVersion(saveData)
      if (version !== SAVE_VERSION) {
        return {
          success: false,
          message: `存档版本不兼容，当前版本 ${SAVE_VERSION}，读到版本 ${version || '未知'}，请开新档`,
        }
      }

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
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slotIndex}`)
      return true
    } catch {
      return false
    }
  }

  getSaveSlots(): (SaveMetadata | null)[] {
    const slots: (SaveMetadata | null)[] = []
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      try {
        const json = localStorage.getItem(`${STORAGE_KEY_PREFIX}${i}`)
        if (json && json.length <= MAX_SAVE_SIZE) {
          const parsedData = safeJsonParse(json)
          slots.push(isValidSaveData(parsedData) ? parsedData.metadata : null)
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
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${slotIndex}`) !== null
  }

  startAutoSave(interval: number, getSaveData: () => SaveData, slotIndex: number = 0): void {
    this.stopAutoSave()
    this.autoSaveInterval = setInterval(() => {
      this.saveToSlot(slotIndex, getSaveData())
    }, interval)
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }

  formatPlayTime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}小时${minutes % 60}分钟`
    if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`
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

export default SaveManager
