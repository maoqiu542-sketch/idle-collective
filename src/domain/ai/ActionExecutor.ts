/**
 * @deprecated Not connected to the main AI pipeline (AISystem.ts).
 * All action execution is handled internally by AISystem.
 * Kept for reference; do not import into new code.
 */
import { Character, CharacterState } from '@app-types/character.types'
import { Task, TaskType } from '@app-types/priority.types'
import { EventBus } from '@core/EventBus'
import { CharacterManager } from '@domain/character/CharacterManager'
import { Logger } from '@utils/logger'

export class ActionExecutor {
  private eventBus: EventBus
  private characterManager: CharacterManager
  private logger: Logger

  constructor(eventBus: EventBus, characterManager: CharacterManager) {
    this.eventBus = eventBus
    this.characterManager = characterManager
    this.logger = new Logger('ActionExecutor')
  }

  execute(character: Character, task: Task): boolean {
    if (character.state === CharacterState.MOVING) {
      this.logger.warn(`Character ${character.id} is already moving`)
      return false
    }

    switch (task.type) {
      case TaskType.MOVE:
        return this.executeMove(character, task)
      case TaskType.GATHER:
        return this.executeGather(character, task)
      case TaskType.BUILD:
        return this.executeBuild(character, task)
      case TaskType.CRAFT:
        return this.executeCraft(character, task)
      case TaskType.REST:
        return this.executeRest(character, task)
      case TaskType.EAT:
        return this.executeEat(character, task)
      case TaskType.SOCIALIZE:
        return this.executeSocialize(character, task)
      case TaskType.WORK:
        return this.executeWork(character, task)
      case TaskType.COMBAT:
        return this.executeCombat(character, task)
      default:
        this.logger.warn(`Unknown task type: ${task.type}`)
        return false
    }
  }

  private executeMove(character: Character, task: Task): boolean {
    if (!task.targetPosition) {
      this.logger.warn(`Task ${task.id} has no target position`)
      return false
    }

    this.characterManager.setState(character.id, CharacterState.MOVING)

    this.eventBus.emit('character:moving', {
      characterId: character.id,
      from: character.position,
      to: task.targetPosition,
      estimatedTime: 1000
    })

    return true
  }

  private executeGather(character: Character, task: Task): boolean {
    if (!task.targetPosition) {
      return false
    }

    this.characterManager.setState(character.id, CharacterState.WORKING)

    this.eventBus.emit('resource:gathered', {
      characterId: character.id,
      resourceId: task.targetId || '',
      amount: 1
    })

    return true
  }

  private executeBuild(character: Character, task: Task): boolean {
    if (!task.targetId) {
      return false
    }

    this.characterManager.setState(character.id, CharacterState.WORKING)

    this.eventBus.emit('building:progress', {
      characterId: character.id,
      buildingId: task.targetId,
      progress: 0.1
    })

    return true
  }

  private executeCraft(character: Character, task: Task): boolean {
    this.characterManager.setState(character.id, CharacterState.WORKING)

    this.eventBus.emit('craft:progress', {
      characterId: character.id,
      recipeId: task.targetId || '',
      progress: 0.1
    })

    return true
  }

  private executeRest(character: Character, _task: Task): boolean {
    this.characterManager.setState(character.id, CharacterState.RESTING)

    return true
  }

  private executeEat(character: Character, _task: Task): boolean {
    if (character.needs) {
      character.needs.hunger = Math.min(100, (character.needs.hunger || 0) + 30)
    }

    this.eventBus.emit('character:ate', {
      characterId: character.id,
      amount: 30
    })

    return true
  }

  private executeSocialize(character: Character, _task: Task): boolean {
    if (character.needs) {
      character.needs.social = Math.min(100, (character.needs.social || 0) + 20)
    }

    return true
  }

  private executeWork(character: Character, task: Task): boolean {
    if (!task.targetId) {
      return false
    }

    this.characterManager.setState(character.id, CharacterState.WORKING)

    this.eventBus.emit('work:progress', {
      characterId: character.id,
      buildingId: task.targetId,
      efficiency: 1.0
    })

    return true
  }

  private executeCombat(character: Character, task: Task): boolean {
    if (!task.targetId) {
      return false
    }

    this.characterManager.setState(character.id, CharacterState.WORKING)

    const stats = character.sixDimensions || { atk: 10, def: 5, hp: 100, critRate: 5, critDmg: 150, atkSpd: 1 }
    const atk = stats.atk || 10
    const critRate = stats.critRate || 0
    const critDmg = stats.critDmg || 1.5

    const isCritical = Math.random() * 100 < critRate
    const damage = atk * (isCritical ? critDmg : 1)

    this.eventBus.emit('combat:engaged', {
      characterId: character.id,
      targetId: task.targetId,
      combatPower: damage
    })

    return true
  }

  interrupt(character: Character): void {
    this.characterManager.setState(character.id, CharacterState.IDLE)
    this.logger.debug(`Interrupted character ${character.id}`)
  }
}
