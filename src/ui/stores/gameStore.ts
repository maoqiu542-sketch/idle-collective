import { create } from 'zustand'
import { Game } from '@core/Game'
import { ResourceType } from '@app-types/map.types'
import { EquipmentQuality, EquipmentSlot } from '@app-types/equipment.types'
import { ProfessionType } from '@app-types/character.types'
import { ProductionBuildingType } from '@app-types/production-building.types'
import { TaskType } from '@app-types/priority.types'
import { TaskPriorityLevel } from '@app-types/task-priority.types'
import { SkillType } from '@app-types/character.types'
import {
  DevelopmentBreakdown,
  TradeStateSnapshot,
  GlobalStrategyPreset,
  PriorityMode,
  RecruitmentStationState,
} from '@app-types/settlement.types'
import { Logger } from '@utils/logger'
import { useResourceStore } from './resourceStore'
import { useCharacterStore } from './characterStore'
import { useBuildingStore } from './buildingStore'
import { useTechStore } from './techStore'

const logger = new Logger('gameStore')
const STORAGE_KEY_PREFIX = 'idle_collective_save_'
const MAX_SAVE_SLOTS = 5
const AUTO_SAVE_SLOT = 0
const AUTO_SAVE_INTERVAL_MS = 60 * 1000
const AUTO_SAVE_KEY = 'idle_collective_auto_save'
let initializationPromise: Promise<void> | null = null

function getBuildingCompletionHint(type: ProductionBuildingType): string {
  switch (type) {
    case ProductionBuildingType.HOUSE:
      return '住房已启用，休息恢复提升'
    case ProductionBuildingType.KITCHEN:
      return '厨房启用，进食恢复与农场效率提升'
    case ProductionBuildingType.WAREHOUSE:
      return '仓库启用，生产周转提升'
    case ProductionBuildingType.BARRACKS:
      return '兵营启用，战备训练提升'
    case ProductionBuildingType.TRADE_STATION:
      return '贸易站启用，可将盈余资源自动转成金币'
    case ProductionBuildingType.RECRUITMENT_STATION:
      return '招募站启用，商队开始到访'
    case ProductionBuildingType.RESEARCH_DESK:
      return '研究台启用，可开始研究'
    case ProductionBuildingType.LUMBER_MILL:
      return '伐木场启用，开始自动产出木材'
    case ProductionBuildingType.QUARRY:
      return '采石场启用，开始自动产出石材'
    case ProductionBuildingType.FARM:
      return '农场启用，开始稳定产出食物'
    default:
      return '建筑已完工并开始生效'
  }
}

interface GameCoreState {
  game: Game | null
  mapData: {
    width: number
    height: number
    tiles: any[][]
  } | null
  isPaused: boolean
  isInitialized: boolean
  isInitializing: boolean
  manualHarvestCount: number
  globalStrategyPreset: GlobalStrategyPreset
  priorityMode: PriorityMode
  settlementLivability: number
  settlementDevelopment: number
  developmentBreakdown: DevelopmentBreakdown
  recruitmentStationState: RecruitmentStationState
  tradeState: TradeStateSnapshot
  saveVersion: string
  interventionRevision: number

  init: () => Promise<void>
  start: () => void
  pause: () => void
  resume: () => void
  subscribeToEvents: () => void
  updateCharacters: () => void
  updateResources: () => void
  updateMapData: () => void
  updateBuildings: () => void
  updateEquipments: () => void
  updateShopItems: () => void
  updateShopCharacters: () => void
  updateEssence: () => void
  updateTechPoints: () => void
  updateSettlementState: () => void
  publishFloatSnapshot: () => void

  // character actions (delegated)
  selectCharacter: (characterId: string | null) => void
  equipItem: (characterId: string, equipmentId: string, slot: EquipmentSlot) => boolean
  unequipItem: (characterId: string, slot: EquipmentSlot) => boolean
  setSkillPriority: (characterId: string, skill: string, priority: number) => void
  getEquipmentById: (equipmentId: string) => any
  getCharacterEquipments: (characterId: string) => any[]
  getTaskProgress: (characterId: string) => any
  updateTaskProgress: (characterId: string, progress: number) => void
  createCharacter: (profession: ProfessionType) => boolean
  purchaseCharacter: (slotId: number) => boolean
  refreshShop: () => { success: boolean; message?: string }
  getSaveSlots: () => (import('@app-types/save.types').SaveMetadata | null)[]
  saveGameToSlot: (slotIndex: number, name: string) => { success: boolean; message?: string }
  loadGameFromSlot: (slotIndex: number) => { success: boolean; message?: string }
  deleteSaveSlot: (slotIndex: number) => boolean
  applyGlobalStrategyPreset: (preset: Exclude<GlobalStrategyPreset, 'none'>) => void
  clearGlobalStrategyPreset: () => void
  canEditCharacterPriority: () => boolean
  setTradeEnabled: (enabled: boolean) => void
  startAutoSave: () => void
  stopAutoSave: () => void
  autoSave: () => void
  hasAutoSave: () => boolean
  loadAutoSave: () => boolean

