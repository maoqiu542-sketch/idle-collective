import { ProductionBuildingType } from './production-building.types'
import { ResourceType } from './map.types'

export type GlobalStrategyPreset = 'none' | 'survival' | 'expand' | 'research' | 'boss'
export type PriorityMode = 'manual' | 'preset'

export interface SettlementBuildingSnapshot {
  type: ProductionBuildingType
  level: number
  count?: number
}

export interface RecruitmentStationState {
  stationLevel: number
  candidateCount: number
  maxCandidates: number
  nextRefreshAt: number
  manualRefreshCost: number
  refreshIntervalMs: number
  qualityBonus: number
}

export interface ResearchDeskState {
  totalLevel: number
  outputMultiplier: number
  workerCapacity: number
  assignedWorkers: number
}

export interface TradeReserve {
  wood: number
  stone: number
  food: number
}

export interface TradeLastResult {
  timestamp: number
  sold: Partial<Record<ResourceType, number>>
  goldEarned: number
  reason?: string
}

export interface TradeStateSnapshot {
  stationLevel: number
  enabled: boolean
  reserve: TradeReserve
  queuedBuffer: TradeReserve
  cycleIntervalMs: number
  cycleCap: number
  estimatedGoldPerMinute: number
  lastResult: TradeLastResult | null
}

export interface DevelopmentBreakdown {
  research: number
  building: number
  coreParts: number
  combat: number
  balanceFactor: number
}

export interface BuildingUpgradePreview {
  buildingId: string
  buildingName: string
  currentLevel: number
  nextLevel: number | null
  canUpgrade: boolean
  reason?: string
  cost?: {
    coreParts: number
    resources: Record<string, number>
    techRequired?: string
  }
  currentEffectSummary: string[]
  nextEffectSummary: string[]
}

export interface SettlementBuildingEffects {
  houseRestBonus: number
  houseComfortBonus: number
  kitchenMealBonus: number
  kitchenFoodProductionMultiplier: number
  warehouseCoreCapacity: number
  warehouseProductionMultiplier: number
  barracksCombatBonusMultiplier: number
  recruitmentQualityBonus: number
  recruitmentSlotBonus: number
  recruitmentRefreshCostDiscount: number
  researchOutputMultiplier: number
  researchWorkerCapacity: number
  tradeStationLevel: number
}

export interface SettlementStateSnapshot {
  settlementLivability: number
  settlementDevelopment: number
  developmentBreakdown: DevelopmentBreakdown
  coreParts: number
  priorityMode: PriorityMode
  globalStrategyPreset: GlobalStrategyPreset
  recruitmentStationState: RecruitmentStationState
  researchDeskState: ResearchDeskState
  tradeState: TradeStateSnapshot
  buildingEffects: SettlementBuildingEffects
}
