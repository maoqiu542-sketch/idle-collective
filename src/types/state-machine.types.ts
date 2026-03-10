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
      CharacterState.RESTING,
      CharacterState.EATING,
    ],
    animation: 'idle',
  },
  [CharacterState.MOVING]: {
    name: CharacterState.MOVING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.WORKING],
    animation: 'walk',
  },
  [CharacterState.WORKING]: {
    name: CharacterState.WORKING,
    allowedTransitions: [CharacterState.IDLE, CharacterState.RESTING],
    animation: 'work',
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
}

export const STATE_DISPLAY_NAMES: Record<CharacterState, string> = {
  [CharacterState.IDLE]: '空闲',
  [CharacterState.MOVING]: '移动中',
  [CharacterState.WORKING]: '工作中',
  [CharacterState.RESTING]: '休息中',
  [CharacterState.EATING]: '进食中',
}

export const STATE_ICONS: Record<CharacterState, string> = {
  [CharacterState.IDLE]: '💤',
  [CharacterState.MOVING]: '🚶',
  [CharacterState.WORKING]: '⚒️',
  [CharacterState.RESTING]: '😴',
  [CharacterState.EATING]: '🍽️',
}

export const STATE_COLORS: Record<CharacterState, string> = {
  [CharacterState.IDLE]: '#888888',
  [CharacterState.MOVING]: '#60A5FA',
  [CharacterState.WORKING]: '#FBBF24',
  [CharacterState.RESTING]: '#A78BFA',
  [CharacterState.EATING]: '#34D399',
}
