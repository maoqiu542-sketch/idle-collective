import { EventBus } from '@core/EventBus'
import { ServiceContainer } from '@core/ServiceContainer'
import { Logger } from '@utils/logger'
import { MapSystem } from '@domain/map/MapSystem'
import { CharacterManager } from '@domain/character/CharacterManager'
import { NeedManager } from '@domain/character/NeedManager'
import { SixDimensionManager } from '@domain/character/SixDimensionManager'
import { AISystem } from '@domain/ai/AISystem'
import { ProductionBuildingManager } from '@domain/building/ProductionBuildingManager'
import { BossManager } from '@domain/combat/BossManager'
import { EquipmentManager } from '@domain/equipment/EquipmentManager'
import { ShopManager } from '@domain/shop/ShopManager'
import { ConfigManager } from '@data/config/ConfigManager'
import { ResourceType } from '@app-types/map.types'

export interface GameConfig {
  mapWidth: number
  mapHeight: number
  initialCharacters: number
  tickRate: number
}

export interface GameState {
  isRunning: boolean
  isPaused: boolean
  tick: number
  gameTime: number
  lastUpdate: number
}

export class Game {
  private eventBus: EventBus
  private serviceContainer: ServiceContainer
  private logger: Logger
  private config: GameConfig
  private state: GameState
  private resources: Map<ResourceType, number>

  private mapSystem!: MapSystem
  private characterManager!: CharacterManager
  private needManager!: NeedManager
  private sixDimensionManager!: SixDimensionManager
  private aiSystem!: AISystem
  private productionBuildingManager!: ProductionBuildingManager
  private bossManager!: BossManager
  private equipmentManager!: EquipmentManager
  private shopManager!: ShopManager
  private configManager!: ConfigManager

