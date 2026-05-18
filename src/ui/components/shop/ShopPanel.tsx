import { useMemo, useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { useResourceStore } from '@ui/stores/resourceStore'
import { useCharacterStore } from '@ui/stores/characterStore'
import { EquipmentQuality, EquipmentSlot, QUALITY_COLORS } from '@app-types/equipment.types'
import {
  ProductionBuildingConfig,
  ProductionBuildingType,
} from '@app-types/production-building.types'
import { ResourceType } from '@app-types/map.types'
import { getBuildingAssetPath, getResourceUiAssetPath } from '@data/assets/artAssets'
import './ShopPanel.css'

type ShopTab = 'equipment' | 'building'
type BuildingCategory = 'production' | 'infrastructure' | 'military' | 'research'

interface ShopPanelProps {
  onClose: () => void
}

const EQUIPMENT_QUALITY_NAMES: Record<EquipmentQuality, string> = {
  [EquipmentQuality.COMMON]: '普通',
  [EquipmentQuality.UNCOMMON]: '优秀',
  [EquipmentQuality.RARE]: '稀有',
  [EquipmentQuality.EPIC]: '史诗',
  [EquipmentQuality.LEGENDARY]: '传奇',
}

const BUILDING_CATEGORY_INFO: Record<BuildingCategory, { name: string; icon: string }> = {
  production: { name: '生产', icon: '🌾' },
  infrastructure: { name: '基础', icon: '🏠' },
  military: { name: '战备', icon: '⚔️' },
  research: { name: '科研', icon: '🔬' },
}

const BUILDING_CATEGORY_BY_TYPE: Partial<Record<ProductionBuildingType, BuildingCategory>> = {
  [ProductionBuildingType.LUMBER_MILL]: 'production',
  [ProductionBuildingType.QUARRY]: 'production',
  [ProductionBuildingType.FARM]: 'production',
  [ProductionBuildingType.HOUSE]: 'infrastructure',
  [ProductionBuildingType.KITCHEN]: 'infrastructure',
  [ProductionBuildingType.WAREHOUSE]: 'infrastructure',
  [ProductionBuildingType.TRADE_STATION]: 'infrastructure',
  [ProductionBuildingType.RECRUITMENT_STATION]: 'military',
  [ProductionBuildingType.BARRACKS]: 'military',
  [ProductionBuildingType.RESEARCH_DESK]: 'research',
}

const BUILDING_ICONS: Partial<Record<ProductionBuildingType, string>> = {
  [ProductionBuildingType.LUMBER_MILL]: '🪵',
  [ProductionBuildingType.QUARRY]: '🪨',
  [ProductionBuildingType.FARM]: '🌾',
  [ProductionBuildingType.WAREHOUSE]: '📦',
  [ProductionBuildingType.KITCHEN]: '🍳',
  [ProductionBuildingType.HOUSE]: '🏠',
  [ProductionBuildingType.TRADE_STATION]: '💱',
  [ProductionBuildingType.BARRACKS]: '🛡️',
  [ProductionBuildingType.RECRUITMENT_STATION]: '🏕️',
  [ProductionBuildingType.RESEARCH_DESK]: '🔬',
}

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  [EquipmentSlot.WEAPON]: '🗡️',
  [EquipmentSlot.HELMET]: '⛑️',
  [EquipmentSlot.ARMOR]: '🛡️',
  [EquipmentSlot.BOOTS]: '🥾',
  [EquipmentSlot.ACCESSORY]: '💍',
}

function BuildingIcon({ type, size = '64' }: { type: ProductionBuildingType; size?: '32' | '64' | '128' }) {
  const assetPath = getBuildingAssetPath(type, size)
  if (!assetPath) return <span className="building-icon-fallback">{BUILDING_ICONS[type] || '🏗️'}</span>

  return (
    <img
      src={assetPath}
      alt={type}
      className="building-icon-img"
      style={{ width: size === '64' ? 48 : size === '32' ? 32 : 64, height: size === '64' ? 48 : size === '32' ? 32 : 64 }}
    />
  )
}

