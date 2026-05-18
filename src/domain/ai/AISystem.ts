import { Character, ProfessionType, CharacterState, SkillType } from '@app-types/character.types'
import { Task, TaskType, TaskPriority, TaskStatus, NeedType } from '@app-types/priority.types'
import { EventBus } from '@core/EventBus'
import { CharacterManager } from '@domain/character/CharacterManager'
import { MapSystem } from '@domain/map/MapSystem'
import { ProductionBuildingManager } from '@domain/building/ProductionBuildingManager'
import { PlayerInterventionManager } from '@domain/intervention/PlayerInterventionManager'
import { BuildingStatus } from '@app-types/production-building.types'
import { ProductionBuildingType } from '@app-types/production-building.types'
import { Logger } from '@utils/logger'
import { TaskPhase, ActiveTask } from './AITypes'

/** TaskType → 执行时对应的 CharacterState */
const TASK_WORKING_STATES: Partial<Record<TaskType, CharacterState>> = {
  [TaskType.GATHER]:   CharacterState.GATHERING,
  [TaskType.HARVEST]:  CharacterState.GATHERING,
  [TaskType.FARM]:     CharacterState.FARMING,
  [TaskType.GROW]:     CharacterState.FARMING,
  [TaskType.HUNT]:     CharacterState.HUNTING,
  [TaskType.BUILD]:    CharacterState.BUILDING,
  [TaskType.CONSTRUCT]:CharacterState.BUILDING,
  [TaskType.CRAFT]:    CharacterState.CRAFTING,
  [TaskType.COOK]:     CharacterState.COOKING,
  [TaskType.HEAL]:     CharacterState.HEALING,
  [TaskType.RESEARCH]: CharacterState.RESEARCHING,
  [TaskType.WORK]:     CharacterState.WORKING,
}

const PROFESSION_TASKS: Record<ProfessionType, TaskType[]> = {
  [ProfessionType.FARMER]:   [TaskType.FARM, TaskType.GROW, TaskType.HARVEST, TaskType.HAUL],
  [ProfessionType.HUNTER]:   [TaskType.HUNT, TaskType.GATHER, TaskType.HAUL],
  [ProfessionType.WARRIOR]:  [TaskType.COMBAT, TaskType.GUARD],
  [ProfessionType.ENGINEER]: [TaskType.BUILD, TaskType.CONSTRUCT, TaskType.CRAFT],
  [ProfessionType.COOK]:     [TaskType.COOK, TaskType.GATHER],
  [ProfessionType.DOCTOR]:   [TaskType.HEAL, TaskType.PATIENT, TaskType.RESCUE],
  [ProfessionType.SCHOLAR]:  [TaskType.RESEARCH, TaskType.WORK],
}

const TASK_PRIORITIES: Partial<Record<TaskType, TaskPriority>> = {
  [TaskType.FIREFIGHT]: TaskPriority.CRITICAL,
  [TaskType.RESCUE]: TaskPriority.CRITICAL,
  [TaskType.PATIENT]: TaskPriority.HIGH,
  [TaskType.SLEEP]: TaskPriority.HIGH,
  [TaskType.EAT]: TaskPriority.HIGH,
  [TaskType.REST]: TaskPriority.NORMAL,
  [TaskType.GATHER]: TaskPriority.NORMAL,
  [TaskType.BUILD]: TaskPriority.NORMAL,
  [TaskType.CRAFT]: TaskPriority.NORMAL,
  [TaskType.WORK]: TaskPriority.NORMAL,
  [TaskType.MOVE]: TaskPriority.LOW,
  [TaskType.SOCIALIZE]: TaskPriority.LOW,
  [TaskType.COMBAT]: TaskPriority.NORMAL,
  [TaskType.DOCTOR]: TaskPriority.HIGH,
  [TaskType.CONSTRUCT]: TaskPriority.NORMAL,
  [TaskType.GROW]: TaskPriority.NORMAL,
  [TaskType.MINE]: TaskPriority.NORMAL,
  [TaskType.HAUL]: TaskPriority.LOW,
  [TaskType.CLEAN]: TaskPriority.LOW,
  [TaskType.HARVEST]: TaskPriority.NORMAL,
  [TaskType.JOY]: TaskPriority.LOW,
  [TaskType.SOCIAL]: TaskPriority.LOW,
  [TaskType.MEDITATE]: TaskPriority.LOW,
  [TaskType.GUARD]: TaskPriority.NORMAL,
}

