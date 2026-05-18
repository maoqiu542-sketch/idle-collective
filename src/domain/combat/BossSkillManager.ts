import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'
import { Boss } from '@app-types/combat.types'
import {
  BossSkill,
  BOSS_SKILL_TEMPLATES,
  SkillEffect,
} from '@app-types/boss-skill.types'

export class BossSkillManager {
  private eventBus: EventBus
  private logger: Logger
  private bossSkills: Map<string, BossSkill[]> = new Map()

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('BossSkillManager')
  }

  initializeBossSkills(boss: Boss): void {
    const templateKey = this.getTemplateKey(boss.configId)
    const templates = BOSS_SKILL_TEMPLATES[templateKey] || []

    const skills: BossSkill[] = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      cooldown: template.baseCooldown,
      currentCooldown: 0,
      damage: Math.floor(boss.stats.atk * template.damageMultiplier),
      targetType: template.targetType,
      effects: [...template.effects],
      visualEffect: template.visualEffect,
      animationDuration: template.animationDuration,
    }))

    this.bossSkills.set(boss.id, skills)
    this.logger.info(`Initialized ${skills.length} skills for boss ${boss.name}`)
  }

  private getTemplateKey(configId: string): string {
    const keyMap: Record<string, string> = {
      'boss_goblin': 'goblin_chief',
      'boss_gargoyle': 'stone_gargoyle',
      'boss_shadow': 'shadow_knight',
      'boss_inferno': 'inferno_lord',
      'boss_dragon': 'ancient_dragon',
    }
    return keyMap[configId] || 'goblin_chief'
  }

  getAvailableSkills(bossId: string, bossHpPercent: number): BossSkill[] {
    const skills = this.bossSkills.get(bossId) || []
    const templateKey = this.getTemplateKey(bossId)
    const templates = BOSS_SKILL_TEMPLATES[templateKey] || []

    return skills.filter((skill, index) => {
      if (skill.currentCooldown > 0) return false

      const template = templates[index]
      if (template?.unlockAtHpPercent && bossHpPercent > template.unlockAtHpPercent) {
        return false
      }

      return true
    })
  }

  selectSkill(bossId: string, bossHpPercent: number): BossSkill | null {
    const availableSkills = this.getAvailableSkills(bossId, bossHpPercent)
    if (availableSkills.length === 0) return null

    const weights = availableSkills.map(skill => {
      if (skill.targetType === 'all_enemies') return 2
      if (skill.effects.some(e => e.type === 'heal' || e.type === 'lifesteal')) {
        return bossHpPercent < 50 ? 3 : 1
      }
      return 1
    })

    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < availableSkills.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return availableSkills[i]
      }
    }

    return availableSkills[0]
  }

  executeSkill(
    boss: Boss,
    skill: BossSkill,
    targets: { id: string; hp: number; maxHp: number }[]
  ): {
    damage: number
    effects: SkillEffect[]
    targets: string[]
    visualEffect: string
  } {
    skill.currentCooldown = skill.cooldown

    const affectedTargets = this.selectTargets(skill, targets)
    const totalDamage = skill.damage * affectedTargets.length

    this.eventBus.emit('boss:skill-used', {
      bossId: boss.id,
      skillId: skill.id,
      skillName: skill.name,
      targets: affectedTargets,
      damage: totalDamage,
      effects: skill.effects,
      visualEffect: skill.visualEffect,
    })

    this.logger.debug(`Boss ${boss.name} used ${skill.name} on ${affectedTargets.length} targets`)

    return {
      damage: totalDamage,
      effects: skill.effects,
      targets: affectedTargets,
      visualEffect: skill.visualEffect,
    }
  }

  private selectTargets(
    skill: BossSkill,
    targets: { id: string; hp: number; maxHp: number }[]
  ): string[] {
    switch (skill.targetType) {
      case 'single': {
        const aliveTargets = targets.filter(t => t.hp > 0)
        if (aliveTargets.length === 0) return []
        const lowestHp = aliveTargets.reduce((a, b) => 
          (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b
        )
        return [lowestHp.id]
      }

      case 'all_enemies':
        return targets.filter(t => t.hp > 0).map(t => t.id)

      case 'aoe':
        return targets.filter(t => t.hp > 0).map(t => t.id)

      case 'self':
        return []

      default:
        return []
    }
  }

  reduceCooldowns(bossId: string): void {
    const skills = this.bossSkills.get(bossId) || []
    skills.forEach(skill => {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown--
      }
    })
  }

  getSkillCooldown(bossId: string, skillId: string): number {
    const skills = this.bossSkills.get(bossId) || []
    const skill = skills.find(s => s.id === skillId)
    return skill?.currentCooldown || 0
  }

  getAllSkills(bossId: string): BossSkill[] {
    return this.bossSkills.get(bossId) || []
  }

  removeBossSkills(bossId: string): void {
    this.bossSkills.delete(bossId)
    this.logger.debug(`Removed skills for boss ${bossId}`)
  }
}
