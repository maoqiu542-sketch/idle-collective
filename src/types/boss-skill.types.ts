export type SkillTargetType = 'single' | 'aoe' | 'self' | 'all_enemies'

export type SkillEffectType = 
  | 'damage'
  | 'heal'
  | 'burn'
  | 'freeze'
  | 'stun'
  | 'poison'
  | 'buff_atk'
  | 'buff_def'
  | 'debuff_atk'
  | 'debuff_def'
  | 'shield'
  | 'summon'
  | 'lifesteal'

export interface SkillEffect {
  type: SkillEffectType
  value?: number
  duration?: number
  damage?: number
  chance?: number
}

export interface BossSkill {
  id: string
  name: string
  description: string
  cooldown: number
  currentCooldown: number
  damage: number
  targetType: SkillTargetType
  effects: SkillEffect[]
  visualEffect: string
  animationDuration: number
  soundEffect?: string
}

export interface BossSkillConfig {
  id: string
  name: string
  description: string
  baseCooldown: number
  damageMultiplier: number
  targetType: SkillTargetType
  effects: SkillEffect[]
  visualEffect: string
  animationDuration: number
  unlockAtHpPercent?: number
}

export const BOSS_SKILL_TEMPLATES: Record<string, BossSkillConfig[]> = {
  goblin_chief: [
    {
      id: 'throw_spear',
      name: '投掷长矛',
      description: '对单个目标造成120%攻击力伤害',
      baseCooldown: 3,
      damageMultiplier: 1.2,
      targetType: 'single',
      effects: [],
      visualEffect: 'Boss投掷长矛动画',
      animationDuration: 1000,
    },
    {
      id: 'call_reinforcements',
      name: '呼叫援军',
      description: '召唤2只哥布林小怪',
      baseCooldown: 5,
      damageMultiplier: 0,
      targetType: 'self',
      effects: [{ type: 'summon', value: 2 }],
      visualEffect: 'Boss吹响号角',
      animationDuration: 1500,
    },
    {
      id: 'frenzy',
      name: '狂暴',
      description: '攻击力提升30%，持续3回合',
      baseCooldown: 6,
      damageMultiplier: 0,
      targetType: 'self',
      effects: [{ type: 'buff_atk', value: 30, duration: 3 }],
      visualEffect: 'Boss眼睛变红',
      animationDuration: 800,
    },
  ],
  stone_gargoyle: [
    {
      id: 'stone_throw',
      name: '投石',
      description: '对所有敌人造成80%攻击力伤害',
      baseCooldown: 4,
      damageMultiplier: 0.8,
      targetType: 'all_enemies',
      effects: [],
      visualEffect: 'Boss投掷巨石',
      animationDuration: 1200,
    },
    {
      id: 'stone_skin',
      name: '石肤术',
      description: '获得50%伤害减免护盾，持续3回合',
      baseCooldown: 5,
      damageMultiplier: 0,
      targetType: 'self',
      effects: [{ type: 'shield', value: 50, duration: 3 }],
      visualEffect: 'Boss身体变成灰色',
      animationDuration: 1000,
    },
    {
      id: 'petrify',
      name: '石化凝视',
      description: '30%概率使单个目标眩晕1回合',
      baseCooldown: 4,
      damageMultiplier: 0.5,
      targetType: 'single',
      effects: [{ type: 'stun', duration: 1, chance: 30 }],
      visualEffect: 'Boss眼睛发光',
      animationDuration: 1500,
    },
  ],
  shadow_knight: [
    {
      id: 'dark_slash',
      name: '暗影斩击',
      description: '对单个目标造成150%攻击力伤害，并恢复造成伤害的20%生命值',
      baseCooldown: 3,
      damageMultiplier: 1.5,
      targetType: 'single',
      effects: [{ type: 'lifesteal', value: 20 }],
      visualEffect: '黑色剑气斩击',
      animationDuration: 1000,
    },
    {
      id: 'shadow_veil',
      name: '暗影帷幕',
      description: '闪避率提升40%，持续2回合',
      baseCooldown: 5,
      damageMultiplier: 0,
      targetType: 'self',
      effects: [{ type: 'buff_def', value: 40, duration: 2 }],
      visualEffect: 'Boss被黑雾笼罩',
      animationDuration: 800,
    },
    {
      id: 'soul_drain',
      name: '灵魂汲取',
      description: '对所有敌人造成60%攻击力伤害，每命中一个敌人恢复10%最大生命值',
      baseCooldown: 6,
      damageMultiplier: 0.6,
      targetType: 'all_enemies',
      effects: [{ type: 'lifesteal', value: 10 }],
      visualEffect: '紫色能量从敌人流向Boss',
      animationDuration: 2000,
    },
    {
      id: 'execute',
      name: '处决',
      description: '对生命值低于30%的目标造成200%攻击力伤害',
      baseCooldown: 5,
      damageMultiplier: 2.0,
      targetType: 'single',
      effects: [],
      visualEffect: 'Boss举起巨剑劈下',
      animationDuration: 1500,
      unlockAtHpPercent: 50,
    },
  ],
  inferno_lord: [
    {
      id: 'fireball',
      name: '火球术',
      description: '对单个目标造成130%攻击力的火焰伤害，并附加灼烧效果',
      baseCooldown: 3,
      damageMultiplier: 1.3,
      targetType: 'single',
      effects: [{ type: 'burn', duration: 2, damage: 10 }],
      visualEffect: '红色火球从Boss飞向目标',
      animationDuration: 1000,
    },
    {
      id: 'inferno',
      name: '地狱烈焰',
      description: '对所有敌人造成100%攻击力的AOE伤害',
      baseCooldown: 5,
      damageMultiplier: 1.0,
      targetType: 'all_enemies',
      effects: [{ type: 'burn', duration: 3, damage: 15 }],
      visualEffect: 'Boss周围爆发火焰环',
      animationDuration: 2000,
    },
    {
      id: 'flame_shield',
      name: '烈焰护盾',
      description: '攻击者受到反伤伤害，持续3回合',
      baseCooldown: 6,
      damageMultiplier: 0,
      targetType: 'self',
      effects: [{ type: 'shield', value: 20, duration: 3 }],
      visualEffect: 'Boss周围形成火焰护盾',
      animationDuration: 1000,
    },
    {
      id: 'meteor',
      name: '陨石术',
      description: '对所有敌人造成180%攻击力伤害',
      baseCooldown: 7,
      damageMultiplier: 1.8,
      targetType: 'all_enemies',
      effects: [{ type: 'burn', duration: 2, damage: 20 }],
      visualEffect: '巨大陨石从天而降',
      animationDuration: 3000,
      unlockAtHpPercent: 30,
    },
  ],
  ancient_dragon: [
    {
      id: 'dragon_breath',
      name: '龙息',
      description: '对所有敌人造成120%攻击力的火焰伤害',
      baseCooldown: 4,
      damageMultiplier: 1.2,
      targetType: 'all_enemies',
      effects: [{ type: 'burn', duration: 3, damage: 15 }],
      visualEffect: 'Boss喷出火焰',
      animationDuration: 2000,
    },
    {
      id: 'tail_sweep',
      name: '尾击',
      description: '对所有敌人造成80%攻击力伤害，并有20%概率眩晕',
      baseCooldown: 3,
      damageMultiplier: 0.8,
      targetType: 'all_enemies',
      effects: [{ type: 'stun', duration: 1, chance: 20 }],
      visualEffect: 'Boss尾巴横扫',
      animationDuration: 1200,
    },
    {
      id: 'dragon_armor',
      name: '龙鳞护甲',
      description: '防御力提升50%，持续4回合',
      baseCooldown: 6,
      damageMultiplier: 0,
      targetType: 'self',
      effects: [{ type: 'buff_def', value: 50, duration: 4 }],
      visualEffect: 'Boss鳞片发光',
      animationDuration: 1000,
    },
    {
      id: 'devour',
      name: '吞噬',
      description: '对单个目标造成200%攻击力伤害，并恢复等量生命值',
      baseCooldown: 5,
      damageMultiplier: 2.0,
      targetType: 'single',
      effects: [{ type: 'lifesteal', value: 100 }],
      visualEffect: 'Boss张嘴咬向目标',
      animationDuration: 1500,
      unlockAtHpPercent: 50,
    },
    {
      id: 'ancient_roar',
      name: '远古咆哮',
      description: '使所有敌人攻击力降低30%，持续3回合',
      baseCooldown: 7,
      damageMultiplier: 0,
      targetType: 'all_enemies',
      effects: [{ type: 'debuff_atk', value: 30, duration: 3 }],
      visualEffect: 'Boss发出震耳咆哮',
      animationDuration: 2000,
      unlockAtHpPercent: 30,
    },
  ],
}
