import { create } from 'zustand'
import { Character } from '@app-types/character.types'
import { Equipment } from '@app-types/equipment.types'
import { ShopItem } from '@domain/shop/ShopManager'
import { ShopCharacter } from '@app-types/character-shop.types'
import { Logger } from '@utils/logger'

const logger = new Logger('characterStore')

export interface TaskProgress {
  characterId: string
  taskType: string
  progress: number
  duration: number
  startTime: number
}

interface CharacterState {
  characters: Character[]
  equipments: Equipment[]
  shopItems: ShopItem[]
  shopCharacters: ShopCharacter[]
  selectedCharacterId: string | null
  taskProgress: Map<string, TaskProgress>

  setCharacters: (characters: Character[]) => void
  setEquipments: (equipments: Equipment[]) => void
  setShopItems: (items: ShopItem[]) => void
  setShopCharacters: (characters: ShopCharacter[]) => void
  selectCharacter: (characterId: string | null) => void
  setTaskProgress: (characterId: string, progress: TaskProgress) => void
  removeTaskProgress: (characterId: string) => void
  updateTaskProgress: (characterId: string, progress: number) => void
  getTaskProgress: (characterId: string) => TaskProgress | undefined
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  equipments: [],
  shopItems: [],
  shopCharacters: [],
  selectedCharacterId: null,
  taskProgress: new Map(),

  setCharacters: (characters: Character[]) => {
    set({ characters })
  },

  setEquipments: (equipments: Equipment[]) => {
    set({ equipments })
  },

  setShopItems: (items: ShopItem[]) => {
    set({ shopItems: items })
  },

  setShopCharacters: (characters: ShopCharacter[]) => {
    logger.info('shopCharacters updated:', characters.length)
    set({ shopCharacters: characters })
  },

  selectCharacter: (characterId: string | null) => {
    set({ selectedCharacterId: characterId })
  },

  setTaskProgress: (characterId: string, progress: TaskProgress) => {
    const newProgress = new Map(get().taskProgress)
    newProgress.set(characterId, progress)
    set({ taskProgress: newProgress })
  },

  removeTaskProgress: (characterId: string) => {
    const newProgress = new Map(get().taskProgress)
    newProgress.delete(characterId)
    set({ taskProgress: newProgress })
  },

  updateTaskProgress: (characterId: string, progress: number) => {
    const existing = get().taskProgress.get(characterId)
    if (existing) {
      const newProgress = new Map(get().taskProgress)
      newProgress.set(characterId, { ...existing, progress })
      set({ taskProgress: newProgress })
    }
  },

  getTaskProgress: (characterId: string): TaskProgress | undefined => {
    return get().taskProgress.get(characterId)
  },
}))
