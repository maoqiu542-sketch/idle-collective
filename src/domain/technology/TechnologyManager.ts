import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'
import {
  TechnologyConfig,
  TechProgress,
  TechStatus,
  TechBranch,
  ResearchStation,
  ResearchStationConfig,
  TechnologySystemState,
  TechPointSource,
  ResearchResult,
  TechUnlockCheck,
} from '@app-types/technology.types'

const DEFAULT_TECH_CONFIGS: TechnologyConfig[] = [
  {
    id: 'building_tech_1',
    name: '基础居住',
    description: '解锁房屋和厨房，稳定聚落生活。',
    branch: TechBranch.BUILDING,
    level: 1,
    essenceCost: 20,
    prerequisites: [],
    unlockTime: 0,
    unlocks: ['house', 'kitchen'],
    effects: [{ type: 'unlock', target: 'building', value: 1, description: '解锁基础生活建筑' }],
  },
  {
    id: 'building_tech_2',
    name: '聚落扩建',
    description: '解锁仓库和招募站，提升聚落容量。',
    branch: TechBranch.BUILDING,
    level: 2,
    essenceCost: 60,
    prerequisites: ['building_tech_1'],
    unlockTime: 0,
    unlocks: ['warehouse', 'recruitment_station'],
    effects: [{ type: 'capacity', target: 'storage', value: 0.3, description: '提升聚落储备能力' }],
  },
  {
    id: 'production_tech_1',
    name: '基础生产',
    description: '解锁农场，确保食物供给稳定。',
    branch: TechBranch.PRODUCTION,
    level: 1,
    essenceCost: 20,
    prerequisites: [],
    unlockTime: 0,
    unlocks: ['farm'],
    effects: [{ type: 'efficiency', target: 'farming', value: 0.1, description: '农业效率提升 10%' }],
  },
  {
    id: 'production_tech_2',
    name: '资源提炼',
    description: '解锁伐木场与采石场，强化基础资源循环。',
    branch: TechBranch.PRODUCTION,
    level: 2,
    essenceCost: 60,
    prerequisites: ['production_tech_1'],
    unlockTime: 0,
    unlocks: ['lumber_mill', 'quarry'],
    effects: [{ type: 'efficiency', target: 'gathering', value: 0.15, description: '采集效率提升 15%' }],
  },
  {
    id: 'combat_tech_1',
    name: '基础战备',
    description: '解锁兵营，提高战斗准备效率。',
    branch: TechBranch.COMBAT,
    level: 1,
    essenceCost: 40,
    prerequisites: [],
    unlockTime: 0,
    unlocks: ['barracks'],
    effects: [{ type: 'bonus', target: 'combat', value: 0.12, description: '战斗能力提升' }],
  },
  {
    id: 'combat_tech_2',
    name: '战备统筹',
    description: '提升 Boss 战前组织效率，并强化研究设施。',
    branch: TechBranch.COMBAT,
    level: 2,
    essenceCost: 100,
    prerequisites: ['combat_tech_1'],
    unlockTime: 0,
    unlocks: ['laboratory'],
    effects: [{ type: 'capacity', target: 'boss_team_size', value: 1, description: 'Boss 备战容量提升' }],
  },
]

const DEFAULT_RESEARCH_STATION_CONFIGS: ResearchStationConfig[] = [
  { id: 'basic_research_station', name: '基础研究台', level: 1, baseOutput: 1, workerSlots: 1 },
  { id: 'advanced_research_station', name: '进阶图书馆', level: 2, baseOutput: 2, workerSlots: 2, unlockTech: 'building_tech_2' },
  { id: 'super_research_station', name: '实验研究室', level: 3, baseOutput: 4, workerSlots: 3, unlockTech: 'combat_tech_2' },
]

function cloneResearchStation(station: ResearchStation): ResearchStation {
  return {
    ...station,
    assignedWorkers: [...station.assignedWorkers],
  }
}

export class TechnologyManager {
  private eventBus: EventBus
  private logger: Logger
  private techConfigs: Map<string, TechnologyConfig>
  private techProgress: Map<string, TechProgress>
  private researchStationConfigs: Map<string, ResearchStationConfig>
  private state: TechnologySystemState
  private getAssignedWorker: (workerId: string) => { intelligence: number } | null
  private getResearchOutputMultiplier: () => number
  private getResearchWorkerCapacity: () => number
  private isResearchAvailable: () => boolean