const TASK_BASE_UTILITIES: Partial<Record<TaskType, number>> = {
  [TaskType.GATHER]: 30,
  [TaskType.HARVEST]: 25,
  [TaskType.BUILD]: 20,
  [TaskType.WORK]: 35,
  [TaskType.REST]: 15,
  [TaskType.EAT]: 50,
}

const TASK_SKILL_MAP: Partial<Record<TaskType, SkillType>> = {
  [TaskType.GATHER]: SkillType.GATHERING,
  [TaskType.HARVEST]: SkillType.FARMING,
  [TaskType.FARM]: SkillType.FARMING,
  [TaskType.GROW]: SkillType.FARMING,
  [TaskType.HUNT]: SkillType.HUNTING,
  [TaskType.BUILD]: SkillType.BUILDING,
  [TaskType.CONSTRUCT]: SkillType.BUILDING,
  [TaskType.CRAFT]: SkillType.ENGINEERING,
  [TaskType.COOK]: SkillType.COOKING,
  [TaskType.HEAL]: SkillType.MEDICINE,
  [TaskType.RESEARCH]: SkillType.RESEARCH,
  [TaskType.COMBAT]: SkillType.COMBAT,
  [TaskType.GUARD]: SkillType.COMBAT,
}

const AUTO_STAFFABLE_OPERATIONAL_BUILDINGS = new Set<ProductionBuildingType>([
  ProductionBuildingType.LUMBER_MILL,
  ProductionBuildingType.QUARRY,
  ProductionBuildingType.FARM,
  ProductionBuildingType.KITCHEN,
  ProductionBuildingType.BARRACKS,
  ProductionBuildingType.RESEARCH_DESK,
])

const OPERATIONAL_STAFFING_IDLE_RESERVE = 3
const AI_VERBOSE_DEBUG = false
const AI_DIAG = true

let taskIdCounter = 0

export class AISystem {
  private characterManager: CharacterManager
  private mapSystem: MapSystem
  private buildingManager: ProductionBuildingManager | null
  private interventionManager: PlayerInterventionManager | null
  private eventBus: EventBus
  private logger: Logger
  private pendingTasks: Task[] = []
  private activeTasks: Map<string, ActiveTask> = new Map()
  private needTaskCooldowns: Map<string, number> = new Map()
  private static readonly NEED_COOLDOWN_MS = 30000
  private gameTime: number = 0

  private verboseDebug(...args: unknown[]): void {
    if (!AI_VERBOSE_DEBUG) return
    console.log(...args)
  }

  constructor(
    characterManager: CharacterManager, 
    mapSystem: MapSystem, 
    eventBus?: EventBus,
    buildingManager?: ProductionBuildingManager,
    interventionManager?: PlayerInterventionManager
  ) {
    this.characterManager = characterManager
    this.mapSystem = mapSystem
    this.buildingManager = buildingManager || null
    this.interventionManager = interventionManager || null
    this.eventBus = eventBus || new EventBus()
    this.logger = new Logger('AISystem')

    this.eventBus.on('need:critical', (event: { characterId: string; needType: string; value: number }) => {
      this.handleNeedCritical(event.characterId, event.needType as NeedType)
    })

    this.eventBus.on('task:priority-changed', (event: { characterId: string }) => {
      this.replanCharacter(event.characterId)
    })

    this.eventBus.on('task:priorities-reset', (event: { characterId: string }) => {
      this.replanCharacter(event.characterId)
    })

    this.eventBus.on('task:disabled', (event: { characterId: string; taskType: TaskType }) => {
      const activeTask = this.activeTasks.get(event.characterId)
      if (activeTask?.task.type === event.taskType) {
        this.replanCharacter(event.characterId)
      }
    })

    this.eventBus.on('task:forced', (event: { characterId: string }) => {
      this.replanCharacter(event.characterId)
    })
  }

