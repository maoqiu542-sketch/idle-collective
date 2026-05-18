export type EquipmentEffectType =
  | 'lifesteal'
  | 'crit_damage_boost'
  | 'counter_attack'
  | 'burn_on_hit'
  | 'freeze_on_hit'
  | 'poison_on_hit'
  | 'stun_on_hit'
  | 'damage_reflect'
  | 'heal_on_kill'
  | 'bonus_damage_low_hp'
  | 'attack_speed_boost'
  | 'damage_reduction'

export interface EquipmentEffect {
  id: string
  type: EquipmentEffectType
  name: string
  description: string
  trigger: 'on_attack' | 'on_hit' | 'on_kill' | 'passive'
  chance: number
  value: number
  duration?: number
  cooldown?: number
}

export interface SetBonus {
  setId: string
  setName: string
  pieces: string[]
  bonuses: {
    pieces2: SetEffect
    pieces4: SetEffect
    pieces6: SetEffect
  }
}

export interface SetEffect {
  type: 'stat' | 'effect'
  stat?: string
  value?: number
  effect?: EquipmentEffectType
  chance?: number
  duration?: number
}

export const EQUIPMENT_EFFECTS: Record<string, EquipmentEffect> = {
  lifesteal_5: {
    id: 'lifesteal_5',
    type: 'lifesteal',
    name: '吸血',
    description: '攻击时恢复造成伤害的5%生命值',
    trigger: 'on_attack',
    chance: 100,
    value: 5,
  },
  lifesteal_10: {
    id: 'lifesteal_10',
    type: 'lifesteal',
    name: '强力吸血',
    description: '攻击时恢复造成伤害的10%生命值',
    trigger: 'on_attack',
    chance: 100,
    value: 10,
  },
  lifesteal_20: {
    id: 'lifesteal_20',
    type: 'lifesteal',
    name: '极致吸血',
    description: '攻击时恢复造成伤害的20%生命值',
    trigger: 'on_attack',
    chance: 100,
    value: 20,
  },
  crit_damage_20: {
    id: 'crit_damage_20',
    type: 'crit_damage_boost',
    name: '暴击伤害',
    description: '暴击伤害增加20%',
    trigger: 'passive',
    chance: 100,
    value: 20,
  },
  crit_damage_35: {
    id: 'crit_damage_35',
    type: 'crit_damage_boost',
    name: '强力暴击',
    description: '暴击伤害增加35%',
    trigger: 'passive',
    chance: 100,
    value: 35,
  },
  crit_damage_50: {
    id: 'crit_damage_50',
    type: 'crit_damage_boost',
    name: '致命暴击',
    description: '暴击伤害增加50%',
    trigger: 'passive',
    chance: 100,
    value: 50,
  },
  counter_10: {
    id: 'counter_10',
    type: 'counter_attack',
    name: '反击',
    description: '受击时10%概率反击，造成50%攻击力伤害',
    trigger: 'on_hit',
    chance: 10,
    value: 50,
  },
  counter_20: {
    id: 'counter_20',
    type: 'counter_attack',
    name: '强力反击',
    description: '受击时20%概率反击，造成75%攻击力伤害',
    trigger: 'on_hit',
    chance: 20,
    value: 75,
  },
  counter_30: {
    id: 'counter_30',
    type: 'counter_attack',
    name: '荆棘反击',
    description: '受击时30%概率反击，造成100%攻击力伤害',
    trigger: 'on_hit',
    chance: 30,
    value: 100,
  },
  burn_on_hit: {
    id: 'burn_on_hit',
    type: 'burn_on_hit',
    name: '灼烧',
    description: '攻击时15%概率使敌人灼烧，每回合造成10点伤害，持续3回合',
    trigger: 'on_attack',
    chance: 15,
    value: 10,
    duration: 3,
  },
  freeze_on_hit: {
    id: 'freeze_on_hit',
    type: 'freeze_on_hit',
    name: '冰冻',
    description: '攻击时10%概率冻结敌人1回合',
    trigger: 'on_attack',
    chance: 10,
    value: 1,
    duration: 1,
  },
  poison_on_hit: {
    id: 'poison_on_hit',
    type: 'poison_on_hit',
    name: '剧毒',
    description: '攻击时20%概率使敌人中毒，每回合造成5点伤害，持续5回合',
    trigger: 'on_attack',
    chance: 20,
    value: 5,
    duration: 5,
  },
  stun_on_hit: {
    id: 'stun_on_hit',
    type: 'stun_on_hit',
    name: '眩晕',
    description: '攻击时5%概率眩晕敌人1回合',
    trigger: 'on_attack',
    chance: 5,
    value: 1,
    duration: 1,
  },
  damage_reflect: {
    id: 'damage_reflect',
    type: 'damage_reflect',
    name: '伤害反弹',
    description: '受击时反弹20%伤害给攻击者',
    trigger: 'on_hit',
    chance: 100,
    value: 20,
  },
  heal_on_kill: {
    id: 'heal_on_kill',
    type: 'heal_on_kill',
    name: '击杀回血',
    description: '击杀敌人时恢复20%最大生命值',
    trigger: 'on_kill',
    chance: 100,
    value: 20,
  },
  bonus_damage_low_hp: {
    id: 'bonus_damage_low_hp',
    type: 'bonus_damage_low_hp',
    name: '背水一战',
    description: '生命值低于30%时，攻击力提升50%',
    trigger: 'passive',
    chance: 100,
    value: 50,
  },
}

