import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'
import {
  BossLevel,
  EssenceDropConfig,
  BuildingUpgradeCost,
  BossDefeatRecord,
  MaterialSystemState,
  DropResult,
  UpgradeResult
} from '@app-types/building-essence.types'

const DEFAULT_DROP_CONFIGS: EssenceDropConfig[] = [
  { bossLevel: BossLevel.LEVEL_1, minDrop: 5, maxDrop: 10, firstTimeBonus: 5, cooldownMs: 30 * 60 * 1000 },
  { bossLevel: BossLevel.LEVEL_2, minDrop: 15, maxDrop: 25, firstTimeBonus: 10, cooldownMs: 60 * 60 * 1000 },
  { bossLevel: BossLevel.LEVEL_3, minDrop: 40, maxDrop: 60, firstTimeBonus: 20, cooldownMs: 2 * 60 * 60 * 1000 },
  { bossLevel: BossLevel.LEVEL_4, minDrop: 80, maxDrop: 120, firstTimeBonus: 40, cooldownMs: 4 * 60 * 60 * 1000 },
  { bossLevel: BossLevel.LEVEL_5, minDrop: 200, maxDrop: 300, firstTimeBonus: 100, cooldownMs: 8 * 60 * 60 * 1000 }
]

const DEFAULT_UPGRADE_COSTS: BuildingUpgradeCost[] = [
  { fromLevel: 1, toLevel: 2, essenceCost: 10, baseResources: { wood: 20, stone: 10 } },
  { fromLevel: 2, toLevel: 3, essenceCost: 30, baseResources: { wood: 40, stone: 25, gold: 60 }, techRequired: 'building_tech_2' },
  { fromLevel: 3, toLevel: 4, essenceCost: 70, baseResources: { wood: 80, stone: 60, gold: 120 }, techRequired: 'combat_tech_1' },
  { fromLevel: 4, toLevel: 5, essenceCost: 140, baseResources: { wood: 140, stone: 110, gold: 220 }, techRequired: 'combat_tech_2' }
]

export class BuildingEssenceManager {
  private eventBus: EventBus
  private logger: Logger
  private dropConfigs: Map<BossLevel, EssenceDropConfig>
  private upgradeCosts: BuildingUpgradeCost[]
  private state: MaterialSystemState
  private defeatedBosses: Set<string>
  private checkTechUnlocked: (techId: string) => boolean
  private consumeResources: (resources: Record<string, number>) => boolean

  constructor(
    eventBus: EventBus,
    checkTechUnlocked: (techId: string) => boolean = () => true,
    consumeResources: (resources: Record<string, number>) => boolean = () => true
  ) {
    this.eventBus = eventBus
    this.logger = new Logger('BuildingEssenceManager')
    this.dropConfigs = new Map(DEFAULT_DROP_CONFIGS.map(config => [config.bossLevel, config]))
    this.upgradeCosts = DEFAULT_UPGRADE_COSTS
    this.checkTechUnlocked = checkTechUnlocked
    this.consumeResources = consumeResources
    this.defeatedBosses = new Set()

    this.state = {
      essence: {
        current: 0,
        maxCapacity: 500,
        totalEarned: 0,
        totalSpent: 0
      },
      defeatRecords: [],
      lastDefeatByLevel: new Map()
    }
  }

  onBossDefeated(bossId: string, bossLevel: BossLevel, luckyBonus = 0): DropResult {
    const config = this.dropConfigs.get(bossLevel)
    if (!config) {
      return { success: false, essenceAmount: 0, bonusAmount: 0, totalAmount: 0, isFirstDefeat: false }
    }

    const isFirstDefeat = !this.defeatedBosses.has(bossId)
    const baseAmount = Math.floor(Math.random() * (config.maxDrop - config.minDrop + 1)) + config.minDrop
    const bonusAmount = isFirstDefeat ? config.firstTimeBonus : 0
    const luckyAmount = Math.floor(baseAmount * luckyBonus)
    const totalAmount = baseAmount + bonusAmount + luckyAmount
    const actualAmount = Math.min(totalAmount, Math.max(0, this.state.essence.maxCapacity - this.state.essence.current))

    if (actualAmount < totalAmount) {
      this.logger.warn(`Essence storage full, lost ${totalAmount - actualAmount} core parts`)
    }

    this.state.essence.current += actualAmount
    this.state.essence.totalEarned += actualAmount
    this.defeatedBosses.add(bossId)

    const record: BossDefeatRecord = {
      bossId,
      bossLevel,
      defeatedAt: Date.now(),
      essenceEarned: actualAmount,
      isFirstDefeat
    }

    this.state.defeatRecords.push(record)
    this.state.lastDefeatByLevel.set(bossLevel, Date.now())

    this.eventBus.emit('essence:earned', {
      amount: actualAmount,
      source: 'boss_defeat',
      bossLevel,
      isFirstDefeat
    })

    return {
      success: true,
      essenceAmount: baseAmount,
      bonusAmount: bonusAmount + luckyAmount,
      totalAmount: actualAmount,
      isFirstDefeat
    }
  }

