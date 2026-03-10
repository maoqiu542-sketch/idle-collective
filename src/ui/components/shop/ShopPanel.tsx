import { useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { EquipmentQuality, QUALITY_COLORS } from '@app-types/equipment.types'
import { ProductionBuildingType } from '@app-types/production-building.types'
import { ResourceType } from '@app-types/map.types'
import './ShopPanel.css'

type ShopTab = 'equipment' | 'building'

const EQUIPMENT_QUALITY_NAMES: Record<EquipmentQuality, string> = {
  [EquipmentQuality.COMMON]: '普通',
  [EquipmentQuality.UNCOMMON]: '精良',
  [EquipmentQuality.RARE]: '稀有',
  [EquipmentQuality.EPIC]: '史诗',
  [EquipmentQuality.LEGENDARY]: '传说',
}

const BUILDING_ICONS: Record<ProductionBuildingType, string> = {
  [ProductionBuildingType.LUMBER_MILL]: '🪵',
  [ProductionBuildingType.QUARRY]: '🪨',
  [ProductionBuildingType.RANCH]: '🐄',
}

const RESOURCE_NAMES: Record<string, string> = {
  wood: '木材',
  stone: '石材',
  food: '食物',
  leather: '皮革',
  gold: '金币',
}

interface ShopPanelProps {
  onClose: () => void
}

export function ShopPanel({ onClose }: ShopPanelProps) {
  const [activeTab, setActiveTab] = useState<ShopTab>('equipment')
  const { game, resources, shopItems = [], startBuildingPlacement, updateShopItems, updateEquipments } = useGameStore()

  const buildingConfigs = game?.getConfigManager().getProductionBuildingConfigs() || []

  const shopManager = game?.getShopManager()

  const availableShopItems = shopItems.filter(item => !item.purchased)
  const gold = resources.get(ResourceType.GOLD) || 0
  const wood = resources.get(ResourceType.WOOD) || 0
  const stone = resources.get(ResourceType.STONE) || 0

  const getQualityColor = (quality: EquipmentQuality): string => {
    return QUALITY_COLORS[quality] || '#FFFFFF'
  }

  const handlePurchase = (itemId: string, price: number) => {
    if (gold < price) {
      alert(`金币不足！缺少${price - gold}金币`)
      return
    }
    const result = shopManager?.purchaseItem(itemId)
    if (result?.success) {
      alert(`购买成功！获得 ${result.equipment?.name}`)
      updateShopItems()
      updateEquipments()
    }
  }

  const handleRefresh = () => {
    const result = shopManager?.instantRefresh()
    if (result && !result.success) {
      alert(result.message || '刷新失败')
    } else {
      updateShopItems()
    }
  }

  const handleBuildingPurchase = (buildingType: ProductionBuildingType, cost: { wood: number; stone: number; gold: number }) => {
    if (wood < cost.wood) {
      alert(`木材不足！缺少${cost.wood - wood}木材`)
      return
    }
    if (stone < cost.stone) {
      alert(`石材不足！缺少${cost.stone - stone}石材`)
      return
    }
    if (gold < cost.gold) {
      alert(`金币不足！缺少${cost.gold - gold}金币`)
      return
    }
    
    startBuildingPlacement(buildingType)
    onClose()
  }

  const canAffordBuilding = (cost: { wood: number; stone: number; gold: number }) => {
    return wood >= cost.wood && stone >= cost.stone && gold >= cost.gold
  }

  return (
    <div className="shop-panel">
      <div className="shop-header">
        <h2>商店</h2>
        <div className="gold-display">💰 {gold}</div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="shop-tabs">
        <button 
          className={activeTab === 'equipment' ? 'active' : ''}
          onClick={() => setActiveTab('equipment')}
        >
          装备
        </button>
        <button 
          className={activeTab === 'building' ? 'active' : ''}
          onClick={() => setActiveTab('building')}
        >
          建筑
        </button>
      </div>

      <div className="shop-content">
        {activeTab === 'equipment' && (
          <div className="equipment-shop">
            <div className="shop-actions">
              <button onClick={handleRefresh}>刷新 (100金币)</button>
            </div>
            <div className="item-grid">
              {availableShopItems.map(item => (
                <div key={item.id} className="shop-item">
                  <div 
                    className="item-icon"
                    style={{ borderColor: getQualityColor(item.equipment.quality) }}
                  >
                    {item.equipment.slot === 'weapon' && '⚔️'}
                    {item.equipment.slot === 'helmet' && '🪖'}
                    {item.equipment.slot === 'armor' && '🛡️'}
                    {item.equipment.slot === 'boots' && '👢'}
                    {item.equipment.slot === 'accessory' && '💍'}
                  </div>
                  <div className="item-info">
                    <div 
                      className="item-name"
                      style={{ color: getQualityColor(item.equipment.quality) }}
                    >
                      {item.equipment.name}
                    </div>
                    <div className="item-quality">
                      {EQUIPMENT_QUALITY_NAMES[item.equipment.quality]}
                    </div>
                    <div className="item-stats">
                      {item.equipment.stats.atk && <span>攻击+{item.equipment.stats.atk}</span>}
                      {item.equipment.stats.def && <span>防御+{item.equipment.stats.def}</span>}
                      {item.equipment.stats.hp && <span>生命+{item.equipment.stats.hp}</span>}
                    </div>
                    <div className="item-price">💰 {item.price}</div>
                  </div>
                  <button 
                    className="buy-btn"
                    onClick={() => handlePurchase(item.id, item.price)}
                    disabled={gold < item.price}
                  >
                    购买
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'building' && (
          <div className="building-shop">
            <div className="item-grid">
              {buildingConfigs.map((config) => {
                const woodCost = config.cost.wood || 0
                const stoneCost = config.cost.stone || 0
                const goldCost = config.cost.gold || 0
                const cost = { wood: woodCost, stone: stoneCost, gold: goldCost }
                const icon = BUILDING_ICONS[config.type] || '🏗️'
                const productionTime = Math.floor(config.productionInterval / 1000)
                const resourceName = RESOURCE_NAMES[config.outputResource] || config.outputResource
                const desc = `每${productionTime}秒产出${config.outputAmount}${resourceName}`

                return (
                  <div key={config.type} className="shop-item building-item">
                    <div className="item-icon">{icon}</div>
                    <div className="item-info">
                      <div className="item-name">{config.name}</div>
                      <div className="item-cost">
                        <span className={wood < woodCost ? 'insufficient' : ''}>
                          木材×{woodCost}
                        </span>
                        <span className={stone < stoneCost ? 'insufficient' : ''}>
                          石材×{stoneCost}
                        </span>
                        <span className={gold < goldCost ? 'insufficient' : ''}>
                          金币×{goldCost}
                        </span>
                      </div>
                      <div className="item-desc">{desc}</div>
                    </div>
                    <button
                      className="buy-btn"
                      onClick={() => handleBuildingPurchase(config.type, cost)}
                      disabled={!canAffordBuilding(cost)}
                    >
                      建造
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
