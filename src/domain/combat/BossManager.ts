import {
  Boss,
  BossConfig,
  BossStatus,
  BossReward
} from '@app-types/combat.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

export class BossManager {
  private eventBus: EventBus
  private logger: Logger
  private bosses: Map<string, Boss> = new Map()
  private configs: Map<string, BossConfig> = new Map()
  private spawnTimer: number = 0
  private readonly SPAWN_INTERVAL: number = 3600000

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('BossManager')
  }

  loadConfigs(configs: BossConfig[]): void {
    for (const config of configs) {
      this.configs.set(config.id, config)
    }
    this.logger.info(`Loaded ${configs.length} boss configs`)
  }

  update(deltaTime: number): void {
    this.spawnTimer += deltaTime

    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.trySpawnBoss()
      this.spawnTimer = 0
    }

    for (const boss of this.bosses.values()) {
      if (boss.state.status === BossStatus.RESTING) {
        boss.state.restTimer -= deltaTime
        if (boss.state.restTimer <= 0) {
          boss.state.status = BossStatus.AVAILABLE
          boss.state.restTimer = 0
          this.logger.info(`Boss ${boss.id} is now available`)
        }
      }
    }
  }

  private trySpawnBoss(): void {
    const availableConfigs = Array.from(this.configs.values())
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

    const boss: Boss = {
      id,
      configId,
      name: config.name,
      level: config.level,
      stats: {
        hp: config.baseHp,
        maxHp: config.baseHp,
        atk: config.baseAtk,
        def: config.baseDef,
        speed: config.baseSpeed || 1.5,
      },
      state: {
        status: BossStatus.AVAILABLE,
        currentHp: config.baseHp,
        restTimer: 0,
        defeatCount: 0,
        lastDefeatTime: null
      },
      rewards: config.rewards,
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

    boss.state.status = BossStatus.IN_COMBAT

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
    boss.state.currentHp = Math.max(0, boss.state.currentHp - actualDamage)

    this.eventBus.emit('boss:damaged', {
      bossId,
      attackerId,
      damage: actualDamage,
      remainingHp: boss.state.currentHp
    })

    if (boss.state.currentHp <= 0) {
      this.defeatBoss(bossId, attackerId)
    }

    return actualDamage
  }

  private defeatBoss(bossId: string, attackerId: string): void {
    const boss = this.bosses.get(bossId)
    if (!boss) return

    boss.state.status = BossStatus.RESTING
    boss.state.restTimer = 900000
    boss.state.defeatCount += 1
    boss.state.lastDefeatTime = Date.now()

    const rewards = this.calculateRewards(boss)

    this.eventBus.emit('boss:defeated', {
      bossId,
      attackerId,
      bossName: boss.name,
      rewards
    })

    this.logger.info(`Boss ${boss.name} defeated by ${attackerId}`)
  }

  private calculateRewards(boss: Boss): BossReward[] {
    const rewards: BossReward[] = []

    for (const reward of boss.rewards) {
      if (Math.random() < reward.dropRate) {
        rewards.push({
          type: reward.type,
          itemId: reward.itemId,
          amount: reward.amount * (1 + boss.state.defeatCount * 0.1),
          dropRate: reward.dropRate
        })
      }
    }

    return rewards
  }

  flee(bossId: string, attackerId: string): void {
    const boss = this.bosses.get(bossId)
    if (!boss) return

    boss.state.status = BossStatus.AVAILABLE

    this.eventBus.emit('boss:fled', {
      bossId,
      attackerId
    })

    this.logger.debug(`Attacker ${attackerId} fled from boss ${bossId}`)
  }

  getBoss(bossId: string): Boss | undefined {
    return this.bosses.get(bossId)
  }

  getAvailableBosses(): Boss[] {
    return Array.from(this.bosses.values()).filter(
      b => b.state.status === BossStatus.AVAILABLE
    )
  }

  getAllBosses(): Boss[] {
    return Array.from(this.bosses.values())
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
    this.spawnTimer = this.SPAWN_INTERVAL
  }

  getTimeUntilNextSpawn(): number {
    return Math.max(0, this.SPAWN_INTERVAL - this.spawnTimer)
  }
}
