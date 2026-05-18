import { CharacterState } from './character.types'

export interface StateTransition {
  from: CharacterState
  to: CharacterState
  condition?: () => boolean
  onEnter?: () => void
  onExit?: () => void
}

export interface StateConfig {
  name: CharacterState
  allowedTransitions: CharacterState[]
  animation?: string
  duration?: number
}

export const STATE_CONFIGS: Record<CharacterState, StateConfig> = {
  [CharacterState.IDLE]: {
    name: CharacterState.IDLE,
    allowedTransitions: [
      CharacterState.MOVING,
      CharacterState.WORKING,
      CharacterState.GATHERING,
      CharacterState.RESTING,
      CharacterState.EATING,
    ],
    animation: 'idle',
  },
  [CharacterState.MOVING]: {
    name: CharacterState.MOVING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.WORKING, CharacterState.GATHERING],
    animation: 'walk',
  },
  [CharacterState.WORKING]: {
    name: CharacterState.WORKING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.RESTING],
    animation: 'work',
  },
  [CharacterState.GATHERING]: {
    name: CharacterState.GATHERING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.MOVING],
    animation: 'gather',
    duration: 30000,
  },
  [CharacterState.FARMING]: {
    name: CharacterState.FARMING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.MOVING],
    animation: 'farm',
    duration: 30000,
  },
  [CharacterState.HUNTING]: {
    name: CharacterState.HUNTING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.MOVING],
    animation: 'hunt',
    duration: 40000,
  },
  [CharacterState.BUILDING]: {
    name: CharacterState.BUILDING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.MOVING],
    animation: 'build',
    duration: 60000,
  },
  [CharacterState.CRAFTING]: {
    name: CharacterState.CRAFTING,
    allowedTransitions: [CharacterState.IDLE],
    animation: 'craft',
    duration: 45000,
  },
  [CharacterState.COOKING]: {
    name: CharacterState.COOKING,
    allowedTransitions: [CharacterState.IDLE],
    animation: 'cook',
    duration: 30000,
  },
  [CharacterState.HEALING]: {
    name: CharacterState.HEALING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.MOVING],
    animation: 'heal',
    duration: 20000,
  },
  [CharacterState.RESEARCHING]: {
    name: CharacterState.RESEARCHING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.RESTING],
    animation: 'research',
    duration: 120000,
  },
  [CharacterState.RESTING]: {
    name: CharacterState.RESTING,
    allowedTransitions: [CharacterState.IDLE],
    animation: 'rest',
  },
  [CharacterState.EATING]: {
    name: CharacterState.EATING,
    allowedTransitions: [CharacterState.IDLE],
    animation: 'eat',
  },
  [CharacterState.SLEEPING]: {
    name: CharacterState.SLEEPING,
    allowedTransitions: [CharacterState.IDLE],
    animation: 'sleep',
    duration: 28800000,
  },
  [CharacterState.FIGHTING]: {
    name: CharacterState.FIGHTING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.RESTING],
    animation: 'fight',
  },
  [CharacterState.SOCIALIZING]: {
    name: CharacterState.SOCIALIZING,
    allowedTransitions: [CharacterState.IDLE],
    animation: 'socialize',
    duration: 15000,
  },
}

export const STATE_DISPLAY_NAMES: Record<CharacterState, string> = {
  [CharacterState.IDLE]: '空闲',
  [CharacterState.MOVING]: '移动中',
  [CharacterState.WORKING]: '工作中',
  [CharacterState.GATHERING]: '采集中',
  [CharacterState.FARMING]: '耕种中',
  [CharacterState.HUNTING]: '狩猎中',
  [CharacterState.BUILDING]: '建造中',
  [CharacterState.CRAFTING]: '制作中',
  [CharacterState.COOKING]: '烹饪中',
  [CharacterState.HEALING]: '治疗中',
  [CharacterState.RESEARCHING]: '研究中',
  [CharacterState.RESTING]: '休息中',
  [CharacterState.EATING]: '进食中',
  [CharacterState.SLEEPING]: '睡眠中',
  [CharacterState.FIGHTING]: '战斗中',
  [CharacterState.SOCIALIZING]: '社交中',
}

export const STATE_ICONS: Record<CharacterState, string> = {
  [CharacterState.IDLE]: '💤',
  [CharacterState.MOVING]: '🚶',
  [CharacterState.WORKING]: '⚒️',
  [CharacterState.GATHERING]: '🪓',
  [CharacterState.FARMING]: '🌾',
  [CharacterState.HUNTING]: '🏹',
  [CharacterState.BUILDING]: '🔨',
  [CharacterState.CRAFTING]: '⚙️',
  [CharacterState.COOKING]: '🍳',
  [CharacterState.HEALING]: '💊',
  [CharacterState.RESEARCHING]: '📚',
  [CharacterState.RESTING]: '😴',
  [CharacterState.EATING]: '🍽️',
  [CharacterState.SLEEPING]: '🌙',
  [CharacterState.FIGHTING]: '⚔️',
  [CharacterState.SOCIALIZING]: '💬',
}

export const STATE_COLORS: Record<CharacterState, string> = {
  [CharacterState.IDLE]: '#888888',
  [CharacterState.MOVING]: '#60A5FA',
  [CharacterState.WORKING]: '#FBBF24',
  [CharacterState.GATHERING]: '#10B981',
  [CharacterState.FARMING]: '#84CC16',
  [CharacterState.HUNTING]: '#F97316',
  [CharacterState.BUILDING]: '#F59E0B',
  [CharacterState.CRAFTING]: '#6366F1',
  [CharacterState.COOKING]: '#EC4899',
  [CharacterState.HEALING]: '#14B8A6',
  [CharacterState.RESEARCHING]: '#8B5CF6',
  [CharacterState.RESTING]: '#A78BFA',
  [CharacterState.EATING]: '#34D399',
  [CharacterState.SLEEPING]: '#7C3AED',
  [CharacterState.FIGHTING]: '#EF4444',
  [CharacterState.SOCIALIZING]: '#F472B6',
}
