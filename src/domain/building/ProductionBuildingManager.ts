import {
  ProductionBuilding,
  ProductionBuildingConfig,
  ProductionBuildingType,
  BuildingStatus
} from '@app-types/production-building.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

type ProductionMultiplierResolver = (
  building: ProductionBuilding,
  config: ProductionBuildingConfig
) => number

export class ProductionBuildingManager {
  private eventBus: EventBus
  private logger: Logger
  private buildings: Map<string, ProductionBuilding> = new Map()
  private configs: Map<string, ProductionBuildingConfig> = new Map()
  private checkTechUnlocked: (techId: string) => boolean
  private getProductionMultiplier: ProductionMultiplierResolver

  constructor(
    eventBus: EventBus,
    checkTechUnlocked?: (techId: string) => boolean,
    getProductionMultiplier: ProductionMultiplierResolver = () => 1
  ) {
    this.eventBus = eventBus
    this.logger = new Logger('ProductionBuildingManager')
    this.checkTechUnlocked = checkTechUnlocked || (() => true)
    this.getProductionMultiplier = getProductionMultiplier
  }

  loadConfigs(configs: ProductionBuildingConfig[]): void {
    for (const config of configs) {
      if (config.buildTime > 0 && config.buildTime < 1000) {
        config.buildTime *= 1000
      }
      if (config.production && !config.productionInterval) {
        config.productionInterval = config.production.interval || 60000
        config.outputResource = config.production.type || config.outputResource
        config.outputAmount = config.production.amount || config.outputAmount
      }
      if (config.productionInterval !== undefined && config.productionInterval > 0 && config.productionInterval < 1000) {
        config.productionInterval *= 1000
      }
      this.configs.set(config.id, config)
    }

    this.logger.info(`Loaded ${configs.length} production building configs`)
  }

