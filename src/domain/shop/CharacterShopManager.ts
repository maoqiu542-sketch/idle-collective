import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'
import {
  CharacterShopConfig,
  CharacterShopState,
  ShopCharacter,
  ShopSlot,
  ShopRefreshResult,
  PurchaseResult,
  CharacterQuality,
  CharacterProfession,
} from '@app-types/character-shop.types'
import { calculateRecruitQualityScore } from '@domain/settlement/SettlementMath'
import {
  RECRUIT_MANUAL_REFRESH_COST,
  RECRUIT_PRICE_RANGES,
} from '@domain/settlement/EconomyBalance'
import { RecruitmentStationState } from '@app-types/settlement.types'

const DEFAULT_CONFIG: CharacterShopConfig = {
  autoRefreshInterval: 30 * 60 * 1000,
  manualRefreshCost: RECRUIT_MANUAL_REFRESH_COST,
  initialSlots: 3,
  maxSlots: 6,
  qualityWeights: {
    [CharacterQuality.COMMON]: 55,
    [CharacterQuality.RARE]: 30,
    [CharacterQuality.EPIC]: 12,
    [CharacterQuality.LEGENDARY]: 3,
  },
  priceRanges: RECRUIT_PRICE_RANGES,
  expirationDays: 7,
}

const PROFESSION_NAMES: Record<CharacterProfession, string[]> = {
  [CharacterProfession.GATHERER]: ['采集者', '猎人', '伐木工', '拾荒者'],
  [CharacterProfession.BUILDER]: ['建造者', '建筑师', '工匠', '工程师'],
  [CharacterProfession.FARMER]: ['农夫', '种植者', '农场工', '园丁'],
  [CharacterProfession.WARRIOR]: ['战士', '剑士', '骑士', '勇士'],
  [CharacterProfession.RESEARCHER]: ['研究员', '学者', '科学家', '智者'],
}

interface RecruitmentBonuses {
  maxCandidates: number
  manualRefreshCost: number
  refreshIntervalMs: number
  qualityBonus: number
  stationLevel: number
}

export class CharacterShopManager {
  private eventBus: EventBus
  private logger: Logger
  private config: CharacterShopConfig
  private state: CharacterShopState
  private getGold: () => number
  private deductGold: (amount: number) => boolean
  private onCharacterPurchased: (character: ShopCharacter) => void
  private getLivability: () => number
  private getDevelopment: () => number
  private hasRecruitmentStation: () => boolean
  private canRecruitCharacter: () => boolean
  private getRecruitmentBonuses: () => RecruitmentBonuses

  constructor(
    eventBus: EventBus,
    getGold: () => number = () => 0,
    deductGold: (amount: number) => boolean = () => true,
    onCharacterPurchased: (character: ShopCharacter) => void = () => {},
    getLivability: () => number = () => 0,
    getDevelopment: () => number = () => 0,
    hasRecruitmentStation: () => boolean = () => true,
    canRecruitCharacter: () => boolean = () => true,
    getRecruitmentBonuses: () => RecruitmentBonuses = () => ({
      maxCandidates: DEFAULT_CONFIG.initialSlots,
      manualRefreshCost: DEFAULT_CONFIG.manualRefreshCost,
      refreshIntervalMs: DEFAULT_CONFIG.autoRefreshInterval,
      qualityBonus: 0,
      stationLevel: 0,
    })
  ) {
    this.eventBus = eventBus
    this.logger = new Logger('CharacterShopManager')
    this.config = DEFAULT_CONFIG
    this.getGold = getGold
    this.deductGold = deductGold
    this.onCharacterPurchased = onCharacterPurchased
    this.getLivability = getLivability
    this.getDevelopment = getDevelopment
    this.hasRecruitmentStation = hasRecruitmentStation
    this.canRecruitCharacter = canRecruitCharacter
    this.getRecruitmentBonuses = getRecruitmentBonuses

    this.state = {
      slots: this.createInitialSlots(),
      lastRefreshTime: Date.now(),
      lastManualRefreshTime: 0,
      totalPurchases: 0,
      totalSpent: 0,
    }
  }

  private createInitialSlots(): ShopSlot[] {
    return Array.from({ length: this.config.initialSlots }, (_, index) => ({
      id: index,
      character: null,
      unlocked: true,
    }))
  }

  private ensureSlotCount(targetCount: number): void {
    const clampedCount = Math.max(0, Math.min(this.config.maxSlots, targetCount))
    while (this.state.slots.length < clampedCount) {
      this.state.slots.push({
        id: this.state.slots.length,
        character: null,
        unlocked: true,
      })
    }
  }

  private getRefreshCandidateCount(maxCandidates: number): number {
    const lowerBound = Math.min(maxCandidates, 2)
    const upperBound = Math.min(maxCandidates, 4)

    if (upperBound <= 0) {
      return 0
    }

    if (upperBound <= lowerBound) {
      return upperBound
    }

    return lowerBound + Math.floor(Math.random() * (upperBound - lowerBound + 1))
  }

  init(): void {
    this.refreshShop()
    this.logger.info('Character shop initialized')
  }

