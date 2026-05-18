import { useState } from 'react'
import { useGameStore } from '@ui/stores/gameStore'
import { useCharacterStore } from '@ui/stores/characterStore'
import { EquipmentSlot, EquipmentQuality, QUALITY_COLORS, EquipmentStats } from '@app-types/equipment.types'
import { Character } from '@app-types/character.types'
import './EquipmentPanel.css'

const V1_EQUIPMENT_SLOTS: EquipmentSlot[] = [
  EquipmentSlot.WEAPON,
  EquipmentSlot.ARMOR,
  EquipmentSlot.ACCESSORY,
]

const SLOT_NAMES: Record<EquipmentSlot, string> = {
  [EquipmentSlot.WEAPON]: '武器',
  [EquipmentSlot.HELMET]: '头盔',
  [EquipmentSlot.ARMOR]: '护甲',
  [EquipmentSlot.BOOTS]: '鞋子',
  [EquipmentSlot.ACCESSORY]: '饰品',
}

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  [EquipmentSlot.WEAPON]: '⚔️',
  [EquipmentSlot.HELMET]: '🪖',
  [EquipmentSlot.ARMOR]: '🛡️',
  [EquipmentSlot.BOOTS]: '👢',
  [EquipmentSlot.ACCESSORY]: '💍',
}

const QUALITY_NAMES: Record<EquipmentQuality, string> = {
  [EquipmentQuality.COMMON]: '普通',
  [EquipmentQuality.UNCOMMON]: '精良',
  [EquipmentQuality.RARE]: '稀有',
  [EquipmentQuality.EPIC]: '史诗',
  [EquipmentQuality.LEGENDARY]: '传说',
}

interface EquipmentPanelProps {
  character: Character
  onClose: () => void
}

