import {
  Boss,
  BossConfig,
  BossStage,
  BossStatus,
  BossReward,
  BossState
} from '@app-types/combat.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'
import { getBossDifficultyScale, getBossDifficultyTier } from '@domain/settlement/SettlementMath'

function cloneBossState(state: BossState): BossState {
  return {
    ...state,
    lastDefeatTime: state.lastDefeatTime
  }
}

function cloneBoss(boss: Boss): Boss {
  return {
    ...boss,
    stats: { ...boss.stats },
    state: cloneBossState(boss.state),
    rewards: [...boss.rewards]
  }
}

export class BossManager {
  private eventBus: EventBus
  private logger: Logger
  private bosses: Map<string, Boss> = new Map()
  private configs: Map<string, BossConfig> = new Map()
  private spawnTimer: number = 0
  private readonly spawnInterval: number
  private readonly getSettlementDevelopment: () => number

  constructor(
    eventBus: EventBus,
    getSettlementDevelopment: () => number = () => 0,
    spawnInterval: number = 15 * 60 * 1000
  ) {
    this.eventBus = eventBus
    this.logger = new Logger('BossManager')
    this.getSettlementDevelopment = getSettlementDevelopment
    this.spawnInterval = spawnInterval
  }

  loadConfigs(configs: BossConfig[]): void {
    for (const config of configs) {
      this.configs.set(config.id, config)
    }
    this.logger.info(`Loaded ${configs.length} boss configs`)
  }

  update(deltaTime: number): void {
    this.spawnTimer += deltaTime

    if (this.spawnTimer >= this.spawnInterval) {
      this.trySpawnBoss()
      this.spawnTimer = 0
    }

    for (const [id, boss] of this.bosses) {
      if (boss.state.status === BossStatus.RESTING) {
        const newRestTimer = boss.state.restTimer - deltaTime
        if (newRestTimer <= 0) {
          const updatedBoss = cloneBoss(boss)
          updatedBoss.state = {
            ...boss.state,
            status: BossStatus.AVAILABLE,
            restTimer: 0
          }
          this.bosses.set(id, updatedBoss)
          this.logger.info(`Boss ${boss.id} is now available`)
        } else {
          const updatedBoss = cloneBoss(boss)
          updatedBoss.state = {
            ...boss.state,
            restTimer: newRestTimer
          }
          this.bosses.set(id, updatedBoss)
        }
      }
    }
  }

  private trySpawnBoss(): void {
    const development = this.getSettlementDevelopment()
    const tier = getBossDifficultyTier(development)
    const allowedStages: BossStage[] =
      tier === 1 ? [BossStage.EARLY] :
      tier === 2 ? [BossStage.EARLY, BossStage.MID] :
      [BossStage.EARLY, BossStage.MID, BossStage.LATE]

    const availableConfigs = Array.from(this.configs.values()).filter(config => allowedStages.includes(config.stage))
    if (availableConfigs.length === 0) return

    const randomConfig = availableConfigs[Math.floor(Math.random() * availableConfigs.length)]
    this.spawnBoss(randomConfig.id)
  }