  private handleNeedCritical(characterId: string, needType: NeedType): void {
    const character = this.characterManager.get(characterId)
    if (!character) return

    const cooldownKey = `${characterId}_${needType}`
    const lastProcessed = this.needTaskCooldowns.get(cooldownKey)
    if (lastProcessed && this.gameTime - lastProcessed < AISystem.NEED_COOLDOWN_MS) {
      return
    }

    if (character.state !== CharacterState.IDLE) {
      this.verboseDebug(`[AISystem] ${character.name} is busy (${character.state}), cannot handle critical need ${needType}`)
      return
    }

    if (this.activeTasks.has(characterId)) {
      const activeTask = this.activeTasks.get(characterId)
      if (activeTask?.task.type === TaskType.EAT || activeTask?.task.type === TaskType.SLEEP) {
        this.verboseDebug(`[AISystem] ${character.name} already has active need task, skipping ${needType}`)
        return
      }
    }

    const taskType = needType === NeedType.HUNGER ? TaskType.EAT
      : needType === NeedType.REST ? TaskType.SLEEP
      : null
    if (!taskType) return

    this.needTaskCooldowns.set(cooldownKey, this.gameTime)

    const id = `need_${characterId}_${needType}_${taskIdCounter++}`
    const urgentTask: Task = {
      id,
      type: taskType,
      priority: TaskPriority.HIGH,
      status: TaskStatus.ASSIGNED,
      assignedCharacterId: characterId,
      position: character.position,
      utility: 90,
      createdAt: Date.now()
    }

    const targetState = taskType === TaskType.EAT ? CharacterState.EATING : CharacterState.SLEEPING
    this.characterManager.setState(characterId, targetState)

    this.activeTasks.set(characterId, {
      task: urgentTask,
      characterId,
      startTime: this.gameTime,
      duration: 5000,
      progress: 0,
      phase: TaskPhase.WORKING,
      moveDelay: 0,
      moveTimer: 0,
    })

    this.verboseDebug(`[AISystem] ${character.name} started ${taskType} due to critical ${needType}`)
    if (AI_VERBOSE_DEBUG) {
      this.logger.debug(`Urgent ${taskType} task started for ${character.name} due to critical ${needType}`)
    }
  }

  update(deltaTime: number): void {
    this.gameTime += deltaTime
    if (AI_DIAG && Math.floor(this.gameTime / 2000) !== Math.floor((this.gameTime - deltaTime) / 2000)) {
      const chars = this.characterManager.getAll()
      const byState: Record<string, number> = {}
      for (const c of chars) {
        byState[c.state] = (byState[c.state] || 0) + 1
      }
      const stateStr = Object.entries(byState).map(([s, n]) => `${s}=${n}`).join(' ')
      const pending = this.pendingTasks.filter(t=>t.status===TaskStatus.PENDING).length
      const active = this.activeTasks.size
      console.log(`[AI_DIAG] update(t=${(this.gameTime/1000).toFixed(0)}s) | ${stateStr} | pending=${pending} active=${active}`)
    }
    if (AI_VERBOSE_DEBUG) {
      this.verboseDebug('[AISystem] update called, characters:', this.characterManager.getAll().length)
    }
    this.updateActiveTasks(deltaTime)
    this.scanForTasksOptimized()
    this.assignTasks()

    if (AI_VERBOSE_DEBUG && Math.floor(this.gameTime / 5000) !== Math.floor((this.gameTime - deltaTime) / 5000)) {
      const characters = this.characterManager.getAll()
      const idleCount = characters.filter(c => c.state === CharacterState.IDLE).length
      const workingCount = characters.filter(c => c.state === CharacterState.WORKING).length
      const movingCount = characters.filter(c => c.state === CharacterState.MOVING).length
      const pendingTaskCount = this.pendingTasks.filter(t => t.status === TaskStatus.PENDING).length
      const activeTaskCount = this.activeTasks.size

      this.logger.info(`[AI状态] 角色: ${characters.length}个 (闲置:${idleCount}, 工作:${workingCount}, 移动:${movingCount}) | 任务: 待分配${pendingTaskCount}个, 执行中${activeTaskCount}个`)
    }
  }