  // building actions (delegated)
  startBuildingPlacement: (type: ProductionBuildingType) => void
  cancelBuildingPlacement: () => void
  placeBuilding: (type: ProductionBuildingType, x: number, y: number) => boolean
  upgradeBuilding: (buildingId: string) => { success: boolean; message?: string; newLevel?: number }
  tryManualHarvest: (x: number, y: number) => { success: boolean; amount?: number; resourceType?: ResourceType; message?: string }

  // resource actions (delegated)
  addResource: (type: ResourceType, amount: number) => void
  grantDebugEquipmentPack: (quality?: EquipmentQuality) => number
  spawnDebugBoss: () => void

  // intervention actions (delegated)
  setTaskPriority: (characterId: string, taskType: TaskType, level: TaskPriorityLevel) => boolean
  disableTask: (characterId: string, taskType: TaskType) => boolean
  enableTask: (characterId: string, taskType: TaskType) => boolean
  forceTask: (characterId: string, taskType: TaskType, targetPosition?: { x: number; y: number }) => boolean
  cancelForcedTask: (characterId: string) => boolean
  resetTaskPriorities: (characterId: string) => void
  getCharacterPriorities: (characterId: string) => import('@app-types/task-priority.types').CharacterTaskPriority | undefined
  getPendingSessionSummary: () => import('@app-types/session.types').SessionSummary | null
  dismissSessionSummary: () => void
}