  setStorageCapacity(maxCapacity: number): void {
    const nextCapacity = Math.max(100, Math.floor(maxCapacity))
    this.state.essence.maxCapacity = nextCapacity
    this.state.essence.current = Math.min(this.state.essence.current, nextCapacity)
  }

  canUpgradeBuilding(fromLevel: number): { canUpgrade: boolean; cost?: BuildingUpgradeCost; reason?: string } {
    const cost = this.upgradeCosts.find(item => item.fromLevel === fromLevel)
    if (!cost) {
      return { canUpgrade: false, reason: '建筑已经达到最高等级。' }
    }

    if (cost.techRequired && !this.checkTechUnlocked(cost.techRequired)) {
      return { canUpgrade: false, cost, reason: `需要先完成科技：${cost.techRequired}` }
    }

    if (this.state.essence.current < cost.essenceCost) {
      return {
        canUpgrade: false,
        cost,
        reason: `核心零件不足，需要 ${cost.essenceCost}，当前只有 ${this.state.essence.current}。`
      }
    }

    return { canUpgrade: true, cost }
  }

  upgradeBuilding(fromLevel: number): UpgradeResult {
    const check = this.canUpgradeBuilding(fromLevel)
    if (!check.canUpgrade || !check.cost) {
      return { success: false, message: check.reason }
    }

    const { cost } = check
    if (!this.consumeResources(cost.baseResources)) {
      return { success: false, message: '基础资源不足，无法升级建筑。' }
    }

    this.state.essence.current -= cost.essenceCost
    this.state.essence.totalSpent += cost.essenceCost

    this.eventBus.emit('essence:spent', {
      amount: cost.essenceCost,
      purpose: 'building_upgrade',
      fromLevel,
      toLevel: cost.toLevel
    })

    return {
      success: true,
      essenceSpent: cost.essenceCost,
      newLevel: cost.toLevel
    }
  }

  addEssence(amount: number, source = 'manual'): number {
    const actualAmount = Math.min(amount, Math.max(0, this.state.essence.maxCapacity - this.state.essence.current))
    this.state.essence.current += actualAmount
    this.state.essence.totalEarned += actualAmount

    this.eventBus.emit('essence:earned', { amount: actualAmount, source })
    return actualAmount
  }

  upgradeStorage(): boolean {
    const upgradeCost = 100
    const maxCapacity = 2000

    if (this.state.essence.maxCapacity >= maxCapacity) return false
    if (this.state.essence.current < upgradeCost) return false

    this.state.essence.current -= upgradeCost
    this.state.essence.maxCapacity += 500
    this.state.essence.totalSpent += upgradeCost

    this.eventBus.emit('essence:storage-upgraded', {
      newCapacity: this.state.essence.maxCapacity
    })

    return true
  }

  getEssence(): number {
    return this.state.essence.current
  }

  getStorageCapacity(): { current: number; max: number } {
    return {
      current: this.state.essence.current,
      max: this.state.essence.maxCapacity
    }
  }

  getUpgradeCost(level: number): BuildingUpgradeCost | undefined {
    return this.upgradeCosts.find(cost => cost.fromLevel === level)
  }

  getAllUpgradeCosts(): BuildingUpgradeCost[] {
    return [...this.upgradeCosts]
  }

  getDropConfig(level: BossLevel): EssenceDropConfig | undefined {
    return this.dropConfigs.get(level)
  }

  getDefeatRecords(): BossDefeatRecord[] {
    return [...this.state.defeatRecords]
  }

  getStats(): { totalEarned: number; totalSpent: number; totalDefeats: number } {
    return {
      totalEarned: this.state.essence.totalEarned,
      totalSpent: this.state.essence.totalSpent,
      totalDefeats: this.state.defeatRecords.length
    }
  }

  serialize(): MaterialSystemState {
    return {
      ...this.state,
      lastDefeatByLevel: new Map(this.state.lastDefeatByLevel)
    }
  }

  deserialize(data: MaterialSystemState): void {
    this.state = {
      ...data,
      lastDefeatByLevel: new Map(data.lastDefeatByLevel)
    }
  }
}
