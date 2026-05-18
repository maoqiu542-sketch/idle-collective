import { create } from 'zustand'
import { ProductionBuilding, ProductionBuildingType } from '@app-types/production-building.types'
import type { OnlineBuildingSnapshot } from '@app-types/online.types'
import { Logger } from '@utils/logger'

const logger = new Logger('buildingStore')

export type StoredBuilding = ProductionBuilding | OnlineBuildingSnapshot

interface BuildingState {
  buildings: StoredBuilding[]
  buildingPlacementMode: boolean
  selectedBuildingType: ProductionBuildingType | null
  placementError: string | null

  setBuildings: (buildings: StoredBuilding[]) => void
  startBuildingPlacement: (type: ProductionBuildingType) => void
  cancelBuildingPlacement: () => void
  setPlacementError: (error: string | null) => void
  clearPlacementError: () => void
}

export const useBuildingStore = create<BuildingState>((set) => ({
  buildings: [],
  buildingPlacementMode: false,
  selectedBuildingType: null,
  placementError: null,

  setBuildings: (buildings: StoredBuilding[]) => {
    set({ buildings })
  },

  startBuildingPlacement: (type: ProductionBuildingType) => {
    logger.debug('Started building placement:', type)
    set({ buildingPlacementMode: true, selectedBuildingType: type, placementError: null })
  },

  cancelBuildingPlacement: () => {
    logger.debug('Cancelled building placement')
    set({ buildingPlacementMode: false, selectedBuildingType: null, placementError: null })
  },

  setPlacementError: (error: string | null) => {
    set({ placementError: error })
  },

  clearPlacementError: () => {
    set({ placementError: null })
  },
}))
