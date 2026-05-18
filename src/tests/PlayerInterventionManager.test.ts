import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '@core/EventBus'
import { PlayerInterventionManager } from '@domain/intervention/PlayerInterventionManager'
import { TaskType } from '@app-types/priority.types'
import { DEFAULT_TASK_PRIORITIES } from '@app-types/task-priority.types'

describe('PlayerInterventionManager', () => {
  let eventBus: EventBus
  let manager: PlayerInterventionManager

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    eventBus = new EventBus()
    manager = new PlayerInterventionManager(eventBus)
    manager.initCharacter('char-1')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize default task priorities for a character', () => {
    const priorities = manager.getCharacterPriorities('char-1')

    expect(priorities).toBeDefined()
    expect(priorities?.priorities.get(TaskType.GATHER)).toBe(DEFAULT_TASK_PRIORITIES[TaskType.GATHER])
    expect(priorities?.disabledTasks).toHaveLength(0)
    expect(priorities?.forcedTask).toBeNull()
  })

  it('should allow manual priority edits and disable/enable task types', () => {
    expect(manager.setTaskPriority('char-1', TaskType.BUILD, 1)).toBe(true)
    expect(manager.getTaskPriority('char-1', TaskType.BUILD)).toBe(1)

    expect(manager.disableTask('char-1', TaskType.BUILD)).toBe(true)
    expect(manager.isTaskDisabled('char-1', TaskType.BUILD)).toBe(true)

    expect(manager.enableTask('char-1', TaskType.BUILD)).toBe(true)
    expect(manager.isTaskDisabled('char-1', TaskType.BUILD)).toBe(false)
  })

  it('should support forced tasks and expire them after the timeout', () => {
    expect(manager.forceTask('char-1', TaskType.GATHER, { x: 3, y: 4 })).toBe(true)

    const forced = manager.getForcedTask('char-1')
    expect(forced?.type).toBe(TaskType.GATHER)
    expect(forced?.targetPosition).toEqual({ x: 3, y: 4 })

    vi.advanceTimersByTime(30001)

    expect(manager.getForcedTask('char-1')).toBeNull()
  })

  it('should reset to defaults and preserve roundtrip serialization', () => {
    manager.setTaskPriority('char-1', TaskType.CRAFT, 1)
    manager.disableTask('char-1', TaskType.CRAFT)
    manager.forceTask('char-1', TaskType.CRAFT)

    manager.resetToDefault('char-1')
    const reset = manager.getCharacterPriorities('char-1')

    expect(reset?.disabledTasks).toHaveLength(0)
    expect(reset?.forcedTask).toBeNull()
    expect(reset?.priorities.get(TaskType.CRAFT)).toBe(DEFAULT_TASK_PRIORITIES[TaskType.CRAFT])

    const snapshot = manager.serialize()
    const restored = new PlayerInterventionManager(eventBus)
    restored.deserialize(snapshot)

    expect(restored.getTaskPriority('char-1', TaskType.GATHER)).toBe(DEFAULT_TASK_PRIORITIES[TaskType.GATHER])
  })
})
