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
  CharacterStats,
} from '@app-types/character.types'
import { Position } from '@app-types/map.types'
import { EquipmentSlot } from '@app-types/equipment.types'
import { NeedType } from '@app-types/priority.types'

const PROFESSION_SKILLS: Record<ProfessionType, SkillType[]> = {
  [ProfessionType.FARMER]:   [SkillType.FARMING],
  [ProfessionType.HUNTER]:   [SkillType.HUNTING, SkillType.GATHERING],
  [ProfessionType.WARRIOR]:  [SkillType.COMBAT],
  [ProfessionType.ENGINEER]: [SkillType.ENGINEERING, SkillType.BUILDING],
  [ProfessionType.COOK]:     [SkillType.COOKING],
  [ProfessionType.DOCTOR]:   [SkillType.MEDICINE],
  [ProfessionType.SCHOLAR]:  [SkillType.RESEARCH],
}

function cloneCharacter(character: Character): Character {
  const talents = character.talents instanceof Map
    ? new Map(character.talents)
    : new Map(Object.entries(character.talents || {}) as [SkillType, TalentLevel][])

  const skillPriorities = character.skillPriorities instanceof Map
    ? new Map(character.skillPriorities)
    : new Map(Object.entries(character.skillPriorities || {}) as [SkillType, number][])

  return {
    ...character,
    position: { ...character.position },
    stats: { ...character.stats },
    needs: normalizeNeeds(character.needs),
    personality: character.personality ? {
      diligence: character.personality.diligence ?? 50,
      extroversion: character.personality.extroversion ?? 50,
      bravery: character.personality.bravery ?? 50,
    } : undefined,
    talents,
    skillPriorities,
    inventory: [...character.inventory],
    equipmentSlots: { ...character.equipmentSlots },
  }
}

function cloneStats(stats: CharacterStats): CharacterStats {
  return { ...stats }
}

function normalizeNeeds(needs?: Character['needs']): Character['needs'] {
  return {
    hunger: needs?.hunger ?? 100,
    energy: needs?.energy ?? 100,
    safety: needs?.safety ?? 100,
    comfort: needs?.comfort ?? 100,
  }
}

export class CharacterManager {
  private characters: Map<string, Character> = new Map()
  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  createCharacter(config: CharacterConfig): Character {
    const id = uuidv4()
    const profession = config.profession || ProfessionType.FARMER
    const talents = this.createDefaultTalents(profession)

    const character: Character = {
      id,
      name: config.name,
      profession,
      position: { ...config.position },
      state: CharacterState.IDLE,
      stats: config.baseStats ? cloneStats(config.baseStats) : {
        health: 100,
        maxHealth: 100,
        mood: 100,
        maxMood: 100,
      },
      needs: normalizeNeeds(),
      personality: {
        diligence: 50 + Math.random() * 50,
        extroversion: 50 + Math.random() * 50,
        bravery: 50 + Math.random() * 50,
      },
      talents,
      skillPriorities: new Map<SkillType, number>(),
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
    const character = this.characters.get(id)
    return character ? cloneCharacter(character) : undefined
  }

  getAll(): Character[] {
    return Array.from(this.characters.values()).map(cloneCharacter)
  }

  getCount(): number {
    return this.characters.size
  }

  setSkillPriority(characterId: string, skill: SkillType, priority: number): boolean {
    const character = this.characters.get(characterId)
    if (!character) return false
    
    character.skillPriorities.set(skill, priority)
    return true
  }

  updateNeeds(id: string, updates: Partial<Character['needs']>): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    const updatedCharacter = cloneCharacter(character)
    updatedCharacter.needs = {
      ...normalizeNeeds(character.needs),
      ...updates,
    }
    this.characters.set(id, updatedCharacter)
    return true
  }

  setNeedValue(id: string, needType: NeedType, value: number): boolean {
    const normalized = Math.max(0, Math.min(100, value))
    switch (needType) {
      case NeedType.HUNGER:
        return this.updateNeeds(id, { hunger: normalized })
      case NeedType.REST:
        return this.updateNeeds(id, { energy: normalized })
      case NeedType.SAFETY:
        return this.updateNeeds(id, { safety: normalized })
      case NeedType.COMFORT:
        return this.updateNeeds(id, { comfort: normalized })
      default:
        return false
    }
  }

