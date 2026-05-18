import { describe, expect, it } from 'vitest'
import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import {
  calculateSettlementBuildingEffects,
  calculateSettlementLivability,
  calculateSettlementDevelopment,
} from '@domain/settlement/SettlementMath'

describe('SettlementMath building effects', () => {
  it('should calculate core building effects from operational building levels', () => {
    const effects = calculateSettlementBuildingEffects([
      { type: ProductionBuildingType.HOUSE, level: 2, status: BuildingStatus.OPERATIONAL },
      { type: ProductionBuildingType.KITCHEN, level: 1, status: BuildingStatus.OPERATIONAL },
      { type: ProductionBuildingType.WAREHOUSE, level: 2, status: BuildingStatus.OPERATIONAL },
      { type: ProductionBuildingType.BARRACKS, level: 1, status: BuildingStatus.OPERATIONAL },
    ])

    expect(effects.houseRestBonus).toBe(16)
    expect(effects.houseComfortBonus).toBe(8)
    expect(effects.kitchenMealBonus).toBe(10)
    expect(effects.kitchenFoodProductionMultiplier).toBeCloseTo(1.15)
    expect(effects.warehouseCoreCapacity).toBe(1000)
    expect(effects.warehouseProductionMultiplier).toBeCloseTo(1.16)
    expect(effects.barracksCombatBonusMultiplier).toBeCloseTo(1.08)
  })

  it('should ignore buildings that are not operational', () => {
    const effects = calculateSettlementBuildingEffects([
      { type: ProductionBuildingType.HOUSE, level: 3, status: BuildingStatus.BUILDING },
      { type: ProductionBuildingType.KITCHEN, level: 2, status: BuildingStatus.DAMAGED },
      { type: ProductionBuildingType.WAREHOUSE, level: 1, status: BuildingStatus.OPERATIONAL },
    ])

    expect(effects.houseRestBonus).toBe(0)
    expect(effects.kitchenMealBonus).toBe(0)
    expect(effects.warehouseCoreCapacity).toBe(750)
  })

  it('should increase staffed building effects while leaving recruitment station bonuses level-based', () => {
    const staffedEffects = calculateSettlementBuildingEffects([
      {
        type: ProductionBuildingType.KITCHEN,
        level: 1,
        status: BuildingStatus.OPERATIONAL,
        state: { hasWorker: true },
      },
      {
        type: ProductionBuildingType.RESEARCH_DESK,
        level: 1,
        status: BuildingStatus.OPERATIONAL,
        state: { hasWorker: true },
      },
      {
        type: ProductionBuildingType.RECRUITMENT_STATION,
        level: 1,
        status: BuildingStatus.OPERATIONAL,
        state: { hasWorker: true },
      },
    ])

    expect(staffedEffects.kitchenMealBonus).toBe(14)
    expect(staffedEffects.kitchenFoodProductionMultiplier).toBeCloseTo(1.2)
    expect(staffedEffects.researchOutputMultiplier).toBeCloseTo(1.2)
    expect(staffedEffects.recruitmentQualityBonus).toBe(4)
    expect(staffedEffects.recruitmentRefreshCostDiscount).toBe(5)
  })

  it('should ignore staffing flags on auto buildings like houses and warehouses', () => {
    const effects = calculateSettlementBuildingEffects([
      {
        type: ProductionBuildingType.HOUSE,
        level: 1,
        status: BuildingStatus.OPERATIONAL,
        state: { hasWorker: true },
      },
      {
        type: ProductionBuildingType.WAREHOUSE,
        level: 1,
        status: BuildingStatus.OPERATIONAL,
        state: { hasWorker: true },
      },
    ])

    expect(effects.houseRestBonus).toBe(8)
    expect(effects.houseComfortBonus).toBe(4)
    expect(effects.warehouseCoreCapacity).toBe(750)
    expect(effects.warehouseProductionMultiplier).toBeCloseTo(1.08)
  })

  it('should turn building progression into livability and development values', () => {
    const livability = calculateSettlementLivability([
      { type: ProductionBuildingType.HOUSE, level: 2 },
      { type: ProductionBuildingType.KITCHEN, level: 1 },
      { type: ProductionBuildingType.FARM, level: 1 },
      { type: ProductionBuildingType.RECRUITMENT_STATION, level: 1 },
      { type: ProductionBuildingType.TRADE_STATION, level: 1 },
    ])

    const development = calculateSettlementDevelopment({
      completedKeyResearchCount: 1,
      buildingLevels: {
        [ProductionBuildingType.HOUSE]: 2,
        [ProductionBuildingType.KITCHEN]: 1,
        [ProductionBuildingType.FARM]: 1,
        [ProductionBuildingType.RECRUITMENT_STATION]: 1,
        [ProductionBuildingType.TRADE_STATION]: 1,
      },
      corePartsSpent: 8,
      activeCombatPower: 250,
    })

    expect(livability).toBe(29)
    expect(development.value).toBeGreaterThan(30)
    expect(development.value).toBeLessThan(60)
    expect(development.breakdown.building).toBeGreaterThan(0)
  })

  it('should keep settlement development from being capped by building levels alone', () => {
    const development = calculateSettlementDevelopment({
      completedKeyResearchCount: 0,
      buildingLevels: {
        [ProductionBuildingType.HOUSE]: 6,
        [ProductionBuildingType.KITCHEN]: 4,
        [ProductionBuildingType.FARM]: 4,
        [ProductionBuildingType.LUMBER_MILL]: 6,
        [ProductionBuildingType.QUARRY]: 6,
        [ProductionBuildingType.RESEARCH_DESK]: 0,
        [ProductionBuildingType.WAREHOUSE]: 4,
        [ProductionBuildingType.RECRUITMENT_STATION]: 3,
        [ProductionBuildingType.BARRACKS]: 3,
        [ProductionBuildingType.TRADE_STATION]: 2,
      },
      corePartsSpent: 0,
      activeCombatPower: 0,
    })

    expect(development.value).toBeLessThan(35)
  })
})
