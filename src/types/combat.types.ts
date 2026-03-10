/**
 * 战斗相关类型定义
 * @module types/combat.types
 */

import { SixDimensionStats } from './six-dimension.types'

/** BOSS状态 */
export enum BossStatus {
  AVAILABLE = 'available',
  IN_COMBAT = 'in_combat',
  RESTING = 'resting'
}

/** BOSS奖励 */
export interface BossReward {
  type: 'gold' | 'equipment' | 'exp'
  itemId?: string
  amount: number
  dropRate: number
}

/** BOSS配置 */
export interface BossConfig {
  id: string
  name: string
  level: number
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpeed?: number
  rewards: BossReward[]
}

/** BOSS状态数据 */
export interface BossState {
  status: BossStatus
  currentHp: number
  restTimer: number
  defeatCount: number
  lastDefeatTime: number | null
}

/** BOSS实例 */
export interface Boss {
  id: string
  configId: string
  name: string
  level: number
  stats: {
    hp: number
    maxHp: number
    atk: number
    def: number
    speed: number
  }
  state: BossState
  rewards: BossReward[]
  createdAt: number
}

/** 战斗参与者 */
export interface CombatParticipant {
  characterId: string
  currentHp: number
  maxHp: number
  stats: SixDimensionStats
  nextAttackTime: number
}

/** 战斗状态 */
export interface CombatState {
  bossId: string
  participants: CombatParticipant[]
  currentTurn: number
  logs: CombatLog[]
  startTime: number
  isEnded: boolean
  result?: 'victory' | 'defeat'
}

/** 战斗日志 */
export interface CombatLog {
  time: number
  attacker: string
  target: string
  damage: number
  isCritical: boolean
}

/** 战斗结果 */
export interface CombatResult {
  victory: boolean
  goldReward: number
  expReward: number
  equipmentDrop?: string
  restingCharacters: string[]
}

/** 计算伤害 */
export function calculateDamage(atk: number, def: number): number {
  return Math.max(1, Math.floor(atk * (1 - def / (def + 100))))
}

/** 计算攻击间隔 */
export function calculateAttackInterval(atkSpd: number): number {
  return 1000 / atkSpd
}