  move(id: string, position: Position): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    const from = { ...character.position }
    const updatedCharacter = cloneCharacter(character)
    updatedCharacter.position = { ...position }
    this.characters.set(id, updatedCharacter)

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
    const updatedCharacter = cloneCharacter(character)
    updatedCharacter.state = state
    this.characters.set(id, updatedCharacter)

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

    const updatedCharacter = cloneCharacter(character)
    updatedCharacter.stats = cloneStats(character.stats)
    updatedCharacter.stats.health = Math.max(0, character.stats.health - amount)
    this.characters.set(id, updatedCharacter)

    this.eventBus.emit('character:damaged', {
      characterId: id,
      amount,
    })

    return true
  }

  heal(id: string, amount: number): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    const updatedCharacter = cloneCharacter(character)
    updatedCharacter.stats = cloneStats(character.stats)
    updatedCharacter.stats.health = Math.min(
      character.stats.maxHealth,
      character.stats.health + amount
    )
    this.characters.set(id, updatedCharacter)

    this.eventBus.emit('character:healed', {
      characterId: id,
      amount,
    })

    return true
  }

  updateMood(id: string, delta: number): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    const updatedCharacter = cloneCharacter(character)
    updatedCharacter.stats = cloneStats(character.stats)
    updatedCharacter.stats.mood = Math.max(
      0,
      Math.min(character.stats.maxMood, character.stats.mood + delta)
    )
    this.characters.set(id, updatedCharacter)

    return true
  }

  addTalentExperience(id: string, skill: SkillType, amount: number): boolean {
    const character = this.characters.get(id)
    if (!character) return false

    const talent = character.talents.get(skill)
    if (!talent) return false

    const updatedCharacter = cloneCharacter(character)
    const newTalent: TalentLevel = {
      level: talent.level,
      experience: talent.experience + amount,
      experienceToNext: talent.experienceToNext,
    }

    while (newTalent.experience >= newTalent.experienceToNext) {
      newTalent.experience -= newTalent.experienceToNext
      newTalent.level++
      newTalent.experienceToNext = Math.floor(100 * Math.pow(1.2, newTalent.level))

      this.eventBus.emit('character:talent-upgraded', {
        characterId: id,
        skill,
        newLevel: newTalent.level,
      })
    }

    updatedCharacter.talents = new Map(character.talents)
    updatedCharacter.talents.set(skill, newTalent)
    this.characters.set(id, updatedCharacter)

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
    const updatedCharacter = cloneCharacter(character)
    updatedCharacter.equipmentSlots = { ...character.equipmentSlots }
    updatedCharacter.equipmentSlots[slot] = equipmentId
    this.characters.set(characterId, updatedCharacter)

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

    const updatedCharacter = cloneCharacter(character)
    updatedCharacter.equipmentSlots = { ...character.equipmentSlots }
    delete updatedCharacter.equipmentSlots[slot]
    this.characters.set(characterId, updatedCharacter)

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
    if (characters.length > 0) {
      this.characters.clear()
      characters.forEach(c => {
        const talents = new Map<SkillType, TalentLevel>()
        if (c.talents && typeof c.talents === 'object') {
          if (c.talents instanceof Map) {
            c.talents.forEach((value, key) => talents.set(key, value))
          } else {
            Object.entries(c.talents).forEach(([skill, level]) => {
              talents.set(skill as SkillType, level as TalentLevel)
            })
          }
        }
        const deserializedCharacter: Character = {
          ...c,
          position: { ...c.position },
          stats: { ...c.stats },
          needs: normalizeNeeds(c.needs),
          personality: c.personality ? {
            diligence: c.personality.diligence ?? 50,
            extroversion: c.personality.extroversion ?? 50,
            bravery: c.personality.bravery ?? 50,
          } : undefined,
          talents,
          skillPriorities: c.skillPriorities instanceof Map
            ? c.skillPriorities
            : Array.isArray(c.skillPriorities)
              ? new Map(c.skillPriorities)
              : new Map(),
          inventory: [...(c.inventory || [])],
          equipmentSlots: { ...c.equipmentSlots },
        }
        this.characters.set(c.id, deserializedCharacter)
      })
    }
  }
}
