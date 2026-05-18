import { TaskType } from './priority.types'

export type TaskPriorityLevel = 1 | 2 | 3 | 4 | 5

export interface CharacterTaskPriority {
  characterId: string
  priorities: Map<TaskType, TaskPriorityLevel>
  disabledTasks: TaskType[]
  forcedTask: {
    type: TaskType
    targetPosition?: { x: number; y: number }
    expiresAt: number
  } | null
}

export interface TaskPriorityConfig {
  defaultPriorities: Record<TaskType, TaskPriorityLevel>
}

export const DEFAULT_TASK_PRIORITIES: Partial<Record<TaskType, TaskPriorityLevel>> = {
  [TaskType.GATHER]: 1,
  [TaskType.BUILD]: 2,
  [TaskType.CRAFT]: 3,
  [TaskType.REST]: 4,
  [TaskType.EAT]: 5,
  [TaskType.SOCIALIZE]: 5,
  [TaskType.WORK]: 2,
  [TaskType.COMBAT]: 3,
}

export const TASK_PRIORITY_LABELS: Partial<Record<TaskType, string>> = {
  [TaskType.GATHER]: '采集资源',
  [TaskType.BUILD]: '建造',
  [TaskType.CRAFT]: '制作',
  [TaskType.REST]: '休息',
  [TaskType.EAT]: '进食',
  [TaskType.SOCIALIZE]: '社交',
  [TaskType.WORK]: '工作',
  [TaskType.COMBAT]: '战斗',
}

export const TASK_PRIORITY_ICONS: Partial<Record<TaskType, string>> = {
  [TaskType.GATHER]: '🪓',
  [TaskType.BUILD]: '🔨',
  [TaskType.CRAFT]: '⚒️',
  [TaskType.REST]: '😴',
  [TaskType.EAT]: '🍖',
  [TaskType.SOCIALIZE]: '💬',
  [TaskType.WORK]: '⚙️',
  [TaskType.COMBAT]: '⚔️',
}
