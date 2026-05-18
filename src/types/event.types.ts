/**
 * 事件相关类型定义
 * @module types/event.types
 */

import { Position, Tile, ResourceType } from './map.types'
import { Character, CharacterState } from './character.types'
import { Building } from './building.types'
import { ProductionBuildingType } from './production-building.types'
import { SixDimensionType } from './six-dimension.types'
import { EquipmentSlot, EquipmentQuality } from './equipment.types'
import { TaskType } from './priority.types'
import { BossReward } from './combat.types'

/** 游戏事件映射 */
export interface GameEvents {
  'game:init': { config: object }
  'game:started': Record<string, never>
  'game:stopped': Record<string, never>
  'game:pause': Record<string, never>
  'game:resume': Record<string, never>
  'game:tick': { tick: number; gameTime: number }
  
  'map:generated': { width: number; height: number }
  'map:loaded': { width: number; height: number }
  'map:tile-changed': { position: Position; tile: Tile }
  
  'character:spawned': { character: Character }
  'character:removed': { characterId: string }
  'character:moving': { characterId: string; from: Position; to: Position; estimatedTime: number }
  'character:arrived': { characterId: string; position: Position }
  'character:moved': { characterId: string; from: Position; to: Position }
  'character:state-changed': { characterId: string; from: CharacterState; to: CharacterState }
  'character:damaged': { characterId: string; amount: number }
  'character:healed': { characterId: string; amount: number }
  'character:talent-upgraded': { characterId: string; skill: string; newLevel: number }
  'character:rest-ended': { characterId: string }
  'character:ate': { characterId: string; amount: number }
  'character:equipped': { characterId: string; equipmentId: string; slot: EquipmentSlot; previousEquipmentId?: string }
  'character:unequipped': { characterId: string; equipmentId: string; slot: EquipmentSlot }
  'state-machine:transition': { from: CharacterState; to: CharacterState; timestamp: number }
  'state-machine:forced': { from: CharacterState; to: CharacterState; timestamp: number }
  'character:state-enter': { characterId: string; state: CharacterState }
  'character:state-exit': { characterId: string; state: CharacterState }
  
  'need:updated': { characterId: string; needType: string; change: number }
  'need:critical': { characterId: string; needType: string; value: number }
  'need:satisfied': { characterId: string; needType: string }
  
  'task:assigned': { taskId: string; characterId: string; taskType: TaskType }
  'task:started': { characterId: string; taskId: string; taskType: TaskType; estimatedDuration: number }
  'task:completed': { characterId: string; taskId: string; taskType: TaskType }
  'task:cancelled': { characterId: string; taskId: string }
  'task:interrupted': { taskId: string; characterId: string; reason: string }
  'task:failed': { taskId: string; characterId: string; reason: string }
  'task:progress': { characterId: string; taskType: string; progress: number; duration: number }
  'task:priority-changed': { characterId: string; taskType: TaskType; newLevel: number }
  'task:priorities-updated': { characterId: string; priorities: [TaskType, number][] }
  'task:disabled': { characterId: string; taskType: TaskType }
  'task:enabled': { characterId: string; taskType: TaskType }
  'task:forced': { characterId: string; taskType: TaskType; targetPosition?: { x: number; y: number }; duration: number }
  'task:force-cancelled': { characterId: string }
  'task:force-expired': { characterId: string }
  'task:priorities-reset': { characterId: string }
  
  'action:interrupted': { characterId: string; actionType: string }
  
  'resource:collected': { characterId: string; type: ResourceType; amount: number }
  'resource:harvested': { characterId?: string; type: ResourceType; amount: number; position: Position }
  'resource:stored': { type: ResourceType; amount: number; total: number }
  'resource:sold': { type: ResourceType; amount: number; gold: number }
  'resource:gathered': { characterId: string; resourceId: string; amount: number }
  'trade:completed': { buildingId: string; sold: Partial<Record<ResourceType, number>>; goldEarned: number; reason?: string }
  