export const useGameStore = create<GameCoreState>((set, get) => ({
  game: null,
  mapData: null,
  isPaused: false,
  isInitialized: false,
  isInitializing: false,
  manualHarvestCount: 0,
  globalStrategyPreset: 'none',
  priorityMode: 'manual',
  settlementLivability: 0,
  settlementDevelopment: 0,
  developmentBreakdown: {
    research: 0,
    building: 0,
    coreParts: 0,
    combat: 0,
    balanceFactor: 1,
  },
  recruitmentStationState: {
    stationLevel: 0,
    candidateCount: 0,
    maxCandidates: 0,
    nextRefreshAt: 0,
    manualRefreshCost: 50,
    refreshIntervalMs: 30 * 60 * 1000,
    qualityBonus: 0,
  },
  tradeState: {
    stationLevel: 0,
    enabled: false,
    reserve: { wood: 120, stone: 80, food: 100 },
    queuedBuffer: { wood: 0, stone: 0, food: 0 },
    cycleIntervalMs: 20 * 1000,
    cycleCap: 0,
    estimatedGoldPerMinute: 0,
    lastResult: null,
  },
  saveVersion: '2.1.0',
  interventionRevision: 0,

  init: async () => {
    if (get().isInitialized) {
      return
    }

    if (get().isInitializing) {
      if (initializationPromise) {
        return initializationPromise
      }

      logger.warn('Game already initializing or initialized, skipping')
      return
    }

    set({ isInitializing: true })
    initializationPromise = (async () => {
      logger.info('Initializing game...')
      const game = new Game({ mapWidth: 50, mapHeight: 50 })
      await game.initialize()
      set({ game, isInitialized: true, saveVersion: game.getSaveVersion(), manualHarvestCount: 0 })
      get().subscribeToEvents()

      const hasAutoSave = localStorage.getItem(AUTO_SAVE_KEY)
      const autoSaveSlotKey = `${STORAGE_KEY_PREFIX}${AUTO_SAVE_SLOT}`
      const hasAutoSaveData = localStorage.getItem(autoSaveSlotKey)
      logger.info(`init: autoSaveFlag=${hasAutoSave}, autoSaveData=${hasAutoSaveData ? 'exists' : 'null'}`)

      if (hasAutoSave === 'true' && hasAutoSaveData) {
        logger.info('Found auto save, attempting to load...')
        const loaded = get().loadAutoSave()
        if (loaded) {
          logger.info('Auto save loaded successfully')
          get().start()
          get().startAutoSave()
          return
        }
        logger.warn('Failed to load auto save, starting new game')
      }

      get().updateCharacters()
      get().updateResources()
      get().updateMapData()
      get().updateShopItems()
      try { get().updateShopCharacters() } catch (e) { logger.error('Failed to update shop characters:', e) }
      try { get().updateEssence() } catch (e) { logger.error('Failed to update essence:', e) }
      try { get().updateTechPoints() } catch (e) { logger.error('Failed to update tech points:', e) }
      try { get().updateSettlementState() } catch (e) { logger.error('Failed to update settlement state:', e) }
      logger.info('Game initialized')
    })()

    try {
      await initializationPromise
    } finally {
      initializationPromise = null
      set({ isInitializing: false })
    }
  },

  start: () => {
    const { game } = get()
    if (!game) return
    game.start()
    set({ isPaused: false })
    get().startAutoSave()
    logger.info('Game started')
  },

  pause: () => {
    const { game } = get()
    if (!game) return
    game.pause()
    set({ isPaused: true })
  },

  resume: () => {
    const { game } = get()
    if (!game) return
    game.resume()
    set({ isPaused: false })
  },

  subscribeToEvents: () => {
    logger.debug('Subscribing to events')
    const { game } = get()
    if (!game) return
    const eventBus = game.getEventBus()

    eventBus.on('game:tick', () => {
      get().updateCharacters()
      get().updateResources()
      get().updateMapData()
      get().updateSettlementState()
      get().publishFloatSnapshot()
    })

    eventBus.on('character:spawned', () => {
      logger.debug('Received character:spawned event')
      get().updateCharacters()
      get().updateSettlementState()
    })

    eventBus.on('character:state-changed', (data: any) => {
      logger.debug('Character state changed:', data.characterId, data.from, '->', data.to)
      get().updateCharacters()
    })

    eventBus.on('task:started', (data: any) => {
      useCharacterStore.getState().setTaskProgress(data.characterId, {
        characterId: data.characterId,
        taskType: data.taskType,
        progress: 0,
        duration: data.estimatedDuration,
        startTime: Date.now()
      })
    })

    eventBus.on('task:progress', (data: any) => {
      const existing = useCharacterStore.getState().getTaskProgress(data.characterId)
      if (existing) {
        useCharacterStore.getState().updateTaskProgress(data.characterId, data.progress)
      }
    })

    eventBus.on('task:completed', (data: any) => {
      useCharacterStore.getState().removeTaskProgress(data.characterId)
    })

    eventBus.on('resource:collected', () => {
      logger.debug('Resource collected')
      get().updateResources()
      get().updateMapData()
    })

    eventBus.on('resource:harvested', (data: { type: ResourceType; amount: number; position: { x: number; y: number } }) => {
      const resourceNames: Record<string, string> = {
        [ResourceType.WOOD]: '木材',
        [ResourceType.STONE]: '石材',
        [ResourceType.FOOD]: '食物',
        [ResourceType.GOLD]: '金币',
        [ResourceType.CORE_PARTS]: '核心零件',
      }

      useResourceStore.getState().addFloatingText(
        `+${data.amount} ${resourceNames[data.type] || data.type}`,
        data.position.x,
        data.position.y,
        'resource'
      )

      get().updateResources()
      get().updateMapData()
    })

    eventBus.on('building:created', () => {
      logger.debug('Building created')
      get().updateBuildings()
      get().updateSettlementState()
    })

      eventBus.on('building:completed', (data: { buildingId: string; type: ProductionBuildingType }) => {
        logger.debug('Building completed')
        get().updateBuildings()
        get().updateSettlementState()

        const building = game.getProductionBuildingManager().getBuilding(data.buildingId)
        if (building) {
          useResourceStore.getState().addFloatingText(
            getBuildingCompletionHint(data.type),
            building.position.x,
            building.position.y,
            'success'
          )
        }
      })

    eventBus.on('building:upgraded', () => {
      logger.debug('Building upgraded')
      get().updateBuildings()
      get().updateResources()
      get().updateSettlementState()
      get().updateEssence()
    })

    eventBus.on('building:produced', (data: { buildingId: string; resource: ResourceType; amount: number }) => {
        logger.debug('Building produced:', data)
        game.getResourceManager().add(data.resource, data.amount)
        get().updateResources()
        const building = game.getProductionBuildingManager().getBuilding(data.buildingId)
        if (building) {
          const config = game.getConfigManager().getProductionBuildingConfigs().find(item => item.id === building.configId)
          const resourceNames: Record<string, string> = {
            [ResourceType.WOOD]: '木材',
            [ResourceType.STONE]: '石材',
            [ResourceType.FOOD]: '食物',
            [ResourceType.GOLD]: '金币',
            [ResourceType.CORE_PARTS]: '核心零件',
          }
          const resourceName = resourceNames[data.resource] || data.resource
          const centerX = building.position.x + (((config?.size.width || 1) - 1) / 2)
          useResourceStore.getState().addFloatingText(
            `${building.name} +${data.amount} ${resourceName}`,
            centerX,
            building.position.y,
            'resource'
          )
        }
    })

    eventBus.on('trade:completed', (data: { buildingId: string; sold: Partial<Record<ResourceType, number>>; goldEarned: number; reason?: string }) => {
      const building = game.getProductionBuildingManager().getBuilding(data.buildingId)
      if (building) {
        const soldParts = Object.entries(data.sold)
          .filter(([, amount]) => typeof amount === 'number' && amount > 0)
          .map(([resource, amount]) => {
            const resourceNames: Record<string, string> = {
              [ResourceType.WOOD]: '木材',
              [ResourceType.STONE]: '石材',
              [ResourceType.FOOD]: '食物',
            }
            return `${resourceNames[resource] || resource}x${amount}`
          })
        const centerX = building.position.x + 0.5
        const message = data.goldEarned > 0
          ? `${building.name} 卖出 ${soldParts.join(' / ')}，+${data.goldEarned} 金币`
          : data.reason || `${building.name} 本轮未成交`

        useResourceStore.getState().addFloatingText(message, centerX, building.position.y, data.goldEarned > 0 ? 'resource' : 'success')
      }

      get().updateResources()
      get().updateSettlementState()
    })

    eventBus.on('shop:refreshed', () => {
      logger.debug('Shop refreshed')
      get().updateShopItems()
    })

    eventBus.on('equipment:created', () => {
      get().updateEquipments()
    })

    eventBus.on('character-shop:refreshed', () => {
      get().updateShopCharacters()
      get().updateSettlementState()
    })

    eventBus.on('character-shop:purchased', () => {
      get().updateShopCharacters()
      get().updateCharacters()
      get().updateResources()
      get().updateSettlementState()
    })

    eventBus.on('essence:earned', () => {
      get().updateEssence()
      get().updateResources()
      get().updateSettlementState()
    })

    eventBus.on('essence:spent', () => {
      get().updateEssence()
      get().updateResources()
      get().updateSettlementState()
    })

    eventBus.on('technology:points-earned', () => {
      get().updateTechPoints()
    })

    eventBus.on('technology:research-completed', () => {
      get().updateTechPoints()
      get().updateBuildings()
      get().updateSettlementState()
    })
  },

  updateCharacters: () => {
    const { game } = get()
    if (!game) return
    const characterManager = game.getCharacterManager()
    const characters = characterManager.getAll()
    useCharacterStore.getState().setCharacters(characters)
  },

  updateResources: () => {
    const { game } = get()
    if (!game) return
    const gameResources = game.getResources()
    useResourceStore.getState().setResources(gameResources)
  },

  updateMapData: () => {
    const { game } = get()
    if (!game) return
    const mapSystem = game.getMapSystem()
    const mapData = mapSystem.getMapData()
    if (mapData) {
      logger.debug('Map data updated:', { width: mapData.width, height: mapData.height })
      set({ mapData })
    }
  },

  updateBuildings: () => {
    const { game } = get()
    if (!game) return
    const buildingManager = game.getProductionBuildingManager()
    const buildings = buildingManager.getAllBuildings()
    useBuildingStore.getState().setBuildings(buildings)
  },

  updateEquipments: () => {
    const { game } = get()
    if (!game) return
    const equipmentManager = game.getEquipmentManager()
    const equipments = equipmentManager.getAllEquipments()
    useCharacterStore.getState().setEquipments(equipments)
  },

  updateShopItems: () => {
    const { game } = get()
    if (!game) return
    try {
      const shopManager = game.getShopManager()
      if (!shopManager) return
      const shopItems = shopManager.getAllShopItems() || []
      useCharacterStore.getState().setShopItems(shopItems)
    } catch (error) {
      logger.error('Failed to update shop items:', error)
    }
  },

  updateShopCharacters: () => {
    const { game } = get()
    logger.info('updateShopCharacters called, game:', !!game)
    if (!game) {
      logger.warn('game is null in updateShopCharacters')
      return
    }
    try {
      const characterShopManager = game.getCharacterShopManager()
      logger.info('characterShopManager:', !!characterShopManager)
      if (!characterShopManager) {
        logger.warn('characterShopManager is null')
        return
      }
      const shopCharacters = characterShopManager.getAvailableCharacters()
      logger.info('shopCharacters from manager:', shopCharacters.length, shopCharacters)
      useCharacterStore.getState().setShopCharacters(shopCharacters)
    } catch (error) {
      logger.error('Failed to update shop characters:', error)
    }
  },

  updateEssence: () => {
    const { game } = get()
    if (!game) return
    try {
      const essenceManager = game.getBuildingEssenceManager()
      if (!essenceManager) return
      const storage = essenceManager.getStorageCapacity()
      useResourceStore.getState().setCoreParts(storage.current, storage.max)
    } catch (error) {
      logger.error('Failed to update essence:', error)
    }
  },

  updateTechPoints: () => {
    const { game } = get()
    if (!game) return
    try {
      const techManager = game.getTechnologyManager()
      if (!techManager) return
      const points = techManager.getPoints()
      const completedTechs = techManager.getCompletedTechs()
      useTechStore.getState().setTechPoints(points)
      useTechStore.getState().setCompletedTechs(completedTechs)
    } catch (error) {
      logger.error('Failed to update tech points:', error)
    }
  },

  updateSettlementState: () => {
    const { game } = get()
    if (!game) return
    const state = game.getSettlementState()
    set({
      settlementLivability: state.settlementLivability,
      settlementDevelopment: state.settlementDevelopment,
      developmentBreakdown: state.developmentBreakdown,
      recruitmentStationState: state.recruitmentStationState,
      tradeState: state.tradeState,
      globalStrategyPreset: state.globalStrategyPreset,
      priorityMode: state.priorityMode
    })
  },

  publishFloatSnapshot: () => {
    const { game } = get()
    if (!game) return
    const electronAPI = (window as any).electronAPI
    if (!electronAPI?.publishFloatSnapshot) return
    const snapshot = game.getFloatSnapshot()
    const taskProgressMap = useCharacterStore.getState().taskProgress
    snapshot.workers = snapshot.workers.map(w => {
      const tp = taskProgressMap.get(w.id)
      if (tp && tp.progress !== undefined) {
        return { ...w, progress: Math.round(tp.progress * 100) }
      }
      return w
    })
    electronAPI.publishFloatSnapshot(snapshot)
  },

  // --- Character actions ---
  selectCharacter: (characterId: string | null) => {
    useCharacterStore.getState().selectCharacter(characterId)
  },

  equipItem: (characterId: string, equipmentId: string, slot: EquipmentSlot): boolean => {
    const { game } = get()
    if (!game) return false
    const equipments = useCharacterStore.getState().equipments
    const equipment = equipments.find(e => e.id === equipmentId)
    if (!equipment) return false
    if (equipment.slot !== slot) {
      logger.warn('Equipment slot mismatch')
      return false
    }
    const characterManager = game.getCharacterManager()
    const success = characterManager.equipItem(characterId, equipmentId, slot)
    if (success) {
      get().updateCharacters()
      logger.debug('Equipment equipped:', { characterId, equipmentId, slot })
    }
    return success
  },

  unequipItem: (characterId: string, slot: EquipmentSlot): boolean => {
    const { game } = get()
    if (!game) return false
    const characterManager = game.getCharacterManager()
    const equipmentId = characterManager.unequipItem(characterId, slot)
    if (equipmentId) {
      get().updateCharacters()
      logger.debug('Equipment unequipped:', { characterId, equipmentId, slot })
      return true
    }
    return false
  },

  setSkillPriority: (characterId: string, skill: string, priority: number): void => {
    const { game } = get()
    if (!game) return
    if (get().priorityMode === 'preset') {
      logger.warn('Cannot edit character priorities while preset mode is active')
      return
    }
    const characterManager = game.getCharacterManager()
    const success = characterManager.setSkillPriority(characterId, skill as any, priority)
    if (success) {
      game.getEventBus().emit('task:priorities-reset', { characterId })
      get().updateCharacters()
      logger.debug('Skill priority updated:', { characterId, skill, priority })
    }
  },

  getEquipmentById: (equipmentId: string) => {
    return useCharacterStore.getState().equipments.find(e => e.id === equipmentId)
  },

  getCharacterEquipments: (characterId: string) => {
    const { game } = get()
    if (!game) return []
    const characterManager = game.getCharacterManager()
    const character = characterManager.get(characterId)
    if (!character) return []
    const equippedIds = Object.values(character.equipmentSlots || {}).filter(Boolean) as string[]
    return useCharacterStore.getState().equipments.filter(e => equippedIds.includes(e.id))
  },

  getTaskProgress: (characterId: string) => {
    return useCharacterStore.getState().getTaskProgress(characterId)
  },

  updateTaskProgress: (characterId: string, progress: number) => {
    useCharacterStore.getState().updateTaskProgress(characterId, progress)
  },

  createCharacter: (profession: ProfessionType): boolean => {
    const { game } = get()
    if (!game) return false
    const characterManager = game.getCharacterManager()
    const mapData = get().mapData
    const x = mapData ? Math.floor(Math.random() * mapData.width) : 5
    const y = mapData ? Math.floor(Math.random() * mapData.height) : 5
    const character = characterManager.createCharacter({
      name: `${profession}_${Date.now().toString().slice(-4)}`,
      profession,
      position: { x, y },
    })
    if (character) {
      get().updateCharacters()
      return true
    }
    return false
  },

  purchaseCharacter: (slotId: number): boolean => {
    const { game } = get()
    if (!game) return false
    try {
      const characterShopManager = game.getCharacterShopManager()
      if (!characterShopManager) return false
      const result = characterShopManager.purchaseCharacter(slotId)
      if (result.success) {
        get().updateShopCharacters()
        get().updateCharacters()
        get().updateResources()
        return true
      }
      return false
    } catch (error) {
      logger.error('Failed to purchase character:', error)
      return false
    }
  },

  refreshShop: () => {
      const { game } = get()
      if (!game) {
        return { success: false, message: '游戏尚未初始化。' }
      }
      try {
        const characterShopManager = game.getCharacterShopManager()
        if (!characterShopManager) {
          return { success: false, message: '招募系统暂不可用。' }
        }

        const result = characterShopManager.manualRefresh()
        get().updateShopCharacters()
        get().updateResources()
        get().updateSettlementState()
        return result
      } catch (error) {
        logger.error('Failed to refresh shop:', error)
        return { success: false, message: '刷新失败，请稍后再试。' }
      }
    },

  getSaveSlots: () => {
    const slots: (import('@app-types/save.types').SaveMetadata | null)[] = []
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const key = `${STORAGE_KEY_PREFIX}${i}`
      const json = localStorage.getItem(key)
      if (!json) {
        slots.push(null)
        continue
      }
      try {
        const parsed = JSON.parse(json)
        if (parsed?.metadata) {
          slots.push(parsed.metadata)
        } else {
          slots.push(null)
        }
      } catch {
        slots.push(null)
      }
    }
    return slots
  },

  saveGameToSlot: (slotIndex: number, name: string) => {
    const { game, saveVersion } = get()
    if (!game) {
      return { success: false, message: '游戏未初始化' }
    }
    if (slotIndex < 0 || slotIndex >= MAX_SAVE_SLOTS) {
      return { success: false, message: '无效存档槽位' }
    }

    try {
      const saveData = game.createSaveData(name)
      saveData.saveVersion = saveVersion || game.getSaveVersion()
      saveData.metadata.saveVersion = saveData.saveVersion
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${slotIndex}`, JSON.stringify(saveData))
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      return { success: false, message }
    }
  },

  loadGameFromSlot: (slotIndex: number) => {
    const { game } = get()
    if (!game) {
      return { success: false, message: '游戏未初始化' }
    }
    if (slotIndex < 0 || slotIndex >= MAX_SAVE_SLOTS) {
      return { success: false, message: '无效存档槽位' }
    }

    const key = `${STORAGE_KEY_PREFIX}${slotIndex}`
    const json = localStorage.getItem(key)
    if (!json) {
      return { success: false, message: '存档不存在' }
    }

    try {
      const parsed = JSON.parse(json)
      const saveVersion = parsed?.saveVersion || parsed?.metadata?.saveVersion || parsed?.metadata?.version
      const currentVersion = get().saveVersion || game.getSaveVersion()
      if (saveVersion !== currentVersion) {
        return {
          success: false,
          message: `存档版本不匹配：当前版本 ${currentVersion}，存档版本 ${saveVersion || '未知'}`
        }
      }

      game.restoreFromSaveData(parsed)
      game.setStrategyState('none', 'manual')
      if (parsed.game?.isPaused) {
        game.pause()
      } else {
        game.resume()
      }

      set({
        isPaused: Boolean(parsed.game?.isPaused),
        manualHarvestCount: 0,
        globalStrategyPreset: 'none',
        priorityMode: 'manual',
      })

      get().updateCharacters()
      get().updateResources()
      get().updateMapData()
      get().updateBuildings()
      get().updateEquipments()
      get().updateShopItems()
      get().updateShopCharacters()
      get().updateEssence()
      get().updateTechPoints()
      get().updateSettlementState()

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载失败'
      return { success: false, message }
    }
  },

  deleteSaveSlot: (slotIndex: number) => {
    if (slotIndex < 0 || slotIndex >= MAX_SAVE_SLOTS) return false
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slotIndex}`)
    return true
  },

  applyGlobalStrategyPreset: (preset) => {
    const { game } = get()
    if (!game) return

    const characterManager = game.getCharacterManager()
    const presetPriorities: Record<GlobalStrategyPreset, Partial<Record<SkillType, number>>> = {
      none: {},
      survival: {
        [SkillType.FARMING]: 1,
        [SkillType.COOKING]: 1,
        [SkillType.GATHERING]: 2,
        [SkillType.HUNTING]: 2,
        [SkillType.BUILDING]: 4,
        [SkillType.ENGINEERING]: 5,
        [SkillType.RESEARCH]: 7,
        [SkillType.COMBAT]: 6,
      },
      expand: {
        [SkillType.BUILDING]: 1,
        [SkillType.ENGINEERING]: 1,
        [SkillType.GATHERING]: 2,
        [SkillType.FARMING]: 3,
        [SkillType.COOKING]: 4,
        [SkillType.RESEARCH]: 5,
        [SkillType.COMBAT]: 6,
      },
      research: {
        [SkillType.RESEARCH]: 1,
        [SkillType.ENGINEERING]: 3,
        [SkillType.BUILDING]: 4,
        [SkillType.GATHERING]: 5,
        [SkillType.FARMING]: 5,
        [SkillType.COOKING]: 5,
        [SkillType.COMBAT]: 6,
      },
      boss: {
        [SkillType.COMBAT]: 1,
        [SkillType.ENGINEERING]: 3,
        [SkillType.BUILDING]: 4,
        [SkillType.RESEARCH]: 4,
        [SkillType.GATHERING]: 5,
        [SkillType.FARMING]: 5,
        [SkillType.COOKING]: 5,
      }
    }

    characterManager.getAll().forEach((character) => {
      const profile = presetPriorities[preset]
      Object.entries(profile).forEach(([skill, priority]) => {
        characterManager.setSkillPriority(character.id, skill as SkillType, priority ?? 5)
      })
    })

    game.setStrategyState(preset, 'preset')
    set({ globalStrategyPreset: preset, priorityMode: 'preset' })
    get().updateCharacters()
  },

  clearGlobalStrategyPreset: () => {
    const { game } = get()
    game?.setStrategyState('none', 'manual')
    set({ globalStrategyPreset: 'none', priorityMode: 'manual' })
  },

  canEditCharacterPriority: () => get().priorityMode === 'manual',

  setTradeEnabled: (enabled: boolean) => {
    const { game } = get()
    if (!game) return
    game.setTradeEnabled(enabled)
    get().updateSettlementState()
  },

  // --- Building actions ---
  startBuildingPlacement: (type: ProductionBuildingType) => {
    useBuildingStore.getState().startBuildingPlacement(type)
    logger.debug('Started building placement:', type)
  },

  cancelBuildingPlacement: () => {
    useBuildingStore.getState().cancelBuildingPlacement()
    logger.debug('Cancelled building placement')
  },

  placeBuilding: (type: ProductionBuildingType, x: number, y: number): boolean => {
    const { game } = get()
    if (!game) return false

    const result = game.placeBuilding(type, x, y)
    if (result.success) {
      useBuildingStore.getState().cancelBuildingPlacement()
      get().updateBuildings()
      get().updateResources()
      get().updateSettlementState()
      logger.debug('Building placed successfully:', result.buildingId)
      return true
    }

    useBuildingStore.getState().setPlacementError(result.message)
    return false
  },

  upgradeBuilding: (buildingId: string) => {
    const { game } = get()
    if (!game) {
      return { success: false, message: '游戏尚未初始化。' }
    }

    const result = game.upgradeBuilding(buildingId)
    if (result.success) {
      get().updateBuildings()
      get().updateResources()
      get().updateSettlementState()
      get().updateEssence()
    }

    return result
  },

  tryManualHarvest: (x: number, y: number) => {
    const { game } = get()
    if (!game) {
      return { success: false, message: '游戏尚未初始化。' }
    }

    const result = game.tryManualHarvest(x, y)
    if (!result.success) {
      return { success: false, message: result.reason }
    }

    get().updateResources()
    get().updateMapData()
    set(state => ({ manualHarvestCount: state.manualHarvestCount + 1 }))
    return {
      success: true,
      amount: result.amount,
      resourceType: result.resourceType,
    }
  },

  // --- Resource actions ---
  addResource: (type: ResourceType, amount: number) => {
    const { game } = get()
    if (!game || amount <= 0) return

    if (type === ResourceType.CORE_PARTS) {
      game.getBuildingEssenceManager().addEssence(amount, 'debug_panel')
      get().updateEssence()
      get().updateSettlementState()
      return
    }

    game.getResourceManager().add(type, amount)
    get().updateResources()
    get().updateSettlementState()
  },

  grantDebugEquipmentPack: (quality: EquipmentQuality = EquipmentQuality.LEGENDARY) => {
    const { game } = get()
    if (!game) return 0

    const equipmentConfigs = game.getConfigManager().getEquipmentConfigs()
    const preferredSlots = [EquipmentSlot.WEAPON, EquipmentSlot.ARMOR, EquipmentSlot.ACCESSORY]
    const selectedConfigs = preferredSlots
      .map(slot => equipmentConfigs.find(config => config.slot === slot))
      .filter((config): config is NonNullable<typeof config> => Boolean(config))

    const fallbackConfigs = equipmentConfigs
      .filter(config => !selectedConfigs.some(selected => selected.id === config.id))
      .slice(0, Math.max(0, 3 - selectedConfigs.length))

    const created = [...selectedConfigs, ...fallbackConfigs]
      .map(config => game.getEquipmentManager().createEquipment(config.id, quality))
      .filter(Boolean).length

    if (created > 0) {
      get().updateEquipments()
      get().updateShopItems()
    }

    return created
  },

  spawnDebugBoss: () => {
    const { game } = get()
    if (!game) return

    game.getBossManager().forceSpawn()
  },

  // --- Intervention actions ---
  setTaskPriority: (characterId: string, taskType: TaskType, level: TaskPriorityLevel): boolean => {
    const { game } = get()
    if (!game) return false
    const success = game.getInterventionManager().setTaskPriority(characterId, taskType, level)
    if (success) set(state => ({ interventionRevision: state.interventionRevision + 1 }))
    return success
  },

  disableTask: (characterId: string, taskType: TaskType): boolean => {
    const { game } = get()
    if (!game) return false
    const success = game.getInterventionManager().disableTask(characterId, taskType)
    if (success) set(state => ({ interventionRevision: state.interventionRevision + 1 }))
    return success
  },

  enableTask: (characterId: string, taskType: TaskType): boolean => {
    const { game } = get()
    if (!game) return false
    const success = game.getInterventionManager().enableTask(characterId, taskType)
    if (success) set(state => ({ interventionRevision: state.interventionRevision + 1 }))
    return success
  },

  forceTask: (characterId: string, taskType: TaskType, targetPosition?: { x: number; y: number }): boolean => {
    const { game } = get()
    if (!game) return false
    const success = game.getInterventionManager().forceTask(characterId, taskType, targetPosition)
    if (success) set(state => ({ interventionRevision: state.interventionRevision + 1 }))
    return success
  },

  cancelForcedTask: (characterId: string): boolean => {
    const { game } = get()
    if (!game) return false
    const success = game.getInterventionManager().cancelForcedTask(characterId)
    if (success) set(state => ({ interventionRevision: state.interventionRevision + 1 }))
    return success
  },

  resetTaskPriorities: (characterId: string): void => {
    const { game } = get()
    if (!game) return
    game.getInterventionManager().resetToDefault(characterId)
    set(state => ({ interventionRevision: state.interventionRevision + 1 }))
  },

  getCharacterPriorities: (characterId: string) => {
    const { game } = get()
    if (!game) return undefined
    return game.getInterventionManager().getCharacterPriorities(characterId)
  },

  getPendingSessionSummary: () => {
    const { game } = get()
    if (!game) return null

    const inMemory = game.getPendingSessionSummary()
    if (inMemory) return inMemory

    try {
      const stored = sessionStorage.getItem('idle_collective_last_summary')
      if (stored) return JSON.parse(stored) as import('@app-types/session.types').SessionSummary
    } catch {
      // non-critical
    }
    return null
  },

  dismissSessionSummary: () => {
    const { game } = get()
    game?.dismissSessionSummary()
  },

  // --- Auto Save actions ---
  startAutoSave: () => {
    const { game } = get()
    if (!game) return

    const existingInterval = (get() as any)._autoSaveInterval
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    const interval = setInterval(() => {
      get().autoSave()
    }, AUTO_SAVE_INTERVAL_MS)

    ;(get() as any)._autoSaveInterval = interval

    const handleBeforeUnload = () => {
      get().autoSave()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    ;(get() as any)._beforeUnloadHandler = handleBeforeUnload

    logger.info('Auto save started')
  },

  stopAutoSave: () => {
    const existingInterval = (get() as any)._autoSaveInterval
    if (existingInterval) {
      clearInterval(existingInterval)
      ;(get() as any)._autoSaveInterval = null
    }

    const handler = (get() as any)._beforeUnloadHandler
    if (handler) {
      window.removeEventListener('beforeunload', handler)
      ;(get() as any)._beforeUnloadHandler = null
    }

    logger.info('Auto save stopped')
  },

  autoSave: () => {
    const { game, saveVersion } = get()
    if (!game) return

    try {
      const saveData = game.createSaveData('自动存档')
      saveData.saveVersion = saveVersion || game.getSaveVersion()
      saveData.metadata.saveVersion = saveData.saveVersion
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${AUTO_SAVE_SLOT}`, JSON.stringify(saveData))
      localStorage.setItem(AUTO_SAVE_KEY, 'true')
      logger.debug('Auto save completed')
    } catch (error) {
      logger.error('Auto save failed:', error)
    }
  },

  hasAutoSave: () => {
    return localStorage.getItem(AUTO_SAVE_KEY) === 'true' &&
           localStorage.getItem(`${STORAGE_KEY_PREFIX}${AUTO_SAVE_SLOT}`) !== null
  },

  loadAutoSave: () => {
    const { game } = get()
    if (!game) return false

    const key = `${STORAGE_KEY_PREFIX}${AUTO_SAVE_SLOT}`
    const autoSaveFlag = localStorage.getItem(AUTO_SAVE_KEY)
    const json = localStorage.getItem(key)
    logger.info(`loadAutoSave: flag=${autoSaveFlag}, hasJson=${!!json}`)
    if (!json) return false

    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object') {
        logger.warn('loadAutoSave: parsed is invalid, clearing')
        localStorage.removeItem(key)
        return false
      }
      const saveVersion = parsed?.saveVersion || parsed?.metadata?.saveVersion || parsed?.metadata?.version
      const currentVersion = get().saveVersion || game.getSaveVersion()
      logger.info(`loadAutoSave: saveVersion=${saveVersion}, currentVersion=${currentVersion}`)
      if (saveVersion !== currentVersion) {
        logger.warn(`loadAutoSave: version mismatch, clearing`)
        localStorage.removeItem(key)
        return false
      }

      logger.info('loadAutoSave: calling restoreFromSaveData...')
      game.restoreFromSaveData(parsed)
      game.setStrategyState('none', 'manual')
      if (parsed.game?.isPaused) {
        game.pause()
      } else {
        game.resume()
      }

      set({
        isPaused: Boolean(parsed.game?.isPaused),
        manualHarvestCount: 0,
        globalStrategyPreset: 'none',
        priorityMode: 'manual',
      })

      get().updateCharacters()
      get().updateResources()
      get().updateMapData()
      get().updateBuildings()
      get().updateEquipments()
      get().updateShopItems()
      get().updateShopCharacters()
      get().updateEssence()
      get().updateTechPoints()
      get().updateSettlementState()

      logger.info('Auto save loaded')
      return true
    } catch (error) {
      logger.error('Failed to load auto save:', error)
      localStorage.removeItem(key)
      return false
    }
  },
}))
