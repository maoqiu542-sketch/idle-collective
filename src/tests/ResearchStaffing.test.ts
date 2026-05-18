import { describe, expect, it } from 'vitest'
import { resolveAutoResearchWorkers, getResearchWorkerCapacity } from '@domain/technology/ResearchStaffing'
import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import { CharacterState, ProfessionType, SkillType } from '@app-types/character.types'

describe('ResearchStaffing', () => {
  it('calculates capacity from operational research buildings', () => {
    const buildings: any[] = [
      { type: ProductionBuildingType.RESEARCH_DESK, status: BuildingStatus.OPERATIONAL },
      { type: ProductionBuildingType.LIBRARY, status: BuildingStatus.OPERATIONAL },
      { type: ProductionBuildingType.HOUSE, status: BuildingStatus.OPERATIONAL },
      { type: ProductionBuildingType.RESEARCH_DESK, status: BuildingStatus.BUILDING },
    ]

    expect(getResearchWorkerCapacity(buildings)).toBe(3)
  })

  it('assigns the highest research talent characters first', () => {
    const buildings: any[] = [
      { type: ProductionBuildingType.RESEARCH_DESK, status: BuildingStatus.OPERATIONAL },
      { type: ProductionBuildingType.RESEARCH_DESK, status: BuildingStatus.OPERATIONAL },
    ]

    const createCharacter = (id: string, name: string, researchLevel: number) => ({
      id,
      name,
      profession: ProfessionType.SCHOLAR,
      state: CharacterState.IDLE,
      position: { x: 0, y: 0 },
      stats: { health: 100, maxHealth: 100, mood: 100, maxMood: 100 },
      needs: { hunger: 100, energy: 100, safety: 100, comfort: 100 },
      talents: new Map([[SkillType.RESEARCH, { level: researchLevel, experience: 0, experienceToNext: 100 }]]),
      skillPriorities: new Map(),
      inventory: [],
      equipmentSlots: {},
      createdAt: Date.now(),
    })

    const workers = resolveAutoResearchWorkers(buildings, [
      createCharacter('c1', '甲', 1),
      createCharacter('c2', '乙', 4),
      createCharacter('c3', '丙', 3),
    ] as any)

    expect(workers).toEqual(['c2', 'c3'])
  })
})
