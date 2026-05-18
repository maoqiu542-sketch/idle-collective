
/**
 * 科技研究系统类型定义
 * @module types/technology.types
 */

/** 科技分支 */
export enum TechBranch {
  BUILDING = 'building',
  PRODUCTION = 'production',
  COMBAT = 'combat',
  CIVILIAN = 'civilian'
}

/** 科技状态 */
export enum TechStatus {
  LOCKED = 'locked',
  AVAILABLE = 'available',
  RESEARCHING = 'researching',
  COMPLETED = 'completed'
}

/** 科技配置 */
export interface TechnologyConfig {
  id: string
  name: string
  description: string
  branch: TechBranch
  level: number
  essenceCost: number
  prerequisites: string[]
  unlockTime: number
  unlocks: string[]
  effects: TechEffect[]
}

/** 科技效果 */
export interface TechEffect {
  type: 'efficiency' | 'unlock' | 'bonus' | 'capacity' | 'speed'
  target: string
  value: number
  description: string
}

/** 科技研究进度 */
export interface TechProgress {
  techId: string
  status: TechStatus
  progress: number
  startTime?: number
  completedTime?: number
}

/** 研究台配置 */
export interface ResearchStationConfig {
  id: string
  name: string
  level: number
  baseOutput: number
  workerSlots: number
  unlockTech?: string
}

/** 研究台状态 */
export interface ResearchStation {
  id: string
  configId: string
  level: number
  assignedWorkers: string[]
  isActive: boolean
  efficiency: number
  createdAt: number
}

/** 科技点来源 */
export interface TechPointSource {
  type: 'research_station' | 'boss_essence' | 'scroll' | 'task'
  amount: number
  timestamp: number
}

/** 科技系统状态 */
export interface TechnologySystemState {
  points: number
  totalEarned: number
  totalSpent: number
  completedTechs: string[]
  researchingTech: string | null
  researchProgress: number
  researchStations: ResearchStation[]
  pointHistory: TechPointSource[]
}

/** 研究结果 */
export interface ResearchResult {
  success: boolean
  message?: string
  techId?: string
  pointsSpent?: number
}

/** 科技解锁检查结果 */
export interface TechUnlockCheck {
  canUnlock: boolean
  missingPrerequisites: string[]
  missingPoints: number
}