  update(_deltaTime: number): void {
    const now = Date.now()
    if (now - this.state.lastRefreshTime >= this.getRecruitmentBonuses().refreshIntervalMs) {
      this.refreshShop()
    }
  }

  refreshShop(): ShopRefreshResult {
    if (!this.hasRecruitmentStation()) {
      this.state.slots.forEach(slot => {
        slot.character = null
      })
      return {
        success: false,
        message: '需要先建造招募站',
      }
    }

    const bonuses = this.getRecruitmentBonuses()
    this.ensureSlotCount(bonuses.maxCandidates)
    const candidateCount = this.getRefreshCandidateCount(bonuses.maxCandidates)

    const newCharacters: ShopCharacter[] = []
    for (const slot of this.state.slots) {
      if (slot.unlocked && slot.id < candidateCount) {
        const character = this.generateRandomCharacter(slot.id)
        slot.character = character
        newCharacters.push(character)
      } else {
        slot.character = null
      }
    }

    this.state.lastRefreshTime = Date.now()

    this.eventBus.emit('character-shop:refreshed', {
      itemCount: newCharacters.length,
    })

    this.logger.info(`Shop refreshed with ${newCharacters.length} characters`)
    return { success: true, newCharacters }
  }

  manualRefresh(): ShopRefreshResult {
    if (!this.hasRecruitmentStation()) {
      return { success: false, message: '需要先建造招募站' }
    }

    const now = Date.now()
    const currentGold = this.getGold()
    const manualRefreshCost = this.getRecruitmentBonuses().manualRefreshCost

    if (currentGold < manualRefreshCost) {
      return {
        success: false,
        message: `金币不足，需要 ${manualRefreshCost} 金币刷新`,
      }
    }

    if (!this.deductGold(manualRefreshCost)) {
      return { success: false, message: '金币扣除失败' }
    }

    this.state.lastManualRefreshTime = now
    return this.refreshShop()
  }

  private generateRandomCharacter(slotId: number): ShopCharacter {
    const quality = this.rollQuality()
    const profession = this.rollProfession()
    const name = this.generateName(profession)
    const price = this.calculatePrice(quality)
    const stats = this.generateStats(quality)
    const skills = this.generateSkills(profession, quality)

    return {
      id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      slotId,
      name,
      profession,
      quality,
      baseStats: stats,
      skills,
      price,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.expirationDays * 24 * 60 * 60 * 1000,
    }
  }

  private rollQuality(): CharacterQuality {
    const recruitScore = calculateRecruitQualityScore(this.getLivability(), this.getDevelopment()) + this.getRecruitmentBonuses().qualityBonus
    const scoreBias = recruitScore / 100
    const adjustedWeights: Record<CharacterQuality, number> = {
      [CharacterQuality.COMMON]: Math.max(20, this.config.qualityWeights[CharacterQuality.COMMON] - scoreBias * 20),
      [CharacterQuality.RARE]: this.config.qualityWeights[CharacterQuality.RARE] + scoreBias * 8,
      [CharacterQuality.EPIC]: this.config.qualityWeights[CharacterQuality.EPIC] + scoreBias * 8,
      [CharacterQuality.LEGENDARY]: this.config.qualityWeights[CharacterQuality.LEGENDARY] + scoreBias * 4,
    }

    const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0)
    const roll = Math.random() * totalWeight
    let cumulative = 0

    for (const [quality, weight] of Object.entries(adjustedWeights)) {
      cumulative += weight
      if (roll < cumulative) {
        return quality as CharacterQuality
      }
    }

