import { create } from 'zustand'
import { Game } from '@core/Game'
import { Character, ProfessionType } from '@app-types/character.types'
import { ResourceType } from '@app-types/map.types'
import { ProductionBuilding, ProductionBuildingType } from '@app-types/production-building.types'
import { Equipment, EquipmentSlot } from '@app-types/equipment.types'
import { ShopItem } from '@domain/shop/ShopManager'

interface FloatingText {
  id: string
  text: string
  x: number
  y: number
  type: 'resource' | 'error' | 'success'
  createdAt: number
}

interface GameState {
  game: Game | null
  characters: Character[]
  resources: Map<ResourceType, number>
  mapData: {
    width: number
    height: number
    tiles: unknown[][]
  } | null
  buildings: ProductionBuilding[]
  equipments: Equipment[]
  shopItems: ShopItem[]
  floatingTexts: FloatingText[]
  isPaused: boolean
  isInitialized: boolean
  buildingPlacementMode: boolean
  selectedBuildingType: ProductionBuildingType | null
  placementError: string | null
  selectedCharacterId: string | null
  
  init: () => Promise<void>
  start: () => void
  pause: () => void
  resume: () => void
  createCharacter: (name: string, profession: ProfessionType) => void
  updateCharacters: () => void
  updateResources: () => void
  updateMapData: () => void
  updateBuildings: () => void
  updateEquipments: () => void
  updateShopItems: () => void
  subscribeToEvents: () => void
  startBuildingPlacement: (type: ProductionBuildingType) => void
  cancelBuildingPlacement: () => void
  placeBuilding: (x: number, y: number) => boolean
  getResource: (type: ResourceType) => number
  addResource: (type: ResourceType, amount: number) => void
  consumeResource: (type: ResourceType, amount: number) => boolean
  addFloatingText: (text: string, x: number, y: number, type?: 'resource' | 'error' | 'success') => void
  removeFloatingText: (id: string) => void
  selectCharacter: (characterId: string | null) => void
  equipItem: (characterId: string, equipmentId: string, slot: EquipmentSlot) => boolean
  unequipItem: (characterId: string, slot: EquipmentSlot) => boolean
  getEquipmentById: (equipmentId: string) => Equipment | undefined
  getCharacterEquipments: (characterId: string) => Equipment[]
}

const INITIAL_RESOURCES: Map<ResourceType, number> = new Map([
  [ResourceType.WOOD, 500],
  [ResourceType.STONE, 300],
  [ResourceType.FOOD, 200],
  [ResourceType.GOLD, 1000],
  [ResourceType.LEATHER, 50],
])

