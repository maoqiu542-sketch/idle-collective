/**
 * 需求管理器 - 管理角色需求
 * @module domain/character/NeedManager
 */

import { EventBus } from '@core/EventBus'
import { Need, NeedType } from '@app-types/priority.types'
import { clamp } from '@domain/settlement/SettlementMath'

interface NeedConfig {
  decayRate: number
  criticalThreshold: number
  urgencyWeight: number
}

const NEED_CONFIGS: Record<NeedType, NeedConfig> = {
  [NeedType.HUNGER]: { decayRate: 0.5, criticalThreshold: 20, urgencyWeight: 2.0 },
  [NeedType.REST]: { decayRate: 0.3, criticalThreshold: 25, urgencyWeight: 1.8 },
  [NeedType.SAFETY]: { decayRate: 0.08, criticalThreshold: 30, urgencyWeight: 1.2 },
  [NeedType.COMFORT]: { decayRate: 0.1, criticalThreshold: 30, urgencyWeight: 1.0 },
  [NeedType.JOY]: { decayRate: 0, criticalThreshold: 0, urgencyWeight: 0 },
  [NeedType.BEAUTY]: { decayRate: 0, criticalThreshold: 0, urgencyWeight: 0 },
  [NeedType.OUTDOORS]: { decayRate: 0, criticalThreshold: 0, urgencyWeight: 0 },
  [NeedType.SOCIAL]: { decayRate: 0, criticalThreshold: 0, urgencyWeight: 0 },
  [NeedType.PRIVACY]: { decayRate: 0, criticalThreshold: 0, urgencyWeight: 0 },
  [NeedType.SPACE]: { decayRate: 0, criticalThreshold: 0, urgencyWeight: 0 },
}

export class NeedManager {
  private needs: Map<string, Map<NeedType, Need>> = new Map()
  private eventBus: EventBus
  private getDecayMultiplier: () => number
  private getLivability: () => number
  private onNeedChanged: (characterId: string, needType: NeedType, value: number) => void

  constructor(
    eventBus: EventBus,
    getDecayMultiplier: () => number = () => 1,
    getLivability: () => number = () => 0,
    onNeedChanged: (characterId: string, needType: NeedType, value: number) => void = () => {}
  ) {
    this.eventBus = eventBus
    this.getDecayMultiplier = getDecayMultiplier
    this.getLivability = getLivability
    this.onNeedChanged = onNeedChanged
  }

  private initializeNeeds(characterId: string): void {
    const characterNeeds = new Map<NeedType, Need>()
    Object.entries(NEED_CONFIGS).forEach(([type, config]) => {
      characterNeeds.set(type as NeedType, {
        type: type as NeedType,
        currentValue: 100,
        maxValue: 100,
        decayRate: config.decayRate,
        criticalThreshold: config.criticalThreshold,
      })
    })
    this.needs.set(characterId, characterNeeds)
  }

  initCharacter(characterId: string): void {
    if (!this.needs.has(characterId)) {
      this.initializeNeeds(characterId)
    }
  }

  update(deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000
    const decayMultiplier = this.getDecayMultiplier()
    const livability = this.getLivability()
    const passiveRecovery = Math.max(0, (livability - 45) / 200)

    this.needs.forEach((characterNeeds, characterId) => {
      characterNeeds.forEach((need, type) => {
        if (need.decayRate > 0) {
          const decayAmount = need.decayRate * deltaSeconds * decayMultiplier
          const recoveryAmount = (type === NeedType.SAFETY || type === NeedType.COMFORT)
            ? passiveRecovery * deltaSeconds
            : 0
          need.currentValue = clamp(need.currentValue - decayAmount + recoveryAmount, 0, need.maxValue)
          this.onNeedChanged(characterId, type, need.currentValue)

          if (need.currentValue <= need.criticalThreshold) {
            this.eventBus.emit('need:critical', {
              characterId,
              needType: type,
              value: need.currentValue,
            })
          }
        }
      })
    })
  }

  satisfy(characterId: string, type: NeedType, amount: number): void {
    const characterNeeds = this.needs.get(characterId)
    if (!characterNeeds) return

    const need = characterNeeds.get(type)
    if (!need) return

    need.currentValue = Math.min(need.maxValue, need.currentValue + amount)
    this.onNeedChanged(characterId, type, need.currentValue)

    this.eventBus.emit('need:satisfied', {
      characterId,
      needType: type,
    })
  }

  get(characterId: string, type: NeedType): Need | undefined {
    return this.needs.get(characterId)?.get(type)
  }

  getAll(characterId: string): Map<NeedType, Need> | undefined {
    const characterNeeds = this.needs.get(characterId)
    return characterNeeds ? new Map(characterNeeds) : undefined
  }

  getCriticalNeeds(characterId: string): Need[] {
    const characterNeeds = this.needs.get(characterId)
    if (!characterNeeds) return []

    return Array.from(characterNeeds.values()).filter(
      need => need.currentValue <= need.criticalThreshold
    )
  }

  getMostUrgentNeed(characterId: string): NeedType | null {
    const characterNeeds = this.needs.get(characterId)
    if (!characterNeeds) return null

    let mostUrgent: NeedType | null = null
    let highestUrgency = 0

    characterNeeds.forEach((need, type) => {
      const config = NEED_CONFIGS[type]
      const urgency = (100 - need.currentValue) * config.urgencyWeight

      if (urgency > highestUrgency) {
        highestUrgency = urgency
        mostUrgent = type
      }
    })

    return mostUrgent
  }

  getAverageMood(characterId: string): number {
    const characterNeeds = this.needs.get(characterId)
    if (!characterNeeds) return 100

    let total = 0
    characterNeeds.forEach(need => {
      total += need.currentValue
    })
    return total / characterNeeds.size
  }

  removeCharacter(characterId: string): void {
    this.needs.delete(characterId)
  }

  serialize(): Record<string, Record<string, Need>> {
    const data: Record<string, Record<string, Need>> = {}
    this.needs.forEach((characterNeeds, characterId) => {
      data[characterId] = {}
      characterNeeds.forEach((need, type) => {
        data[characterId][type] = need
      })
    })
    return data
  }

  deserialize(data: Record<string, Record<string, Need>>): void {
    Object.entries(data).forEach(([characterId, needs]) => {
      const characterNeeds = new Map<NeedType, Need>()
      Object.entries(needs).forEach(([type, need]) => {
        characterNeeds.set(type as NeedType, need)
      })
      this.needs.set(characterId, characterNeeds)
    })
  }
}
