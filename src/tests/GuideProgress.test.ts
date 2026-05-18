import { describe, expect, it } from 'vitest'
import { ProductionBuildingType, BuildingStatus } from '@app-types/production-building.types'
import { getCurrentGuideStep } from '@ui/components/guide/guideProgress'

describe('Guide progress', () => {
  it('should point new players to manual harvest first', () => {
    const result = getCurrentGuideStep({
      manualHarvestCount: 0,
      buildings: [],
      characterCount: 5,
      coreParts: 0,
    })

    expect(result.currentStep?.id).toBe('manual_harvest')
    expect(result.completedCount).toBe(0)
  })

  it('should advance to the boss step after recruit growth unlocks', () => {
    const result = getCurrentGuideStep({
      manualHarvestCount: 1,
      buildings: [
        { type: ProductionBuildingType.HOUSE, status: BuildingStatus.OPERATIONAL },
        { type: ProductionBuildingType.FARM, status: BuildingStatus.OPERATIONAL },
        { type: ProductionBuildingType.RESEARCH_DESK, status: BuildingStatus.OPERATIONAL },
      ],
      characterCount: 6,
      coreParts: 0,
    })

    expect(result.currentStep?.id).toBe('defeat_boss')
    expect(result.completedCount).toBe(5)
  })
})
