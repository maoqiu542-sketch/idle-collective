import { Character, ProfessionType } from '@app-types/character.types'
import { Task, TaskType, TaskPriority, TaskStatus } from '@app-types/priority.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

export interface WorldState {
  resources: Record<string, number>
  threats: Array<{ id: string; severity: number }>
  opportunities: Array<{ id: string; type: string; value: number }>
  timeOfDay: number
  weather: string
}

const PROFESSION_PREFERENCES: Record<ProfessionType, TaskType[]> = {
  [ProfessionType.GATHERER]: [TaskType.GATHER, TaskType.HAUL],
  [ProfessionType.BUILDER]: [TaskType.BUILD, TaskType.CONSTRUCT],
  [ProfessionType.FARMER]: [TaskType.GROW, TaskType.HARVEST],
  [ProfessionType.WARRIOR]: [TaskType.COMBAT, TaskType.GUARD],
}

export class DecisionMaker {
  private logger: Logger

  constructor(_eventBus: EventBus) {
    this.logger = new Logger('DecisionMaker')
  }

  decide(character: Character, tasks: Task[], worldState: WorldState): Task | null {
    const scoredTasks = tasks
      .filter(task => task.status === TaskStatus.PENDING)
      .map(task => ({
        task,
        score: this.scoreTask(character, task, worldState)
      }))
      .sort((a, b) => b.score - a.score)

    if (scoredTasks.length === 0) {
      return null
    }

    const best = scoredTasks[0]
    this.logger.debug(
      `Character ${character.id} chose task ${best.task.id} with score ${best.score.toFixed(2)}`
    )

    return best.task
  }

  private scoreTask(character: Character, task: Task, worldState: WorldState): number {
    let score = 0

    score += this.scoreByPriority(task)
    score += this.scoreByProfession(character, task)
    score += this.scoreByNeeds(character, task)
    score += this.scoreByDistance(character, task)
    score += this.scoreByWorldState(task, worldState)

    return score
  }

  private scoreByPriority(task: Task): number {
    const priorityScores: Record<TaskPriority, number> = {
      [TaskPriority.CRITICAL]: 100,
      [TaskPriority.HIGH]: 50,
      [TaskPriority.NORMAL]: 25,
      [TaskPriority.LOW]: 10,
    }
    return priorityScores[task.priority] || 25
  }

  private scoreByProfession(character: Character, task: Task): number {
    const preferences = PROFESSION_PREFERENCES[character.profession] || []
    return preferences.includes(task.type) ? 30 : 0
  }

  private scoreByNeeds(character: Character, task: Task): number {
    const needs = character.needs
    if (!needs) return 0

    let score = 0

    if (task.type === TaskType.EAT && needs.hunger !== undefined && needs.hunger < 50) {
      score += (50 - needs.hunger) * 2
    }

    if (task.type === TaskType.REST && needs.energy !== undefined && needs.energy < 50) {
      score += (50 - needs.energy) * 1.5
    }

    if (task.type === TaskType.SOCIALIZE && needs.social !== undefined && needs.social < 30) {
      score += (30 - needs.social)
    }

    return score
  }

  private scoreByDistance(character: Character, task: Task): number {
    if (!task.targetPosition) return 0

    const dx = task.targetPosition.x - character.position.x
    const dy = task.targetPosition.y - character.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    return Math.max(0, 50 - distance)
  }

  private scoreByWorldState(task: Task, worldState: WorldState): number {
    let score = 0

    if (task.type === TaskType.GATHER) {
      const totalResources = Object.values(worldState.resources).reduce((a: number, b: number) => a + b, 0)
      if (totalResources < 100) {
        score += 20
      }
    }

    if (task.type === TaskType.COMBAT && worldState.threats.length > 0) {
      const maxSeverity = Math.max(...worldState.threats.map(t => t.severity))
      score += maxSeverity * 10
    }

    return score
  }

  shouldInterrupt(currentTask: Task, newTask: Task): boolean {
    if (newTask.priority === TaskPriority.CRITICAL) {
      return true
    }

    if (currentTask.priority === TaskPriority.CRITICAL) {
      return false
    }

    return newTask.priority > currentTask.priority
  }

  getTaskDescription(task: Task): string {
    const baseUtility = task.utility
    return `TaskType.${task.type}: base=${baseUtility.toFixed(1)}, priority=${task.priority}`
  }
}