  constructor(
    eventBus: EventBus,
    getAssignedWorker: (workerId: string) => { intelligence: number } | null = () => null,
    getResearchOutputMultiplier: () => number = () => 1,
    getResearchWorkerCapacity: () => number = () => 1,
    isResearchAvailable: () => boolean = () => true
  ) {
    this.eventBus = eventBus
    this.logger = new Logger('TechnologyManager')
    this.techConfigs = new Map()
    this.techProgress = new Map()
    this.researchStationConfigs = new Map(DEFAULT_RESEARCH_STATION_CONFIGS.map(config => [config.id, config]))
    this.getAssignedWorker = getAssignedWorker
    this.getResearchOutputMultiplier = getResearchOutputMultiplier
    this.getResearchWorkerCapacity = getResearchWorkerCapacity
    this.isResearchAvailable = isResearchAvailable

    this.state = {
      points: 0,
      totalEarned: 0,
      totalSpent: 0,
      completedTechs: [],
      researchingTech: null,
      researchProgress: 0,
      researchStations: [],
      pointHistory: [],
    }
  }

  loadConfigs(configs: TechnologyConfig[]): void {
    const sourceConfigs = configs.length > 0 ? configs : DEFAULT_TECH_CONFIGS
    this.techConfigs = new Map(sourceConfigs.map(config => [config.id, config]))
    this.techProgress = new Map()

    sourceConfigs.forEach(config => {
      this.techProgress.set(config.id, {
        techId: config.id,
        status: config.prerequisites.length === 0 ? TechStatus.AVAILABLE : TechStatus.LOCKED,
        progress: 0,
      })
    })

    this.logger.info(`Loaded ${sourceConfigs.length} tech configs`)
  }

  init(): void {
    if (this.techConfigs.size === 0) {
      this.loadConfigs(DEFAULT_TECH_CONFIGS)
    }

    this.syncResearchInfrastructure()

    this.logger.info('Technology system initialized')
  }

  update(deltaTime: number): void {
    this.syncResearchInfrastructure()
    this.updateResearchStations(deltaTime)
    this.updateResearchProgress(deltaTime)
  }

  private syncResearchInfrastructure(): void {
    if (!this.isResearchAvailable()) {
      this.state.researchStations.forEach(station => {
        station.assignedWorkers = []
        station.isActive = false
      })
      return
    }

    if (this.state.researchStations.length === 0) {
      const basicStation = this.createResearchStation('basic_research_station')
      if (basicStation) {
        this.state.researchStations.push(basicStation)
      }
    }
  }

  private updateResearchStations(deltaTime: number): void {
    if (!this.isResearchAvailable()) {
      return
    }

    let totalOutput = 0

    for (const station of this.state.researchStations) {
      if (!station.isActive) continue

      const config = this.researchStationConfigs.get(station.configId)
      if (!config) continue

      let stationOutput = config.baseOutput * station.efficiency
      for (const workerId of station.assignedWorkers) {
        const worker = this.getAssignedWorker(workerId)
        if (!worker) continue

        const intelligenceBonus = worker.intelligence / 100
        stationOutput += config.baseOutput * intelligenceBonus * 0.5
      }

      totalOutput += stationOutput * this.getResearchOutputMultiplier() * (deltaTime / 60000)
    }

    if (totalOutput > 0) {
      this.addPoints(totalOutput, 'research_station')
    }
  }

  private updateResearchProgress(deltaTime: number): void {
    const researchingTechId = this.state.researchingTech
    if (!researchingTechId) return

    const config = this.techConfigs.get(researchingTechId)
    const progress = this.techProgress.get(researchingTechId)
    if (!config || !progress || config.unlockTime <= 0) return

    const deltaProgress = deltaTime / config.unlockTime
    progress.progress = Math.min(1, progress.progress + deltaProgress)
    this.state.researchProgress = progress.progress

    if (progress.progress >= 1) {
      this.completeResearch(researchingTechId)
    }
  }