  'building:placed': { building: Building }
  'building:created': { buildingId: string; type: ProductionBuildingType; position: Position }
  'building:removed': { buildingId: string }
  'building:destroyed': { buildingId: string; type: ProductionBuildingType }
  'building:upgraded': { buildingId: string; newLevel: number }
  'building:produced': { buildingId: string; resource: ResourceType; amount: number; efficiency?: number }
  'building:progress': { characterId: string; buildingId: string; progress: number }
  'building:completed': { buildingId: string; type: ProductionBuildingType }
  
  'building:purchased': { buildingId: string; type: ProductionBuildingType; cost: object }
  'building:construction-started': { buildingId: string }
  'building:constructed': { buildingId: string }
  'building:worker-assigned': { buildingId: string; workerId: string }
  'building:worker-removed': { buildingId: string; workerId?: string }
  
  'equipment:created': { equipmentId: string; name: string; quality: EquipmentQuality }
  'equipment:destroyed': { equipmentId: string }
  'equipment:equipped': { characterId: string; equipmentId: string; slot: EquipmentSlot }
  'equipment:unequipped': { characterId: string; equipmentId: string; slot: EquipmentSlot }
  'equipment:upgraded': { equipmentId: string; newLevel: number }
  'equipment:purchased': { equipmentId: string; name: string; quality: EquipmentQuality }
  
  'shop:refreshed': { itemCount: number }
  'shop:item-purchased': { itemId: string; equipment: object; price: number }
  
  'boss:appeared': { bossId: string; name: string; level: number }
  'boss:spawned': { bossId: string; name: string; level: number }
  'boss:engaged': { bossId: string; attackerId: string; bossName: string }
  'boss:damaged': { bossId: string; attackerId: string; damage: number; remainingHp: number }
  'boss:defeated': { bossId: string; attackerId: string; bossName: string; bossLevel: number; rewards: BossReward[] }
  'boss:fled': { bossId: string; attackerId: string }
  'boss:removed': { bossId: string }
  'boss:skill-used': { bossId: string; skillId: string; skillName: string; targets: string[]; damage: number; effects: object[]; visualEffect: string }
  
  'combat:started': { participants: string[]; bossId: string }
  'combat:engaged': { characterId: string; targetId: string; combatPower: number }
  'combat:attack': { attacker: string; target: string; damage: number; isCritical: boolean }
  'combat:ended': { result: object; bossId?: string }
  
  'craft:progress': { characterId: string; recipeId: string; progress: number }
  'work:progress': { characterId: string; buildingId: string; efficiency: number }
  
  'sixdim:levelup': { characterId: string; attribute: SixDimensionType; newLevel: number }
  
  'economy:gold-changed': { amount: number; total: number }
  'territory:expanded': { newWidth: number; newHeight: number }
  
  'save:started': Record<string, never>
  'save:completed': { timestamp: number }
  'load:started': Record<string, never>
  'load:completed': { timestamp: number }
  
  'error:occurred': { code: string; message: string; context?: object }
  
  'character-shop:refreshed': { itemCount: number }
  'character-shop:purchased': { character: object; price: number; slotId: number }
  'character-shop:slot-unlocked': { slotId: number }
  
  'essence:earned': { amount: number; source: string; bossLevel?: number; isFirstDefeat?: boolean }
  'essence:spent': { amount: number; purpose: string; fromLevel?: number; toLevel?: number }
  'essence:storage-upgraded': { newCapacity: number }
  
  'technology:station-created': { stationId: string; configId: string }
  'technology:worker-assigned': { stationId: string; workerId: string }
  'technology:worker-removed': { stationId: string; workerId: string }
  'technology:points-earned': { amount: number; source: string; total: number }
  'technology:research-started': { techId: string; pointCost: number }
  'technology:research-completed': { techId: string; name: string; unlocks: string[] }
  'technology:unlocked': { techId: string }
}

/** 事件处理器类型 */
export type EventHandler<T extends keyof GameEvents = keyof GameEvents> = (data: GameEvents[T]) => void
