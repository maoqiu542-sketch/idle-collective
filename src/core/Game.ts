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
import { CharacterShopManager } from '@domain/shop/CharacterShopManager'
import { BuildingEssenceManager } from '@domain/building/BuildingEssenceManager'
import { TechnologyManager } from '@domain/technology/TechnologyManager'
import { PlayerInterventionManager } from '@domain/intervention/PlayerInterventionManager'
import { ConfigManager, ConfigSource } from '@data/config/ConfigManager'
import { ResourceManager } from '@domain/resource/ResourceManager'
import { ResourceType } from '@app-types/map.types'
import { ProfessionType, SkillType, CharacterState } from '@app-types/character.types'
import { SaveData } from '@app-types/save.types'
import { FloatSnapshot, WorkerSnapshot, sortWorkers } from '@app-types/float.types'
import { CharacterProfession } from '@app-types/character-shop.types'
import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'
import {
  calculateCombatTrainingMultiplier,
  calculateRecruitmentStationState,
  calculateResearchDeskState,
  calculateSettlementBuildingEffects,
  calculateSettlementDevelopment,
  calculateEssenceStorageCapacity,
  calculateFoodRecoveryBonus,
  calculateHousingCapacity,
  calculateSettlementLivability,
  calculateNeedDecayMultiplier,
} from '@domain/settlement/SettlementMath'
import { GlobalStrategyPreset, PriorityMode, SettlementStateSnapshot, TradeLastResult, TradeReserve } from '@app-types/settlement.types'
import { SessionSummary, SESSION_STORAGE_KEY } from '@app-types/session.types'
import { SessionTracker, SettlementStateReader } from '@core/SessionTracker'
import { TaskType, NeedType } from '@app-types/priority.types'
import { resolveAutoResearchWorkers } from '@domain/technology/ResearchStaffing'
import {
  createEmptyTradeResult,
  DEFAULT_TRADE_RESERVE,
  getTradeableResources,
  resolveTradeCycle,
  TRADE_BASE_CYCLE_CAP,
  TRADE_CYCLE_INTERVAL_MS,
  TRADE_RESOURCE_PRICES,
} from '@domain/settlement/TradeEconomy'

/** 商店职业 → 游戏职业 映射 */
const SHOP_PROFESSION_MAP: Record<CharacterProfession, ProfessionType> = {
  [CharacterProfession.GATHERER]:   ProfessionType.HUNTER,
  [CharacterProfession.BUILDER]:    ProfessionType.ENGINEER,
  [CharacterProfession.FARMER]:     ProfessionType.FARMER,
  [CharacterProfession.WARRIOR]:    ProfessionType.WARRIOR,
  [CharacterProfession.RESEARCHER]: ProfessionType.SCHOLAR,
}

/** 职业中文名 */
const PROFESSION_CN: Record<ProfessionType, string> = {
  [ProfessionType.FARMER]:   '农夫',
  [ProfessionType.HUNTER]:   '猎人',
  [ProfessionType.WARRIOR]:  '战士',
  [ProfessionType.ENGINEER]: '工程师',
  [ProfessionType.COOK]:     '厨师',
  [ProfessionType.DOCTOR]:   '医生',
  [ProfessionType.SCHOLAR]:  '学者',
}

export interface GameConfig {
  mapWidth: number
  mapHeight: number
  initialCharacters: number
  tickRate: number
  configSource?: ConfigSource
}

export interface GameState {
  isRunning: boolean
  isPaused: boolean
  tick: number
  gameTime: number
  lastUpdate: number
}

export interface ManualHarvestResult {
  success: boolean
  amount?: number
  resourceType?: ResourceType
  reason?: string
}

export interface PlaceBuildingResult {
  success: boolean
  message: string
  buildingId?: string
}

export class Game {
  private eventBus: EventBus
  private serviceContainer: ServiceContainer
  private logger: Logger
  private config: GameConfig
  private state: GameState
  private resourceManager!: ResourceManager

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
  private characterShopManager!: CharacterShopManager
  private buildingEssenceManager!: BuildingEssenceManager
  private technologyManager!: TechnologyManager
  private interventionManager!: PlayerInterventionManager
  private simulationSpeedMultiplier = 1

  private updateIntervalId: ReturnType<typeof setInterval> | null = null
  private sessionStart: number = Date.now()
  private readonly saveVersion = '2.1.0'
  private globalStrategyPreset: GlobalStrategyPreset = 'none'
  private priorityMode: PriorityMode = 'manual'
  private sessionTracker!: SessionTracker
  private pendingSummary: SessionSummary | null = null
  private tradeState: {
    enabled: boolean
    reserve: TradeReserve
    progressMs: number
    goldRemainder: number
    lastResult: TradeLastResult | null
  } = {
    enabled: false,
    reserve: { ...DEFAULT_TRADE_RESERVE },
    progressMs: 0,
    goldRemainder: 0,
    lastResult: null,
  }

  constructor(config: Partial<GameConfig> = {}) {
    this.eventBus = new EventBus()
    this.serviceContainer = new ServiceContainer()
    this.logger = new Logger('Game')

    this.config = {
      mapWidth: config.mapWidth ?? 50,
      mapHeight: config.mapHeight ?? 50,
      initialCharacters: config.initialCharacters ?? 3,
      tickRate: config.tickRate ?? 100,
      configSource: config.configSource,
    }

    this.state = {
      isRunning: false,
      isPaused: false,
      tick: 0,
      gameTime: 0,
      lastUpdate: Date.now()
    }

    this.initializeServices()
  }