export const SET_BONUSES: Record<string, SetBonus> = {
  flame: {
    setId: 'flame',
    setName: '烈焰套装',
    pieces: ['flame_weapon', 'flame_helmet', 'flame_armor', 'flame_boots', 'flame_ring', 'flame_necklace'],
    bonuses: {
      pieces2: { type: 'stat', stat: 'atk', value: 10 },
      pieces4: { type: 'stat', stat: 'critRate', value: 10 },
      pieces6: { type: 'effect', effect: 'burn_on_hit', chance: 20, duration: 3 },
    },
  },
  frost: {
    setId: 'frost',
    setName: '寒冰套装',
    pieces: ['frost_weapon', 'frost_helmet', 'frost_armor', 'frost_boots', 'frost_ring', 'frost_necklace'],
    bonuses: {
      pieces2: { type: 'stat', stat: 'def', value: 10 },
      pieces4: { type: 'stat', stat: 'hp', value: 50 },
      pieces6: { type: 'effect', effect: 'freeze_on_hit', chance: 15, duration: 1 },
    },
  },
  berserker: {
    setId: 'berserker',
    setName: '狂战套装',
    pieces: ['berserker_weapon', 'berserker_helmet', 'berserker_armor', 'berserker_boots', 'berserker_ring', 'berserker_necklace'],
    bonuses: {
      pieces2: { type: 'stat', stat: 'hp', value: 50 },
      pieces4: { type: 'stat', stat: 'atk', value: 15 },
      pieces6: { type: 'effect', effect: 'bonus_damage_low_hp', chance: 100 },
    },
  },
  guardian: {
    setId: 'guardian',
    setName: '守护套装',
    pieces: ['guardian_weapon', 'guardian_helmet', 'guardian_armor', 'guardian_boots', 'guardian_ring', 'guardian_necklace'],
    bonuses: {
      pieces2: { type: 'stat', stat: 'def', value: 15 },
      pieces4: { type: 'stat', stat: 'hp', value: 100 },
      pieces6: { type: 'stat', stat: 'hpRegen', value: 5 },
    },
  },
  assassin: {
    setId: 'assassin',
    setName: '刺客套装',
    pieces: ['assassin_weapon', 'assassin_helmet', 'assassin_armor', 'assassin_boots', 'assassin_ring', 'assassin_necklace'],
    bonuses: {
      pieces2: { type: 'stat', stat: 'critRate', value: 10 },
      pieces4: { type: 'stat', stat: 'critDamage', value: 25 },
      pieces6: { type: 'effect', effect: 'stun_on_hit', chance: 10, duration: 1 },
    },
  },
  vampire: {
    setId: 'vampire',
    setName: '吸血套装',
    pieces: ['vampire_weapon', 'vampire_helmet', 'vampire_armor', 'vampire_boots', 'vampire_ring', 'vampire_necklace'],
    bonuses: {
      pieces2: { type: 'stat', stat: 'atk', value: 8 },
      pieces4: { type: 'effect', effect: 'lifesteal', chance: 100, value: 10 },
      pieces6: { type: 'effect', effect: 'lifesteal', chance: 100, value: 20 },
    },
  },
}
