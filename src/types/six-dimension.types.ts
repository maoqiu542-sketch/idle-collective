/**
 * 六维属性相关类型定义
 * @module types/six-dimension.types
 */

/** 六维属性类型 */
export enum SixDimensionType {
  ATK = 'atk',
  DEF = 'def',
  HP = 'hp',
  CRIT_RATE = 'crit_rate',
  CRIT_DMG = 'crit_dmg',
  ATK_SPD = 'atk_spd',
}

/** 六维配置 */
export interface SixDimensionConfig {
  id: SixDimensionType
  name: string
  baseValue: number
  growthRate: number
  expFormula: string
}

/** 六维等级数据 */
export interface SixDimensionLevel {
  type: SixDimensionType
  level: number
  exp: number
  expToNext: number
}

/** 六维属性数据 */
export interface SixDimensionStats {
  atk: number
  def: number
  hp: number
  critRate: number
  critDmg: number
  atkSpd: number
}

/** 角色六维数据 */
export interface CharacterSixDimensions {
  characterId: string
  dimensions: Map<SixDimensionType, SixDimensionLevel>
}

/** 计算升级所需经验: 100 × 当前等级^1.5 */
export function calculateExpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

/** 计算属性值: 基础属性 × (成长率 ^ 当前等级) */
export function calculateAttributeValue(baseValue: number, growthRate: number, level: number): number {
  return Math.floor(baseValue * Math.pow(growthRate, level))
}

/** 计算战力: 攻击力×2 + 防御力×1.5 + 生命值×0.1 + 暴击率×10 + 暴击伤害×5 + 攻击速度×50 */
export function calculatePower(stats: SixDimensionStats): number {
  return Math.floor(
    stats.atk * 2 +
    stats.def * 1.5 +
    stats.hp * 0.1 +
    stats.critRate * 10 +
    stats.critDmg * 5 +
    stats.atkSpd * 50
  )
}

/** 六维属性名称 */
export const SIX_DIMENSION_NAMES: Record<SixDimensionType, string> = {
  [SixDimensionType.ATK]: '攻击力',
  [SixDimensionType.DEF]: '防御力',
  [SixDimensionType.HP]: '生命值',
  [SixDimensionType.CRIT_RATE]: '暴击率',
  [SixDimensionType.CRIT_DMG]: '暴击伤害',
  [SixDimensionType.ATK_SPD]: '攻击速度',
}