    return CharacterQuality.COMMON
  }

  private rollProfession(): CharacterProfession {
    const professions = Object.values(CharacterProfession)
    return professions[Math.floor(Math.random() * professions.length)]
  }

  private generateName(profession: CharacterProfession): string {
    const names = PROFESSION_NAMES[profession]
    return names[Math.floor(Math.random() * names.length)]
  }

  private calculatePrice(quality: CharacterQuality): number {
    const range = this.config.priceRanges[quality]
    const recruitScore = calculateRecruitQualityScore(this.getLivability(), this.getDevelopment()) + this.getRecruitmentBonuses().qualityBonus
    const basePrice = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
    const scoreMultiplier = Math.min(1.2, 1 + recruitScore / 400)
    return Math.min(999, Math.floor(basePrice * scoreMultiplier))
  }

  private generateStats(quality: CharacterQuality): { strength: number; agility: number; intelligence: number; endurance: number } {
    const multipliers: Record<CharacterQuality, number> = {
      [CharacterQuality.COMMON]: 1.0,
      [CharacterQuality.RARE]: 1.2,
      [CharacterQuality.EPIC]: 1.5,
      [CharacterQuality.LEGENDARY]: 2.0,
    }

    const base = 10
    const multiplier = multipliers[quality]

    return {
      strength: Math.floor((base + Math.random() * 5) * multiplier),
      agility: Math.floor((base + Math.random() * 5) * multiplier),
      intelligence: Math.floor((base + Math.random() * 5) * multiplier),
      endurance: Math.floor((base + Math.random() * 5) * multiplier),
    }
  }

  private generateSkills(profession: CharacterProfession, quality: CharacterQuality): string[] {
    const skillsByProfession: Record<CharacterProfession, string[]> = {
      [CharacterProfession.GATHERER]: ['快速采集', '资源感知', '负重训练'],
      [CharacterProfession.BUILDER]: ['快速建造', '建筑专精', '材料节省'],
      [CharacterProfession.FARMER]: ['种植专精', '丰收祝福', '作物培育'],
      [CharacterProfession.WARRIOR]: ['战斗专精', '防御姿态', '致命一击'],
      [CharacterProfession.RESEARCHER]: ['研究加速', '灵感迸发', '知识积累'],
    }

    const allSkills = skillsByProfession[profession]
    const skillCount = quality === CharacterQuality.LEGENDARY ? 3 : quality === CharacterQuality.EPIC ? 2 : 1
    return allSkills.slice(0, skillCount)
  }

  purchaseCharacter(slotId: number): PurchaseResult {
    const slot = this.state.slots.find(currentSlot => currentSlot.id === slotId)

    if (!slot || !slot.unlocked || !slot.character) {
      return { success: false, message: '该槽位没有可用角色' }
    }

    if (!this.canRecruitCharacter()) {
      return { success: false, message: '当前住房容量不足，请先建造或升级房屋。' }
    }

    const character = slot.character
    const currentGold = this.getGold()

    if (currentGold < character.price) {
      return {
        success: false,
        message: `金币不足，需要 ${character.price} 金币，当前只有 ${currentGold} 金币`,
      }
    }

    if (!this.deductGold(character.price)) {
      return { success: false, message: '金币扣除失败' }
    }

    this.state.totalPurchases++
    this.state.totalSpent += character.price
    slot.character = null

    this.onCharacterPurchased(character)

    this.eventBus.emit('character-shop:purchased', {
      character,
      price: character.price,
      slotId,
    })

    this.logger.info(`Character ${character.name} purchased for ${character.price} gold`)
    return { success: true, character }
  }

  unlockSlot(slotId: number): boolean {
    if (slotId < 0) {
      return false
    }

    const existingSlot = this.state.slots.find(slot => slot.id === slotId)
    if (existingSlot) {
      if (existingSlot.unlocked) {
        return false
      }

      existingSlot.unlocked = true
      existingSlot.character = this.generateRandomCharacter(slotId)
      this.eventBus.emit('character-shop:slot-unlocked', { slotId })
      this.logger.info(`Slot ${slotId} unlocked`)
      return true
    }

    if (this.state.slots.length >= this.config.maxSlots) {
      return false
    }

    const newSlot: ShopSlot = {
      id: slotId,
      unlocked: true,
      character: this.generateRandomCharacter(slotId),
    }

    this.state.slots.push(newSlot)
    this.eventBus.emit('character-shop:slot-unlocked', { slotId })
    this.logger.info(`Slot ${slotId} unlocked`)
    return true
  }

  getAvailableCharacters(): ShopCharacter[] {
    if (!this.hasRecruitmentStation()) {
      return []
    }

    const maxCandidates = this.getRecruitmentBonuses().maxCandidates
    return this.state.slots
      .filter(slot => slot.unlocked && slot.character && slot.id < maxCandidates)
      .map(slot => slot.character!)
  }

  getAllSlots(): ShopSlot[] {
    return this.state.slots
  }

  getTimeUntilNextRefresh(): number {
    if (!this.hasRecruitmentStation()) {
      return 0
    }
    return Math.max(0, this.getRecruitmentBonuses().refreshIntervalMs - (Date.now() - this.state.lastRefreshTime))
  }

  getManualRefreshCost(): number {
    return this.getRecruitmentBonuses().manualRefreshCost
  }

  getRecruitmentBonusesSummary(): {
    totalSlots: number
    qualityBonus: number
    manualRefreshDiscount: number
    stationLevel: number
  } {
    const bonuses = this.getRecruitmentBonuses()
    return {
      totalSlots: bonuses.maxCandidates,
      qualityBonus: bonuses.qualityBonus,
      manualRefreshDiscount: Math.max(0, this.config.manualRefreshCost - bonuses.manualRefreshCost),
      stationLevel: bonuses.stationLevel,
    }
  }

  getRecruitmentStationState(): RecruitmentStationState {
    const bonuses = this.getRecruitmentBonuses()
    return {
      stationLevel: bonuses.stationLevel,
      candidateCount: this.getAvailableCharacters().length,
      maxCandidates: bonuses.maxCandidates,
      nextRefreshAt: this.state.lastRefreshTime + bonuses.refreshIntervalMs,
      manualRefreshCost: bonuses.manualRefreshCost,
      refreshIntervalMs: bonuses.refreshIntervalMs,
      qualityBonus: bonuses.qualityBonus,
    }
  }

  getStats(): { totalPurchases: number; totalSpent: number } {
    return {
      totalPurchases: this.state.totalPurchases,
      totalSpent: this.state.totalSpent,
    }
  }

  serialize(): CharacterShopState {
    return { ...this.state }
  }

  deserialize(data: CharacterShopState): void {
    this.state = { ...data }
  }
}
