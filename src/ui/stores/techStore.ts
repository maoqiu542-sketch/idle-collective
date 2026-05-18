import { create } from 'zustand'

interface TechState {
  techPoints: number
  completedTechs: string[]

  setTechPoints: (points: number) => void
  setCompletedTechs: (techs: string[]) => void
  addCompletedTech: (techId: string) => void
}

export const useTechStore = create<TechState>((set, get) => ({
  techPoints: 0,
  completedTechs: [],

  setTechPoints: (points: number) => {
    set({ techPoints: points })
  },

  setCompletedTechs: (techs: string[]) => {
    set({ completedTechs: techs })
  },

  addCompletedTech: (techId: string) => {
    const { completedTechs } = get()
    if (!completedTechs.includes(techId)) {
      set({ completedTechs: [...completedTechs, techId] })
    }
  },
}))
