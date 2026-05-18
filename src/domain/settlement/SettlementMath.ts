import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import { DevelopmentBreakdown, SettlementBuildingEffects } from '@app-types/settlement.types'

const LIVABILITY_BY_BUILDING: Partial<Record<ProductionBuildingType, number>> = {
  [ProductionBuildingType.HOUSE]: 12,
  [ProductionBuildingType.KITCHEN]: 6,
  [ProductionBuildingType.FARM]: 4,
  [ProductionBuildingType.LUMBER_MILL]: 2,
  [ProductionBuildingType.QUARRY]: 2,
  [ProductionBuildingType.RESEARCH_DESK]: 3,
  [ProductionBuildingType.RECRUITMENT_STATION]: 4,
  [ProductionBuildingType.WAREHOUSE]: 2,
  [ProductionBuildingType.BARRACKS]: 0,
  [ProductionBuildingType.TRADE_STATION]: 2,
}

const HOUSING_CAPACITY_BY_BUILDING: Partial<Record<ProductionBuildingType, number>> = {
  [ProductionBuildingType.HOUSE]: 2,
}

const ESSENCE_STORAGE_BY_BUILDING: Partial<Record<ProductionBuildingType, number>> = {
  [ProductionBuildingType.WAREHOUSE]: 200,
}

const FOOD_RECOVERY_BY_BUILDING: Partial<Record<ProductionBuildingType, number>> = {
  [ProductionBuildingType.KITCHEN]: 10,
}

const COMBAT_TRAINING_BY_BUILDING: Partial<Record<ProductionBuildingType, number>> = {
  [ProductionBuildingType.BARRACKS]: 0.08,
}

const KEY_BUILDINGS = new Set<ProductionBuildingType>([
  ProductionBuildingType.HOUSE,
  ProductionBuildingType.FARM,
  ProductionBuildingType.KITCHEN,
  ProductionBuildingType.RESEARCH_DESK,
  ProductionBuildingType.WAREHOUSE,
  ProductionBuildingType.BARRACKS,
  ProductionBuildingType.TRADE_STATION,
  ProductionBuildingType.LUMBER_MILL,
  ProductionBuildingType.QUARRY,
])

