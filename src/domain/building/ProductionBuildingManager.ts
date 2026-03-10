import {
  ProductionBuilding,
  ProductionBuildingConfig,
  ProductionBuildingType,
  BuildingStatus
} from '@app-types/production-building.types'
import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'

export class ProductionBuildingManager {
  private eventBus: EventBus
  private logger: Logger
  private buildings: Map<string, ProductionBuilding> = new Map()
  private configs: Map<string, ProductionBuildingConfig> = new Map()

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('ProductionBuildingManager')
  }

  loadConfigs(configs: ProductionBuildingConfig[]): void {
    for (const config of configs) {
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

    const id = customId || `building_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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

    this.logger.debug(`Started construction of building ${buildingId}`)
    return true
  }

  updateConstruction(buildingId: string, progress: number): boolean {
    const building = this.buildings.get(buildingId)
    if (!building || building.status !== BuildingStatus.BUILDING) return false

    const config = this.configs.get(building.configId)
    if (!config) return false

    building.state.buildProgress += progress

    if (building.state.buildProgress >= config.buildTime) {
      building.status = BuildingStatus.OPERATIONAL
      building.state.buildProgress = config.buildTime
      building.state.isActive = true

      this.eventBus.emit('building:completed', {
        buildingId,
        type: building.type
      })

      this.logger.info(`Building ${buildingId} construction completed`)
    }

    return true
  }

  assignWorker(buildingId: string, workerId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building || building.status !== BuildingStatus.OPERATIONAL) return false

    building.state.hasWorker = true
    building.state.workerId = workerId

    this.eventBus.emit('building:worker-assigned', {
      buildingId,
      workerId
    })

    this.logger.debug(`Assigned worker ${workerId} to building ${buildingId}`)
    return true
  }

  removeWorker(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false

    const previousWorkerId = building.state.workerId
    building.state.hasWorker = false
    building.state.workerId = null

    if (previousWorkerId) {
      this.eventBus.emit('building:worker-removed', {
        buildingId,
        workerId: previousWorkerId
      })
    }

    this.logger.debug(`Removed worker from building ${buildingId}`)
    return true
  }

  update(deltaTime: number): void {
    for (const building of this.buildings.values()) {
      const config = this.configs.get(building.configId)
      if (!config) continue

      // Handle construction progress
      if (building.status === BuildingStatus.BUILDING) {
        this.updateConstruction(building.id, deltaTime)
        continue
      }

      // Handle production for operational buildings
      if (building.status !== BuildingStatus.OPERATIONAL) continue
      if (!building.state.isActive) continue

      const efficiency = building.state.hasWorker ? 1.0 : 0.5
      const progressIncrement = (deltaTime / config.productionInterval) * efficiency

      building.state.productionProgress += progressIncrement

      if (building.state.productionProgress >= 1.0) {
        this.produceOutput(building, config)
        building.state.productionProgress = 0
      }
    }
  }

  private produceOutput(building: ProductionBuilding, config: ProductionBuildingConfig): void {
    const outputAmount = config.outputAmount * building.level

    building.state.currentProduction += outputAmount

    this.eventBus.emit('building:produced', {
      buildingId: building.id,
      resource: config.outputResource as any,
      amount: outputAmount,
      efficiency: building.state.hasWorker ? 1.0 : 0.5
    })
  }

  collectProduction(buildingId: string): number {
    const building = this.buildings.get(buildingId)
    if (!building) return 0

    const amount = building.state.currentProduction
    building.state.currentProduction = 0

    this.logger.debug(`Collected ${amount} from building ${buildingId}`)
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

    this.logger.info(`Upgraded building ${buildingId} to level ${building.level}`)
    return true
  }

  getBuilding(buildingId: string): ProductionBuilding | undefined {
    return this.buildings.get(buildingId)
  }

  getAllBuildings(): ProductionBuilding[] {
    return Array.from(this.buildings.values())
  }

  getBuildingsByType(type: ProductionBuildingType): ProductionBuilding[] {
    return Array.from(this.buildings.values()).filter(b => b.type === type)
  }

  getOperationalBuildings(): ProductionBuilding[] {
    return Array.from(this.buildings.values()).filter(
      b => b.status === BuildingStatus.OPERATIONAL
    )
  }

  deleteBuilding(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false

    this.buildings.delete(buildingId)

    this.eventBus.emit('building:destroyed', {
      buildingId,
      type: building.type
    })

    this.logger.info(`Deleted building ${buildingId}`)
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
    const building = this.buildings.get(buildingId)
    return building?.state.productionProgress || 0
  }
}