  private initializeServices(): void {
    this.serviceContainer.register('EventBus', this.eventBus)

    this.resourceManager = new ResourceManager(this.eventBus)
    this.serviceContainer.register('ResourceManager', this.resourceManager)

    this.configManager = new ConfigManager(this.config.configSource)
    this.serviceContainer.register('ConfigManager', this.configManager)

    this.mapSystem = new MapSystem(this.eventBus, this.config.mapWidth, this.config.mapHeight)
    this.serviceContainer.register('MapSystem', this.mapSystem)

    this.characterManager = new CharacterManager(this.eventBus)
    this.serviceContainer.register('CharacterManager', this.characterManager)

    this.needManager = new NeedManager(
      this.eventBus,
      () => calculateNeedDecayMultiplier(this.getSettlementState().settlementLivability),
      () => this.getSettlementState().settlementLivability,
      (characterId, needType, value) => {
        this.characterManager.setNeedValue(characterId, needType, value)
      }
    )
    this.serviceContainer.register('NeedManager', this.needManager)

    this.sixDimensionManager = new SixDimensionManager(this.eventBus)
    this.serviceContainer.register('SixDimensionManager', this.sixDimensionManager)

    this.productionBuildingManager = new ProductionBuildingManager(
      this.eventBus,
      (techId: string) => this.technologyManager?.isTechCompleted(techId) ?? true,
      (building) => this.getBuildingProductionMultiplier(building.type)
    )
    this.serviceContainer.register('ProductionBuildingManager', this.productionBuildingManager)

    this.bossManager = new BossManager(
      this.eventBus,
      () => this.getSettlementState().settlementDevelopment
    )
    this.serviceContainer.register('BossManager', this.bossManager)

    this.equipmentManager = new EquipmentManager(this.eventBus)
    this.serviceContainer.register('EquipmentManager', this.equipmentManager)

    this.shopManager = new ShopManager(
      this.eventBus,
      this.equipmentManager,
      () => this.resourceManager.get(ResourceType.GOLD),
      (amount: number) => this.resourceManager.consume(ResourceType.GOLD, amount)
    )
    this.serviceContainer.register('ShopManager', this.shopManager)

    this.technologyManager = new TechnologyManager(
      this.eventBus,
      (workerId: string) => {
        const character = this.characterManager.get(workerId)
        const researchTalent = character?.talents.get(SkillType.RESEARCH)?.level ?? 1
        return character ? { intelligence: researchTalent * 12 } : null
      },
      () => this.getResearchOutputMultiplier(),
      () => this.getResearchWorkerCapacity(),
      () => this.getResearchDeskLevel() > 0
    )
    this.serviceContainer.register('TechnologyManager', this.technologyManager)

    this.characterShopManager = new CharacterShopManager(
      this.eventBus,
      () => this.resourceManager.get(ResourceType.GOLD),
      (amount: number) => this.resourceManager.consume(ResourceType.GOLD, amount),
      (character) => {
        const profession = SHOP_PROFESSION_MAP[character.profession] ?? ProfessionType.FARMER
        this.characterManager.createCharacter({
          name: character.name,
          profession,
          position: { x: Math.floor(Math.random() * this.config.mapWidth), y: Math.floor(Math.random() * this.config.mapHeight) }
        })
      },
      () => this.getSettlementState().settlementLivability,
      () => this.getSettlementState().settlementDevelopment,
      () => this.productionBuildingManager
        .getOperationalBuildings()
        .some(building => building.type === ProductionBuildingType.RECRUITMENT_STATION),
      () => this.characterManager.getAll().length < this.getHousingCapacity(),
      () => this.getRecruitmentBuildingBonuses()
    )
    this.serviceContainer.register('CharacterShopManager', this.characterShopManager)

    this.buildingEssenceManager = new BuildingEssenceManager(
      this.eventBus,
      (techId: string) => this.technologyManager?.isTechCompleted(techId) ?? false,
      (resources: Record<string, number>) => {
        for (const [type, amount] of Object.entries(resources)) {
          const resourceType = type as ResourceType
          if (!this.resourceManager.consume(resourceType, amount)) {
            return false
          }
        }
        return true
      }
    )
    this.serviceContainer.register('BuildingEssenceManager', this.buildingEssenceManager)

    this.interventionManager = new PlayerInterventionManager(this.eventBus)
    this.serviceContainer.register('PlayerInterventionManager', this.interventionManager)

    this.aiSystem = new AISystem(
      this.characterManager,
      this.mapSystem,
      this.eventBus,
      this.productionBuildingManager,
      this.interventionManager
    )
    this.serviceContainer.register('AISystem', this.aiSystem)

    this.eventBus.on('boss:defeated', (event: { bossId: string; bossLevel: number; rewards: { type: string; amount: number; itemId?: string }[] }) => {
      for (const reward of event.rewards) {
        if (reward.type === 'gold') {
          this.resourceManager.add(ResourceType.GOLD, reward.amount)
        } else if (reward.type === 'core_parts' || reward.type === 'essence') {
          this.buildingEssenceManager.addEssence(reward.amount, 'boss_defeat')
        } else if (reward.type === 'equipment') {
          const equipmentConfigs = this.configManager.getEquipmentConfigs()
          if (equipmentConfigs.length > 0) {
            const config = equipmentConfigs[Math.floor(Math.random() * equipmentConfigs.length)]
            for (let i = 0; i < Math.max(1, reward.amount); i++) {
              this.equipmentManager.createEquipment(config.id)
            }
          }
        }
      }

      this.technologyManager.addPoints(event.bossLevel * 5, 'boss_essence')
    })

    this.eventBus.on('character:spawned', (event: { character: { id: string; name: string } }) => {
      this.needManager.initCharacter(event.character.id)
      this.sixDimensionManager.initCharacter(event.character.id)
      this.interventionManager.initCharacter(event.character.id)

      const character = this.characterManager.get(event.character.id)
      if (character) {
        character.sixDimensions = this.sixDimensionManager.getStats(event.character.id)
      }

      this.logger.debug(`Initialized needs and six dimensions for character ${event.character.name}`)
    })

    this.eventBus.on('task:completed', (event: { characterId: string; taskType: TaskType }) => {
      const buildingEffects = calculateSettlementBuildingEffects(this.productionBuildingManager.getAllBuildings())
      if (event.taskType === TaskType.EAT) {
        this.needManager.satisfy(event.characterId, NeedType.HUNGER, 55 + buildingEffects.kitchenMealBonus)
      }
      if (event.taskType === TaskType.SLEEP || event.taskType === TaskType.REST) {
        this.needManager.satisfy(event.characterId, NeedType.REST, 65 + buildingEffects.houseRestBonus)
        this.needManager.satisfy(event.characterId, NeedType.COMFORT, 20 + buildingEffects.houseComfortBonus)
      }
    })

    this.sessionTracker = new SessionTracker(this.eventBus)

    this.logger.info('All services initialized')
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing game...')

    await this.configManager.loadAllConfigs()

    this.loadBuildingConfigs()
    this.loadEquipmentConfigs()
    this.loadBossConfigs()
    this.loadTechConfigs()

    this.mapSystem.generateMap()

    this.createInitialCharacters()

    this.shopManager.init()
    this.characterShopManager.init()
    this.technologyManager.init()
    this.bossManager.forceSpawn()
    this.bossManager.update(1)

    this.state.isRunning = true
    this.state.lastUpdate = Date.now()
    this.sessionStart = Date.now()

    this.sessionTracker.startTracking()

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

  private loadTechConfigs(): void {
    const techConfigs = this.configManager.getTechConfigs()
    if (techConfigs.length > 0) {
      this.technologyManager.loadConfigs(techConfigs)
    }
  }

  private createInitialCharacters(): void {
    const professions = Object.values(ProfessionType)
    for (let i = 0; i < this.config.initialCharacters; i++) {
      const x = Math.floor(Math.random() * this.config.mapWidth)
      const y = Math.floor(Math.random() * this.config.mapHeight)
      const profession = professions[i % professions.length] as ProfessionType
      const cnName = PROFESSION_CN[profession]
      this.characterManager.createCharacter({
        name: `${cnName}${i + 1}`,
        profession,
        position: { x, y },
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

    this.sessionTracker.startTracking()

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

    const summary = this.sessionTracker.generateSummary(this.getStateReader())
    this.pendingSummary = summary
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(summary))
    } catch {
      // non-critical: summary is also stored in-memory
    }
    this.sessionTracker.startTracking()

    this.eventBus.emit('game:resume', {})
    this.logger.info('Game resumed')
  }

  private gameLoop(): void {
    if (this.state.isPaused) return

    const now = Date.now()
    const deltaTime = now - this.state.lastUpdate
    this.state.lastUpdate = now

    this.advance(deltaTime)
  }

  advance(deltaTime: number): void {
    if (this.state.isPaused) return

    const scaledDeltaTime = Math.max(0, deltaTime) * this.simulationSpeedMultiplier
    this.state.tick++
    this.state.gameTime += scaledDeltaTime

    this.update(scaledDeltaTime)
  }

  setSimulationSpeedMultiplier(multiplier: number): void {
    this.simulationSpeedMultiplier = Math.max(1, Math.min(3, Number(multiplier.toFixed(2))))
  }

  getSimulationSpeedMultiplier(): number {
    return this.simulationSpeedMultiplier
  }

  private update(deltaTime: number): void {
    this.syncBuildingDerivedEffects()
    this.needManager.update(deltaTime)
    this.productionBuildingManager.update(deltaTime)
    this.updateTrade(deltaTime)
    this.bossManager.update(deltaTime)
    this.aiSystem.update(deltaTime)
    this.characterShopManager.update(deltaTime)
    this.syncResearchStaffing()
    this.technologyManager.update(deltaTime)
    this.interventionManager.update(deltaTime)

    if (this.state.tick % 20 === 0) {
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

  tryManualHarvest(x: number, y: number): ManualHarvestResult {
    const tile = this.mapSystem.getTile(x, y)
    if (!tile?.resource || tile.resource.amount <= 0) {
      return { success: false, reason: '这里没有可采集的资源。' }
    }

    const harvested = this.mapSystem.harvestResource(x, y)
    if (!harvested) {
      return { success: false, reason: '资源点暂时无法采集。' }
    }

    this.resourceManager.add(harvested.type, harvested.amount)
    this.eventBus.emit('resource:harvested', {
      type: harvested.type,
      amount: harvested.amount,
      position: { x, y },
    })

    return {
      success: true,
      amount: harvested.amount,
      resourceType: harvested.type,
    }
  }

  placeBuilding(type: ProductionBuildingType, x: number, y: number): PlaceBuildingResult {
    const buildingConfigs = this.getConfigManager().getProductionBuildingConfigs()
    const config = buildingConfigs.find(item => item.id === type)
    if (!config) {
      return { success: false, message: '建筑配置不存在。' }
    }

    const size = config.size || { width: 1, height: 1 }
    for (let dx = 0; dx < size.width; dx++) {
      for (let dy = 0; dy < size.height; dy++) {
        const tile = this.mapSystem.getTile(x + dx, y + dy)
        if (!tile || !tile.isPassable) {
          return { success: false, message: `位置 (${x + dx},${y + dy}) 无法放置建筑` }
        }
      }
    }

    if (type === ProductionBuildingType.TRADE_STATION) {
      const hasWarehouse = this.productionBuildingManager
        .getOperationalBuildings()
        .some(building => building.type === ProductionBuildingType.WAREHOUSE)

      if (!hasWarehouse) {
        return { success: false, message: '需要先建成仓库，才能建立贸易站' }
      }

      if (!this.technologyManager.isTechCompleted('production_tech_1')) {
        return { success: false, message: '需要先完成“基础生产”科技，才能建立贸易站' }
      }
    }

    const existingBuildings = this.productionBuildingManager.getAllBuildings()
    for (let dx = 0; dx < size.width; dx++) {
      for (let dy = 0; dy < size.height; dy++) {
        const checkX = x + dx
        const checkY = y + dy
        for (const building of existingBuildings) {
          const buildingConfig = buildingConfigs.find(item => item.id === building.configId)
          const buildingSize = buildingConfig?.size || { width: 1, height: 1 }
          for (let bdx = 0; bdx < buildingSize.width; bdx++) {
            for (let bdy = 0; bdy < buildingSize.height; bdy++) {
              if (building.position.x + bdx === checkX && building.position.y + bdy === checkY) {
                return { success: false, message: `位置 (${checkX},${checkY}) 已有建筑` }
              }
            }
          }
        }
      }
    }

    const buildingCosts: Array<[ResourceType, number]> = [
      [ResourceType.WOOD, config.cost.wood || 0],
      [ResourceType.STONE, config.cost.stone || 0],
      [ResourceType.GOLD, config.cost.gold || 0],
    ]

    for (const [resourceType, amount] of buildingCosts) {
      if (amount > 0 && this.resourceManager.get(resourceType) < amount) {
        return { success: false, message: `资源不足，无法建造 ${config.name}` }
      }
    }

    for (const [resourceType, amount] of buildingCosts) {
      if (amount > 0 && !this.resourceManager.consume(resourceType, amount)) {
        return { success: false, message: `资源扣除失败，无法建造 ${config.name}` }
      }
    }

    const building = this.productionBuildingManager.createBuilding(type, { x, y })
    if (!building) {
      for (const [resourceType, amount] of buildingCosts) {
        if (amount > 0) {
          this.resourceManager.add(resourceType, amount)
        }
      }
      return { success: false, message: '建筑创建失败。' }
    }

    return {
      success: true,
      message: `${building.name} 已开始施工`,
      buildingId: building.id,
    }
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
    return this.resourceManager.getAll()
  }

  getResource(type: ResourceType): number {
    return this.resourceManager.get(type)
  }

  getResourceManager(): ResourceManager {
    return this.resourceManager
  }

  getCharacterShopManager(): CharacterShopManager {
    return this.characterShopManager
  }

  getBuildingEssenceManager(): BuildingEssenceManager {
    return this.buildingEssenceManager
  }

  getTechnologyManager(): TechnologyManager {
    return this.technologyManager
  }

  getInterventionManager(): PlayerInterventionManager {
    return this.interventionManager
  }

  upgradeBuilding(buildingId: string): { success: boolean; message: string; newLevel?: number } {
    const building = this.productionBuildingManager.getBuilding(buildingId)
    if (!building) {
      return { success: false, message: '建筑不存在。' }
    }

    if (building.type === ProductionBuildingType.TRADE_STATION) {
      return { success: false, message: '贸易站升级将在后续版本开放。' }
    }

    if (building.status !== BuildingStatus.OPERATIONAL) {
      return { success: false, message: '建筑尚未完工，暂时无法升级。' }
    }

    const preview = this.buildingEssenceManager.canUpgradeBuilding(building.level)
    if (!preview.canUpgrade) {
      return { success: false, message: preview.reason || '当前无法升级该建筑。' }
    }

    const essenceResult = this.buildingEssenceManager.upgradeBuilding(building.level)
    if (!essenceResult.success) {
      return { success: false, message: essenceResult.message || '建筑升级失败。' }
    }

    const upgraded = this.productionBuildingManager.upgradeBuilding(buildingId)
    if (!upgraded) {
      return { success: false, message: '建筑状态写入失败。' }
    }

    this.syncBuildingDerivedEffects()
    return {
      success: true,
      message: `${building.name} 已升级到 Lv.${essenceResult.newLevel}`,
      newLevel: essenceResult.newLevel
    }
  }

  getBuildingUpgradePreview(buildingId: string): {
    buildingId: string
    name: string
    type: ProductionBuildingType
    level: number
    status: BuildingStatus
    staffingStatus: string
    staffingEffect: string
    efficiencyLabel: string
    nextLevel: number | null
    canUpgrade: boolean
    reason?: string
    essenceCost: number
    resources: Record<string, number>
  } | null {
    const building = this.productionBuildingManager.getBuilding(buildingId)
    if (!building) {
      return null
    }

    const check = this.buildingEssenceManager.canUpgradeBuilding(building.level)
    const staffingSummary = this.getBuildingStaffingSummary(building)
    return {
      buildingId: building.id,
      name: building.name,
      type: building.type,
      level: building.level,
      status: building.status,
      staffingStatus: staffingSummary.status,
      staffingEffect: staffingSummary.effect,
      efficiencyLabel: staffingSummary.efficiencyLabel,
      nextLevel: building.type === ProductionBuildingType.TRADE_STATION ? null : (check.cost?.toLevel ?? null),
      canUpgrade: building.type === ProductionBuildingType.TRADE_STATION ? false : check.canUpgrade,
      reason: building.type === ProductionBuildingType.TRADE_STATION ? '贸易站升级将在后续版本开放。' : check.reason,
      essenceCost: building.type === ProductionBuildingType.TRADE_STATION ? 0 : (check.cost?.essenceCost ?? 0),
      resources: building.type === ProductionBuildingType.TRADE_STATION ? {} : (check.cost?.baseResources ?? {}),
    }
  }

  private getBuildingStaffingSummary(building: { type: ProductionBuildingType; status: BuildingStatus; state: { hasWorker: boolean } }): {
    status: string
    effect: string
    efficiencyLabel: string
  } {
    if (building.status === BuildingStatus.BUILDING) {
      return building.state.hasWorker
        ? {
            status: '施工中',
            effect: '已有角色施工，建造进度会持续推进。',
            efficiencyLabel: '施工效率 x1.00',
          }
        : {
            status: '等待施工',
            effect: '需要至少 1 名角色进场施工，未派工时不会推进建造。',
            efficiencyLabel: '施工效率 x0.00',
          }
    }

    const staffed = building.state.hasWorker
    const productionEfficiency = (staffed ? 1.35 : 0.75) * this.getBuildingProductionMultiplier(building.type)
    const autoOperationalTypes = new Set<ProductionBuildingType>([
      ProductionBuildingType.HOUSE,
      ProductionBuildingType.WAREHOUSE,
      ProductionBuildingType.RECRUITMENT_STATION,
      ProductionBuildingType.TRADE_STATION,
    ])
    const status = autoOperationalTypes.has(building.type)
      ? '自动运作'
      : staffed
        ? '已值班'
        : '未值班'

    switch (building.type) {
      case ProductionBuildingType.HOUSE:
        return {
          status,
          effect: '房屋建成后会自动提供休息与舒适恢复，不需要额外值班。',
          efficiencyLabel: '自动居住服务',
        }
      case ProductionBuildingType.KITCHEN:
        return {
          status,
          effect: staffed ? '值班后进食恢复额外 +4，农场效率额外 +0.05。' : '空岗时只提供基础烹饪加成。',
          efficiencyLabel: staffed ? '后勤效率 x1.05' : '后勤效率 x1.00',
        }
      case ProductionBuildingType.WAREHOUSE:
        return {
          status,
          effect: '仓库建成后会自动提供容量与周转加成，不需要额外值班。',
          efficiencyLabel: '自动仓储周转',
        }
      case ProductionBuildingType.BARRACKS:
        return {
          status,
          effect: staffed ? '值班后战备训练额外 +0.05。' : '空岗时只提供基础训练加成。',
          efficiencyLabel: staffed ? '战备效率 x1.05' : '战备效率 x1.00',
        }
        case ProductionBuildingType.RECRUITMENT_STATION:
          return {
            status: '自动运作',
            effect: '招募站完工后会自动接待商队，不需要角色持续值班。',
            efficiencyLabel: '自动招募',
          }
      case ProductionBuildingType.TRADE_STATION:
        return {
          status: this.tradeState.enabled ? '自动贸易' : '已停用',
          effect: this.tradeState.enabled ? '贸易站会按周期出售盈余资源并换成金币。' : '贸易站已建成，开启后会自动将盈余资源转成金币。',
          efficiencyLabel: this.tradeState.enabled ? '经济循环已启用' : '等待开启自动贸易',
        }
      case ProductionBuildingType.RESEARCH_DESK:
        return {
          status,
          effect: staffed ? '值班后研究产出额外 +0.08。' : '空岗时只提供基础研究加成。',
          efficiencyLabel: staffed ? '研究效率 x1.08' : '研究效率 x1.00',
        }
      case ProductionBuildingType.LUMBER_MILL:
      case ProductionBuildingType.QUARRY:
      case ProductionBuildingType.FARM:
        return {
          status,
          effect: staffed ? '值班会显著提高自动产出速度。' : '空岗时仍会产出，但速度较慢。',
          efficiencyLabel: `产出效率 x${productionEfficiency.toFixed(2)}`,
        }
      default:
        return {
          status,
          effect: staffed ? '当前已有角色值班。' : '当前没有角色值班。',
          efficiencyLabel: staffed ? '建筑效率提升中' : '基础建筑效率',
        }
    }
  }

  getCombatTrainingMultiplier(): number {
    return calculateCombatTrainingMultiplier(this.getSettlementBuildings())
  }

  getSettlementState(): SettlementStateSnapshot {
    const buildings = this.getSettlementBuildings()
    const fullBuildings = this.productionBuildingManager.getAllBuildings()
    const completedTechCount = this.technologyManager.getCompletedTechs().length
    const buildingEffects = calculateSettlementBuildingEffects(fullBuildings)
    const researchDeskState = calculateResearchDeskState(
      fullBuildings,
      this.technologyManager
        .getResearchStations()
        .reduce((sum, station) => sum + station.assignedWorkers.length, 0)
    )
    const combatTrainingMultiplier = calculateCombatTrainingMultiplier(buildings)
    const activeCombatPower = this.characterManager
      .getAll()
      .reduce((sum, character) => {
        const stats = character.sixDimensions
        if (!stats) {
          return sum
        }

        return sum + Math.floor(
          stats.atk * 2 +
          stats.def * 1.5 +
          stats.hp * 0.1 +
          stats.critRate * 10 +
          stats.critDmg * 0.5 +
          stats.atkSpd * 50
        )
      }, 0) * combatTrainingMultiplier

    const buildingLevels = this.getOperationalBuildingLevels()
    const settlementLivability = calculateSettlementLivability(buildings)
    const developmentResult = calculateSettlementDevelopment({
      completedKeyResearchCount: completedTechCount,
      buildingLevels,
      corePartsSpent: this.buildingEssenceManager.getStats().totalSpent,
      activeCombatPower,
    })
    const tradeState = this.getTradeStateSnapshot()

    return {
      settlementLivability,
      settlementDevelopment: developmentResult.value,
      developmentBreakdown: developmentResult.breakdown,
      coreParts: this.buildingEssenceManager.getEssence(),
      priorityMode: this.priorityMode,
      globalStrategyPreset: this.globalStrategyPreset,
      recruitmentStationState: calculateRecruitmentStationState(
        fullBuildings,
        this.characterShopManager.getAvailableCharacters().length
      ),
      researchDeskState,
      tradeState,
      buildingEffects,
    }
  }

  getFloatSnapshot(): FloatSnapshot {
    const settlement = this.getSettlementState()
    const characters = this.characterManager.getAll()
    const activeTasks = this.aiSystem.getActiveTasks()

    const workers: WorkerSnapshot[] = characters.map((character) => {
      const activeTask = activeTasks.get(character.id)
      return {
        id: character.id,
        name: character.name,
        profession: character.profession,
        state: character.state,
        currentTask: character.currentTask,
        progress: activeTask ? Math.round(activeTask.progress * 100) : undefined,
      }
    })

    return {
      settlementLivability: settlement.settlementLivability,
      settlementDevelopment: settlement.settlementDevelopment,
      gold: this.resourceManager.get(ResourceType.GOLD),
      workers: sortWorkers(workers),
    }
  }

  setStrategyState(globalStrategyPreset: GlobalStrategyPreset, priorityMode: PriorityMode): void {
    this.globalStrategyPreset = globalStrategyPreset
    this.priorityMode = priorityMode
  }

  private getSettlementBuildings(): Array<{ type: ProductionBuildingType; level: number }> {
    return this.productionBuildingManager
      .getOperationalBuildings()
      .map(building => ({ type: building.type, level: building.level }))
  }

  private getOperationalBuildingLevels(): Partial<Record<ProductionBuildingType, number>> {
    const totals: Partial<Record<ProductionBuildingType, number>> = {}
    this.productionBuildingManager.getOperationalBuildings().forEach(building => {
      totals[building.type] = (totals[building.type] || 0) + Math.max(1, building.level)
    })
    return totals
  }

  private getHousingCapacity(): number {
    return calculateHousingCapacity(this.getSettlementBuildings(), this.config.initialCharacters)
  }

  private getFoodRecoveryBonus(): number {
    return calculateFoodRecoveryBonus(this.getSettlementBuildings())
  }

  private getBuildingProductionMultiplier(type: ProductionBuildingType): number {
    const buildingEffects = calculateSettlementBuildingEffects(this.productionBuildingManager.getAllBuildings())

    if (
      type === ProductionBuildingType.LUMBER_MILL ||
      type === ProductionBuildingType.QUARRY ||
      type === ProductionBuildingType.FARM
    ) {
      return buildingEffects.warehouseProductionMultiplier
    }

    return 1
  }

  private getResearchOutputMultiplier(): number {
    const buildingEffects = calculateSettlementBuildingEffects(this.productionBuildingManager.getAllBuildings())
    return buildingEffects.researchOutputMultiplier
  }

  private getResearchWorkerCapacity(): number {
    const buildingEffects = calculateSettlementBuildingEffects(this.productionBuildingManager.getAllBuildings())
    return buildingEffects.researchWorkerCapacity
  }

  private getResearchDeskLevel(): number {
    const buildingEffects = calculateSettlementBuildingEffects(this.productionBuildingManager.getAllBuildings())
    return buildingEffects.researchWorkerCapacity
  }

  private getRecruitmentBuildingBonuses(): {
    maxCandidates: number
    manualRefreshCost: number
    refreshIntervalMs: number
    qualityBonus: number
    stationLevel: number
  } {
    const buildingEffects = calculateSettlementBuildingEffects(this.productionBuildingManager.getAllBuildings())
    const stationLevel = Math.max(0, buildingEffects.recruitmentSlotBonus + 1)
    return {
      maxCandidates: Math.min(6, 3 + buildingEffects.recruitmentSlotBonus),
      manualRefreshCost: Math.max(20, 50 - buildingEffects.recruitmentRefreshCostDiscount),
      refreshIntervalMs: 30 * 60 * 1000,
      qualityBonus: buildingEffects.recruitmentQualityBonus,
      stationLevel,
    }
  }

  private syncBuildingDerivedEffects(): void {
    const buildings = this.getSettlementBuildings()
    const storageCapacity = calculateEssenceStorageCapacity(buildings)
    this.buildingEssenceManager.setStorageCapacity(storageCapacity)
  }

  private syncResearchStaffing(): void {
    const desiredWorkerIds = new Set(
      resolveAutoResearchWorkers(
        this.productionBuildingManager.getAllBuildings(),
        this.characterManager.getAll()
      )
    )
    const stations = this.technologyManager.getResearchStations()
    const assignedWorkerIds = new Set<string>()

    for (const station of stations) {
      for (const workerId of [...station.assignedWorkers]) {
        if (!desiredWorkerIds.has(workerId)) {
          this.technologyManager.removeWorkerFromStation(station.id, workerId)
          continue
        }

        assignedWorkerIds.add(workerId)
      }
    }

    for (const workerId of desiredWorkerIds) {
      if (assignedWorkerIds.has(workerId)) {
        continue
      }

      for (const station of stations) {
        if (this.technologyManager.assignWorkerToStation(station.id, workerId)) {
          assignedWorkerIds.add(workerId)
          break
        }
      }
    }
  }

  private normalizeRestoredCharacterStates(): void {
    const buildingWorkerStates = new Map<string, CharacterState>()

    for (const building of this.productionBuildingManager.getAllBuildings()) {
      const workerId = building.state.workerId
      if (!building.state.hasWorker || !workerId) {
        continue
      }

      buildingWorkerStates.set(
        workerId,
        building.status === BuildingStatus.BUILDING
          ? CharacterState.BUILDING
          : CharacterState.WORKING
      )
    }

    for (const character of this.characterManager.getAll()) {
      const restoredState = buildingWorkerStates.get(character.id) ?? CharacterState.IDLE
      if (character.state !== restoredState) {
        this.characterManager.setState(character.id, restoredState)
      }
    }
  }

  createSaveData(name: string): SaveData & Record<string, unknown> {
    const now = Date.now()
    const essenceState = this.buildingEssenceManager.serialize()
    const bossState = this.bossManager.serialize()
    const mapData = this.mapSystem.serialize()

    return {
      metadata: {
        id: `save_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.slice(0, 100) || '未命名存档',
        createdAt: now,
        updatedAt: now,
        playTime: Math.max(0, this.state.gameTime || now - this.sessionStart),
        version: this.saveVersion,
        saveVersion: this.saveVersion,
      },
      saveVersion: this.saveVersion,
      game: {
        tick: this.state.tick,
        gameTime: this.state.gameTime,
        isPaused: this.state.isPaused,
      },
      characters: this.characterManager.serialize(),
      buildings: this.productionBuildingManager.serialize(),
      equipments: this.equipmentManager.serialize(),
      resources: this.resourceManager.serialize(),
      settings: {
        autoSaveInterval: 60000,
        soundEnabled: true,
        musicEnabled: true,
        language: 'zh-CN',
      },
      needs: this.needManager.serialize(),
      shop: this.shopManager.serialize(),
      characterShop: this.characterShopManager.serialize(),
      technology: this.technologyManager.serialize(),
      buildingEssence: {
        ...essenceState,
        lastDefeatByLevel: Array.from(essenceState.lastDefeatByLevel.entries()),
      },
      bossState,
      trade: {
        enabled: this.tradeState.enabled,
        reserve: { ...this.tradeState.reserve },
        lastResult: this.tradeState.lastResult ? { ...this.tradeState.lastResult, sold: { ...this.tradeState.lastResult.sold } } : null,
        goldRemainder: this.tradeState.goldRemainder,
        progressMs: this.tradeState.progressMs,
      },
      interventions: Array.from(this.interventionManager.serialize().entries()).map(([characterId, data]) => [
        characterId,
        {
          ...data,
          priorities: Array.from(data.priorities.entries()),
        }
      ]),
      mapData: mapData ?? undefined,
    }
  }

  restoreFromSaveData(saveData: SaveData & Record<string, unknown>): void {
    this.state.tick = Math.max(0, saveData.game.tick)
    this.state.gameTime = Math.max(0, saveData.game.gameTime)
    this.state.isPaused = Boolean(saveData.game.isPaused)
    this.state.lastUpdate = Date.now()

    this.resourceManager.deserialize(saveData.resources)
    this.characterManager.deserialize(saveData.characters)

    this.aiSystem.resetActiveTasks()

    this.productionBuildingManager.deserialize(saveData.buildings)
    this.normalizeRestoredCharacterStates()
    this.equipmentManager.deserialize(saveData.equipments)

    const savedNeeds = saveData.needs as Record<string, unknown> | undefined
    if (savedNeeds && typeof savedNeeds === 'object') {
      this.needManager.deserialize(savedNeeds as Record<string, Record<string, import('@app-types/priority.types').Need>>)
    } else {
      const fallbackNeeds: Record<string, Record<string, import('@app-types/priority.types').Need>> = {}
      this.characterManager.getAll().forEach(character => {
        fallbackNeeds[character.id] = {}
        Object.entries(character.needs || {}).forEach(([needType, value]) => {
          fallbackNeeds[character.id][needType] = {
            type: needType as import('@app-types/priority.types').NeedType,
            currentValue: value ?? 100,
            maxValue: 100,
            decayRate: 0,
            criticalThreshold: 20,
          }
        })
      })
      this.needManager.deserialize(fallbackNeeds)
    }

    if (saveData.shop) {
      this.shopManager.deserialize(saveData.shop as { shopItems: any[]; lastRefreshTime: number })
    }

    if (saveData.characterShop) {
      this.characterShopManager.deserialize(saveData.characterShop as any)
    }

    if (saveData.technology) {
      this.technologyManager.deserialize(saveData.technology as any)
    }

    if (saveData.buildingEssence) {
      const buildingEssence = saveData.buildingEssence as Record<string, unknown>
      this.buildingEssenceManager.deserialize({
        ...(buildingEssence as any),
        lastDefeatByLevel: new Map((buildingEssence.lastDefeatByLevel as [number, number][]) || []),
      })
    }

    if (saveData.bossState) {
      this.bossManager.deserialize(saveData.bossState as any)
    }

    const savedTrade = saveData.trade as Record<string, unknown> | undefined
    this.tradeState = {
      enabled: Boolean(savedTrade?.enabled ?? false),
      reserve: {
        ...DEFAULT_TRADE_RESERVE,
        ...(savedTrade?.reserve as Partial<TradeReserve> | undefined),
      },
      lastResult: (savedTrade?.lastResult as TradeLastResult | null | undefined) ?? null,
      goldRemainder: typeof savedTrade?.goldRemainder === 'number' ? savedTrade.goldRemainder : 0,
      progressMs: typeof savedTrade?.progressMs === 'number' ? savedTrade.progressMs : 0,
    }

    if (saveData.interventions) {
      const interventionMap = new Map(
        (saveData.interventions as [string, any][]).map(([characterId, data]) => [
          characterId,
          {
            ...data,
            priorities: new Map(data.priorities || []),
            disabledTasks: [...(data.disabledTasks || [])],
            forcedTask: data.forcedTask ? { ...data.forcedTask } : null,
          }
        ])
      )
      this.interventionManager.deserialize(interventionMap as any)
    }

    if (saveData.mapData) {
      this.mapSystem.deserialize(saveData.mapData as any)
    }

    this.state.isRunning = true
    this.sessionStart = Date.now() - this.state.gameTime

    this.sessionTracker.startTracking()
  }

  getSaveVersion(): string {
    return this.saveVersion
  }

  getPendingSessionSummary(): SessionSummary | null {
    return this.pendingSummary
  }

  dismissSessionSummary(): void {
    this.pendingSummary = null
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // non-critical
    }
  }

  private getStateReader(): SettlementStateReader {
    const getWood = () => this.resourceManager.get(ResourceType.WOOD)
    const getStone = () => this.resourceManager.get(ResourceType.STONE)
    const getFood = () => this.resourceManager.get(ResourceType.FOOD)
    const getGold = () => this.resourceManager.get(ResourceType.GOLD)
    const getEssence = () => this.buildingEssenceManager.getEssence()
    const getDevelopment = () => this.getSettlementState().settlementDevelopment
    const getLivability = () => this.getSettlementState().settlementLivability
    const getPopulation = () => this.characterManager.getAll().length
    const getHousingCapacity = () => this.getHousingCapacity()

    return {
      getWood, getStone, getFood, getGold, getEssence,
      getDevelopment, getLivability, getPopulation, getHousingCapacity,
    }
  }

  setTradeEnabled(enabled: boolean): void {
    this.tradeState.enabled = enabled
  }

  getTradeEnabled(): boolean {
    return this.tradeState.enabled
  }

  private getTradeStationLevel(): number {
    return this.productionBuildingManager
      .getOperationalBuildings()
      .filter(building => building.type === ProductionBuildingType.TRADE_STATION)
      .reduce((sum, building) => sum + Math.max(1, building.level), 0)
  }

  private getTradeQueuedBuffer(): TradeReserve {
    // 当前版本建筑成本在放置时即时扣除，因此不存在额外待支付的建造队列。
    return { wood: 0, stone: 0, food: 0 }
  }

  private getTradeStateSnapshot() {
    const stationLevel = this.getTradeStationLevel()
    const queuedBuffer = this.getTradeQueuedBuffer()
    const cycleCap = stationLevel > 0 ? TRADE_BASE_CYCLE_CAP * stationLevel : 0
    const estimatedGoldPerMinute = this.estimateTradeGoldPerMinute(stationLevel, queuedBuffer)

    return {
      stationLevel,
      enabled: this.tradeState.enabled && stationLevel > 0,
      reserve: { ...this.tradeState.reserve },
      queuedBuffer,
      cycleIntervalMs: TRADE_CYCLE_INTERVAL_MS,
      cycleCap,
      estimatedGoldPerMinute,
      lastResult: this.tradeState.lastResult ? { ...this.tradeState.lastResult, sold: { ...this.tradeState.lastResult.sold } } : null,
    }
  }

  private estimateTradeGoldPerMinute(stationLevel: number, queuedBuffer: TradeReserve): number {
    if (stationLevel <= 0 || !this.tradeState.enabled) {
      return 0
    }

    let remainingCap = TRADE_BASE_CYCLE_CAP * stationLevel
    let estimatedGold = this.tradeState.goldRemainder
    for (const resourceType of getTradeableResources()) {
      const sellable = Math.max(
        0,
        this.resourceManager.get(resourceType) -
          this.getTradeReserveAmount(this.tradeState.reserve, resourceType) -
          this.getTradeReserveAmount(queuedBuffer, resourceType)
      )
      if (sellable <= 0 || remainingCap <= 0) continue
      const soldAmount = Math.min(remainingCap, sellable)
      estimatedGold += soldAmount * TRADE_RESOURCE_PRICES[resourceType]
      remainingCap -= soldAmount
    }

    const goldPerCycle = Math.floor(estimatedGold)
    return Math.round((goldPerCycle * 60000) / TRADE_CYCLE_INTERVAL_MS)
  }

  private updateTrade(deltaTime: number): void {
    const stationLevel = this.getTradeStationLevel()
    if (stationLevel <= 0 || !this.tradeState.enabled) {
      this.tradeState.progressMs = 0
      return
    }

    this.tradeState.progressMs += deltaTime
    while (this.tradeState.progressMs >= TRADE_CYCLE_INTERVAL_MS) {
      this.tradeState.progressMs -= TRADE_CYCLE_INTERVAL_MS
      this.executeTradeCycle(stationLevel)
    }
  }

  private executeTradeCycle(stationLevel: number): void {
    const tradeBuilding = this.productionBuildingManager
      .getOperationalBuildings()
      .find(building => building.type === ProductionBuildingType.TRADE_STATION)
    if (!tradeBuilding) {
      this.tradeState.lastResult = createEmptyTradeResult('尚未建成可运作的贸易站。')
      return
    }

    const queuedBuffer = this.getTradeQueuedBuffer()
    const cycleResult = resolveTradeCycle({
      stationLevel,
      currentResources: Object.fromEntries(this.resourceManager.getAll()) as Partial<Record<ResourceType, number>>,
      reserve: this.tradeState.reserve,
      queuedBuffer,
      goldRemainder: this.tradeState.goldRemainder,
    })

    for (const [resourceType, amount] of Object.entries(cycleResult.sold) as Array<[ResourceType, number]>) {
      if (!amount) {
        continue
      }

      this.resourceManager.consume(resourceType, amount)
      this.eventBus.emit('resource:sold', {
        type: resourceType,
        amount,
        gold: Number((amount * TRADE_RESOURCE_PRICES[resourceType]).toFixed(1)),
      })
    }

    const goldEarned = cycleResult.goldEarned
    this.tradeState.goldRemainder = cycleResult.goldRemainder
    if (goldEarned > 0) {
      this.resourceManager.add(ResourceType.GOLD, goldEarned)
    }

    this.tradeState.lastResult = {
      timestamp: Date.now(),
      sold: cycleResult.sold,
      goldEarned,
      reason: cycleResult.reason
    }

    this.eventBus.emit('trade:completed', {
      buildingId: tradeBuilding.id,
      sold: cycleResult.sold,
      goldEarned,
      reason: this.tradeState.lastResult.reason,
    })
  }

  private getTradeReserveAmount(reserve: TradeReserve, type: ResourceType): number {
    switch (type) {
      case ResourceType.WOOD:
        return reserve.wood
      case ResourceType.STONE:
        return reserve.stone
      case ResourceType.FOOD:
        return reserve.food
      default:
        return 0
    }
  }
}

export type GameType = Game
