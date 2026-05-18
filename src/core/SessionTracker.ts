/**
 * 会话追踪器 - 记录玩家离开期间的游戏状态变化
 * @module core/SessionTracker
 */

import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'
import { ResourceType } from '@app-types/map.types'
import { ProductionBuildingType } from '@app-types/production-building.types'
import type {
  SessionSummary,
  ResourceGainedRecord,
  BuildingCompletedRecord,
  ResearchCompletedRecord,
  BossCombatRecord,
} from '@app-types/session.types'

const BOTTLENECK_THRESHOLDS = {
  WOOD_LOW: 20,
  STONE_LOW: 15,
  FOOD_LOW: 15,
} as const

export interface SettlementStateReader {
  getWood: () => number
  getStone: () => number
  getFood: () => number
  getGold: () => number
  getEssence: () => number
  getPopulation: () => number
  getHousingCapacity: () => number
  getDevelopment: () => number
  getLivability: () => number
}

export class SessionTracker {
  private eventBus: EventBus
  private logger: Logger

  private sessionStart: number = Date.now()
  private isTracking: boolean = false

  private resourcesGained: Map<ResourceType, number> = new Map()
  private buildingsCompleted: BuildingCompletedRecord[] = []
  private researchCompleted: ResearchCompletedRecord[] = []
  private bossBattles: BossCombatRecord[] = []

  private boundResourceCollected: (data: any) => void
  private boundBuildingCompleted: (data: any) => void
  private boundResearchCompleted: (data: any) => void
  private boundBossDefeated: (data: any) => void
  private boundBossFled: (data: any) => void

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('SessionTracker')

    this.boundResourceCollected = this.onResourceCollected.bind(this)
    this.boundBuildingCompleted = this.onBuildingCompleted.bind(this)
    this.boundResearchCompleted = this.onResearchCompleted.bind(this)
    this.boundBossDefeated = this.onBossDefeated.bind(this)
    this.boundBossFled = this.onBossFled.bind(this)
  }

  startTracking(): void {
    if (this.isTracking) return
    this.isTracking = true
    this.sessionStart = Date.now()
    this.resourcesGained.clear()
    this.buildingsCompleted = []
    this.researchCompleted = []
    this.bossBattles = []

    this.eventBus.on('resource:collected', this.boundResourceCollected)
    this.eventBus.on('resource:harvested', this.boundResourceCollected)
    this.eventBus.on('building:completed', this.boundBuildingCompleted)
    this.eventBus.on('technology:research-completed', this.boundResearchCompleted)
    this.eventBus.on('boss:defeated', this.boundBossDefeated)
    this.eventBus.on('boss:fled', this.boundBossFled)

    this.logger.debug('Session tracking started')
  }

  stopTracking(): void {
    if (!this.isTracking) return
    this.isTracking = false

    this.eventBus.off('resource:collected', this.boundResourceCollected)
    this.eventBus.off('resource:harvested', this.boundResourceCollected)
    this.eventBus.off('building:completed', this.boundBuildingCompleted)
    this.eventBus.off('technology:research-completed', this.boundResearchCompleted)
    this.eventBus.off('boss:defeated', this.boundBossDefeated)
    this.eventBus.off('boss:fled', this.boundBossFled)
  }

  generateSummary(stateReader: SettlementStateReader): SessionSummary {
    const now = Date.now()
    const durationMs = now - this.sessionStart

    const resourcesGained: ResourceGainedRecord[] = []
    this.resourcesGained.forEach((amount, type) => {
      if (amount > 0) {
        resourcesGained.push({ type, amount })
      }
    })
    resourcesGained.sort((a, b) => b.amount - a.amount)

    const bottlenecks: string[] = []
    if (stateReader.getWood() < BOTTLENECK_THRESHOLDS.WOOD_LOW) {
      bottlenecks.push('木材不足，建筑进度可能暂停')
    }
    if (stateReader.getStone() < BOTTLENECK_THRESHOLDS.STONE_LOW) {
      bottlenecks.push('石材不足，升级进度受限')
    }
    if (stateReader.getFood() < BOTTLENECK_THRESHOLDS.FOOD_LOW) {
      bottlenecks.push('食物储备偏低，注意人口维持')
    }
    if (this.bossBattles.length > 0 && this.bossBattles.every(b => !b.won)) {
      bottlenecks.push('Boss 挑战失败，建议继续备战后再试')
    }

    const bossLevelsDefeated = this.bossBattles
      .filter(b => b.won)
      .map(b => b.bossLevel)

    const newUnlocks: string[] = []
    for (const b of this.buildingsCompleted) {
      newUnlocks.push(`${b.name} 建造完成`)
    }
    for (const r of this.researchCompleted) {
      newUnlocks.push(`研究完成：${r.name}`)
    }
    if (bossLevelsDefeated.length > 0) {
      newUnlocks.push(`击败 Lv.${Math.max(...bossLevelsDefeated)} Boss，获得核心零件`)
    }

    const sessionSummary: SessionSummary = {
      sessionStart: this.sessionStart,
      sessionEnd: now,
      durationMs,
      resourcesGained,
      buildingsCompleted: [...this.buildingsCompleted],
      researchCompleted: [...this.researchCompleted],
      bossBattles: [...this.bossBattles],
      bottlenecks,
      newUnlocks,
    }

    this.stopTracking()
    return sessionSummary
  }

  private onResourceCollected(data: any): void {
    const type = data.type || data.resourceType
    const amount = data.amount || 0
    if (type && amount > 0) {
      const current = this.resourcesGained.get(type) || 0
      this.resourcesGained.set(type, current + amount)
    }
  }

  private onBuildingCompleted(data: any): void {
    const buildingType = data.type || data.buildingType
    if (buildingType) {
      this.buildingsCompleted.push({
        type: buildingType as ProductionBuildingType,
        name: data.buildingName || data.name || buildingType,
        level: data.level || 1,
      })
    }
  }

  private onResearchCompleted(data: any): void {
    this.researchCompleted.push({
      techId: data.techId || data.id || '',
      name: data.name || data.techName || '未知科技',
    })
  }

  private onBossDefeated(data: any): void {
    this.bossBattles.push({
      bossId: data.bossId || data.id || '',
      bossName: data.bossName || data.name || 'Boss',
      bossLevel: data.bossLevel || data.level || 1,
      won: true,
      essenceEarned: data.essenceEarned || data.rewards?.essence || 0,
    })
  }

  private onBossFled(data: any): void {
    this.bossBattles.push({
      bossId: data.bossId || data.id || '',
      bossName: data.bossName || data.name || 'Boss',
      bossLevel: data.bossLevel || data.level || 1,
      won: false,
      essenceEarned: 0,
    })
  }
}
