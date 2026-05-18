import { beforeEach, describe, expect, it } from 'vitest'
import { EventBus } from '@core/EventBus'
import { BossManager } from '@domain/combat/BossManager'
import { BossConfig, BossStage, BossStatus } from '@app-types/combat.types'

describe('BossManager', () => {
  let eventBus: EventBus
  let manager: BossManager
  let configs: BossConfig[]

  beforeEach(() => {
    eventBus = new EventBus()
    manager = new BossManager(eventBus)
    configs = [
      {
        id: 'boss-1',
        name: '测试Boss',
        level: 1,
        stage: BossStage.EARLY,
        baseHp: 20,
        baseAtk: 5,
        baseDef: 2,
        baseSpeed: 1.5,
        rewards: [{ type: 'gold', amount: 50, dropRate: 1 }],
      },
    ]
    manager.loadConfigs(configs)
  })

  it('should spawn a boss after the refresh timer elapses', () => {
    manager.forceSpawn()
    manager.update(1)

    const bosses = manager.getAvailableBosses()

    expect(bosses).toHaveLength(1)
    expect(bosses[0].name).toBe('测试Boss')
    expect(manager.getTimeUntilNextSpawn()).toBeGreaterThan(0)
  })

  it('should allow combat, defeat, and resting recovery', () => {
    manager.forceSpawn()
    manager.update(1)

    const boss = manager.getAvailableBosses()[0]
    expect(boss).toBeDefined()

    expect(manager.engageBoss(boss.id, 'char-1')).toBe(true)
    expect(manager.getBoss(boss.id)?.state.status).toBe(BossStatus.IN_COMBAT)

    const dealt = manager.dealDamage(boss.id, 999, 'char-1')
    expect(dealt).toBeGreaterThan(0)
    expect(manager.getBoss(boss.id)?.state.status).toBe(BossStatus.RESTING)

    manager.update(900000)
    expect(manager.getBoss(boss.id)?.state.status).toBe(BossStatus.AVAILABLE)
  })
})