function ResourceIcon({ type, size = '32' }: { type: ResourceType | string; size?: '32' | '64' | '128' }) {
  const assetPath = getResourceUiAssetPath(type, size)
  const fallbackMap: Record<string, string> = {
    wood: '🪵',
    stone: '🪨',
    food: '🍞',
    gold: '💰',
    core_parts: '⚙️',
  }
  if (!assetPath) return <span>{fallbackMap[type] || '❓'}</span>

  return (
    <img
      src={assetPath}
      alt={type}
      className="resource-icon-img"
      style={{ width: size === '64' ? 20 : 16, height: size === '64' ? 20 : 16 }}
    />
  )
}

const BUILDING_EFFECT_TEXT: Partial<Record<ProductionBuildingType, string>> = {
  [ProductionBuildingType.LUMBER_MILL]: '自动产出木材，支撑聚落扩张与升级。',
  [ProductionBuildingType.QUARRY]: '自动产出石材，支撑建造和建筑升级。',
  [ProductionBuildingType.FARM]: '稳定产出食物，维持聚落运转。',
  [ProductionBuildingType.HOUSE]: '提供住房容量，并提升休息恢复效率。',
  [ProductionBuildingType.KITCHEN]: '提高进食恢复，并强化农场与后勤效率。',
  [ProductionBuildingType.WAREHOUSE]: '提高核心零件容量，并提升生产周转效率。',
  [ProductionBuildingType.TRADE_STATION]: '将盈余木材、石材与食物自动转成金币，为招募和装备提供经济来源。',
  [ProductionBuildingType.BARRACKS]: '强化战备训练和 Boss 前准备。',
  [ProductionBuildingType.RECRUITMENT_STATION]: '开放商队招募，提升候选质量与刷新收益。',
  [ProductionBuildingType.RESEARCH_DESK]: '提供研究席位并提升研究产出。',
}

function getBuildingConfigs(
  game: ReturnType<typeof useGameStore.getState>['game']
): ProductionBuildingConfig[] {
  return (game?.getConfigManager().getProductionBuildingConfigs() || []).filter(config => {
    return BUILDING_CATEGORY_BY_TYPE[config.type] !== undefined
  })
}

