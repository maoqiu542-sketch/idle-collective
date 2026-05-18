import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventBus } from '@core/EventBus'
import { EquipmentManager } from '@domain/equipment/EquipmentManager'
import { EquipmentConfig, EquipmentQuality, EquipmentSlot } from '@app-types/equipment.types'

describe('EquipmentManager', () => {
  let eventBus: EventBus
  let manager: EquipmentManager
  let configs: EquipmentConfig[]

  beforeEach(() => {
    eventBus = new EventBus()
    manager = new EquipmentManager(eventBus)
    configs = [
      {
        id: 'sword_iron',
        name: '铁剑',
        slot: EquipmentSlot.WEAPON,
        baseStats: { atk: 10, def: 2 },
        basePrice: 50,
      },
      {
        id: 'shield_wood',
        name: '木盾',
        slot: EquipmentSlot.ARMOR,
        baseStats: { def: 5, hp: 20 },
        basePrice: 30,
      },
      {
        id: 'ring_gold',
        name: '金戒指',
        slot: EquipmentSlot.ACCESSORY,
        baseStats: { critRate: 0.05, critDmg: 0.1 },
        basePrice: 100,
      },
    ]
    manager.loadConfigs(configs)
  })

  describe('loadConfigs / createEquipment', () => {
    it('should create equipment with valid config id', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

      const equipment = manager.createEquipment('sword_iron')

      expect(equipment).not.toBeNull()
      expect(equipment!.name).toBe('铁剑')
      expect(equipment!.slot).toBe(EquipmentSlot.WEAPON)
      expect(equipment!.quality).toBe(EquipmentQuality.COMMON)
      expect(equipment!.level).toBe(1)
      randomSpy.mockRestore()
    })

    it('should return null for invalid config id', () => {
      const equipment = manager.createEquipment('nonexistent')

      expect(equipment).toBeNull()
    })

    it('should accept custom quality override', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const equipment = manager.createEquipment('sword_iron', EquipmentQuality.LEGENDARY)

      expect(equipment).not.toBeNull()
      expect(equipment!.quality).toBe(EquipmentQuality.LEGENDARY)
      randomSpy.mockRestore()
    })

    it('should calculate stats scaled by quality', () => {
      const common = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)
      const legendary = manager.createEquipment('sword_iron', EquipmentQuality.LEGENDARY)

      expect(legendary!.stats.atk).toBeGreaterThan(common!.stats.atk!)
    })
  })

  describe('getEquipment / getAllEquipments', () => {
    it('should retrieve equipment by id', () => {
      const created = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)

      const retrieved = manager.getEquipment(created!.id)

      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(created!.id)
    })

    it('should return undefined for non-existent equipment', () => {
      expect(manager.getEquipment('nonexistent')).toBeUndefined()
    })

    it('should return all created equipment', () => {
      manager.createEquipment('sword_iron', EquipmentQuality.COMMON)
      manager.createEquipment('shield_wood', EquipmentQuality.COMMON)

      const all = manager.getAllEquipments()

      expect(all).toHaveLength(2)
    })
  })

  describe('getEquipmentsBySlot / getEquipmentsByQuality', () => {
    it('should filter equipment by slot', () => {
      manager.createEquipment('sword_iron', EquipmentQuality.COMMON)
      manager.createEquipment('shield_wood', EquipmentQuality.COMMON)

      const weapons = manager.getEquipmentsBySlot(EquipmentSlot.WEAPON)

      expect(weapons).toHaveLength(1)
      expect(weapons[0].slot).toBe(EquipmentSlot.WEAPON)
    })

    it('should filter equipment by quality', () => {
      manager.createEquipment('sword_iron', EquipmentQuality.EPIC)
      manager.createEquipment('shield_wood', EquipmentQuality.COMMON)

      const epics = manager.getEquipmentsByQuality(EquipmentQuality.EPIC)

      expect(epics).toHaveLength(1)
      expect(epics[0].quality).toBe(EquipmentQuality.EPIC)
    })
  })

  describe('upgradeEquipment', () => {
    it('should increase equipment level', () => {
      const equipment = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)

      const result = manager.upgradeEquipment(equipment!.id)

      expect(result).toBe(true)
      expect(manager.getEquipment(equipment!.id)!.level).toBe(2)
    })

    it('should increase stats on upgrade', () => {
      const equipment = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)
      const originalAtk = equipment!.stats.atk

      manager.upgradeEquipment(equipment!.id)

      expect(manager.getEquipment(equipment!.id)!.stats.atk).toBeGreaterThan(originalAtk!)
    })

    it('should return false for non-existent equipment', () => {
      expect(manager.upgradeEquipment('nonexistent')).toBe(false)
    })
  })

  describe('deleteEquipment', () => {
    it('should remove equipment', () => {
      const equipment = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)

      const result = manager.deleteEquipment(equipment!.id)

      expect(result).toBe(true)
      expect(manager.getEquipment(equipment!.id)).toBeUndefined()
    })

    it('should return false for non-existent equipment', () => {
      expect(manager.deleteEquipment('nonexistent')).toBe(false)
    })
  })

  describe('getEquipmentPrice / getUpgradeCost', () => {
    it('should calculate price based on quality and level', () => {
      const equipment = manager.createEquipment('sword_iron', EquipmentQuality.EPIC)

      const price = manager.getEquipmentPrice(equipment!.id)

      expect(price).toBeGreaterThan(0)
    })

    it('should return 0 for non-existent equipment', () => {
      expect(manager.getEquipmentPrice('nonexistent')).toBe(0)
    })

    it('should calculate upgrade cost', () => {
      const equipment = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)

      const cost = manager.getUpgradeCost(equipment!.id)

      expect(cost).toBeGreaterThan(0)
    })

    it('should return 0 upgrade cost for non-existent equipment', () => {
      expect(manager.getUpgradeCost('nonexistent')).toBe(0)
    })
  })

  describe('shop operations', () => {
    it('should refresh shop inventory', () => {
      const inventory = manager.refreshShop()

      expect(inventory.length).toBeGreaterThan(0)
    })

    it('should get existing shop inventory without recreating', () => {
      const first = manager.refreshShop()
      const second = manager.getShopInventory()

      expect(second).toEqual(first)
    })

    it('should purchase equipment from shop', () => {
      manager.refreshShop()
      const shopItem = manager.getShopInventory()[0]

      const purchased = manager.purchaseFromShop(shopItem.id)

      expect(purchased).not.toBeNull()
      expect(purchased!.id).toBe(shopItem.id)
      expect(manager.getShopInventory().find(e => e.id === shopItem.id)).toBeUndefined()
    })

    it('should return null when purchasing non-existent item', () => {
      expect(manager.purchaseFromShop('nonexistent')).toBeNull()
    })
  })

  describe('getTotalStats', () => {
    it('should aggregate stats from multiple equipment', () => {
      const weapon = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)!
      const armor = manager.createEquipment('shield_wood', EquipmentQuality.COMMON)!

      const total = manager.getTotalStats([weapon, armor])

      expect(total.atk).toBeGreaterThan(0)
      expect(total.def).toBeGreaterThan(0)
      expect(total.hp).toBeGreaterThan(0)
    })

    it('should return zeros for empty equipment list', () => {
      const total = manager.getTotalStats([])

      expect(total.atk).toBe(0)
      expect(total.def).toBe(0)
      expect(total.hp).toBe(0)
    })
  })

  describe('serialization', () => {
    it('should serialize and deserialize correctly (roundtrip)', () => {
      const created = manager.createEquipment('sword_iron', EquipmentQuality.EPIC)!

      const data = manager.serialize()
      const newManager = new EquipmentManager(new EventBus())
      newManager.loadConfigs(configs)
      newManager.deserialize(data)

      const restored = newManager.getEquipment(created.id)
      expect(restored).toBeDefined()
      expect(restored!.name).toBe('铁剑')
      expect(restored!.quality).toBe(EquipmentQuality.EPIC)
    })
  })

  describe('event integration', () => {
    it('should emit equipment:created when creating equipment', () => {
      const handler = vi.fn()
      eventBus.on('equipment:created', handler)

      manager.createEquipment('sword_iron', EquipmentQuality.COMMON)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ name: '铁剑' })
      )
    })

    it('should emit equipment:upgraded on upgrade', () => {
      const handler = vi.fn()
      eventBus.on('equipment:upgraded', handler)
      const equipment = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)!

      manager.upgradeEquipment(equipment.id)

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should emit equipment:destroyed on delete', () => {
      const handler = vi.fn()
      eventBus.on('equipment:destroyed', handler)
      const equipment = manager.createEquipment('sword_iron', EquipmentQuality.COMMON)!

      manager.deleteEquipment(equipment.id)

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })
})
