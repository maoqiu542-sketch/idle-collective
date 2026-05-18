import { ProfessionType, CharacterState } from './character.types'

export type FloatAnimationType =
  | 'research'
  | 'build'
  | 'gather'
  | 'farm'
  | 'fight'
  | 'idle'
  | 'sleep'
  | 'cook'
  | 'heal'

export interface WorkerSnapshot {
  id: string
  name: string
  profession: ProfessionType
  state: CharacterState
  currentTask?: string
  progress?: number
  assetPath?: string
}

export interface FloatSnapshot {
  settlementLivability: number
  settlementDevelopment: number
  gold: number
  workers: WorkerSnapshot[]
}

export function mapStateToAnimationType(state: CharacterState): FloatAnimationType {
  switch (state) {
    case CharacterState.RESEARCHING:
      return 'research'
    case CharacterState.BUILDING:
    case CharacterState.CRAFTING:
      return 'build'
    case CharacterState.GATHERING:
    case CharacterState.HUNTING:
      return 'gather'
    case CharacterState.FARMING:
      return 'farm'
    case CharacterState.FIGHTING:
      return 'fight'
    case CharacterState.SLEEPING:
      return 'sleep'
    case CharacterState.COOKING:
      return 'cook'
    case CharacterState.HEALING:
      return 'heal'
    case CharacterState.WORKING:
      return 'build'
    case CharacterState.IDLE:
    case CharacterState.RESTING:
    case CharacterState.EATING:
    case CharacterState.SOCIALIZING:
    case CharacterState.MOVING:
    default:
      return 'idle'
  }
}

export const ANIMATION_LABELS: Record<FloatAnimationType, string> = {
  research: '研究',
  build: '建造',
  gather: '采集',
  farm: '农耕',
  fight: '战斗',
  idle: '空闲',
  sleep: '睡眠',
  cook: '烹饪',
  heal: '治疗',
}

const WORKING_STATES = new Set<CharacterState>([
  CharacterState.RESEARCHING,
  CharacterState.BUILDING,
  CharacterState.CRAFTING,
  CharacterState.GATHERING,
  CharacterState.HUNTING,
  CharacterState.FARMING,
  CharacterState.FIGHTING,
  CharacterState.COOKING,
  CharacterState.HEALING,
  CharacterState.WORKING,
])

export function sortWorkers(workers: WorkerSnapshot[]): WorkerSnapshot[] {
  return [...workers].sort((a, b) => {
    const aWorking = WORKING_STATES.has(a.state)
    const bWorking = WORKING_STATES.has(b.state)
    if (aWorking && !bWorking) return -1
    if (!aWorking && bWorking) return 1
    return 0
  })
}

export const MAX_VISIBLE_WORKERS = 4