  spawnBoss(configId: string): Boss | null {
    const config = this.configs.get(configId)
    if (!config) {
      this.logger.error(`Boss config not found: ${configId}`)
      return null
    }

    const id = `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const development = this.getSettlementDevelopment()
    const difficultyTier = getBossDifficultyTier(development)
    const difficultyScale = getBossDifficultyScale(development) * this.getStageScale(config.stage)
    const scaledHp = Math.max(1, Math.floor(config.baseHp * difficultyScale))
    const scaledAtk = Math.max(1, Math.floor(config.baseAtk * difficultyScale))
    const scaledDef = Math.max(1, Math.floor(config.baseDef * (0.85 + difficultyScale * 0.15)))
    const scaledSpeed = Math.max(0.5, Number(((config.baseSpeed || 1.5) * (0.95 + difficultyScale * 0.05)).toFixed(2)))

    const boss: Boss = {
      id,
      configId,
      name: config.name,
      level: config.level,
      stage: config.stage,
      difficultyTier,
      difficultyScale,
      stats: {
        hp: scaledHp,
        maxHp: scaledHp,
        atk: scaledAtk,
        def: scaledDef,
        speed: scaledSpeed,
      },
      state: {
        status: BossStatus.AVAILABLE,
        currentHp: scaledHp,
        restTimer: 0,
        defeatCount: 0,
        lastDefeatTime: null
      },
      rewards: [...config.rewards],
      createdAt: Date.now()
    }

    this.bosses.set(id, boss)

    this.eventBus.emit('boss:spawned', {
      bossId: id,
      name: boss.name,
      level: boss.level
    })

    this.logger.info(`Spawned boss ${boss.name} (level ${boss.level})`)
    return boss
  }

  engageBoss(bossId: string, attackerId: string): boolean {
    const boss = this.bosses.get(bossId)
    if (!boss) return false

    if (boss.state.status !== BossStatus.AVAILABLE) {
      this.logger.warn(`Boss ${bossId} is not available for combat`)
      return false
    }

    const updatedBoss = cloneBoss(boss)
    updatedBoss.state = {
      ...boss.state,
      status: BossStatus.IN_COMBAT
    }
    this.bosses.set(bossId, updatedBoss)

    this.eventBus.emit('boss:engaged', {
      bossId,
      attackerId,
      bossName: boss.name
    })

    this.logger.debug(`Boss ${bossId} engaged by ${attackerId}`)
    return true
  }

  dealDamage(bossId: string, damage: number, attackerId: string): number {
    const boss = this.bosses.get(bossId)
    if (!boss || boss.state.status !== BossStatus.IN_COMBAT) return 0

    const actualDamage = Math.max(1, damage - boss.stats.def * 0.5)
    const newHp = Math.max(0, boss.state.currentHp - actualDamage)

    const updatedBoss = cloneBoss(boss)
    updatedBoss.state = {
      ...boss.state,
      currentHp: newHp
    }
    this.bosses.set(bossId, updatedBoss)

    this.eventBus.emit('boss:damaged', {
      bossId,
      attackerId,
      damage: actualDamage,
      remainingHp: newHp
    })

    if (newHp <= 0) {
      this.defeatBoss(bossId, attackerId)
    }

    return actualDamage
  }

  private defeatBoss(bossId: string, attackerId: string): void {
    const boss = this.bosses.get(bossId)
    if (!boss) return

    const updatedBoss = cloneBoss(boss)
    updatedBoss.state = {
      ...boss.state,
      status: BossStatus.RESTING,
      restTimer: 900000,
      defeatCount: boss.state.defeatCount + 1,
      lastDefeatTime: Date.now()
    }
    this.bosses.set(bossId, updatedBoss)

    const rewards = this.calculateRewards(boss)

    this.eventBus.emit('boss:defeated', {
      bossId,
      attackerId,
      bossName: boss.name,
      bossLevel: boss.level,
      rewards
    })

    this.logger.info(`Boss ${boss.name} defeated by ${attackerId}`)
  }

  private calculateRewards(boss: Boss): BossReward[] {
    const rewards: BossReward[] = []
    let hasCorePartsReward = false

    for (const reward of boss.rewards) {
      if (Math.random() < reward.dropRate) {
        const amountScale = boss.difficultyScale ?? 1
        const scaledAmount = Math.max(1, Math.floor(reward.amount * amountScale))
        if (reward.type === 'core_parts' || reward.type === 'essence') {
          hasCorePartsReward = true
        }
        rewards.push({
          type: reward.type,
          itemId: reward.itemId,
          amount: scaledAmount,
          dropRate: reward.dropRate
        })
      }
    }

    if (!hasCorePartsReward) {
      rewards.unshift({
        type: 'core_parts',
        amount: Math.max(1, Math.floor((boss.stats.maxHp / 60) + boss.level * 8)),
        dropRate: 1
      })
    }

    return rewards
  }

  flee(bossId: string, attackerId: string): void {
    const boss = this.bosses.get(bossId)
    if (!boss) return

    const updatedBoss = cloneBoss(boss)
    updatedBoss.state = {
      ...boss.state,
      status: BossStatus.AVAILABLE
    }
    this.bosses.set(bossId, updatedBoss)

    this.eventBus.emit('boss:fled', {
      bossId,
      attackerId
    })

    this.logger.debug(`Attacker ${attackerId} fled from boss ${bossId}`)
  }

  getBoss(bossId: string): Boss | undefined {
    const boss = this.bosses.get(bossId)
    return boss ? cloneBoss(boss) : undefined
  }

  getAvailableBosses(): Boss[] {
    return Array.from(this.bosses.values())
      .filter(b => b.state.status === BossStatus.AVAILABLE)
      .map(cloneBoss)
  }

  getAllBosses(): Boss[] {
    return Array.from(this.bosses.values()).map(cloneBoss)
  }

  getBossHpPercent(bossId: string): number {
    const boss = this.bosses.get(bossId)
    if (!boss) return 0
    return (boss.state.currentHp / boss.stats.maxHp) * 100
  }

  deleteBoss(bossId: string): boolean {
    const boss = this.bosses.get(bossId)
    if (!boss) return false

    this.bosses.delete(bossId)

    this.eventBus.emit('boss:removed', {
      bossId
    })

    this.logger.info(`Removed boss ${bossId}`)
    return true
  }

  forceSpawn(): void {
    this.spawnTimer = this.spawnInterval
  }

  getTimeUntilNextSpawn(): number {
    return Math.max(0, this.spawnInterval - this.spawnTimer)
  }

  private getStageScale(stage: BossStage): number {
    switch (stage) {
      case BossStage.EARLY:
        return 1
      case BossStage.MID:
        return 1.25
      case BossStage.LATE:
        return 1.5
      default:
        return 1
    }
  }

  serialize(): { bosses: Boss[]; configs: BossConfig[]; spawnTimer: number } {
    return {
      bosses: this.getAllBosses(),
      configs: Array.from(this.configs.values()).map(config => ({
        ...config,
        rewards: [...config.rewards]
      })),
      spawnTimer: this.spawnTimer
    }
  }

  deserialize(data: { bosses: Boss[]; configs: BossConfig[]; spawnTimer: number }): void {
    this.bosses = new Map(
      data.bosses.map(boss => [
        boss.id,
        {
          ...boss,
          stats: { ...boss.stats },
          state: {
            ...boss.state,
          },
          rewards: [...boss.rewards]
        }
      ])
    )
    this.configs = new Map(
      data.configs.map(config => [
        config.id,
        {
          ...config,
          rewards: [...config.rewards]
        }
      ])
    )
    this.spawnTimer = data.spawnTimer
  }
}
