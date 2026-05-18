import { describe, expect, it } from 'vitest'

type PriorityMode = 'preset' | 'manual'
type GlobalStrategyPreset = 'none' | 'survival' | 'expand' | 'research' | 'boss'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function calculateLivability(input: {
  houses: number
  kitchens: number
  farms: number
  researchStations: number
  recruitmentStations: number
}): number {
  const total =
    input.houses * 12 +
    input.kitchens * 6 +
    input.farms * 4 +
    input.researchStations * 3 +
    input.recruitmentStations * 4

  return clamp(total, 0, 100)
}

function calculateDevelopment(input: {
  completedKeyResearchCount: number
  buildingScore: number
  corePartsSpent: number
  activeCombatPower: number
}): number {
  const researchScore = clamp(input.completedKeyResearchCount / 3, 0, 1)
  const buildingScore = clamp(input.buildingScore, 0, 1)
  const coreScore = clamp(input.corePartsSpent / 12, 0, 1)
  const combatScore = clamp(Math.sqrt(input.activeCombatPower / 650), 0, 1)
  const base = 100 * (
    0.35 * researchScore +
    0.30 * buildingScore +
    0.20 * coreScore +
    0.15 * combatScore
  )
  const balanceFactor = 0.85 + 0.15 * Math.min(researchScore, buildingScore, coreScore)
  return Math.floor(clamp(base * balanceFactor, 0, 100))
}

function needDecayMultiplier(livability: number): number {
  return clamp(1.2 - livability / 200, 0.7, 1.2)
}

function recruitQualityScore(livability: number, development: number): number {
  return livability * 0.4 + development * 0.6
}

function resolvePriorityMode(activePreset: GlobalStrategyPreset): PriorityMode {
  return activePreset === 'none' ? 'manual' : 'preset'
}

function canEditCharacterPriority(activePreset: GlobalStrategyPreset): boolean {
  return resolvePriorityMode(activePreset) === 'manual'
}

function bossDifficultyScale(development: number): number {
  return 1 + development / 100
}

describe('V1 contract formulas', () => {
  it('should calculate livability from the planned building contribution model', () => {
    const livability = calculateLivability({
      houses: 3,
      kitchens: 1,
      farms: 1,
      researchStations: 1,
      recruitmentStations: 1,
    })

    expect(livability).toBe(53)
    expect(needDecayMultiplier(livability)).toBeCloseTo(0.935)
  })

  it('should calculate development from research, building, materials, and combat power', () => {
    const development = calculateDevelopment({
      completedKeyResearchCount: 2,
      buildingScore: 0.56,
      corePartsSpent: 10,
      activeCombatPower: 200,
    })

    expect(development).toBeGreaterThan(50)
    expect(development).toBeLessThan(80)
  })

  it('should score recruits by both livability and development', () => {
    const score = recruitQualityScore(50, 80)

    expect(score).toBe(68)
  })

  it('should lock manual priority editing while a global preset is active', () => {
    expect(resolvePriorityMode('none')).toBe('manual')
    expect(resolvePriorityMode('survival')).toBe('preset')
    expect(canEditCharacterPriority('none')).toBe(true)
    expect(canEditCharacterPriority('boss')).toBe(false)
  })

  it('should scale boss difficulty upward with settlement development', () => {
    expect(bossDifficultyScale(20)).toBeCloseTo(1.2)
    expect(bossDifficultyScale(80)).toBeCloseTo(1.8)
    expect(bossDifficultyScale(80)).toBeGreaterThan(bossDifficultyScale(20))
  })
})