function getBuildingLevelTotal(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>,
  type: ProductionBuildingType
): number {
  return buildings.reduce((sum, building) => {
    if (building.type !== type) {
      return sum
    }

    return sum + Math.max(1, building.level ?? 1)
  }, 0)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function getBuildingLivability(type: ProductionBuildingType): number {
  return LIVABILITY_BY_BUILDING[type] ?? 0
}

export function calculateHousingCapacity(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>,
  baseCapacity = 5
): number {
  return buildings.reduce((total, building) => {
    const level = Math.max(1, building.level ?? 1)
    return total + (HOUSING_CAPACITY_BY_BUILDING[building.type] ?? 0) * level
  }, baseCapacity)
}

export function calculateEssenceStorageCapacity(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>,
  baseCapacity = 500
): number {
  return buildings.reduce((total, building) => {
    const level = Math.max(1, building.level ?? 1)
    return total + (ESSENCE_STORAGE_BY_BUILDING[building.type] ?? 0) * level
  }, baseCapacity)
}

export function calculateFoodRecoveryBonus(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>
): number {
  return buildings.reduce((total, building) => {
    const level = Math.max(1, building.level ?? 1)
    return total + (FOOD_RECOVERY_BY_BUILDING[building.type] ?? 0) * level
  }, 0)
}

export function calculateCombatTrainingMultiplier(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>
): number {
  return buildings.reduce((total, building) => {
    const level = Math.max(1, building.level ?? 1)
    return total + (COMBAT_TRAINING_BY_BUILDING[building.type] ?? 0) * level
  }, 1)
}

export function calculateSettlementLivability(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>,
  techBonus = 0
): number {
  const buildingLivability = buildings.reduce((sum, building) => {
    const level = Math.max(1, building.level ?? 1)
    return sum + getBuildingLivability(building.type) + Math.max(0, level - 1)
  }, 0)

  return clamp(buildingLivability + techBonus, 0, 100)
}

export function calculateSettlementDevelopment(input: {
  completedKeyResearchCount: number
  buildingLevels: Partial<Record<ProductionBuildingType, number>>
  corePartsSpent: number
  activeCombatPower: number
  targetCombatPower?: number
}): { value: number; breakdown: DevelopmentBreakdown } {
  const buildingLevels = input.buildingLevels
  const researchScore = clamp(input.completedKeyResearchCount / 3, 0, 1)
  const buildingScore = clamp(
    0.15 * clamp((buildingLevels[ProductionBuildingType.HOUSE] || 0) / 3, 0, 1) +
      0.1 * clamp((buildingLevels[ProductionBuildingType.KITCHEN] || 0) / 2, 0, 1) +
      0.1 * clamp((buildingLevels[ProductionBuildingType.FARM] || 0) / 3, 0, 1) +
      0.1 * clamp(((buildingLevels[ProductionBuildingType.LUMBER_MILL] || 0) + (buildingLevels[ProductionBuildingType.QUARRY] || 0)) / 6, 0, 1) +
      0.2 * clamp((buildingLevels[ProductionBuildingType.RESEARCH_DESK] || 0) / 3, 0, 1) +
      0.1 * clamp((buildingLevels[ProductionBuildingType.WAREHOUSE] || 0) / 2, 0, 1) +
      0.1 * clamp((buildingLevels[ProductionBuildingType.RECRUITMENT_STATION] || 0) / 2, 0, 1) +
      0.1 * clamp((buildingLevels[ProductionBuildingType.BARRACKS] || 0) / 2, 0, 1) +
      0.05 * clamp((buildingLevels[ProductionBuildingType.TRADE_STATION] || 0) / 2, 0, 1),
    0,
    1
  )
  const coreScore = clamp(input.corePartsSpent / 12, 0, 1)
  const targetCombatPower = input.targetCombatPower ?? 650
  const combatScore = clamp(Math.sqrt(Math.max(0, input.activeCombatPower) / targetCombatPower), 0, 1)

  const baseDevelopment = 100 * (
    0.35 * researchScore +
    0.30 * buildingScore +
    0.20 * coreScore +
    0.15 * combatScore
  )

  const balanceFactor = 0.85 + 0.15 * Math.min(researchScore, buildingScore, coreScore)
  const value = Math.floor(clamp(baseDevelopment * balanceFactor, 0, 100))

  return {
    value,
    breakdown: {
      research: Math.round(researchScore * 100),
      building: Math.round(buildingScore * 100),
      coreParts: Math.round(coreScore * 100),
      combat: Math.round(combatScore * 100),
      balanceFactor: Number(balanceFactor.toFixed(2)),
    },
  }
}

export function calculateNeedDecayMultiplier(livability: number): number {
  return clamp(1.2 - livability / 200, 0.7, 1.2)
}

export function calculateRecruitQualityScore(livability: number, development: number): number {
  return livability * 0.4 + development * 0.6
}

export function getKeyBuildingLevelSum(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>
): number {
  return buildings.reduce((sum, building) => {
    if (!KEY_BUILDINGS.has(building.type)) {
      return sum
    }
    return sum + Math.max(1, building.level ?? 1)
  }, 0)
}

export function getBossDifficultyTier(development: number): 1 | 2 | 3 {
  if (development >= 70) return 3
  if (development >= 35) return 2
  return 1
}

export function getBossDifficultyScale(development: number): number {
  const tier = getBossDifficultyTier(development)
  const tierScale: Record<1 | 2 | 3, number> = {
    1: 1,
    2: 1.2,
    3: 1.45,
  }

  return tierScale[tier] + clamp(development / 200, 0, 0.35)
}

export function getHouseRestBonus(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>
): number {
  return getBuildingLevelTotal(buildings, ProductionBuildingType.HOUSE) * 6
}

export function getKitchenMealBonus(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>
): number {
  return getBuildingLevelTotal(buildings, ProductionBuildingType.KITCHEN) * 8
}

export function getWarehouseStorageBonus(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>
): number {
  return getBuildingLevelTotal(buildings, ProductionBuildingType.WAREHOUSE) * 150
}

export function getBarracksCombatBonus(
  buildings: Array<{ type: ProductionBuildingType; level?: number }>
): number {
  return clamp(getBuildingLevelTotal(buildings, ProductionBuildingType.BARRACKS) * 0.08, 0, 0.4)
}

export function calculateSettlementBuildingEffects(
  buildings: Array<{
    type: ProductionBuildingType
    level?: number
    status?: BuildingStatus
    state?: { hasWorker?: boolean }
  }>
): SettlementBuildingEffects {
  const operationalBuildings = buildings.filter(
    building => !building.status || building.status === BuildingStatus.OPERATIONAL
  )

  const sumLevels = (type: ProductionBuildingType) =>
    operationalBuildings
      .filter(building => building.type === type)
      .reduce((sum, building) => sum + Math.max(1, building.level ?? 1), 0)

  const houseLevels = sumLevels(ProductionBuildingType.HOUSE)
  const kitchenLevels = sumLevels(ProductionBuildingType.KITCHEN)
  const warehouseLevels = sumLevels(ProductionBuildingType.WAREHOUSE)
  const barracksLevels = sumLevels(ProductionBuildingType.BARRACKS)
  const recruitmentLevels = sumLevels(ProductionBuildingType.RECRUITMENT_STATION)
  const researchLevels = sumLevels(ProductionBuildingType.RESEARCH_DESK)
  const tradeLevels = sumLevels(ProductionBuildingType.TRADE_STATION)
  const staffedLevels = (type: ProductionBuildingType) =>
    operationalBuildings
      .filter(building => building.type === type && building.state?.hasWorker)
      .reduce((sum, building) => sum + Math.max(1, building.level ?? 1), 0)

  const staffedKitchenLevels = staffedLevels(ProductionBuildingType.KITCHEN)
  const staffedBarracksLevels = staffedLevels(ProductionBuildingType.BARRACKS)
  const staffedResearchLevels = staffedLevels(ProductionBuildingType.RESEARCH_DESK)

  return {
    houseRestBonus: houseLevels * 8,
    houseComfortBonus: houseLevels * 4,
    kitchenMealBonus: kitchenLevels * 10 + staffedKitchenLevels * 4,
    kitchenFoodProductionMultiplier: clamp(1 + kitchenLevels * 0.15 + staffedKitchenLevels * 0.05, 1, 1.9),
    warehouseCoreCapacity: 500 + warehouseLevels * 250,
    warehouseProductionMultiplier: clamp(1 + warehouseLevels * 0.08, 1, 1.6),
    barracksCombatBonusMultiplier: clamp(1 + barracksLevels * 0.08 + staffedBarracksLevels * 0.05, 1, 1.5),
    recruitmentQualityBonus: recruitmentLevels * 4,
    recruitmentSlotBonus: Math.min(3, Math.max(0, recruitmentLevels - 1)),
    recruitmentRefreshCostDiscount: recruitmentLevels * 5,
    researchOutputMultiplier: clamp(1 + researchLevels * 0.12 + staffedResearchLevels * 0.08, 1, 1.8),
    researchWorkerCapacity: researchLevels,
    tradeStationLevel: tradeLevels,
  }
}

export function calculateRecruitmentStationState(
  buildings: Array<{ type: ProductionBuildingType; level?: number; status?: BuildingStatus }>,
  candidateCount: number
): {
  stationLevel: number
  candidateCount: number
  maxCandidates: number
  nextRefreshAt: number
  manualRefreshCost: number
  refreshIntervalMs: number
  qualityBonus: number
} {
  const effects = calculateSettlementBuildingEffects(buildings)
  const stationLevel = buildings
    .filter(
      building =>
        building.type === ProductionBuildingType.RECRUITMENT_STATION &&
        (!building.status || building.status === BuildingStatus.OPERATIONAL)
    )
    .reduce((sum, building) => sum + Math.max(1, building.level ?? 1), 0)

  return {
    stationLevel,
    candidateCount,
    maxCandidates: stationLevel > 0 ? 3 + effects.recruitmentSlotBonus : 0,
    nextRefreshAt: Date.now() + Math.max(10 * 60 * 1000, 30 * 60 * 1000 - Math.max(0, stationLevel - 1) * 3 * 60 * 1000),
    manualRefreshCost: Math.max(20, 50 - effects.recruitmentRefreshCostDiscount),
    refreshIntervalMs: Math.max(10 * 60 * 1000, 30 * 60 * 1000 - Math.max(0, stationLevel - 1) * 3 * 60 * 1000),
    qualityBonus: effects.recruitmentQualityBonus,
  }
}

export function calculateResearchDeskState(
  buildings: Array<{ type: ProductionBuildingType; level?: number; status?: BuildingStatus }>,
  assignedWorkers: number
): {
  totalLevel: number
  outputMultiplier: number
  workerCapacity: number
  assignedWorkers: number
} {
  const effects = calculateSettlementBuildingEffects(buildings)
  const totalLevel = buildings
    .filter(
      building =>
        building.type === ProductionBuildingType.RESEARCH_DESK &&
        (!building.status || building.status === BuildingStatus.OPERATIONAL)
    )
    .reduce((sum, building) => sum + Math.max(1, building.level ?? 1), 0)

  return {
    totalLevel,
    outputMultiplier: effects.researchOutputMultiplier,
    workerCapacity: effects.researchWorkerCapacity,
    assignedWorkers,
  }
}