  createResearchStation(configId: string): ResearchStation | null {
    const config = this.researchStationConfigs.get(configId)
    if (!config) return null
    if (config.unlockTech && !this.isTechCompleted(config.unlockTech)) return null

    const station: ResearchStation = {
      id: `station_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      configId,
      level: config.level,
      assignedWorkers: [],
      isActive: false,
      efficiency: 1,
      createdAt: Date.now(),
    }

    this.eventBus.emit('technology:station-created', { stationId: station.id, configId })
    this.logger.info(`Created research station: ${config.name}`)
    return station
  }

  assignWorkerToStation(stationId: string, workerId: string): boolean {
    const station = this.state.researchStations.find(item => item.id === stationId)
    if (!station) return false

    const config = this.researchStationConfigs.get(station.configId)
    if (!config) return false
    if (station.assignedWorkers.includes(workerId)) return false
    if (this.state.researchStations.some(item => item.assignedWorkers.includes(workerId))) return false

    const effectiveCapacity = Math.max(config.workerSlots, this.getResearchWorkerCapacity())
    if (station.assignedWorkers.length >= effectiveCapacity) {
      return false
    }

    station.assignedWorkers.push(workerId)
    station.isActive = station.assignedWorkers.length > 0
    this.eventBus.emit('technology:worker-assigned', { stationId, workerId })
    return true
  }

  removeWorkerFromStation(stationId: string, workerId: string): boolean {
    const station = this.state.researchStations.find(item => item.id === stationId)
    if (!station) return false

    const workerIndex = station.assignedWorkers.indexOf(workerId)
    if (workerIndex === -1) return false

    station.assignedWorkers.splice(workerIndex, 1)
    station.isActive = station.assignedWorkers.length > 0
    this.eventBus.emit('technology:worker-removed', { stationId, workerId })
    return true
  }

  addPoints(amount: number, source: TechPointSource['type']): void {
    if (amount <= 0) return

    this.state.points += amount
    this.state.totalEarned += amount
    this.state.pointHistory.push({ type: source, amount, timestamp: Date.now() })
    if (this.state.pointHistory.length > 100) {
      this.state.pointHistory = this.state.pointHistory.slice(-100)
    }

    this.eventBus.emit('technology:points-earned', { amount, source, total: this.state.points })
  }

  canResearch(techId: string): TechUnlockCheck {
    const config = this.techConfigs.get(techId)
    const progress = this.techProgress.get(techId)

    if (!config || !progress) {
      return { canUnlock: false, missingPrerequisites: [], missingPoints: 0 }
    }

    if (!this.isResearchAvailable()) {
      return { canUnlock: false, missingPrerequisites: [], missingPoints: 0 }
    }

    if (progress.status === TechStatus.COMPLETED || progress.status === TechStatus.RESEARCHING) {
      return { canUnlock: false, missingPrerequisites: [], missingPoints: 0 }
    }

    const missingPrerequisites = config.prerequisites.filter(prerequisite => !this.isTechCompleted(prerequisite))
    const missingPoints = Math.max(0, config.essenceCost - this.state.points)
    return {
      canUnlock: missingPrerequisites.length === 0 && missingPoints === 0,
      missingPrerequisites,
      missingPoints,
    }
  }

  startResearch(techId: string): ResearchResult {
    if (this.state.researchingTech && this.state.researchingTech !== techId) {
      return { success: false, message: '当前已有进行中的研究项目。' }
    }

    if (!this.isResearchAvailable()) {
      return { success: false, message: '需要先建造并启用研究台。' }
    }

    const check = this.canResearch(techId)
    if (!check.canUnlock) {
      if (check.missingPrerequisites.length > 0) {
        return { success: false, message: `前置科技未完成：${check.missingPrerequisites.join('、')}` }
      }
      if (check.missingPoints > 0) {
        return { success: false, message: `科技点不足，还差 ${Math.ceil(check.missingPoints)} 点。` }
      }
      return { success: false, message: '当前无法开始这项研究。' }
    }

    const config = this.techConfigs.get(techId)!
    const progress = this.techProgress.get(techId)!

    this.state.points -= config.essenceCost
    this.state.totalSpent += config.essenceCost
    this.state.pointHistory.push({ type: 'task', amount: -config.essenceCost, timestamp: Date.now() })

    this.state.researchingTech = techId
    this.state.researchProgress = 0
    progress.status = TechStatus.RESEARCHING
    progress.progress = 0
    progress.startTime = Date.now()
    delete progress.completedTime

    this.eventBus.emit('technology:research-started', { techId, pointCost: config.essenceCost })
    this.logger.info(`Started research: ${config.name}`)

    if (config.unlockTime <= 0) {
      this.completeResearch(techId)
    }

    return { success: true, techId, pointsSpent: config.essenceCost }
  }

  completeResearch(techId: string): boolean {
    const config = this.techConfigs.get(techId)
    const progress = this.techProgress.get(techId)
    if (!config || !progress) return false
    if (progress.status !== TechStatus.RESEARCHING) return false

    progress.status = TechStatus.COMPLETED
    progress.progress = 1
    progress.completedTime = Date.now()

    if (!this.state.completedTechs.includes(techId)) {
      this.state.completedTechs.push(techId)
    }

    this.state.researchingTech = null
    this.state.researchProgress = 0
    this.updateAvailableTechs()

    this.eventBus.emit('technology:research-completed', { techId, name: config.name, unlocks: config.unlocks })
    this.logger.info(`Research completed: ${config.name}`)
    return true
  }

  private updateAvailableTechs(): void {
    for (const [techId, progress] of this.techProgress.entries()) {
      if (progress.status !== TechStatus.LOCKED) continue

      const config = this.techConfigs.get(techId)
      if (!config) continue

      if (config.prerequisites.every(prerequisite => this.isTechCompleted(prerequisite))) {
        progress.status = TechStatus.AVAILABLE
        this.eventBus.emit('technology:unlocked', { techId })
      }
    }
  }

  isTechCompleted(techId: string): boolean {
    return this.state.completedTechs.includes(techId)
  }

  isTechAvailable(techId: string): boolean {
    return this.techProgress.get(techId)?.status === TechStatus.AVAILABLE
  }

  getTechConfig(techId: string): TechnologyConfig | undefined {
    return this.techConfigs.get(techId)
  }

  getAllTechConfigs(): TechnologyConfig[] {
    return Array.from(this.techConfigs.values())
  }

  getTechsByBranch(branch: TechBranch): TechnologyConfig[] {
    return Array.from(this.techConfigs.values()).filter(config => config.branch === branch)
  }

  getTechProgress(techId: string): TechProgress | undefined {
    const progress = this.techProgress.get(techId)
    return progress ? { ...progress } : undefined
  }

  getAllTechProgress(): Map<string, TechProgress> {
    return new Map(Array.from(this.techProgress.entries()).map(([techId, progress]) => [techId, { ...progress }]))
  }

  getPoints(): number {
    return this.state.points
  }

  getCompletedTechs(): string[] {
    return [...this.state.completedTechs]
  }

  getResearchStations(): ResearchStation[] {
    return this.state.researchStations.map(cloneResearchStation)
  }

  getAssignedWorkerCount(): number {
    return this.state.researchStations.reduce((sum, station) => sum + station.assignedWorkers.length, 0)
  }

  getCurrentOutputMultiplier(): number {
    return this.getResearchOutputMultiplier()
  }

  getStats(): { totalEarned: number; totalSpent: number; completedCount: number } {
    return {
      totalEarned: this.state.totalEarned,
      totalSpent: this.state.totalSpent,
      completedCount: this.state.completedTechs.length,
    }
  }

  serialize(): TechnologySystemState {
    return {
      ...this.state,
      completedTechs: [...this.state.completedTechs],
      researchStations: this.state.researchStations.map(cloneResearchStation),
      pointHistory: [...this.state.pointHistory],
    }
  }

  deserialize(data: TechnologySystemState): void {
    this.state = {
      ...data,
      completedTechs: [...data.completedTechs],
      researchStations: data.researchStations.map(cloneResearchStation),
      pointHistory: [...data.pointHistory],
    }

    for (const [techId, progress] of this.techProgress.entries()) {
      if (this.state.completedTechs.includes(techId)) {
        progress.status = TechStatus.COMPLETED
        progress.progress = 1
      } else if (progress.status === TechStatus.COMPLETED) {
        progress.status = progress.techId === this.state.researchingTech ? TechStatus.RESEARCHING : TechStatus.LOCKED
        progress.progress = 0
      }
    }

    this.updateAvailableTechs()
  }
}