export const useGameStore = create<GameState>((set, get) => ({
  game: null,
  characters: [],
  resources: new Map(INITIAL_RESOURCES),
  mapData: null,
  buildings: [],
  equipments: [],
  shopItems: [],
  floatingTexts: [],
  isPaused: false,
  isInitialized: false,
  buildingPlacementMode: false,
  selectedBuildingType: null,
  placementError: null,
  selectedCharacterId: null,

  init: async () => {
    console.log('[gameStore] Initializing game...')
    
    const game = new Game({
      mapWidth: 20,
      mapHeight: 20,
    })
    await game.initialize()
    
    set({ game, isInitialized: true })
    
    get().subscribeToEvents()
    get().updateCharacters()
    get().updateResources()
    get().updateMapData()
    get().updateShopItems()

    console.log('[gameStore] Game initialized')
  },

  start: () => {
    const { game } = get()
    if (!game) return
    
    game.start()
    set({ isPaused: false })
    console.log('[gameStore] Game started')
  },

  pause: () => {
    const { game } = get()
    if (!game) return
    
    game.pause()
    set({ isPaused: true })
    console.log('[gameStore] Game paused')
  },

  resume: () => {
    const { game } = get()
    if (!game) return
    
    game.resume()
    set({ isPaused: false })
    console.log('[gameStore] Game resumed')
  },

  createCharacter: (name: string, profession: ProfessionType) => {
    const { game } = get()
    if (!game) return
    
    console.log('[gameStore] Creating character:', { name, profession })
    try {
      const characterManager = game.getCharacterManager()
      const mapData = game.getMapSystem().getMapData()
      const mapWidth = mapData?.width || 20
      const mapHeight = mapData?.height || 20
      characterManager.createCharacter({
        name,
        profession,
        position: {
          x: Math.floor(Math.random() * mapWidth),
          y: Math.floor(Math.random() * mapHeight)
        }
      })
      console.log('[gameStore] Character created')
      get().updateCharacters()
    } catch (error) {
      console.error('[gameStore] Failed to create character:', error)
    }
  },

  updateCharacters: () => {
    const { game } = get()
    if (!game) return

    const characterManager = game.getCharacterManager()
    const sixDimensionManager = game.getSixDimensionManager()
    const characters = characterManager.getAll()

    // Sync six dimensions for all characters
    characters.forEach(character => {
      // Initialize if not already initialized
      if (!sixDimensionManager.getAllDimensions(character.id)) {
        sixDimensionManager.initCharacter(character.id)
      }
      // Sync six dimensions to character object
      character.sixDimensions = sixDimensionManager.getStats(character.id)
    })

    console.log('[gameStore] Updating characters:', { count: characters.length })
    set({ characters })
  },

  updateResources: () => {
    const { game } = get()
    if (!game) return

    const gameResources = game.getResources()
    set({ resources: new Map(gameResources) })
  },

  updateMapData: () => {
    const { game } = get()
    if (!game) return
    
    const mapSystem = game.getMapSystem()
    const mapData = mapSystem.getMapData()
    
    if (mapData) {
      console.log('[gameStore] Map data updated:', { width: mapData.width, height: mapData.height })
      set({ mapData })
    }
  },

  subscribeToEvents: () => {
    console.log('[gameStore] Subscribing to events')
    
    const { game } = get()
    if (!game) return
    
    const eventBus = game.getEventBus()
    
    eventBus.on('game:tick', () => {
      get().updateCharacters()
      get().updateResources()
      get().updateMapData()
    })
    
    eventBus.on('character:spawned', () => {
      console.log('[gameStore] Received character:spawned event')
      get().updateCharacters()
    })
    
    eventBus.on('character:moved', () => {
      get().updateCharacters()
    })
    
    eventBus.on('character:state-changed', () => {
      get().updateCharacters()
    })
    
    eventBus.on('resource:collected', () => {
      console.log('[gameStore] Resource collected')
      get().updateResources()
      get().updateMapData()
    })

    eventBus.on('building:created', () => {
      console.log('[gameStore] Building created')
      get().updateBuildings()
    })

    eventBus.on('building:completed', () => {
      console.log('[gameStore] Building completed')
      get().updateBuildings()
    })

    eventBus.on('building:produced', (data: { buildingId: string; resource: ResourceType; amount: number }) => {
      console.log('[gameStore] Building produced:', data)
      get().addResource(data.resource, data.amount)

      const { buildings } = get()
      const building = buildings.find(b => b.id === data.buildingId)
      if (building) {
        const resourceNames: Record<string, string> = {
          [ResourceType.WOOD]: '木材',
          [ResourceType.STONE]: '石材',
          [ResourceType.FOOD]: '食物',
          [ResourceType.GOLD]: '金币',
          [ResourceType.LEATHER]: '皮革',
        }
        const resourceName = resourceNames[data.resource] || data.resource
        get().addFloatingText(
          `+${data.amount} ${resourceName}`,
          building.position.x,
          building.position.y,
          'resource'
        )
      }
    })

    eventBus.on('shop:refreshed', () => {
      console.log('[gameStore] Shop refreshed')
      get().updateShopItems()
    })

    eventBus.on('equipment:created', () => {
      get().updateEquipments()
    })
  },

  updateBuildings: () => {
    const { game } = get()
    if (!game) return
    
    const buildingManager = game.getProductionBuildingManager()
    const buildings = buildingManager.getAllBuildings()
    set({ buildings })
  },

  getResource: (type: ResourceType): number => {
    const { resources } = get()
    return resources.get(type) || 0
  },

  addResource: (type: ResourceType, amount: number) => {
    const { resources } = get()
    const current = resources.get(type) || 0
    const newResources = new Map(resources)
    newResources.set(type, current + amount)
    set({ resources: newResources })
  },

  consumeResource: (type: ResourceType, amount: number): boolean => {
    const { resources } = get()
    const current = resources.get(type) || 0
    if (current < amount) return false
    
    const newResources = new Map(resources)
    newResources.set(type, current - amount)
    set({ resources: newResources })
    return true
  },

  addFloatingText: (text: string, x: number, y: number, type: 'resource' | 'error' | 'success' = 'resource') => {
    const id = `float_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const floatingText: FloatingText = {
      id,
      text,
      x,
      y,
      type,
      createdAt: Date.now()
    }
    
    set(state => ({
      floatingTexts: [...state.floatingTexts, floatingText]
    }))
    
    setTimeout(() => {
      get().removeFloatingText(id)
    }, 2000)
  },

  removeFloatingText: (id: string) => {
    set(state => ({
      floatingTexts: state.floatingTexts.filter(ft => ft.id !== id)
    }))
  },

  startBuildingPlacement: (type: ProductionBuildingType) => {
    set({ 
      buildingPlacementMode: true, 
      selectedBuildingType: type,
      placementError: null 
    })
    console.log('[gameStore] Started building placement:', type)
  },

  cancelBuildingPlacement: () => {
    set({ 
      buildingPlacementMode: false, 
      selectedBuildingType: null,
      placementError: null 
    })
    console.log('[gameStore] Cancelled building placement')
  },

  placeBuilding: (x: number, y: number): boolean => {
    const { game, selectedBuildingType, resources } = get()
    if (!game || !selectedBuildingType) return false

    const configManager = game.getConfigManager()
    const buildingConfigs = configManager.getProductionBuildingConfigs()
    const config = buildingConfigs.find(c => c.type === selectedBuildingType)
    
    if (!config) {
      set({ placementError: '建筑配置未找到' })
      return false
    }

    const { cost } = config
    const woodCost = cost.wood || 0
    const stoneCost = cost.stone || 0
    const goldCost = cost.gold || 0

    const currentWood = resources.get(ResourceType.WOOD) || 0
    const currentStone = resources.get(ResourceType.STONE) || 0
    const currentGold = resources.get(ResourceType.GOLD) || 0

    if (currentWood < woodCost) {
      set({ placementError: `木材不足！缺少 ${woodCost - currentWood} 木材` })
      return false
    }
    if (currentStone < stoneCost) {
      set({ placementError: `石材不足！缺少 ${stoneCost - currentStone} 石材` })
      return false
    }
    if (currentGold < goldCost) {
      set({ placementError: `金币不足！缺少 ${goldCost - currentGold} 金币` })
      return false
    }

    const mapSystem = game.getMapSystem()
    const tile = mapSystem.getTile(x, y)
    if (!tile || !tile.isPassable) {
      set({ placementError: '该位置无法放置建筑' })
      return false
    }

    const buildingManager = game.getProductionBuildingManager()
    const existingBuildings = buildingManager.getAllBuildings()
    for (const b of existingBuildings) {
      if (b.position.x === x && b.position.y === y) {
        set({ placementError: '该位置已有建筑' })
        return false
      }
    }

    const newResources = new Map(resources)
    newResources.set(ResourceType.WOOD, currentWood - woodCost)
    newResources.set(ResourceType.STONE, currentStone - stoneCost)
    newResources.set(ResourceType.GOLD, currentGold - goldCost)
    set({ resources: newResources })

    const building = buildingManager.createBuilding(config.id, { x, y })
    if (building) {
      buildingManager.startConstruction(building.id)
      
      set({ 
        buildingPlacementMode: false, 
        selectedBuildingType: null,
        placementError: null 
      })
      
      get().updateBuildings()
      console.log('[gameStore] Building placed successfully:', building.id)
      return true
    }

    set({ placementError: '建筑创建失败' })
    return false
  },

  updateEquipments: () => {
    const { game } = get()
    if (!game) return

    const equipmentManager = game.getEquipmentManager()
    const equipments = equipmentManager.getAllEquipments()
    set({ equipments })
  },

  updateShopItems: () => {
    const { game } = get()
    if (!game) return

    try {
      const shopManager = game.getShopManager()
      if (!shopManager) return

      const shopItems = shopManager.getAllShopItems() || []
      set({ shopItems })
    } catch (error) {
      console.error('[gameStore] Failed to update shop items:', error)
    }
  },

  selectCharacter: (characterId: string | null) => {
    set({ selectedCharacterId: characterId })
  },

  equipItem: (characterId: string, equipmentId: string, slot: EquipmentSlot): boolean => {
    const { game, equipments } = get()
    if (!game) return false

    const equipment = equipments.find(e => e.id === equipmentId)
    if (!equipment) return false

    if (equipment.slot !== slot) {
      console.warn('[gameStore] Equipment slot mismatch')
      return false
    }

    const characterManager = game.getCharacterManager()
    const success = characterManager.equipItem(characterId, equipmentId, slot)
    
    if (success) {
      get().updateCharacters()
      console.log('[gameStore] Equipment equipped:', { characterId, equipmentId, slot })
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
      console.log('[gameStore] Equipment unequipped:', { characterId, equipmentId, slot })
      return true
    }
    
    return false
  },

  getEquipmentById: (equipmentId: string): Equipment | undefined => {
    const { equipments } = get()
    return equipments.find(e => e.id === equipmentId)
  },

  getCharacterEquipments: (characterId: string): Equipment[] => {
    const { game, equipments } = get()
    if (!game) return []

    const characterManager = game.getCharacterManager()
    const equippedIds = characterManager.getAllEquippedItems(characterId)
    
    const result: Equipment[] = []
    for (const slot of Object.values(EquipmentSlot)) {
      const id = equippedIds[slot as EquipmentSlot]
      if (id) {
        const equipment = equipments.find(e => e.id === id)
        if (equipment) {
          result.push(equipment)
        }
      }
    }
    
    return result
  },
}))
