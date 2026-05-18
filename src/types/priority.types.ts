import { Position } from './map.types'

export enum NeedType {
  HUNGER = 'hunger',
  REST = 'rest',
  SAFETY = 'safety',
  COMFORT = 'comfort',
  JOY = 'joy',
  BEAUTY = 'beauty',
  OUTDOORS = 'outdoors',
  SOCIAL = 'social',
  PRIVACY = 'privacy',
  SPACE = 'space',
}

export enum TaskType {
  MOVE = 'move',
  GATHER = 'gather',
  BUILD = 'build',
  CRAFT = 'craft',
  REST = 'rest',
  EAT = 'eat',
  SOCIALIZE = 'socialize',
  WORK = 'work',
  COMBAT = 'combat',
  FIREFIGHT = 'firefight',
  PATIENT = 'patient',
  RESCUE = 'rescue',
  SLEEP = 'sleep',
  DOCTOR = 'doctor',
  CONSTRUCT = 'construct',
  GROW = 'grow',
  MINE = 'mine',
  HAUL = 'haul',
  CLEAN = 'clean',
  HARVEST = 'harvest',
  JOY = 'joy',
  SOCIAL = 'social',
  MEDITATE = 'meditate',
  GUARD = 'guard',
  FARM = 'farm',
  HUNT = 'hunt',
  COOK = 'cook',
  HEAL = 'heal',
  RESEARCH = 'research',
}

export enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export interface Need {
  type: NeedType
  currentValue: number
  maxValue: number
  decayRate: number
  criticalThreshold: number
}

export interface Task {
  id: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  position: Position
  targetPosition?: Position
  targetId?: string
  assignedCharacterId?: string
  utility: number
  createdAt: number
  startedAt?: number
  completedAt?: number
}

export interface ActionResult {
  completed: boolean
  success?: boolean
  progress?: number
  error?: string
}

export interface Action {
  type: string
  target?: { position: Position }
  targetPosition?: Position
  update(deltaTime: number): ActionResult
  canExecute(): boolean
  interrupt(): void
}
