import { describe, expect, it } from 'vitest'
import {
  mapStateToAnimationType,
  sortWorkers,
  ANIMATION_LABELS,
} from '@app-types/float.types'
import { CharacterState, ProfessionType } from '@app-types/character.types'
import type { WorkerSnapshot } from '@app-types/float.types'

describe('mapStateToAnimationType', () => {
  it('should map RESEARCHING to research', () => {
    expect(mapStateToAnimationType(CharacterState.RESEARCHING)).toBe('research')
  })

  it('should map BUILDING to build', () => {
    expect(mapStateToAnimationType(CharacterState.BUILDING)).toBe('build')
  })

  it('should map CRAFTING to build', () => {
    expect(mapStateToAnimationType(CharacterState.CRAFTING)).toBe('build')
  })

  it('should map GATHERING to gather', () => {
    expect(mapStateToAnimationType(CharacterState.GATHERING)).toBe('gather')
  })

  it('should map HUNTING to gather', () => {
    expect(mapStateToAnimationType(CharacterState.HUNTING)).toBe('gather')
  })

  it('should map FARMING to farm', () => {
    expect(mapStateToAnimationType(CharacterState.FARMING)).toBe('farm')
  })

  it('should map FIGHTING to fight', () => {
    expect(mapStateToAnimationType(CharacterState.FIGHTING)).toBe('fight')
  })

  it('should map SLEEPING to sleep', () => {
    expect(mapStateToAnimationType(CharacterState.SLEEPING)).toBe('sleep')
  })

  it('should map COOKING to cook', () => {
    expect(mapStateToAnimationType(CharacterState.COOKING)).toBe('cook')
  })

  it('should map HEALING to heal', () => {
    expect(mapStateToAnimationType(CharacterState.HEALING)).toBe('heal')
  })

  it('should map IDLE to idle', () => {
    expect(mapStateToAnimationType(CharacterState.IDLE)).toBe('idle')
  })

  it('should map RESTING to idle', () => {
    expect(mapStateToAnimationType(CharacterState.RESTING)).toBe('idle')
  })

  it('should map EATING to idle', () => {
    expect(mapStateToAnimationType(CharacterState.EATING)).toBe('idle')
  })

  it('should map SOCIALIZING to idle', () => {
    expect(mapStateToAnimationType(CharacterState.SOCIALIZING)).toBe('idle')
  })

  it('should map MOVING to idle', () => {
    expect(mapStateToAnimationType(CharacterState.MOVING)).toBe('idle')
  })

  it('should have labels for all animation types', () => {
    const types = ['research', 'build', 'gather', 'farm', 'fight', 'idle', 'sleep', 'cook', 'heal'] as const
    for (const type of types) {
      expect(ANIMATION_LABELS[type]).toBeTruthy()
    }
  })
})

describe('sortWorkers', () => {
  function makeWorker(overrides: Partial<WorkerSnapshot> = {}): WorkerSnapshot {
    return {
      id: 'w1',
      name: 'Test',
      profession: ProfessionType.FARMER,
      state: CharacterState.IDLE,
      ...overrides,
    }
  }

  it('should place working characters before idle ones', () => {
    const workers: WorkerSnapshot[] = [
      makeWorker({ id: '1', name: 'Idle1', state: CharacterState.IDLE }),
      makeWorker({ id: '2', name: 'Working', state: CharacterState.FARMING }),
      makeWorker({ id: '3', name: 'Idle2', state: CharacterState.RESTING }),
    ]

    const sorted = sortWorkers(workers)
    expect(sorted[0].id).toBe('2')
    expect(sorted[0].state).toBe(CharacterState.FARMING)
  })

  it('should place working before sleeping', () => {
    const workers: WorkerSnapshot[] = [
      makeWorker({ id: '1', name: 'Sleepy', state: CharacterState.SLEEPING }),
      makeWorker({ id: '2', name: 'Builder', state: CharacterState.BUILDING }),
    ]

    const sorted = sortWorkers(workers)
    expect(sorted[0].id).toBe('2')
  })

  it('should keep stable order among same category', () => {
    const workers: WorkerSnapshot[] = [
      makeWorker({ id: '1', name: 'W1', state: CharacterState.RESEARCHING }),
      makeWorker({ id: '2', name: 'W2', state: CharacterState.FARMING }),
      makeWorker({ id: '3', name: 'W3', state: CharacterState.BUILDING }),
    ]

    const sorted = sortWorkers(workers)
    const workingIds = sorted.map(w => w.id)
    expect(workingIds).toEqual(['1', '2', '3'])
  })

  it('should place fighting as working (prioritized)', () => {
    const workers: WorkerSnapshot[] = [
      makeWorker({ id: '1', name: 'Idle', state: CharacterState.IDLE }),
      makeWorker({ id: '2', name: 'Fighter', state: CharacterState.FIGHTING }),
    ]

    const sorted = sortWorkers(workers)
    expect(sorted[0].id).toBe('2')
  })

  it('should handle empty array', () => {
    expect(sortWorkers([])).toEqual([])
  })

  it('should handle single worker', () => {
    const workers = [makeWorker({ id: 'only', state: CharacterState.IDLE })]
    expect(sortWorkers(workers)).toEqual(workers)
  })

  it('should keep all idle workers after all working ones', () => {
    const workers: WorkerSnapshot[] = [
      makeWorker({ id: '1', state: CharacterState.EATING }),
      makeWorker({ id: '2', state: CharacterState.HUNTING }),
      makeWorker({ id: '3', state: CharacterState.SOCIALIZING }),
      makeWorker({ id: '4', state: CharacterState.RESEARCHING }),
      makeWorker({ id: '5', state: CharacterState.SLEEPING }),
    ]

    const sorted = sortWorkers(workers)
    const states = sorted.map(w => w.state)
    const firstNonWorkingIdx = states.findIndex(
      s => s === CharacterState.IDLE || s === CharacterState.SLEEPING || s === CharacterState.RESTING
    )
    const before = states.slice(0, firstNonWorkingIdx)
    const after = states.slice(firstNonWorkingIdx)
    for (const s of before) {
      expect([CharacterState.IDLE, CharacterState.SLEEPING, CharacterState.RESTING]).not.toContain(s)
    }
    for (const s of after) {
      expect([
        CharacterState.IDLE,
        CharacterState.SLEEPING,
        CharacterState.RESTING,
        CharacterState.EATING,
        CharacterState.SOCIALIZING,
        CharacterState.MOVING,
      ]).toContain(s)
    }
  })
})

describe('FloatSnapshot structure', () => {
  it('should include required fields', () => {
    const snapshot = {
      settlementLivability: 42,
      settlementDevelopment: 38,
      gold: 250,
      workers: [],
    }

    expect(typeof snapshot.settlementLivability).toBe('number')
    expect(typeof snapshot.settlementDevelopment).toBe('number')
    expect(typeof snapshot.gold).toBe('number')
    expect(Array.isArray(snapshot.workers)).toBe(true)
  })

  it('worker snapshot should have required fields', () => {
    const worker: WorkerSnapshot = {
      id: 'char_1',
      name: '农夫1',
      profession: ProfessionType.FARMER,
      state: CharacterState.FARMING,
      currentTask: 'harvest_crops',
      progress: 45,
    }

    expect(typeof worker.id).toBe('string')
    expect(typeof worker.name).toBe('string')
    expect(typeof worker.profession).toBe('string')
    expect(typeof worker.state).toBe('string')
    expect(worker.currentTask).toBeDefined()
    expect(worker.progress).toBeDefined()
  })
})
