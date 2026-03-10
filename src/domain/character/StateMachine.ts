import { CharacterState } from '@app-types/character.types'
import { STATE_CONFIGS, StateConfig } from '@app-types/state-machine.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

export class StateMachine {
  private currentState: CharacterState
  private previousState: CharacterState | null = null
  private eventBus: EventBus
  private logger: Logger
  private transitionCooldown: number = 0
  private readonly COOLDOWN_DURATION: number = 500
  private onStateEnter?: (state: CharacterState) => void
  private onStateExit?: (state: CharacterState) => void

  constructor(
    initialState: CharacterState,
    eventBus: EventBus,
    callbacks?: {
      onEnter?: (state: CharacterState) => void
      onExit?: (state: CharacterState) => void
    }
  ) {
    this.currentState = initialState
    this.eventBus = eventBus
    this.logger = new Logger('StateMachine')
    this.onStateEnter = callbacks?.onEnter
    this.onStateExit = callbacks?.onExit
  }

  canTransitionTo(targetState: CharacterState): boolean {
    if (this.transitionCooldown > 0) {
      this.logger.debug(`Transition blocked by cooldown: ${this.transitionCooldown}ms remaining`)
      return false
    }

    const config = STATE_CONFIGS[this.currentState]
    if (!config) {
      this.logger.error(`No config found for state: ${this.currentState}`)
      return false
    }

    return config.allowedTransitions.includes(targetState)
  }

  transition(targetState: CharacterState, force: boolean = false): boolean {
    if (!force && !this.canTransitionTo(targetState)) {
      this.logger.warn(`Invalid transition: ${this.currentState} -> ${targetState}`)
      return false
    }

    const fromState = this.currentState
    const toState = targetState

    if (this.onStateExit) {
      this.onStateExit(fromState)
    }

    this.previousState = fromState
    this.currentState = toState
    this.transitionCooldown = this.COOLDOWN_DURATION

    if (this.onStateEnter) {
      this.onStateEnter(toState)
    }

    this.eventBus.emit('state-machine:transition', {
      from: fromState,
      to: toState,
      timestamp: Date.now(),
    })

    this.logger.info(`State transition: ${fromState} -> ${toState}`)
    return true
  }

  update(deltaTime: number): void {
    if (this.transitionCooldown > 0) {
      this.transitionCooldown = Math.max(0, this.transitionCooldown - deltaTime)
    }
  }

  getState(): CharacterState {
    return this.currentState
  }

  getPreviousState(): CharacterState | null {
    return this.previousState
  }

  getStateConfig(): StateConfig {
    return STATE_CONFIGS[this.currentState]
  }

  getAvailableTransitions(): CharacterState[] {
    const config = STATE_CONFIGS[this.currentState]
    return config ? [...config.allowedTransitions] : []
  }

  forceState(state: CharacterState): void {
    this.previousState = this.currentState
    this.currentState = state
    this.transitionCooldown = 0

    this.eventBus.emit('state-machine:forced', {
      from: this.previousState,
      to: state,
      timestamp: Date.now(),
    })
  }

  resetCooldown(): void {
    this.transitionCooldown = 0
  }

  isTransitioning(): boolean {
    return this.transitionCooldown > 0
  }
}

export class CharacterStateMachineManager {
  private stateMachines: Map<string, StateMachine> = new Map()
  private eventBus: EventBus
  private logger: Logger

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('CharacterStateMachineManager')
  }

  createStateMachine(characterId: string, initialState: CharacterState = CharacterState.IDLE): StateMachine {
    const stateMachine = new StateMachine(initialState, this.eventBus, {
      onEnter: (state) => {
        this.eventBus.emit('character:state-enter', { characterId, state })
      },
      onExit: (state) => {
        this.eventBus.emit('character:state-exit', { characterId, state })
      },
    })

    this.stateMachines.set(characterId, stateMachine)
    return stateMachine
  }

  getStateMachine(characterId: string): StateMachine | undefined {
    return this.stateMachines.get(characterId)
  }

  removeStateMachine(characterId: string): boolean {
    return this.stateMachines.delete(characterId)
  }

  transition(characterId: string, targetState: CharacterState): boolean {
    const stateMachine = this.stateMachines.get(characterId)
    if (!stateMachine) {
      this.logger.warn(`No state machine found for character: ${characterId}`)
      return false
    }

    return stateMachine.transition(targetState)
  }

  getState(characterId: string): CharacterState | undefined {
    const stateMachine = this.stateMachines.get(characterId)
    return stateMachine?.getState()
  }

  update(deltaTime: number): void {
    for (const stateMachine of this.stateMachines.values()) {
      stateMachine.update(deltaTime)
    }
  }

  getAllStates(): Map<string, CharacterState> {
    const states = new Map<string, CharacterState>()
    for (const [id, sm] of this.stateMachines) {
      states.set(id, sm.getState())
    }
    return states
  }
}