  private scanForTasksOptimized(): void {
    const mapData = this.mapSystem.getMapData()
    if (!mapData) {
      if (AI_DIAG) console.log('[AI_DIAG] scanForTasks: NO MAP DATA')
      this.verboseDebug('[AISystem] No map data')
      return
    }

    const MAX_PENDING_TASKS = 50
    const currentPendingCount = this.pendingTasks.filter(t => t.status === TaskStatus.PENDING).length
    
    this.verboseDebug('[AISystem] currentPendingCount:', currentPendingCount, 'MAX:', MAX_PENDING_TASKS)
    
    if (currentPendingCount >= MAX_PENDING_TASKS) {
      this.verboseDebug('[AISystem] Already have enough pending tasks, skipping scan')
      return
    }

    const characters = this.characterManager.getAll()
    const activePositions = characters.map(c => c.position)

    let tasksCreated = 0
    const tasksNeeded = MAX_PENDING_TASKS - currentPendingCount

    this.verboseDebug('[AISystem] Will create up to', tasksNeeded, 'new tasks')

    const resourceTiles: { x: number; y: number; tile: any }[] = []
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = mapData.tiles[y][x]
        if (tile.resource && tile.resource.amount > 0) {
          resourceTiles.push({ x, y, tile })
        }
      }
    }
    
    if (AI_DIAG && resourceTiles.length === 0) {
      console.log(`[AI_DIAG] scanForTasks: NO resource tiles with amount>0 found (map=${mapData.width}x${mapData.height})`)
    }
    
    this.verboseDebug('[AISystem] Resource tiles with amount > 0:', resourceTiles.length, 'total tiles checked:', mapData.width * mapData.height)
    if (resourceTiles.length > 0) {
      this.verboseDebug('[AISystem] First resource tile:', resourceTiles[0])
    }

    resourceTiles.sort((a, b) => {
      const minDistA = Math.min(...activePositions.map(p => 
        Math.abs(p.x - a.x) + Math.abs(p.y - a.y)
      ))
      const minDistB = Math.min(...activePositions.map(p => 
        Math.abs(p.x - b.x) + Math.abs(p.y - b.y)
      ))
      return minDistA - minDistB
    })

    for (const { x, y } of resourceTiles) {
      if (tasksCreated >= tasksNeeded) {
        this.verboseDebug('[AISystem] tasksCreated >= tasksNeeded, breaking. tasksCreated:', tasksCreated, 'tasksNeeded:', tasksNeeded)
        break
      }

      const existingTask = this.pendingTasks.find(
        t => t.type === TaskType.GATHER && 
             t.targetPosition?.x === x && 
             t.targetPosition?.y === y &&
             (t.status === TaskStatus.PENDING || t.status === TaskStatus.ASSIGNED)
      )
      
      if (!existingTask) {
        this.verboseDebug('[AISystem] Creating task for', x, y)
        const baseUtility = TASK_BASE_UTILITIES[TaskType.GATHER] || 30
        
        this.pendingTasks.push({
          id: `gather_${x}_${y}_${taskIdCounter++}_${Math.random()}`,
          type: TaskType.GATHER,
          priority: TASK_PRIORITIES[TaskType.GATHER] || TaskPriority.NORMAL,
          status: TaskStatus.PENDING,
          position: { x, y },
          targetPosition: { x, y },
          utility: baseUtility,
          createdAt: Date.now()
        })
        tasksCreated++
      } else {
        this.verboseDebug('[AISystem] Task already exists for', x, y)
      }
    }
    
    if (tasksCreated > 0) {
      this.verboseDebug('[AISystem] Created', tasksCreated, 'new tasks, total pending:', this.pendingTasks.filter(t => t.status === TaskStatus.PENDING).length)
      if (AI_VERBOSE_DEBUG) {
        this.logger.debug(`Created ${tasksCreated} new tasks (total pending: ${this.pendingTasks.filter(t => t.status === TaskStatus.PENDING).length})`)
      }
    }
  }

  private assignTasks(): void {
    const characters = this.characterManager.getAll()
    const idleCharacters = characters.filter(c => c.state === CharacterState.IDLE && !this.activeTasks.has(c.id))

    if (AI_DIAG && idleCharacters.length === 0 && characters.length > 0) {
      const nIdle = characters.filter(c => c.state === CharacterState.IDLE).length
      const nBusy = characters.filter(c => c.state !== CharacterState.IDLE).length
      console.log(`[AI_DIAG] assignTasks: no idle+untasked chars | all=${characters.length} idle=${nIdle} busy=${nBusy}`)
    }

    if (characters.length === 0) {
      this.logger.debug('No characters found')
      return
    }

    this.assignWorkersToBuildings(idleCharacters)

    const stillIdleCharacters = this.characterManager
        .getAll()
        .filter(character => character.state === CharacterState.IDLE && !this.activeTasks.has(character.id))

    for (const character of stillIdleCharacters) {
      
      const suitableTasks = this.pendingTasks.filter(task =>
        task.status === TaskStatus.PENDING &&
        (!task.assignedCharacterId || task.assignedCharacterId === character.id) &&
        this.isTaskSuitable(character, task)
      )

      if (suitableTasks.length === 0) {
        this.verboseDebug('[AISystem] No suitable tasks for', character.name, character.profession)
        continue
      }

      const bestTask = this.selectBestTask(character, suitableTasks)

      bestTask.status = TaskStatus.ASSIGNED
      bestTask.assignedCharacterId = character.id

      this.startTask(character, bestTask)
      this.verboseDebug('[AISystem] Assigned task to', character.name)
    }
  }

  private assignWorkersToBuildings(idleCharacters: Character[]): void {
    if (!this.buildingManager) return

    this.releaseUnsupportedOperationalWorkers()
    idleCharacters = this.characterManager
      .getAll()
      .filter(character => character.state === CharacterState.IDLE && !this.activeTasks.has(character.id))
    if (idleCharacters.length === 0) return

    const productionBuildings = this.buildingManager.getAllBuildings()
    if (!productionBuildings || productionBuildings.length === 0) return

    const constructionQueue = productionBuildings.filter(
      building => building.status === BuildingStatus.BUILDING && !building.state.hasWorker
    )
    const operationalQueue = productionBuildings.filter(
      building =>
        building.status === BuildingStatus.OPERATIONAL &&
        !building.state.hasWorker &&
        AUTO_STAFFABLE_OPERATIONAL_BUILDINGS.has(building.type)
    )
    if (constructionQueue.length === 0 && operationalQueue.length === 0) return

    const BUILDING_PREFERRED_PROFESSIONS: Record<string, ProfessionType[]> = {
      lumber_mill: [ProfessionType.HUNTER, ProfessionType.ENGINEER],
      quarry: [ProfessionType.ENGINEER, ProfessionType.HUNTER],
      farm: [ProfessionType.FARMER],
      kitchen: [ProfessionType.COOK, ProfessionType.FARMER],
      house: [ProfessionType.ENGINEER],
      warehouse: [ProfessionType.ENGINEER, ProfessionType.HUNTER],
      barracks: [ProfessionType.WARRIOR],
      research_desk: [ProfessionType.SCHOLAR],
    }

    idleCharacters = this.assignWorkersFromQueue(
      constructionQueue,
      idleCharacters,
      BUILDING_PREFERRED_PROFESSIONS,
      0
    )

    this.assignWorkersFromQueue(
      operationalQueue,
      idleCharacters,
      BUILDING_PREFERRED_PROFESSIONS,
      OPERATIONAL_STAFFING_IDLE_RESERVE
    )
  }

  private assignWorkersFromQueue(
    buildings: Array<{
      id: string
      type: ProductionBuildingType
      status: BuildingStatus
      position: { x: number; y: number }
      state: { hasWorker: boolean }
    }>,
    idleCharacters: Character[],
    preferredProfessionMap: Record<string, ProfessionType[]>,
    idleReserve: number
  ): Character[] {
    if (!this.buildingManager) {
      return idleCharacters
    }

    for (const building of buildings) {
      if (idleCharacters.length === 0) break
      if (building.state.hasWorker) continue
      if (idleCharacters.length <= idleReserve) continue

      const preferredTypes = preferredProfessionMap[building.type] || []
      const availableChars = idleCharacters.filter(character => {
        const professionMatch = preferredTypes.length === 0 || preferredTypes.includes(character.profession)
        const assignmentTaskType = building.status === BuildingStatus.BUILDING ? TaskType.BUILD : TaskType.WORK
        const taskAllowed = !this.interventionManager?.isTaskDisabled(character.id, assignmentTaskType)
        return professionMatch && taskAllowed && character.state === CharacterState.IDLE && !this.activeTasks.has(character.id)
      })
      if (availableChars.length === 0) continue

      const char = availableChars[0]
      const success = this.buildingManager.assignWorker(building.id, char.id)
      if (!success) continue

      this.characterManager.move(char.id, building.position)
      if (building.status === BuildingStatus.BUILDING) {
        this.characterManager.setState(char.id, CharacterState.BUILDING)
      }
      idleCharacters = idleCharacters.filter(character => character.id !== char.id)
      this.verboseDebug(`[AISystem] Assigned ${char.name} to ${building.type}`)
    }

    return idleCharacters
  }

  private releaseUnsupportedOperationalWorkers(): void {
    if (!this.buildingManager) {
      return
    }

    for (const building of this.buildingManager.getAllBuildings()) {
      if (building.status !== BuildingStatus.OPERATIONAL) continue
      if (!building.state.hasWorker || !building.state.workerId) continue
      if (AUTO_STAFFABLE_OPERATIONAL_BUILDINGS.has(building.type)) {
        const worker = this.characterManager.get(building.state.workerId)
        if (worker?.state === CharacterState.BUILDING) {
          this.characterManager.setState(worker.id, CharacterState.WORKING)
        }
        continue
      }

      const workerId = building.state.workerId
      this.buildingManager.removeWorker(building.id)
      this.characterManager.setState(workerId, CharacterState.IDLE)
    }
  }

  private selectBestTask(character: Character, tasks: Task[]): Task {
    const scored = tasks.map(task => ({
      task,
      score: this.calculateUtility(character, task)
    })).sort((a, b) => b.score - a.score)

    return scored[0].task
  }

  private calculateUtility(character: Character, task: Task): number {
    let utility = task.utility

    const preferredTasks = PROFESSION_TASKS[character.profession] || []
    if (preferredTasks.includes(task.type)) {
      utility *= 1.3
    }

    const relatedSkill = TASK_SKILL_MAP[task.type]
    if (relatedSkill) {
      const talentLevel = character.talents.get(relatedSkill)?.level ?? 1
      utility *= 1 + (talentLevel - 1) * 0.12

      const explicitPriority = character.skillPriorities.get(relatedSkill)
      if (explicitPriority) {
        utility *= Math.max(0.7, 1.75 - explicitPriority * 0.15)
      }
    }

    const taskPriority = this.interventionManager?.getTaskPriority(character.id, task.type)
    if (taskPriority) {
      utility *= Math.max(0.7, 1.75 - taskPriority * 0.15)
    }

    if (task.targetPosition) {
      const dx = task.targetPosition.x - character.position.x
      const dy = task.targetPosition.y - character.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      utility *= Math.max(0.5, 1 - distance / 50)
    }

    return utility
  }

  private startTask(character: Character, task: Task): void {
    const duration = this.estimateTaskDuration(character, task)
    const moveDelay = 300 + Math.random() * 400

    this.characterManager.setState(character.id, CharacterState.MOVING)

    const activeTask: ActiveTask = {
      task,
      characterId: character.id,
      startTime: this.gameTime,
      duration,
      progress: 0,
      phase: TaskPhase.MOVING,
      moveDelay,
      moveTimer: 0,
    }

    this.activeTasks.set(character.id, activeTask)

    if (AI_DIAG) console.log(`[AI_DIAG] ${character.name}: task=${task.type} moveDelay=${moveDelay.toFixed(0)}ms duration=${duration}ms pos=(${character.position.x},${character.position.y})→(${task.targetPosition?.x},${task.targetPosition?.y})`)

    this.verboseDebug('[AISystem] Character', character.name, 'state changed to MOVING')

    this.eventBus.emit('task:assigned', {
      taskId: task.id,
      characterId: character.id,
      taskType: task.type
    })

    this.eventBus.emit('task:started', {
      characterId: character.id,
      taskId: task.id,
      taskType: task.type,
      estimatedDuration: duration
    })

    if (AI_VERBOSE_DEBUG) {
      this.logger.debug(`Started task ${task.type} for ${character.name}`)
    }
  }

  private updateActiveTasks(deltaTime: number): void {
    for (const [characterId, activeTask] of this.activeTasks) {
      const character = this.characterManager.get(characterId)
      if (!character) {
        this.activeTasks.delete(characterId)
        continue
      }

      if (activeTask.phase === TaskPhase.MOVING) {
        activeTask.moveTimer += deltaTime
        if (activeTask.moveTimer >= activeTask.moveDelay) {
          if (AI_DIAG) console.log(`[AI_DIAG] ${character.name}: MOVING→WORKING (moveTimer=${activeTask.moveTimer.toFixed(0)}ms target=${activeTask.moveDelay.toFixed(0)}ms)`)
          if (activeTask.task.targetPosition) {
            this.characterManager.move(characterId, activeTask.task.targetPosition)
          }
          const workingState = TASK_WORKING_STATES[activeTask.task.type] ?? CharacterState.WORKING
          this.characterManager.setState(characterId, workingState)
          activeTask.phase = TaskPhase.WORKING
        } else {
          if (AI_DIAG && Math.floor(activeTask.moveTimer / 200) !== Math.floor((activeTask.moveTimer - deltaTime) / 200)) {
            console.log(`[AI_DIAG] ${character.name}: still MOVING (moveTimer=${activeTask.moveTimer.toFixed(0)}ms / ${activeTask.moveDelay.toFixed(0)}ms)`)
          }
        }
      }

      if (activeTask.phase === TaskPhase.WORKING) {
        activeTask.progress += deltaTime / activeTask.duration

        this.eventBus.emit('task:progress', {
          characterId,
          taskType: activeTask.task.type,
          progress: activeTask.progress,
          duration: activeTask.duration
        })

        if (activeTask.progress >= 1.0) {
          this.completeTask(character, activeTask)
          this.activeTasks.delete(characterId)
        }
      }
    }
  }

  private completeTask(character: Character, activeTask: ActiveTask): void {
    const task = activeTask.task

    switch (task.type) {
      case TaskType.GATHER:
        this.executeGather(character, task)
        break
      case TaskType.HARVEST:
        this.executeHarvest(character, task)
        break
      default:
        break
    }

    task.status = TaskStatus.COMPLETED
    this.characterManager.setState(character.id, CharacterState.IDLE)

    if (AI_DIAG) console.log(`[AI_DIAG] ${character.name}: task=${task.type} COMPLETED → IDLE`)

    const index = this.pendingTasks.findIndex(t => t.id === task.id)
    if (index !== -1) {
      this.pendingTasks.splice(index, 1)
    }

    this.eventBus.emit('task:completed', {
      characterId: character.id,
      taskId: task.id,
      taskType: task.type
    })

    if (AI_VERBOSE_DEBUG) {
      this.logger.debug(`Completed task ${task.type} for ${character.name}`)
    }
  }

  private executeGather(character: Character, task: Task): void {
    if (!task.targetPosition) {
      this.logger.warn(`executeGather: task has no targetPosition`)
      return
    }

    if (AI_VERBOSE_DEBUG) {
      this.logger.debug(`${character.name} attempting to harvest at (${task.targetPosition.x}, ${task.targetPosition.y})`)
    }

    const result = this.mapSystem.harvestResource(
      task.targetPosition.x,
      task.targetPosition.y
    )

    if (result) {
      this.logger.info(`${character.name} harvested ${result.amount} ${result.type}`)
      this.eventBus.emit('resource:collected', {
        characterId: character.id,
        type: result.type,
        amount: result.amount
      })
      this.eventBus.emit('resource:harvested', {
        characterId: character.id,
        type: result.type,
        amount: result.amount,
        position: task.targetPosition,
      })
    } else {
      this.logger.warn(`${character.name} failed to harvest at (${task.targetPosition.x}, ${task.targetPosition.y})`)
    }
  }

  private executeHarvest(character: Character, task: Task): void {
    this.executeGather(character, task)
  }

  private isTaskSuitable(character: Character, task: Task): boolean {
    if (this.interventionManager?.isTaskDisabled(character.id, task.type)) {
      return false
    }

    const preferredTasks = PROFESSION_TASKS[character.profession] || []
    if (task.type === TaskType.EAT || task.type === TaskType.SLEEP || task.type === TaskType.REST) return true
    return preferredTasks.includes(task.type) || task.type === TaskType.MOVE || task.type === TaskType.GATHER
  }

  private estimateTaskDuration(character: Character, task: Task): number {
    const baseDuration = 4000

    let taskMultiplier = 1.0
    switch (task.type) {
      case TaskType.GATHER:
        taskMultiplier = 1.0
        break
      case TaskType.HARVEST:
        taskMultiplier = 1.2
        break
      case TaskType.BUILD:
        taskMultiplier = 2.0
        break
    }

    const relatedSkill = TASK_SKILL_MAP[task.type] ?? SkillType.GATHERING
    const gatheringSkill = character.talents.get(relatedSkill)
    const talentLevel = gatheringSkill?.level || 1
    const talentMultiplier = 5 / talentLevel

    const preferredTasks = PROFESSION_TASKS[character.profession] || []
    const efficiency = preferredTasks.includes(task.type) ? 0.8 : 1.0

    return Math.floor(baseDuration * taskMultiplier * efficiency * talentMultiplier)
  }

  private replanCharacter(characterId: string): void {
    const activeTask = this.activeTasks.get(characterId)
    if (activeTask) {
      if (activeTask.task.status === TaskStatus.ASSIGNED) {
        activeTask.task.status = TaskStatus.PENDING
        activeTask.task.assignedCharacterId = undefined
      }
      this.activeTasks.delete(characterId)
    }

    if (this.buildingManager) {
      const staffedBuilding = this.buildingManager
        .getAllBuildings()
        .find(building => building.state.workerId === characterId)

      if (staffedBuilding) {
        this.buildingManager.removeWorker(staffedBuilding.id)
      }
    }

    this.characterManager.setState(characterId, CharacterState.IDLE)
    this.eventBus.emit('task:force-cancelled', { characterId })
  }

  addTask(task: Task): void {
    this.pendingTasks.push(task)
  }

  removeTask(taskId: string): void {
    const index = this.pendingTasks.findIndex(t => t.id === taskId)
    if (index !== -1) {
      this.pendingTasks.splice(index, 1)
    }
  }

  getPendingTasks(): Task[] {
    return this.pendingTasks.filter(t => t.status === TaskStatus.PENDING)
  }

  getActiveTasks(): Map<string, ActiveTask> {
    return new Map(this.activeTasks)
  }

  resetActiveTasks(): void {
    this.activeTasks.clear()
    this.pendingTasks = []
    this.needTaskCooldowns.clear()
    this.gameTime = 0
    if (AI_DIAG) console.log('[AI_DIAG] AISystem.resetActiveTasks() called')
  }
}
