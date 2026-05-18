import { Task } from '@app-types/priority.types'

export enum TaskPhase {
  MOVING = 'moving',
  WORKING = 'working',
}

export interface ActiveTask {
  task: Task
  characterId: string
  startTime: number
  duration: number
  progress: number
  phase: TaskPhase
  moveDelay: number
  moveTimer: number
}