export function ShopPanel({ onClose }: ShopPanelProps) {
  const [activeTab, setActiveTab] = useState<ShopTab>('building')
  const [buildingCategory, setBuildingCategory] = useState<BuildingCategory>('production')

  const { game, startBuildingPlacement, updateShopItems, updateEquipments } = useGameStore()
  const { resources } = useResourceStore()
  const { shopItems = [] } = useCharacterStore()

  const shopManager = game?.getShopManager()
  const availableShopItems = shopItems.filter(item => !item.purchased)
  const buildingConfigs = useMemo(() => getBuildingConfigs(game), [game])

  const gold = resources.get(ResourceType.GOLD) || 0
  const wood = resources.get(ResourceType.WOOD) || 0
  const stone = resources.get(ResourceType.STONE) || 0

  const filteredBuildings = useMemo(() => {
    return buildingConfigs.filter(config => BUILDING_CATEGORY_BY_TYPE[config.type] === buildingCategory)
  }, [buildingCategory, buildingConfigs])

  const handlePurchaseEquipment = (itemId: string, price: number) => {
    if (gold < price) {
      alert(`金币不足，还需要 ${price - gold} 金币。`)
      return
    }

    const result = shopManager?.purchaseItem(itemId)
    if (result?.success) {
      alert(`购买成功：${result.equipment?.name || '装备已入库'}`)
      updateShopItems()
      updateEquipments()
    }
  }

  const handleRefresh = () => {
    const result = shopManager?.instantRefresh()
    if (result && !result.success) {
      alert(result.message || '刷新失败')
      return
    }

    updateShopItems()
  }

  const handleBuild = (building: ProductionBuildingConfig) => {
    const totalWood = building.cost.wood || 0
    const totalStone = building.cost.stone || 0
    const totalGold = building.cost.gold || 0

    if (wood < totalWood) {
      alert(`木材不足，还需要 ${totalWood - wood}。`)
      return
    }
    if (stone < totalStone) {
      alert(`石材不足，还需要 ${totalStone - stone}。`)
      return
    }
    if (gold < totalGold) {
      alert(`金币不足，还需要 ${totalGold - gold}。`)
      return
    }

    startBuildingPlacement(building.type)
    onClose()
  }

  const canAffordBuilding = (building: ProductionBuildingConfig) =>
    wood >= (building.cost.wood || 0) &&
    stone >= (building.cost.stone || 0) &&
    gold >= (building.cost.gold || 0)

  return (
    <div className="shop-panel">
      <div className="shop-header">
        <h2>商店</h2>
        <div className="resource-display">
          <span><ResourceIcon type="wood" /> {wood}</span>
          <span><ResourceIcon type="stone" /> {stone}</span>
          <span><ResourceIcon type="gold" /> {gold}</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="shop-tabs main-tabs">
        <button className={activeTab === 'equipment' ? 'active' : ''} onClick={() => setActiveTab('equipment')}>
          装备
        </button>
        <button className={activeTab === 'building' ? 'active' : ''} onClick={() => setActiveTab('building')}>
          建造
        </button>
      </div>

      <div className="shop-content">
        {activeTab === 'equipment' && (
          <div className="equipment-shop">
            <div className="shop-actions">
              <button className="refresh-btn" onClick={handleRefresh}>
                刷新装备
              </button>
            </div>
            <div className="shop-helper-text">
              金币主要来自贸易站的自动交易和 Boss 奖励。装备购买与刷新都会消耗金币。
            </div>

            <div className="item-grid">
              {availableShopItems.map(item => (
                <div key={item.id} className="shop-item">
                  <div className="item-icon" style={{ borderColor: QUALITY_COLORS[item.equipment.quality] }}>
                    {SLOT_ICONS[item.equipment.slot] || '🎁'}
                  </div>
                  <div className="item-info">
                    <div className="item-name" style={{ color: QUALITY_COLORS[item.equipment.quality] }}>
                      {item.equipment.name}
                    </div>
                    <div className="item-quality">{EQUIPMENT_QUALITY_NAMES[item.equipment.quality]}</div>
                    <div className="item-stats">
                      {item.equipment.stats.atk && <span>攻 +{item.equipment.stats.atk}</span>}
                      {item.equipment.stats.def && <span>防 +{item.equipment.stats.def}</span>}
                      {item.equipment.stats.hp && <span>血 +{item.equipment.stats.hp}</span>}
                    </div>
                    <div className="item-price">💰 {item.price}</div>
                  </div>
                  <button
                    className="buy-btn"
                    onClick={() => handlePurchaseEquipment(item.id, item.price)}
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
            <div className="shop-tabs sub-tabs">
              {Object.entries(BUILDING_CATEGORY_INFO).map(([key, info]) => (
                <button
                  key={key}
                  className={buildingCategory === key ? 'active' : ''}
                  onClick={() => setBuildingCategory(key as BuildingCategory)}
                >
                  {info.icon} {info.name}
                </button>
              ))}
            </div>

            <div className="item-grid building-grid">
              {filteredBuildings.map(building => {
                const woodCost = building.cost.wood || 0
                const stoneCost = building.cost.stone || 0
                const goldCost = building.cost.gold || 0

                return (
                  <div key={building.type} className="shop-item building-item">
                    <div className="item-icon"><BuildingIcon type={building.type} /></div>
                    <div className="item-info">
                      <div className="item-name">{building.name}</div>
                      <div className="item-desc">{building.description}</div>
                      <div className="building-effect">
                        功能：{BUILDING_EFFECT_TEXT[building.type] || '该建筑功能正在整理中。'}
                      </div>
                      <div className="building-size">
                        尺寸：{building.size.width}x{building.size.height}
                      </div>
                    </div>
                    <div className="cost-display">
                      {woodCost > 0 && (
                        <div className="cost-item">
                          <ResourceIcon type="wood" />
                          <span className={wood >= woodCost ? '' : 'insufficient'}>{woodCost}</span>
                        </div>
                      )}
                      {stoneCost > 0 && (
                        <div className="cost-item">
                          <ResourceIcon type="stone" />
                          <span className={stone >= stoneCost ? '' : 'insufficient'}>{stoneCost}</span>
                        </div>
                      )}
                      {goldCost > 0 && (
                        <div className="cost-item">
                          <ResourceIcon type="gold" />
                          <span className={gold >= goldCost ? '' : 'insufficient'}>{goldCost}</span>
                        </div>
                      )}
                    </div>
                    <button
                      className="buy-btn build-btn"
                      onClick={() => handleBuild(building)}
                      disabled={!canAffordBuilding(building)}
                    >
                      开始建造
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
