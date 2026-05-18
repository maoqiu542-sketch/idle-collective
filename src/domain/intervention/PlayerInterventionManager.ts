import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'
import { TaskType } from '@app-types/priority.types'
import {
  CharacterTaskPriority,
  TaskPriorityLevel,
  DEFAULT_TASK_PRIORITIES,
} from '@app-types/task-priority.types'

const FORCED_TASK_DURATION = 30000

export class PlayerInterventionManager {
  private eventBus: EventBus
  private logger: Logger
  private characterPriorities: Map<string, CharacterTaskPriority> = new Map()

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('PlayerIntervention')
  }

  initCharacter(characterId: string): void {
    const priorities = new Map<TaskType, TaskPriorityLevel>()
    Object.entries(DEFAULT_TASK_PRIORITIES).forEach(([task, level]) => {
      priorities.set(task as TaskType, level as TaskPriorityLevel)
    })

    this.characterPriorities.set(characterId, {
      characterId,
      priorities,
      disabledTasks: [],
      forcedTask: null,
    })
  }

  setTaskPriority(characterId: string, taskType: TaskType, level: TaskPriorityLevel): boolean {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) {
      this.logger.warn(`Character ${characterId} not initialized`)
      return false
    }

    charPriority.priorities.set(taskType, level)

    this.eventBus.emit('task:priority-changed', {
      characterId,
      taskType,
      newLevel: level,
    })

    this.logger.debug(`Set ${taskType} priority to ${level} for character ${characterId}`)
    return true
  }

  setAllPriorities(characterId: string, priorities: Map<TaskType, TaskPriorityLevel>): boolean {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) return false

    priorities.forEach((level, task) => {
      charPriority.priorities.set(task, level)
    })

    this.eventBus.emit('task:priorities-updated', {
      characterId,
      priorities: Array.from(priorities.entries()),
    })

    return true
  }

  disableTask(characterId: string, taskType: TaskType): boolean {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) return false

    if (!charPriority.disabledTasks.includes(taskType)) {
      charPriority.disabledTasks.push(taskType)
      this.eventBus.emit('task:disabled', { characterId, taskType })
    }

    return true
  }

  enableTask(characterId: string, taskType: TaskType): boolean {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) return false

    const index = charPriority.disabledTasks.indexOf(taskType)
    if (index > -1) {
      charPriority.disabledTasks.splice(index, 1)
      this.eventBus.emit('task:enabled', { characterId, taskType })
    }

    return true
  }

  forceTask(
    characterId: string,
    taskType: TaskType,
    targetPosition?: { x: number; y: number }
  ): boolean {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) return false

    charPriority.forcedTask = {
      type: taskType,
      targetPosition,
      expiresAt: Date.now() + FORCED_TASK_DURATION,
    }

    this.eventBus.emit('task:forced', {
      characterId,
      taskType,
      targetPosition,
      duration: FORCED_TASK_DURATION,
    })

    this.logger.info(`Forced task ${taskType} for character ${characterId}`)
    return true
  }

  cancelForcedTask(characterId: string): boolean {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority || !charPriority.forcedTask) return false

    charPriority.forcedTask = null

    this.eventBus.emit('task:force-cancelled', { characterId })
    return true
  }

  getForcedTask(characterId: string): CharacterTaskPriority['forcedTask'] {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority || !charPriority.forcedTask) return null

    if (Date.now() > charPriority.forcedTask.expiresAt) {
      charPriority.forcedTask = null
      return null
    }

    return charPriority.forcedTask
  }

  isTaskDisabled(characterId: string, taskType: TaskType): boolean {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) return false
    return charPriority.disabledTasks.includes(taskType)
  }

  getTaskPriority(characterId: string, taskType: TaskType): TaskPriorityLevel {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) return DEFAULT_TASK_PRIORITIES[taskType] || 3
    return charPriority.priorities.get(taskType) || 3
  }

  getCharacterPriorities(characterId: string): CharacterTaskPriority | undefined {
    return this.characterPriorities.get(characterId)
  }

  getAllPriorities(): Map<string, CharacterTaskPriority> {
    return new Map(this.characterPriorities)
  }

  getAvailableTasks(characterId: string): TaskType[] {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) return Object.values(TaskType)

    return Object.values(TaskType).filter(
      task => !charPriority.disabledTasks.includes(task)
    )
  }

  resetToDefault(characterId: string): void {
    const charPriority = this.characterPriorities.get(characterId)
    if (!charPriority) return

    Object.entries(DEFAULT_TASK_PRIORITIES).forEach(([task, level]) => {
      charPriority.priorities.set(task as TaskType, level as TaskPriorityLevel)
    })

    charPriority.disabledTasks = []
    charPriority.forcedTask = null

    this.eventBus.emit('task:priorities-reset', { characterId })
  }

  update(_deltaTime?: number): void {
    this.characterPriorities.forEach((charPriority, characterId) => {
      if (charPriority.forcedTask && Date.now() > charPriority.forcedTask.expiresAt) {
        charPriority.forcedTask = null
        this.eventBus.emit('task:force-expired', { characterId })
      }
    })
  }

  serialize(): Map<string, CharacterTaskPriority> {
    const serialized = new Map<string, CharacterTaskPriority>()
    this.characterPriorities.forEach((value, key) => {
      serialized.set(key, {
        ...value,
        priorities: new Map(value.priorities),
        disabledTasks: [...value.disabledTasks],
        forcedTask: value.forcedTask ? { ...value.forcedTask } : null,
      })
    })
    return serialized
  }

  deserialize(data: Map<string, CharacterTaskPriority>): void {
    this.characterPriorities.clear()
    data.forEach((value, key) => {
      this.characterPriorities.set(key, {
        ...value,
        priorities: new Map(value.priorities),
        disabledTasks: [...value.disabledTasks],
        forcedTask: value.forcedTask ? { ...value.forcedTask } : null,
      })
    })
  }
}