  private updateIntervalId: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<GameConfig> = {}) {
    this.eventBus = new EventBus()
    this.serviceContainer = new ServiceContainer()
    this.logger = new Logger('Game')

    this.config = {
      mapWidth: config.mapWidth ?? 100,
      mapHeight: config.mapHeight ?? 100,
      initialCharacters: config.initialCharacters ?? 5,
      tickRate: config.tickRate ?? 100
    }

    this.state = {
      isRunning: false,
      isPaused: false,
      tick: 0,
      gameTime: 0,
      lastUpdate: Date.now()
    }

    this.resources = new Map([
      [ResourceType.WOOD, 500],
      [ResourceType.STONE, 300],
      [ResourceType.FOOD, 200],
      [ResourceType.GOLD, 1000],
      [ResourceType.LEATHER, 50],
    ])

    this.initializeServices()
  }

  private initializeServices(): void {
    this.serviceContainer.register('EventBus', this.eventBus)

    this.configManager = new ConfigManager()
    this.serviceContainer.register('ConfigManager', this.configManager)

    this.mapSystem = new MapSystem(this.eventBus, this.config.mapWidth, this.config.mapHeight)
    this.serviceContainer.register('MapSystem', this.mapSystem)

    this.characterManager = new CharacterManager(this.eventBus)
    this.serviceContainer.register('CharacterManager', this.characterManager)

    this.needManager = new NeedManager(this.eventBus)
    this.serviceContainer.register('NeedManager', this.needManager)

    this.sixDimensionManager = new SixDimensionManager(this.eventBus)
    this.serviceContainer.register('SixDimensionManager', this.sixDimensionManager)

    this.productionBuildingManager = new ProductionBuildingManager(this.eventBus)
    this.serviceContainer.register('ProductionBuildingManager', this.productionBuildingManager)

    this.bossManager = new BossManager(this.eventBus)
    this.serviceContainer.register('BossManager', this.bossManager)

    this.equipmentManager = new EquipmentManager(this.eventBus)
    this.serviceContainer.register('EquipmentManager', this.equipmentManager)

    this.shopManager = new ShopManager(
      this.eventBus,
      this.equipmentManager,
      () => this.resources.get(ResourceType.GOLD) || 0,
      (amount: number) => {
        const current = this.resources.get(ResourceType.GOLD) || 0
        if (current < amount) return false
        this.resources.set(ResourceType.GOLD, current - amount)
        return true
      }
    )
    this.serviceContainer.register('ShopManager', this.shopManager)

    this.aiSystem = new AISystem(this.characterManager, this.mapSystem, this.eventBus, this.productionBuildingManager)
    this.serviceContainer.register('AISystem', this.aiSystem)

    // Initialize character needs and six dimensions when they spawn
    this.eventBus.on('character:spawned', (event: any) => {
      this.needManager.initCharacter(event.character.id)
      this.sixDimensionManager.initCharacter(event.character.id)

      // Sync six dimensions to character object
      const character = this.characterManager.get(event.character.id)
      if (character) {
        character.sixDimensions = this.sixDimensionManager.getStats(event.character.id)
      }

      this.logger.debug(`Initialized needs and six dimensions for character ${event.character.name}`)
    })

    // Update resources when collected
    this.eventBus.on('resource:collected', (event: any) => {
      const { type, amount } = event
      const current = this.resources.get(type) || 0
      this.resources.set(type, current + amount)
      this.logger.info(`Resource collected: ${type} +${amount} (total: ${current + amount})`)
    })

    this.logger.info('All services initialized')
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing game...')

    await this.configManager.loadAllConfigs()

    this.loadBuildingConfigs()
    this.loadEquipmentConfigs()
    this.loadBossConfigs()

    this.mapSystem.generateMap()

    this.createInitialCharacters()

    // Initialize shop with initial inventory
    this.shopManager.init()

    this.state.isRunning = true
    this.state.lastUpdate = Date.now()

    this.eventBus.emit('game:init', { config: this.config })

    this.logger.info('Game initialized successfully')
  }

  private loadBuildingConfigs(): void {
    const buildingConfigs = this.configManager.getProductionBuildingConfigs()
    if (buildingConfigs.length > 0) {
      this.productionBuildingManager.loadConfigs(buildingConfigs)
    }
  }

  private loadEquipmentConfigs(): void {
    const equipmentConfigs = this.configManager.getEquipmentConfigs()
    if (equipmentConfigs.length > 0) {
      this.equipmentManager.loadConfigs(equipmentConfigs)
    }
  }

  private loadBossConfigs(): void {
    const bossConfigs = this.configManager.getBossConfigs()
    if (bossConfigs.length > 0) {
      this.bossManager.loadConfigs(bossConfigs)
    }
  }

  private createInitialCharacters(): void {
    for (let i = 0; i < this.config.initialCharacters; i++) {
      const x = Math.floor(Math.random() * this.config.mapWidth)
      const y = Math.floor(Math.random() * this.config.mapHeight)

      this.characterManager.createCharacter({
        name: `Character_${i + 1}`,
        position: { x, y }
      })
    }

    this.logger.info(`Created ${this.config.initialCharacters} initial characters`)
  }

  start(): void {
    if (this.updateIntervalId) return

    this.state.isRunning = true
    this.state.isPaused = false
    this.state.lastUpdate = Date.now()

    this.updateIntervalId = setInterval(() => this.gameLoop(), this.config.tickRate)

    this.eventBus.emit('game:started', {})
    this.logger.info('Game started')
  }

  stop(): void {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId)
      this.updateIntervalId = null
    }

    this.state.isRunning = false
    this.eventBus.emit('game:stopped', {})
    this.logger.info('Game stopped')
  }

  pause(): void {
    this.state.isPaused = true
    this.eventBus.emit('game:pause', {})
    this.logger.info('Game paused')
  }

  resume(): void {
    this.state.isPaused = false
    this.state.lastUpdate = Date.now()
    this.eventBus.emit('game:resume', {})
    this.logger.info('Game resumed')
  }

  private gameLoop(): void {
    if (this.state.isPaused) return

    const now = Date.now()
    const deltaTime = now - this.state.lastUpdate
    this.state.lastUpdate = now

    this.state.tick++
    this.state.gameTime += deltaTime

    this.update(deltaTime)
  }

  private update(deltaTime: number): void {
    this.needManager.update(deltaTime)
    this.productionBuildingManager.update(deltaTime)
    this.bossManager.update(deltaTime)
    this.aiSystem.update(deltaTime)

    if (this.state.tick % 10 === 0) {
      this.eventBus.emit('game:tick', {
        tick: this.state.tick,
        gameTime: this.state.gameTime
      })
    }
  }

  getState(): GameState {
    return { ...this.state }
  }

  getConfig(): GameConfig {
    return { ...this.config }
  }

  getEventBus(): EventBus {
    return this.eventBus
  }

  getServiceContainer(): ServiceContainer {
    return this.serviceContainer
  }

  getMapSystem(): MapSystem {
    return this.mapSystem
  }

  getCharacterManager(): CharacterManager {
    return this.characterManager
  }

  getNeedManager(): NeedManager {
    return this.needManager
  }

  getSixDimensionManager(): SixDimensionManager {
    return this.sixDimensionManager
  }

  getProductionBuildingManager(): ProductionBuildingManager {
    return this.productionBuildingManager
  }

  getBossManager(): BossManager {
    return this.bossManager
  }

  getEquipmentManager(): EquipmentManager {
    return this.equipmentManager
  }

  getShopManager(): ShopManager {
    return this.shopManager
  }

  getConfigManager(): ConfigManager {
    return this.configManager
  }

  getResources(): Map<ResourceType, number> {
    return new Map(this.resources)
  }

  getResource(type: ResourceType): number {
    return this.resources.get(type) || 0
  }
}

export type GameType = Game