  createBuilding(
    configId: string,
    position: { x: number; y: number },
    customId?: string
  ): ProductionBuilding | null {
    const config = this.configs.get(configId)
    if (!config) {
      this.logger.error(`Config not found: ${configId}`)
      return null
    }

    if (config.requiresTech && !this.checkTechUnlocked(config.requiresTech)) {
      this.logger.warn(`Building ${configId} requires tech: ${config.requiresTech}`)
      return null
    }

    const id = customId || `building_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    const building: ProductionBuilding = {
      id,
      configId,
      type: config.type,
      name: config.name,
      position,
      level: 1,
      status: BuildingStatus.BUILDING,
      state: {
        currentProduction: 0,
        productionProgress: 0,
        hasWorker: false,
        workerId: null,
        buildProgress: 0,
        isActive: false
      },
      createdAt: Date.now()
    }

    this.buildings.set(id, building)
    this.eventBus.emit('building:created', {
      buildingId: id,
      type: building.type,
      position
    })

    this.logger.info(`Created building ${id} of type ${config.type}`)
    return building
  }

  startConstruction(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false

    building.status = BuildingStatus.BUILDING
    building.state.buildProgress = 0
    return true
  }

  updateConstruction(buildingId: string, progress: number): boolean {
    const building = this.buildings.get(buildingId)
    if (!building || building.status !== BuildingStatus.BUILDING) return false

    const config = this.configs.get(building.configId)
    if (!config) return false

    if (!building.state.hasWorker || !building.state.workerId) {
      return false
    }

    building.state.buildProgress += progress

    if (building.state.buildProgress >= config.buildTime) {
      building.status = BuildingStatus.OPERATIONAL
      building.state.buildProgress = config.buildTime
      building.state.isActive = true
      building.builtAt = Date.now()

      if (building.type === ProductionBuildingType.RECRUITMENT_STATION && building.state.workerId) {
        const previousWorkerId = building.state.workerId
        building.state.hasWorker = false
        building.state.workerId = null
        this.eventBus.emit('building:worker-removed', { buildingId, workerId: previousWorkerId })
      }

      this.eventBus.emit('building:completed', {
        buildingId,
        type: building.type
      })
    }

    return true
  }

  assignWorker(buildingId: string, workerId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false
    if (building.status !== BuildingStatus.OPERATIONAL && building.status !== BuildingStatus.BUILDING) {
      return false
    }

    building.state.hasWorker = true
    building.state.workerId = workerId
    this.eventBus.emit('building:worker-assigned', { buildingId, workerId })
    return true
  }

  removeWorker(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false

    const previousWorkerId = building.state.workerId
    building.state.hasWorker = false
    building.state.workerId = null

    if (previousWorkerId) {
      this.eventBus.emit('building:worker-removed', { buildingId, workerId: previousWorkerId })
    }

    return true
  }

  update(deltaTime: number): void {
    for (const building of this.buildings.values()) {
      const config = this.configs.get(building.configId)
      if (!config) continue

      if (building.status === BuildingStatus.BUILDING) {
        this.updateConstruction(building.id, deltaTime)
        continue
      }

      if (building.status !== BuildingStatus.OPERATIONAL || !building.state.isActive) {
        continue
      }

      if (!config.outputResource || !config.outputAmount) {
        continue
      }

      const interval = config.productionInterval || 60000
      const efficiency = building.state.hasWorker ? 1.35 : 0.75
      building.state.productionProgress += (deltaTime / interval) * efficiency

      while (building.state.productionProgress >= 1) {
        this.produceOutput(building, config)
        building.state.productionProgress -= 1
      }
    }
  }

  private produceOutput(building: ProductionBuilding, config: ProductionBuildingConfig): void {
    const multiplier = Math.max(0.1, this.getProductionMultiplier(building, config))
    const outputAmount = Math.max(1, Math.round((config.outputAmount || 1) * building.level * multiplier))
    building.state.currentProduction += outputAmount

    this.eventBus.emit('building:produced', {
      buildingId: building.id,
      resource: config.outputResource as any,
      amount: outputAmount,
      efficiency: building.state.hasWorker ? 1 : 0.5
    })
  }

  collectProduction(buildingId: string): number {
    const building = this.buildings.get(buildingId)
    if (!building) return 0

    const amount = building.state.currentProduction
    building.state.currentProduction = 0
    return amount
  }

  upgradeBuilding(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building || building.status !== BuildingStatus.OPERATIONAL) return false

    building.level += 1
    this.eventBus.emit('building:upgraded', {
      buildingId,
      newLevel: building.level
    })

    return true
  }

  getConfig(configId: string): ProductionBuildingConfig | undefined {
    return this.configs.get(configId)
  }

  getBuilding(buildingId: string): ProductionBuilding | undefined {
    return this.buildings.get(buildingId)
  }

  getAllBuildings(): ProductionBuilding[] {
    return Array.from(this.buildings.values())
  }

  getBuildingsByType(type: ProductionBuildingType): ProductionBuilding[] {
    return Array.from(this.buildings.values()).filter(building => building.type === type)
  }

  getOperationalBuildings(): ProductionBuilding[] {
    return Array.from(this.buildings.values()).filter(building => building.status === BuildingStatus.OPERATIONAL)
  }

  deleteBuilding(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false

    this.buildings.delete(buildingId)
    this.eventBus.emit('building:destroyed', { buildingId, type: building.type })
    return true
  }

  getConstructionProgress(buildingId: string): number {
    const building = this.buildings.get(buildingId)
    if (!building) return 0

    const config = this.configs.get(building.configId)
    if (!config) return 0

    return building.state.buildProgress / config.buildTime
  }

  getProductionProgress(buildingId: string): number {
    return this.buildings.get(buildingId)?.state.productionProgress || 0
  }

  serialize(): ProductionBuilding[] {
    return this.getAllBuildings().map(building => ({
      ...building,
      position: { ...building.position },
      state: { ...building.state },
    }))
  }

  deserialize(buildings: ProductionBuilding[]): void {
    this.buildings = new Map(
      buildings.map(building => [
        building.id,
        {
          ...building,
          position: { ...building.position },
          state: { ...building.state },
        }
      ])
    )
  }
}
