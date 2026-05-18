/**
 * 会话摘要类型定义
 * @module types/session.types
 */

import { ResourceType } from './map.types'
import { ProductionBuildingType } from './production-building.types'

/** 资源采集记录 */
export interface ResourceGainedRecord {
  type: ResourceType
  amount: number
}

/** 建筑完成记录 */
export interface BuildingCompletedRecord {
  type: ProductionBuildingType
  name: string
  level: number
}

/** 研究完成记录 */
export interface ResearchCompletedRecord {
  techId: string
  name: string
}

/** Boss 战斗记录 */
export interface BossCombatRecord {
  bossId: string
  bossName: string
  bossLevel: number
  won: boolean
  essenceEarned: number
}

/** 会话摘要 */
export interface SessionSummary {
  /** 离开始时间 */
  sessionStart: number
  /** 回归时间 */
  sessionEnd: number
  /** 离线时长（毫秒） */
  durationMs: number
  /** 资源变化 */
  resourcesGained: ResourceGainedRecord[]
  /** 建筑完成 */
  buildingsCompleted: BuildingCompletedRecord[]
  /** 研究完成 */
  researchCompleted: ResearchCompletedRecord[]
  /** Boss 战斗 */
  bossBattles: BossCombatRecord[]
  /** 当前瓶颈 */
  bottlenecks: string[]
  /** 是否有新解锁内容 */
  newUnlocks: string[]
}

/** 会话摘要显示模式 */
export type SummaryDisplayMode = 'auto' | 'dismissed'

export const SESSION_STORAGE_KEY = 'idle_collective_last_summary'
