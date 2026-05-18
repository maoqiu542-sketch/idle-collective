import { EventBus } from '@core/EventBus'
import { EquipmentManager } from '@domain/equipment/EquipmentManager'
import { Equipment } from '@app-types/equipment.types'
import { EQUIPMENT_INSTANT_REFRESH_COST } from '@domain/settlement/EconomyBalance'

const SHOP_REFRESH_INTERVAL = 24 * 60 * 60 * 1000
const INSTANT_REFRESH_COST = EQUIPMENT_INSTANT_REFRESH_COST
const INSTANT_REFRESH_COOLDOWN = 10 * 1000
const SHOP_SLOTS = 6

export interface ShopItem {
  id: string
  equipment: Equipment
  price: number
  purchased: boolean
}

export type { ShopItem as ShopItemType }

export class ShopManager {
  private equipmentManager: EquipmentManager
  private eventBus: EventBus
  private shopItems: ShopItem[] = []
  private lastRefreshTime: number = 0
  private lastInstantRefreshTime: number = 0
  private getGold: () => number
  private deductGold: (amount: number) => boolean

  constructor(
    eventBus: EventBus,
    equipmentManager: EquipmentManager,
    getGold: () => number = () => 0,
    deductGold: (amount: number) => boolean = () => true
  ) {
    this.eventBus = eventBus
    this.equipmentManager = equipmentManager
    this.getGold = getGold
    this.deductGold = deductGold
  }

  init(): void {
    this.refreshShop()
  }

  update(_deltaTime: number): void {
    const now = Date.now()
    if (now - this.lastRefreshTime >= SHOP_REFRESH_INTERVAL) {
      this.refreshShop()
    }
  }

  refreshShop(): void {
    this.shopItems = []
    const shopInventory = this.equipmentManager.getShopInventory()

    for (const equipment of shopInventory.slice(0, SHOP_SLOTS)) {
      const price = this.equipmentManager.getEquipmentPrice(equipment.id)
      this.shopItems.push({
        id: equipment.id,
        equipment,
        price,
        purchased: false,
      })
    }

    this.lastRefreshTime = Date.now()
    this.eventBus.emit('shop:refreshed', { itemCount: this.shopItems.length })
  }

  purchaseItem(itemId: string): { success: boolean; message?: string; equipment?: Equipment } {
    const item = this.shopItems.find(i => i.id === itemId)
    if (!item) {
      return { success: false, message: '商品不存在' }
    }

    if (item.purchased) {
      return { success: false, message: '该商品已售出' }
    }

    const currentGold = this.getGold()
    if (currentGold < item.price) {
      return { success: false, message: `金币不足！缺少${item.price - currentGold}金币` }
    }

    if (!this.deductGold(item.price)) {
      return { success: false, message: '金币扣除失败' }
    }

    item.purchased = true
    const equipment = this.equipmentManager.purchaseFromShop(itemId)

    this.eventBus.emit('shop:item-purchased', {
      itemId,
      equipment: item.equipment,
      price: item.price,
    })

    return { success: true, equipment: equipment || item.equipment }
  }

  instantRefresh(): { success: boolean; message?: string } {
    const now = Date.now()
    const timeSinceLastRefresh = now - this.lastInstantRefreshTime
    
    if (timeSinceLastRefresh < INSTANT_REFRESH_COOLDOWN) {
      const remainingSeconds = Math.ceil((INSTANT_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000)
      return { success: false, message: `刷新冷却中，请等待${remainingSeconds}秒` }
    }

    const currentGold = this.getGold()
    if (currentGold < INSTANT_REFRESH_COST) {
      return { success: false, message: `金币不足！需要${INSTANT_REFRESH_COST}金币刷新` }
    }

    if (!this.deductGold(INSTANT_REFRESH_COST)) {
      return { success: false, message: '金币扣除失败' }
    }

    this.lastInstantRefreshTime = now
    this.refreshShop()
    return { success: true }
  }

  getInstantRefreshCooldown(): number {
    return Math.max(0, INSTANT_REFRESH_COOLDOWN - (Date.now() - this.lastInstantRefreshTime))
  }

  getShopItems(): ShopItem[] {
    return this.shopItems.filter(i => !i.purchased)
  }

  getAllShopItems(): ShopItem[] {
    return this.shopItems
  }

  getTimeUntilNextRefresh(): number {
    return Math.max(0, SHOP_REFRESH_INTERVAL - (Date.now() - this.lastRefreshTime))
  }

  getInstantRefreshCost(): number {
    return INSTANT_REFRESH_COST
  }

  serialize(): { shopItems: ShopItem[]; lastRefreshTime: number } {
    return {
      shopItems: this.shopItems,
      lastRefreshTime: this.lastRefreshTime,
    }
  }

  deserialize(data: { shopItems: ShopItem[]; lastRefreshTime: number }): void {
    this.shopItems = data.shopItems
    this.lastRefreshTime = data.lastRefreshTime
  }
}
