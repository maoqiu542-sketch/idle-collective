/**
 * 角色管理器 - 管理所有角色
 * @module domain/character/CharacterManager
 */

import { v4 as uuidv4 } from 'uuid'
import { EventBus } from '@core/EventBus'
import {
  Character,
  CharacterState,
  ProfessionType,
  SkillType,
  TalentLevel,
  CharacterConfig,
  EquipmentSlots,
} from '@app-types/character.types'
import { Position } from '@app-types/map.types'
import { EquipmentSlot } from '@app-types/equipment.types'

const PROFESSION_SKILLS: Record<ProfessionType, SkillType[]> = {
  [ProfessionType.GATHERER]: [SkillType.GATHERING, SkillType.MINING],
  [ProfessionType.BUILDER]: [SkillType.BUILDING],
  [ProfessionType.FARMER]: [SkillType.COOKING],
  [ProfessionType.WARRIOR]: [SkillType.COMBAT],
}

export class CharacterManager {
  private characters: Map<string, Character> = new Map()
  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  createCharacter(config: CharacterConfig): Character {
    const id = uuidv4()
    const profession = config.profession || ProfessionType.GATHERER
    const talents = this.createDefaultTalents(profession)

    const character: Character = {
      id,
      name: config.name,
      profession,
      position: config.position,
      state: CharacterState.IDLE,
      stats: config.baseStats || {
        health: 100,
        maxHealth: 100,
        mood: 100,
        maxMood: 100,
      },
      needs: {
        hunger: 100,
        energy: 100,
        social: 100,
      },
      personality: {
        diligence: 50 + Math.random() * 50,
        extroversion: 50 + Math.random() * 50,
        bravery: 50 + Math.random() * 50,
      },
      talents,
      inventory: [],
      equipmentSlots: {},
      createdAt: Date.now(),
    }

    this.characters.set(id, character)

    this.eventBus.emit('character:spawned', { character })

    return character
  }

  private createDefaultTalents(profession: ProfessionType): Map<SkillType, TalentLevel> {
    const talents = new Map<SkillType, TalentLevel>()
    const primarySkills = PROFESSION_SKILLS[profession] || []

    Object.values(SkillType).forEach(skill => {
      const isPrimary = primarySkills.includes(skill)
      talents.set(skill, {
        level: isPrimary ? 2 : 1,
        experience: 0,
        experienceToNext: 100,
      })
    })

    return talents
  }

  get(id: string): Character | undefined {
    return this.characters.get(id)
  }

  getAll(): Character[] {
    return Array.from(this.characters.values())
  }

  getCount(): number {
    return this.characters.size
  }

  move(id: string, position: Position): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    const from = { ...character.position }
    character.position = position

    this.eventBus.emit('character:moved', {
      characterId: id,
      from,
      to: position,
    })

    return true
  }

  setState(id: string, state: CharacterState): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    const from = character.state
    character.state = state

    this.eventBus.emit('character:state-changed', {
      characterId: id,
      from,
      to: state,
    })

    return true
  }

  damage(id: string, amount: number): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    character.stats.health = Math.max(0, character.stats.health - amount)

    this.eventBus.emit('character:damaged', {
      characterId: id,
      amount,
    })

    return true
  }

  heal(id: string, amount: number): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    character.stats.health = Math.min(
      character.stats.maxHealth,
      character.stats.health + amount
    )

    this.eventBus.emit('character:healed', {
      characterId: id,
      amount,
    })

    return true
  }

  updateMood(id: string, delta: number): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    character.stats.mood = Math.max(
      0,
      Math.min(character.stats.maxMood, character.stats.mood + delta)
    )

    return true
  }

  addTalentExperience(id: string, skill: SkillType, amount: number): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    const talent = character.talents.get(skill)
    if (!talent) return false

    talent.experience += amount

    while (talent.experience >= talent.experienceToNext) {
      talent.experience -= talent.experienceToNext
      talent.level++
      talent.experienceToNext = Math.floor(100 * Math.pow(1.2, talent.level))

      this.eventBus.emit('character:talent-upgraded', {
        characterId: id,
        skill,
        newLevel: talent.level,
      })
    }

    return true
  }

  getTalentEfficiency(id: string, skill: SkillType): number {
    const character = this.characters.get(id)
    if (!character) return 1

    const talent = character.talents.get(skill)
    if (!talent) return 1

    return 1 + (talent.level - 1) * 0.1
  }

  remove(id: string): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    this.characters.delete(id)

    this.eventBus.emit('character:removed', { characterId: id })

    return true
  }

  equipItem(characterId: string, equipmentId: string, slot: EquipmentSlot): boolean {
    const character = this.characters.get(characterId)
    if (!character) return false

    const previousEquipmentId = character.equipmentSlots[slot]
    character.equipmentSlots[slot] = equipmentId

    this.eventBus.emit('character:equipped', {
      characterId,
      equipmentId,
      slot,
      previousEquipmentId,
    })

    return true
  }

  unequipItem(characterId: string, slot: EquipmentSlot): string | null {
    const character = this.characters.get(characterId)
    if (!character) return null

    const equipmentId = character.equipmentSlots[slot]
    if (!equipmentId) return null

    delete character.equipmentSlots[slot]

    this.eventBus.emit('character:unequipped', {
      characterId,
      equipmentId,
      slot,
    })

    return equipmentId
  }

  getEquippedItem(characterId: string, slot: EquipmentSlot): string | undefined {
    const character = this.characters.get(characterId)
    if (!character) return undefined

    return character.equipmentSlots[slot]
  }

  getAllEquippedItems(characterId: string): EquipmentSlots {
    const character = this.characters.get(characterId)
    if (!character) return {}

    return { ...character.equipmentSlots }
  }

  update(deltaTime: number): void {
    this.characters.forEach(character => {
      if (character.state === CharacterState.RESTING) {
        this.heal(character.id, 0.1 * deltaTime / 1000)
        this.updateMood(character.id, 0.05 * deltaTime / 1000)
      }
    })
  }

  serialize(): Character[] {
    return this.getAll()
  }

  deserialize(characters: Character[]): void {
    this.characters.clear()
    characters.forEach(c => {
      const talents = new Map<SkillType, TalentLevel>()
      Object.entries(c.talents).forEach(([skill, level]) => {
        talents.set(skill as SkillType, level as TalentLevel)
      })
      c.talents = talents
      this.characters.set(c.id, c)
    })
  }
}
