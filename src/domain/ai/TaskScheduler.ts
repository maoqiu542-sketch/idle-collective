/**
 * @deprecated Not connected to the main AI pipeline (AISystem.ts).
 * All task scheduling is handled internally by AISystem.
 * Kept for reference; do not import into new code.
 */
import { Character } from '@app-types/character.types'
import { Task, TaskStatus, TaskPriority, TaskType } from '@app-types/priority.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

export interface ScheduledTask {
  task: Task
  characterId: string
  startTime: number
  endTime: number
  progress: number
}

export class TaskScheduler {
  private eventBus: EventBus
  private logger: Logger
  private scheduledTasks: Map<string, ScheduledTask> = new Map()
  private taskQueue: Map<string, Task[]> = new Map()

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('TaskScheduler')
  }

  scheduleTask(character: Character, task: Task): boolean {
    if (task.status !== TaskStatus.PENDING) {
      this.logger.warn(`Cannot schedule task ${task.id} with status ${task.status}`)
      return false
    }

    const estimatedDuration = this.estimateTaskDuration(character, task)
    const now = Date.now()

    const scheduledTask: ScheduledTask = {
      task,
      characterId: character.id,
      startTime: now,
      endTime: now + estimatedDuration,
      progress: 0
    }

    this.scheduledTasks.set(task.id, scheduledTask)
    task.status = TaskStatus.IN_PROGRESS

    if (!this.taskQueue.has(character.id)) {
      this.taskQueue.set(character.id, [])
    }
    this.taskQueue.get(character.id)!.push(task)

    this.eventBus.emit('task:started', {
      characterId: character.id,
      taskId: task.id,
      taskType: task.type,
      estimatedDuration
    })

    this.logger.debug(`Scheduled task ${task.id} for character ${character.id}`)
    return true
  }

  update(_deltaTime: number): void {
    const now = Date.now()

    for (const [taskId, scheduled] of this.scheduledTasks) {
      const elapsed = now - scheduled.startTime
      const totalDuration = scheduled.endTime - scheduled.startTime
      scheduled.progress = Math.min(elapsed / totalDuration, 1.0)

      if (scheduled.progress >= 1.0) {
        this.completeScheduledTask(taskId)
      }
    }
  }

  private completeScheduledTask(taskId: string): void {
    const scheduled = this.scheduledTasks.get(taskId)
    if (!scheduled) return

    scheduled.task.status = TaskStatus.COMPLETED
    this.scheduledTasks.delete(taskId)

    this.eventBus.emit('task:completed', {
      characterId: scheduled.characterId,
      taskId: scheduled.task.id,
      taskType: scheduled.task.type
    })

    this.logger.debug(`Completed scheduled task ${taskId}`)
  }

  cancelTask(taskId: string): boolean {
    const scheduled = this.scheduledTasks.get(taskId)
    if (!scheduled) return false

    scheduled.task.status = TaskStatus.CANCELLED
    this.scheduledTasks.delete(taskId)

    const characterTasks = this.taskQueue.get(scheduled.characterId)
    if (characterTasks) {
      const index = characterTasks.findIndex(t => t.id === taskId)
      if (index !== -1) {
        characterTasks.splice(index, 1)
      }
    }

    this.eventBus.emit('task:cancelled', {
      characterId: scheduled.characterId,
      taskId
    })

    this.logger.debug(`Cancelled task ${taskId}`)
    return true
  }

  getCharacterTasks(characterId: string): Task[] {
    return this.taskQueue.get(characterId) || []
  }

  getCurrentTask(characterId: string): Task | null {
    const tasks = this.taskQueue.get(characterId)
    if (!tasks || tasks.length === 0) return null

    return tasks.find(t => t.status === TaskStatus.IN_PROGRESS) || null
  }

  getTaskProgress(taskId: string): number {
    const scheduled = this.scheduledTasks.get(taskId)
    return scheduled?.progress || 0
  }

  prioritizeTask(characterId: string, taskId: string, priority: TaskPriority): boolean {
    const tasks = this.taskQueue.get(characterId)
    if (!tasks) return false

    const task = tasks.find(t => t.id === taskId)
    if (!task) return false

    task.priority = priority
    tasks.sort((a, b) => b.priority - a.priority)

    this.logger.debug(`Updated task ${taskId} priority to ${priority}`)
    return true
  }

  private estimateTaskDuration(character: Character, task: Task): number {
    const baseDuration = 5000

    const speedMultiplier = character.stats?.speed || 1.0

    let taskMultiplier = 1.0
    switch (task.type) {
      case TaskType.MOVE:
        taskMultiplier = 2.0
        break
      case TaskType.GATHER:
        taskMultiplier = 3.0
        break
      case TaskType.BUILD:
        taskMultiplier = 5.0
        break
      case TaskType.CRAFT:
        taskMultiplier = 4.0
        break
      case TaskType.REST:
        taskMultiplier = 2.0
        break
      case TaskType.EAT:
        taskMultiplier = 1.0
        break
      case TaskType.COMBAT:
        taskMultiplier = 3.0
        break
    }

    return Math.floor(baseDuration * taskMultiplier / speedMultiplier)
  }

  clearCharacterTasks(characterId: string): void {
    const tasks = this.taskQueue.get(characterId) || []
    for (const task of tasks) {
      this.scheduledTasks.delete(task.id)
    }
    this.taskQueue.delete(characterId)
    this.logger.debug(`Cleared all tasks for character ${characterId}`)
  }
}
