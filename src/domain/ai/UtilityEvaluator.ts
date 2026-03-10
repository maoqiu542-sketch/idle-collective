import { Character } from '@app-types/character.types'
import { Task, TaskType, TaskPriority } from '@app-types/priority.types'
import { Logger } from '@utils/logger'
import { WorldState } from './DecisionMaker'

export interface UtilityFactors {
  base: number
  priority: number
  distance: number
  need: number
  personality: number
  worldState: number
}

export class UtilityEvaluator {
  private logger: Logger

  private readonly taskBaseUtilities: Partial<Record<TaskType, number>> = {
    [TaskType.MOVE]: 10,
    [TaskType.GATHER]: 30,
    [TaskType.BUILD]: 25,
    [TaskType.CRAFT]: 20,
    [TaskType.REST]: 15,
    [TaskType.EAT]: 20,
    [TaskType.SOCIALIZE]: 12,
    [TaskType.WORK]: 35,
    [TaskType.COMBAT]: 40,
  }

  constructor() {
    this.logger = new Logger('UtilityEvaluator')
  }

  evaluate(character: Character, task: Task, worldState: WorldState): number {
    const factors = this.calculateFactors(character, task, worldState)
    
    const utility = 
      factors.base * 
      factors.priority * 
      factors.distance * 
      factors.need * 
      factors.personality * 
      factors.worldState

    this.logger.debug(
      `Task ${task.id} utility: ${utility.toFixed(2)} ` +
      `(base=${factors.base}, priority=${factors.priority.toFixed(2)}, ` +
      `distance=${factors.distance.toFixed(2)}, need=${factors.need.toFixed(2)}, ` +
      `personality=${factors.personality.toFixed(2)}, world=${factors.worldState.toFixed(2)})`
    )

    return utility
  }

  private calculateFactors(character: Character, task: Task, worldState: WorldState): UtilityFactors {
    return {
      base: this.calculateBaseUtility(task),
      priority: this.calculatePriorityFactor(task),
      distance: this.calculateDistanceFactor(character, task),
      need: this.calculateNeedFactor(character, task),
      personality: this.calculatePersonalityFactor(character, task),
      worldState: this.calculateWorldStateFactor(task, worldState)
    }
  }

  private calculateBaseUtility(task: Task): number {
    return this.taskBaseUtilities[task.type] || 10
  }

  private calculatePriorityFactor(task: Task): number {
    switch (task.priority) {
      case TaskPriority.CRITICAL:
        return 5.0
      case TaskPriority.HIGH:
        return 2.0
      case TaskPriority.NORMAL:
        return 1.0
      case TaskPriority.LOW:
        return 0.5
      default:
        return 1.0
    }
  }

  private calculateDistanceFactor(character: Character, task: Task): number {
    if (!task.targetPosition) return 1.0

    const dx = task.targetPosition.x - character.position.x
    const dy = task.targetPosition.y - character.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    const maxDistance = 100
    const factor = 1.0 - (distance / maxDistance) * 0.5

    return Math.max(factor, 0.1)
  }

  private calculateNeedFactor(character: Character, task: Task): number {
    const needs = character.needs
    if (!needs) return 1.0

    let factor = 1.0

    if (task.type === TaskType.EAT && needs.hunger !== undefined) {
      factor *= 1 + (100 - needs.hunger) / 50
    }

    if (task.type === TaskType.REST && needs.energy !== undefined) {
      factor *= 1 + (100 - needs.energy) / 50
    }

    if (task.type === TaskType.SOCIALIZE && needs.social !== undefined) {
      factor *= 1 + (100 - needs.social) / 100
    }

    return Math.min(factor, 4.0)
  }

  private calculatePersonalityFactor(character: Character, task: Task): number {
    const personality = character.personality
    if (!personality) return 1.0

    let factor = 1.0

    switch (task.type) {
      case TaskType.GATHER:
      case TaskType.WORK:
        factor *= 0.5 + (personality.diligence / 100)
        break
      case TaskType.BUILD:
        factor *= 0.5 + (personality.diligence / 100)
        break
      case TaskType.SOCIALIZE:
        factor *= 0.5 + (personality.extroversion / 100)
        break
      case TaskType.COMBAT:
        factor *= 0.5 + (personality.bravery / 100)
        break
      case TaskType.REST:
        factor *= 1.5 - (personality.diligence / 200)
        break
    }

    return Math.max(factor, 0.1)
  }

  private calculateWorldStateFactor(task: Task, worldState: WorldState): number {
    let factor = 1.0

    if (task.type === TaskType.GATHER) {
      const totalResources = Object.values(worldState.resources).reduce((a: number, b: number) => a + b, 0)
      if (totalResources < 100) {
        factor *= 1.5
      }
    }

    if (task.type === TaskType.COMBAT) {
      const threatCount = worldState.threats.length
      if (threatCount > 0) {
        factor *= 1 + threatCount * 0.2
      }
    }

    if (task.type === TaskType.GATHER || task.type === TaskType.WORK) {
      const opportunityCount = worldState.opportunities.length
      if (opportunityCount > 0) {
        const relevantOpportunity = worldState.opportunities.find((o: { type: string }) => 
          o.type === 'resource' || o.type === 'work'
        )
        if (relevantOpportunity) {
          factor *= 1 + relevantOpportunity.value / 100
        }
      }
    }

    return factor
  }

  evaluateMultiple(character: Character, tasks: Task[], worldState: WorldState): Array<{ task: Task; utility: number }> {
    return tasks.map(task => ({
      task,
      utility: this.evaluate(character, task, worldState)
    })).sort((a, b) => b.utility - a.utility)
  }

  getBestTask(character: Character, tasks: Task[], worldState: WorldState): Task | null {
    if (tasks.length === 0) return null

    const evaluated = this.evaluateMultiple(character, tasks, worldState)
    return evaluated[0].task
  }
}
