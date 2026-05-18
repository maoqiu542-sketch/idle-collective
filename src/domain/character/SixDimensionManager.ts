/**
 * 六维属性管理器 - 管理角色六维属性
 * @module domain/character/SixDimensionManager
 */

import { EventBus } from '@core/EventBus'
import {
  SixDimensionType,
  SixDimensionConfig,
  SixDimensionLevel,
  CharacterSixDimensions,
  SixDimensionStats,
  calculateExpToNextLevel,
  calculateAttributeValue,
  calculatePower,
  SIX_DIMENSION_NAMES,
} from '@app-types/six-dimension.types'
import { EquipmentStats } from '@app-types/equipment.types'

const BASE_VALUES: Record<SixDimensionType, number> = {
  [SixDimensionType.ATK]: 10,
  [SixDimensionType.DEF]: 5,
  [SixDimensionType.HP]: 100,
  [SixDimensionType.CRIT_RATE]: 5,
  [SixDimensionType.CRIT_DMG]: 150,
  [SixDimensionType.ATK_SPD]: 1,
}

const GROWTH_RATE = 1.08
const MAX_LEVEL = 100

export class SixDimensionManager {
  private characterDimensions: Map<string, CharacterSixDimensions> = new Map()
  private configs: Map<SixDimensionType, SixDimensionConfig> = new Map()
  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.initConfigs()
  }

  private initConfigs(): void {
    Object.entries(BASE_VALUES).forEach(([type, baseValue]) => {
      this.configs.set(type as SixDimensionType, {
        id: type as SixDimensionType,
        name: SIX_DIMENSION_NAMES[type as SixDimensionType],
        baseValue,
        growthRate: GROWTH_RATE,
        expFormula: '100*level^1.5',
      })
    })
  }

  initCharacter(characterId: string): void {
    const dimensions = new Map<SixDimensionType, SixDimensionLevel>()

    Object.values(SixDimensionType).forEach(type => {
      dimensions.set(type, {
        type,
        level: 1,
        exp: 0,
        expToNext: calculateExpToNextLevel(1),
      })
    })

    this.characterDimensions.set(characterId, {
      characterId,
      dimensions,
    })
  }

  addExperience(characterId: string, type: SixDimensionType, amount: number): boolean {
    const charDims = this.characterDimensions.get(characterId)
    if (!charDims) return false

    const dim = charDims.dimensions.get(type)
    if (!dim) return false

    dim.exp += amount

    while (dim.exp >= dim.expToNext && dim.level < MAX_LEVEL) {
      dim.exp -= dim.expToNext
      dim.level++
      dim.expToNext = calculateExpToNextLevel(dim.level)

      this.eventBus.emit('sixdim:levelup', {
        characterId,
        attribute: type,
        newLevel: dim.level,
      })
    }

    return true
  }

  addExperienceAll(characterId: string, amount: number): void {
    Object.values(SixDimensionType).forEach(type => {
      this.addExperience(characterId, type, amount)
    })
  }

  getLevel(characterId: string, type: SixDimensionType): number {
    const charDims = this.characterDimensions.get(characterId)
    if (!charDims) return 1

    const dim = charDims.dimensions.get(type)
    return dim?.level || 1
  }

  getDimensionData(characterId: string, type: SixDimensionType): SixDimensionLevel | undefined {
    const charDims = this.characterDimensions.get(characterId)
    if (!charDims) return undefined

    return charDims.dimensions.get(type)
  }

  getAllDimensions(characterId: string): Map<SixDimensionType, SixDimensionLevel> | undefined {
    const charDims = this.characterDimensions.get(characterId)
    return charDims?.dimensions
  }

  getStats(characterId: string, equipmentBonus?: Partial<EquipmentStats>): SixDimensionStats {
    const charDims = this.characterDimensions.get(characterId)
    
    if (!charDims) {
      return {
        atk: (BASE_VALUES[SixDimensionType.ATK] || 0) + (equipmentBonus?.atk || 0),
        def: (BASE_VALUES[SixDimensionType.DEF] || 0) + (equipmentBonus?.def || 0),
        hp: (BASE_VALUES[SixDimensionType.HP] || 0) + (equipmentBonus?.hp || 0),
        critRate: (BASE_VALUES[SixDimensionType.CRIT_RATE] || 0) + (equipmentBonus?.critRate || 0),
        critDmg: (BASE_VALUES[SixDimensionType.CRIT_DMG] || 0) + (equipmentBonus?.critDmg || 0),
        atkSpd: (BASE_VALUES[SixDimensionType.ATK_SPD] || 0) + (equipmentBonus?.atkSpd || 0),
      }
    }

    const stats: SixDimensionStats = {
      atk: 0,
      def: 0,
      hp: 0,
      critRate: 0,
      critDmg: 0,
      atkSpd: 0,
    }

    charDims.dimensions.forEach((dim, type) => {
      const baseValue = BASE_VALUES[type]
      const value = calculateAttributeValue(baseValue, GROWTH_RATE, dim.level)

      switch (type) {
        case SixDimensionType.ATK:
          stats.atk = value + (equipmentBonus?.atk || 0)
          break
        case SixDimensionType.DEF:
          stats.def = value + (equipmentBonus?.def || 0)
          break
        case SixDimensionType.HP:
          stats.hp = value + (equipmentBonus?.hp || 0)
          break
        case SixDimensionType.CRIT_RATE:
          stats.critRate = value + (equipmentBonus?.critRate || 0)
          break
        case SixDimensionType.CRIT_DMG:
          stats.critDmg = value + (equipmentBonus?.critDmg || 0)
          break
        case SixDimensionType.ATK_SPD:
          stats.atkSpd = value + (equipmentBonus?.atkSpd || 0)
          break
      }
    })

    return stats
  }

  getPower(characterId: string, equipmentBonus?: Partial<EquipmentStats>): number {
    const stats = this.getStats(characterId, equipmentBonus)
    return calculatePower(stats)
  }

  removeCharacter(characterId: string): void {
    this.characterDimensions.delete(characterId)
  }

  serialize(): Map<string, CharacterSixDimensions> {
    return new Map(this.characterDimensions)
  }

  deserialize(data: Map<string, CharacterSixDimensions>): void {
    this.characterDimensions = new Map(data)
  }
}

export { calculatePower, calculateAttributeValue, GROWTH_RATE, MAX_LEVEL }
