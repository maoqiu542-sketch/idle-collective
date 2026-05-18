import {
  Equipment,
  EquipmentConfig,
  EquipmentQuality,
  EquipmentSlot,
  EquipmentStats
} from '@app-types/equipment.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

export class EquipmentManager {
  private eventBus: EventBus
  private logger: Logger
  private equipments: Map<string, Equipment> = new Map()
  private configs: Map<string, EquipmentConfig> = new Map()
  private shopInventory: Equipment[] = []
  private lastShopRefresh: number = 0
  private readonly SHOP_REFRESH_INTERVAL: number = 86400000

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('EquipmentManager')
  }

  loadConfigs(configs: EquipmentConfig[]): void {
    for (const config of configs) {
      this.configs.set(config.id, config)
    }
    this.logger.info(`Loaded ${configs.length} equipment configs`)
  }

  createEquipment(
    configId: string,
    quality?: EquipmentQuality,
    customId?: string
  ): Equipment | null {
    const config = this.configs.get(configId)
    if (!config) {
      this.logger.error(`Equipment config not found: ${configId}`)
      return null
    }

    const id = customId || `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const finalQuality = quality ?? this.rollQuality()

    const stats = this.calculateStats(config, finalQuality)

    const equipment: Equipment = {
      id,
      configId,
      name: config.name,
      slot: config.slot,
      quality: finalQuality,
      level: 1,
      stats,
      basePrice: config.basePrice,
      createdAt: Date.now()
    }

    this.equipments.set(id, equipment)

    this.eventBus.emit('equipment:created', {
      equipmentId: id,
      name: equipment.name,
      quality: finalQuality
    })

    return equipment
  }

  private rollQuality(): EquipmentQuality {
    const roll = Math.random() * 100
    if (roll < 30) return EquipmentQuality.COMMON
    if (roll < 60) return EquipmentQuality.UNCOMMON
    if (roll < 85) return EquipmentQuality.RARE
    if (roll < 97) return EquipmentQuality.EPIC
    return EquipmentQuality.LEGENDARY
  }

  private calculateStats(config: EquipmentConfig, quality: EquipmentQuality): EquipmentStats {
    const qualityMultiplier = 1 + (quality * 0.15)

    return {
      atk: config.baseStats.atk ? Math.floor(config.baseStats.atk * qualityMultiplier) : undefined,
      def: config.baseStats.def ? Math.floor(config.baseStats.def * qualityMultiplier) : undefined,
      hp: config.baseStats.hp ? Math.floor(config.baseStats.hp * qualityMultiplier) : undefined,
      critRate: config.baseStats.critRate ? config.baseStats.critRate * qualityMultiplier : undefined,
      critDmg: config.baseStats.critDmg ? config.baseStats.critDmg * qualityMultiplier : undefined,
      atkSpd: config.baseStats.atkSpd ? config.baseStats.atkSpd * qualityMultiplier : undefined
    }
  }

  upgradeEquipment(equipmentId: string): boolean {
    const equipment = this.equipments.get(equipmentId)
    if (!equipment) return false

    const newStats: EquipmentStats = {}
    for (const key of Object.keys(equipment.stats) as (keyof EquipmentStats)[]) {
      const value = equipment.stats[key]
      if (value !== undefined) {
        newStats[key] = Math.floor(value * 1.1)
      }
    }

    const upgradedEquipment: Equipment = {
      ...equipment,
      level: equipment.level + 1,
      stats: newStats
    }

    this.equipments.set(equipmentId, upgradedEquipment)

    this.eventBus.emit('equipment:upgraded', {
      equipmentId,
      newLevel: upgradedEquipment.level
    })

    this.logger.info(`Upgraded equipment ${equipmentId} to level ${upgradedEquipment.level}`)
    return true
  }

  getEquipment(equipmentId: string): Equipment | undefined {
    return this.equipments.get(equipmentId)
  }

  getAllEquipments(): Equipment[] {
    return Array.from(this.equipments.values())
  }

  getEquipmentsBySlot(slot: EquipmentSlot): Equipment[] {
    return Array.from(this.equipments.values()).filter(e => e.slot === slot)
  }

  getEquipmentsByQuality(quality: EquipmentQuality): Equipment[] {
    return Array.from(this.equipments.values()).filter(e => e.quality === quality)
  }

  deleteEquipment(equipmentId: string): boolean {
    const equipment = this.equipments.get(equipmentId)
    if (!equipment) return false

    this.equipments.delete(equipmentId)

    this.eventBus.emit('equipment:destroyed', {
      equipmentId
    })

    this.logger.debug(`Deleted equipment ${equipmentId}`)
    return true
  }

  refreshShop(): Equipment[] {
    this.shopInventory = []

    const configs = Array.from(this.configs.values())
    const slotCounts: Record<EquipmentSlot, number> = {
      [EquipmentSlot.WEAPON]: 0,
      [EquipmentSlot.HELMET]: 0,
      [EquipmentSlot.ARMOR]: 0,
      [EquipmentSlot.BOOTS]: 0,
      [EquipmentSlot.ACCESSORY]: 0
    }

    const maxPerSlot = 2

    for (let i = 0; i < 10 && configs.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * configs.length)
      const config = configs[randomIndex]

      if (slotCounts[config.slot] < maxPerSlot) {
        const equipment = this.createEquipment(config.id)
        if (equipment) {
          this.shopInventory.push(equipment)
          slotCounts[config.slot]++
        }
      }

      configs.splice(randomIndex, 1)
    }

    this.lastShopRefresh = Date.now()

    this.eventBus.emit('shop:refreshed', {
      itemCount: this.shopInventory.length
    })

    this.logger.info(`Shop refreshed with ${this.shopInventory.length} items`)
    return this.shopInventory
  }

  getShopInventory(): Equipment[] {
    const now = Date.now()
    if (this.shopInventory.length === 0 || now - this.lastShopRefresh >= this.SHOP_REFRESH_INTERVAL) {
      this.refreshShop()
    }
    return this.shopInventory
  }

  purchaseFromShop(equipmentId: string): Equipment | null {
    const index = this.shopInventory.findIndex(e => e.id === equipmentId)
    if (index === -1) return null

    const equipment = this.shopInventory[index]
    this.shopInventory.splice(index, 1)

    this.eventBus.emit('equipment:purchased', {
      equipmentId,
      name: equipment.name,
      quality: equipment.quality
    })

    this.logger.info(`Purchased equipment ${equipmentId} from shop`)
    return equipment
  }

  getEquipmentPrice(equipmentId: string): number {
    const equipment = this.equipments.get(equipmentId)
    if (!equipment) return 0

    const qualityMultiplier = 1 + (equipment.quality * 0.5)
    const levelMultiplier = 1 + (equipment.level - 1) * 0.2

    return Math.floor(equipment.basePrice * qualityMultiplier * levelMultiplier)
  }

  getUpgradeCost(equipmentId: string): number {
    const equipment = this.equipments.get(equipmentId)
    if (!equipment) return 0

    return Math.floor(equipment.basePrice * equipment.level * 0.5)
  }

  getTimeUntilShopRefresh(): number {
    const elapsed = Date.now() - this.lastShopRefresh
    return Math.max(0, this.SHOP_REFRESH_INTERVAL - elapsed)
  }

  getTotalStats(equipments: Equipment[]): EquipmentStats {
    const total: EquipmentStats = {
      atk: 0,
      def: 0,
      hp: 0,
      critRate: 0,
      critDmg: 0,
      atkSpd: 0
    }

    for (const equipment of equipments) {
      for (const key of Object.keys(equipment.stats) as (keyof EquipmentStats)[]) {
        const value = equipment.stats[key]
        if (value !== undefined && total[key] !== undefined) {
          (total as Record<string, number>)[key] = (total[key] || 0) + value
        }
      }
    }

    return total
  }

  serialize(): Equipment[] {
    return this.getAllEquipments().map(equipment => ({
      ...equipment,
      stats: { ...equipment.stats }
    }))
  }

  deserialize(equipments: Equipment[]): void {
    this.equipments = new Map(
      equipments.map(equipment => [
        equipment.id,
        {
          ...equipment,
          stats: { ...equipment.stats }
        }
      ])
    )
  }
}
