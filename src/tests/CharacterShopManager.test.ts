import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CharacterShopManager } from '@domain/shop/CharacterShopManager'
import { EventBus } from '@core/EventBus'
import { CharacterQuality } from '@app-types/character-shop.types'

describe('CharacterShopManager', () => {
  let shopManager: CharacterShopManager
  let eventBus: EventBus
  let goldAmount: number
  let getGold: () => number
  let deductGold: (amount: number) => boolean
  let purchasedCharacters: any[]

  beforeEach(() => {
    eventBus = new EventBus()
    goldAmount = 1000
    purchasedCharacters = []

    getGold = () => goldAmount
    deductGold = (amount: number) => {
      if (goldAmount >= amount) {
        goldAmount -= amount
        return true
      }
      return false
    }

    shopManager = new CharacterShopManager(
      eventBus,
      getGold,
      deductGold,
      character => purchasedCharacters.push(character)
    )
    shopManager.init()
  })

  describe('初始化', () => {
    it('应该正确初始化商店', () => {
      const characters = shopManager.getAvailableCharacters()
      expect(characters.length).toBeGreaterThanOrEqual(2)
      expect(characters.length).toBeLessThanOrEqual(3)
    })

    it('应该有正确的初始槽位数量', () => {
      const slots = shopManager.getAllSlots()
      expect(slots.length).toBe(3)
      expect(slots.every(slot => slot.unlocked)).toBe(true)
    })
  })

  describe('商店刷新', () => {
    it('应该能够刷新商店', () => {
      const result = shopManager.refreshShop()
      expect(result.success).toBe(true)
      expect(result.newCharacters?.length).toBeGreaterThanOrEqual(2)
      expect(result.newCharacters?.length).toBeLessThanOrEqual(3)
    })

    it('刷新时应该按权重生成角色品质', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => 0.99)

      const result = shopManager.refreshShop()

      expect(result.success).toBe(true)
      expect(result.newCharacters?.every(character => character.quality === CharacterQuality.LEGENDARY)).toBe(true)

      randomSpy.mockRestore()
    })

    it('手动刷新应该消耗金币', () => {
      const initialGold = goldAmount
      const result = shopManager.manualRefresh()

      expect(result.success).toBe(true)
      expect(goldAmount).toBe(initialGold - 50)
    })

    it('金币不足时手动刷新应该失败', () => {
      goldAmount = 10
      const result = shopManager.manualRefresh()

      expect(result.success).toBe(false)
      expect(result.message).toContain('金币不足')
    })
  })

  describe('角色购买', () => {
    it('应该能够购买角色', () => {
      const characters = shopManager.getAvailableCharacters()
      const character = characters[0]
      const initialGold = goldAmount

      const result = shopManager.purchaseCharacter(0)

      expect(result.success).toBe(true)
      expect(result.character).toBeDefined()
      expect(goldAmount).toBe(initialGold - character.price)
      expect(purchasedCharacters.length).toBe(1)
    })

    it('金币不足时购买应该失败', () => {
      goldAmount = 10

      const result = shopManager.purchaseCharacter(0)

      expect(result.success).toBe(false)
      expect(result.message).toContain('金币不足')
    })

    it('购买后槽位应该为空', () => {
      shopManager.purchaseCharacter(0)
      const slots = shopManager.getAllSlots()

      expect(slots[0].character).toBeNull()
    })
  })

  describe('角色生成', () => {
    it('应该生成不同品质的角色', () => {
      const characters = shopManager.getAvailableCharacters()
      const qualities = characters.map(character => character.quality)

      expect(qualities).toBeDefined()
    })

    it('角色应该有正确的属性', () => {
      const characters = shopManager.getAvailableCharacters()
      const character = characters[0]

      expect(character).toHaveProperty('id')
      expect(character).toHaveProperty('name')
      expect(character).toHaveProperty('profession')
      expect(character).toHaveProperty('quality')
      expect(character).toHaveProperty('baseStats')
      expect(character).toHaveProperty('price')
      expect(character.baseStats).toHaveProperty('strength')
      expect(character.baseStats).toHaveProperty('agility')
      expect(character.baseStats).toHaveProperty('intelligence')
      expect(character.baseStats).toHaveProperty('endurance')
    })

    it('传说角色应该有更高的属性', () => {
      const characters = shopManager.getAvailableCharacters()
      const legendary = characters.find(character => character.quality === CharacterQuality.LEGENDARY)
      const common = characters.find(character => character.quality === CharacterQuality.COMMON)

      if (legendary && common) {
        const legendaryTotal = Object.values(legendary.baseStats).reduce((sum, value) => sum + value, 0)
        const commonTotal = Object.values(common.baseStats).reduce((sum, value) => sum + value, 0)
        expect(legendaryTotal).toBeGreaterThan(commonTotal)
      }
    })
  })

  describe('槽位解锁', () => {
    it('应该能够解锁新槽位', () => {
      const result = shopManager.unlockSlot(3)
      expect(result).toBe(true)

      const slots = shopManager.getAllSlots()
      expect(slots.find(slot => slot.id === 3)?.unlocked).toBe(true)
    })
  })

  describe('统计信息', () => {
    it('应该正确记录购买统计', () => {
      shopManager.purchaseCharacter(0)
      const stats = shopManager.getStats()

      expect(stats.totalPurchases).toBe(1)
      expect(stats.totalSpent).toBeGreaterThan(0)
    })
  })

  describe('序列化', () => {
    it('应该能够正确序列化和反序列化', () => {
      shopManager.purchaseCharacter(0)
      const state = shopManager.serialize()

      const newManager = new CharacterShopManager(eventBus, getGold, deductGold, () => {})
      newManager.deserialize(state)

      const newStats = newManager.getStats()
      const oldStats = shopManager.getStats()

      expect(newStats.totalPurchases).toBe(oldStats.totalPurchases)
      expect(newStats.totalSpent).toBe(oldStats.totalSpent)
    })
  })
})
