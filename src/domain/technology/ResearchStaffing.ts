import { Character, SkillType } from '@app-types/character.types'
import { BuildingStatus, ProductionBuilding, ProductionBuildingType } from '@app-types/production-building.types'

const RESEARCH_BUILDING_CAPACITY: Partial<Record<ProductionBuildingType, number>> = {
  [ProductionBuildingType.RESEARCH_DESK]: 1,
  [ProductionBuildingType.LIBRARY]: 2,
  [ProductionBuildingType.LABORATORY]: 3,
}

export function getResearchWorkerCapacity(buildings: ProductionBuilding[]): number {
  return buildings.reduce((total, building) => {
    if (building.status !== BuildingStatus.OPERATIONAL) {
      return total
    }

    return total + (RESEARCH_BUILDING_CAPACITY[building.type] ?? 0)
  }, 0)
}

export function getResearchTalentLevel(character: Character): number {
  return character.talents.get(SkillType.RESEARCH)?.level ?? 1
}

export function resolveAutoResearchWorkers(
  buildings: ProductionBuilding[],
  characters: Character[]
): string[] {
  const capacity = getResearchWorkerCapacity(buildings)
  if (capacity <= 0) {
    return []
  }

  return [...characters]
    .sort((left, right) => {
      const talentDelta = getResearchTalentLevel(right) - getResearchTalentLevel(left)
      if (talentDelta !== 0) {
        return talentDelta
      }

      return left.name.localeCompare(right.name, 'zh-CN')
    })
    .slice(0, capacity)
    .map((character) => character.id)
}