export function EquipmentPanel({ character, onClose }: EquipmentPanelProps) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null)
  const { equipItem, unequipItem, getEquipmentById } = useGameStore()
  const { equipments } = useCharacterStore()

  const characterEquipments = useGameStore(state => state.getCharacterEquipments(character.id))

  const getEquippedItem = (slot: EquipmentSlot): { quality: EquipmentQuality; name: string; level: number; stats: EquipmentStats } | undefined => {
    const equipmentId = character.equipmentSlots[slot]
    return equipmentId ? getEquipmentById(equipmentId) : undefined
  }

  const handleSlotClick = (slot: EquipmentSlot) => {
    setSelectedSlot(selectedSlot === slot ? null : slot)
  }

  const handleEquip = (equipmentId: string, slot: EquipmentSlot) => {
    equipItem(character.id, equipmentId, slot)
    setSelectedSlot(null)
  }

  const handleUnequip = (slot: EquipmentSlot) => {
    unequipItem(character.id, slot)
    setSelectedSlot(null)
  }

  const getAvailableEquipmentsForSlot = (slot: EquipmentSlot) => {
    return equipments.filter(e => 
      e.slot === slot && 
      !characterEquipments.find(ce => ce.id === e.id)
    )
  }

  const calculateTotalStats = (): EquipmentStats => {
    const total: EquipmentStats = {
      atk: 0,
      def: 0,
      hp: 0,
      critRate: 0,
      critDmg: 0,
      atkSpd: 0,
    }

    for (const equipment of characterEquipments) {
      if (equipment.stats.atk) total.atk! += equipment.stats.atk
      if (equipment.stats.def) total.def! += equipment.stats.def
      if (equipment.stats.hp) total.hp! += equipment.stats.hp
      if (equipment.stats.critRate) total.critRate! += equipment.stats.critRate
      if (equipment.stats.critDmg) total.critDmg! += equipment.stats.critDmg
      if (equipment.stats.atkSpd) total.atkSpd! += equipment.stats.atkSpd
    }

    return total
  }

  const totalStats = calculateTotalStats()

  return (
    <div className="equipment-panel">
      <div className="panel-header">
        <h2>{character.name} - 装备栏</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        <div className="equipment-slots">
          {V1_EQUIPMENT_SLOTS.map(slot => {
            const equipped = getEquippedItem(slot)
            const isSelected = selectedSlot === slot

            return (
              <div key={slot} className="slot-container">
                <div
                  className={`equipment-slot ${equipped ? 'equipped' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSlotClick(slot)}
                  style={{ borderColor: equipped ? QUALITY_COLORS[equipped.quality] : '#666' }}
                >
                  <div className="slot-icon">{equipped ? SLOT_ICONS[slot] : SLOT_ICONS[slot]}</div>
                  {equipped && (
                    <div className="slot-quality-indicator" style={{ backgroundColor: QUALITY_COLORS[equipped.quality] }} />
                  )}
                </div>
                <div className="slot-name">{SLOT_NAMES[slot]}</div>

                {isSelected && (
                  <div className="slot-detail">
                    {equipped ? (
                      <div className="equipped-item">
                        <div className="item-header">
                          <span className="item-name" style={{ color: QUALITY_COLORS[equipped.quality] }}>
                            {equipped.name}
                          </span>
                          <span className="item-level">Lv.{equipped.level}</span>
                        </div>
                        <div className="item-quality">{QUALITY_NAMES[equipped.quality]}</div>
                        <div className="item-stats">
                          {equipped.stats.atk && <div>攻击 +{equipped.stats.atk}</div>}
                          {equipped.stats.def && <div>防御 +{equipped.stats.def}</div>}
                          {equipped.stats.hp && <div>生命 +{equipped.stats.hp}</div>}
                          {equipped.stats.critRate && <div>暴击率 +{equipped.stats.critRate}%</div>}
                          {equipped.stats.critDmg && <div>暴击伤害 +{equipped.stats.critDmg}%</div>}
                          {equipped.stats.atkSpd && <div>攻击速度 +{equipped.stats.atkSpd.toFixed(2)}</div>}
                        </div>
                        <button className="unequip-btn" onClick={() => handleUnequip(slot)}>
                          卸下装备
                        </button>
                      </div>
                    ) : (
                      <div className="empty-slot">
                        <div className="empty-text">空槽位</div>
                        <div className="available-items">
                          {getAvailableEquipmentsForSlot(slot).length > 0 ? (
                            <>
                              <div className="available-label">可装备:</div>
                              {getAvailableEquipmentsForSlot(slot).map(eq => (
                                <div
                                  key={eq.id}
                                  className="available-item"
                                  onClick={() => handleEquip(eq.id, slot)}
                                >
                                  <span style={{ color: QUALITY_COLORS[eq.quality] }}>{eq.name}</span>
                                  <span className="item-stats-preview">
                                    {eq.stats.atk && ` 攻+${eq.stats.atk}`}
                                    {eq.stats.def && ` 防+${eq.stats.def}`}
                                    {eq.stats.hp && ` 血+${eq.stats.hp}`}
                                  </span>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="no-items">没有可用的装备</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="total-stats">
          <h3>装备总属性</h3>
          <div className="stats-grid">
            {(totalStats.atk ?? 0) > 0 && <div className="stat-item"><span>攻击</span><span>+{totalStats.atk}</span></div>}
            {(totalStats.def ?? 0) > 0 && <div className="stat-item"><span>防御</span><span>+{totalStats.def}</span></div>}
            {(totalStats.hp ?? 0) > 0 && <div className="stat-item"><span>生命</span><span>+{totalStats.hp}</span></div>}
            {(totalStats.critRate ?? 0) > 0 && <div className="stat-item"><span>暴击率</span><span>+{totalStats.critRate}%</span></div>}
            {(totalStats.critDmg ?? 0) > 0 && <div className="stat-item"><span>暴击伤害</span><span>+{totalStats.critDmg}%</span></div>}
            {(totalStats.atkSpd ?? 0) > 0 && <div className="stat-item"><span>攻击速度</span><span>+{(totalStats.atkSpd ?? 0).toFixed(2)}</span></div>}
          </div>
        </div>
      </div>
    </div>
  )
}
