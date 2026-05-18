import { create } from 'zustand'
import { ResourceType } from '@app-types/map.types'

export interface FloatingText {
  id: string
  text: string
  x: number
  y: number
  type: 'resource' | 'error' | 'success'
  createdAt: number
}

interface ResourceState {
  resources: Map<ResourceType, number>
  coreParts: number
  corePartsCapacity: number
  floatingTexts: FloatingText[]

  getResource: (type: ResourceType) => number
  addResource: (type: ResourceType, amount: number) => void
  consumeResource: (type: ResourceType, amount: number) => boolean
  setResources: (resources: Map<ResourceType, number>) => void
  setCoreParts: (coreParts: number, capacity?: number) => void
  addFloatingText: (text: string, x: number, y: number, type?: 'resource' | 'error' | 'success') => void
  removeFloatingText: (id: string) => void
}

export const INITIAL_RESOURCES: Map<ResourceType, number> = new Map([
  [ResourceType.WOOD, 120],
  [ResourceType.STONE, 80],
  [ResourceType.FOOD, 60],
  [ResourceType.GOLD, 180],
  [ResourceType.CORE_PARTS, 0],
])

export const useResourceStore = create<ResourceState>((set, get) => ({
  resources: new Map(INITIAL_RESOURCES),
  coreParts: 0,
  corePartsCapacity: 500,
  floatingTexts: [],

  getResource: (type: ResourceType): number => {
    return get().resources.get(type) || 0
  },

  addResource: (type: ResourceType, amount: number) => {
    const { resources } = get()
    const current = resources.get(type) || 0
    const newResources = new Map(resources)
    newResources.set(type, current + amount)
    set({ resources: newResources })
  },

  consumeResource: (type: ResourceType, amount: number): boolean => {
    const { resources } = get()
    const current = resources.get(type) || 0
    if (current < amount) return false
    const newResources = new Map(resources)
    newResources.set(type, current - amount)
    set({ resources: newResources })
    return true
  },

  setResources: (resources: Map<ResourceType, number>) => {
    set({ resources: new Map(resources) })
  },

  setCoreParts: (coreParts: number, capacity?: number) => {
    set({ coreParts, ...(capacity !== undefined ? { corePartsCapacity: capacity } : {}) })
  },

  addFloatingText: (text: string, x: number, y: number, type: 'resource' | 'error' | 'success' = 'resource') => {
    const id = `float_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const floatingText: FloatingText = { id, text, x, y, type, createdAt: Date.now() }
    set(state => ({ floatingTexts: [...state.floatingTexts, floatingText] }))
    setTimeout(() => {
      get().removeFloatingText(id)
    }, 2000)
  },

  removeFloatingText: (id: string) => {
    set(state => ({ floatingTexts: state.floatingTexts.filter(ft => ft.id !== id) }))
  },
}))
