import { Character, ProfessionType, CharacterState } from '@app-types/character.types'
import { Task, TaskType, TaskPriority, TaskStatus } from '@app-types/priority.types'
import { EventBus } from '@core/EventBus'
import { CharacterManager } from '@domain/character/CharacterManager'
import { MapSystem } from '@domain/map/MapSystem'
import { ProductionBuildingManager } from '@domain/building/ProductionBuildingManager'
import { Logger } from '@utils/logger'

const PROFESSION_TASKS: Record<ProfessionType, TaskType[]> = {
  [ProfessionType.GATHERER]: [TaskType.GATHER, TaskType.HAUL],
  [ProfessionType.BUILDER]: [TaskType.BUILD, TaskType.CONSTRUCT, TaskType.GATHER],
  [ProfessionType.FARMER]: [TaskType.GROW, TaskType.HARVEST, TaskType.GATHER],
  [ProfessionType.WARRIOR]: [TaskType.COMBAT, TaskType.GUARD, TaskType.GATHER],
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

interface ActiveTask {
  task: Task
  characterId: string
  startTime: number
  duration: number
  progress: number
}

export class AISystem {
  private characterManager: CharacterManager
  private mapSystem: MapSystem
  private buildingManager: ProductionBuildingManager | null
  private eventBus: EventBus
  private logger: Logger
  private pendingTasks: Task[] = []
  private activeTasks: Map<string, ActiveTask> = new Map()

  constructor(
    characterManager: CharacterManager, 
    mapSystem: MapSystem, 
    eventBus?: EventBus,
    buildingManager?: ProductionBuildingManager
  ) {
    this.characterManager = characterManager
    this.mapSystem = mapSystem
    this.buildingManager = buildingManager || null
    this.eventBus = eventBus || new EventBus()
    this.logger = new Logger('AISystem')
  }

  update(deltaTime: number): void {
    this.scanForTasksOptimized()
    this.assignTasks()
    this.updateActiveTasks(deltaTime)

    // Debug logging every 5 seconds
    if (Date.now() % 5000 < 100) {
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
    if (!mapData) return

    const MAX_PENDING_TASKS = 50
    const currentPendingCount = this.pendingTasks.filter(t => t.status === TaskStatus.PENDING).length
    
    if (currentPendingCount >= MAX_PENDING_TASKS) {
      return
    }

    const characters = this.characterManager.getAll()
    const activePositions = characters.map(c => c.position)

    let tasksCreated = 0
    const tasksNeeded = MAX_PENDING_TASKS - currentPendingCount

    const resourceTiles: { x: number; y: number; tile: any }[] = []
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        const tile = mapData.tiles[y][x]
        if (tile.resource && tile.resource.amount > 0) {
          resourceTiles.push({ x, y, tile })
        }
      }
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
      if (tasksCreated >= tasksNeeded) break

      const existingTask = this.pendingTasks.find(
        t => t.type === TaskType.GATHER && 
             t.targetPosition?.x === x && 
             t.targetPosition?.y === y
      )
      
      if (!existingTask) {
        const baseUtility = TASK_BASE_UTILITIES[TaskType.GATHER] || 30
        
        this.pendingTasks.push({
          id: `gather_${x}_${y}_${Date.now()}_${Math.random()}`,
          type: TaskType.GATHER,
          priority: TASK_PRIORITIES[TaskType.GATHER] || TaskPriority.NORMAL,
          status: TaskStatus.PENDING,
          position: { x, y },
          targetPosition: { x, y },
          utility: baseUtility,
          createdAt: Date.now()
        })
        tasksCreated++
      }
    }
    
    if (tasksCreated > 0) {
      this.logger.debug(`Created ${tasksCreated} new tasks (total pending: ${this.pendingTasks.filter(t => t.status === TaskStatus.PENDING).length})`)
    }
  }

  private assignTasks(): void {
    const characters = this.characterManager.getAll()
    const idleCharacters = characters.filter(c => c.state === CharacterState.IDLE)
    const pendingTasks = this.pendingTasks.filter(t => t.status === TaskStatus.PENDING)
    
    if (idleCharacters.length > 0 && pendingTasks.length === 0) {
      this.logger.warn(`${idleCharacters.length} idle characters but no pending tasks!`)
    }
    
    this.assignWorkersToBuildings(idleCharacters)
    
    for (const character of characters) {
      if (character.state !== CharacterState.IDLE) continue
      
      const suitableTasks = this.pendingTasks.filter(task => 
        task.status === TaskStatus.PENDING &&
        this.isTaskSuitable(character, task)
      )

      if (suitableTasks.length === 0) {
        this.logger.debug(`No suitable tasks for ${character.name} (${character.profession})`)
        continue
      }

      const bestTask = this.selectBestTask(character, suitableTasks)

      bestTask.status = TaskStatus.ASSIGNED
      bestTask.assignedCharacterId = character.id

      this.startTask(character, bestTask)
    }
  }

  private assignWorkersToBuildings(idleCharacters: Character[]): void {
    if (!this.buildingManager) return

    const operationalBuildings = this.buildingManager.getOperationalBuildings()
    const buildingsWithoutWorker = operationalBuildings.filter(b => !b.state.hasWorker)

    for (const building of buildingsWithoutWorker) {
      if (idleCharacters.length === 0) break

      const worker = idleCharacters.shift()
      if (worker) {
        // Move character to building position
        this.characterManager.move(worker.id, building.position)

        // Assign worker to building
        this.buildingManager.assignWorker(building.id, worker.id)
        worker.state = CharacterState.WORKING

        this.eventBus.emit('character:state-changed', {
          characterId: worker.id,
          from: CharacterState.IDLE,
          to: CharacterState.WORKING
        })

        this.logger.info(`Assigned ${worker.name} to ${building.name} at (${building.position.x}, ${building.position.y})`)
      }
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

    character.state = CharacterState.MOVING
    this.eventBus.emit('character:state-changed', {
      characterId: character.id,
      from: CharacterState.IDLE,
      to: CharacterState.MOVING
    })

    const activeTask: ActiveTask = {
      task,
      characterId: character.id,
      startTime: Date.now(),
      duration,
      progress: 0
    }

    this.activeTasks.set(character.id, activeTask)

    setTimeout(() => {
      if (this.activeTasks.has(character.id)) {
        // Move character to target position
        if (task.targetPosition) {
          this.characterManager.move(character.id, task.targetPosition)
        }

        character.state = CharacterState.WORKING
        this.eventBus.emit('character:state-changed', {
          characterId: character.id,
          from: CharacterState.MOVING,
          to: CharacterState.WORKING
        })
      }
    }, moveDelay)

    this.eventBus.emit('task:assigned', {
      taskId: task.id,
      characterId: character.id,
      taskType: task.type
    })

    this.logger.debug(`Started task ${task.type} for ${character.name}`)
  }

  private updateActiveTasks(deltaTime: number): void {
    for (const [characterId, activeTask] of this.activeTasks) {
      const character = this.characterManager.get(characterId)
      if (!character) {
        this.activeTasks.delete(characterId)
        continue
      }

      activeTask.progress += deltaTime / activeTask.duration

      if (activeTask.progress >= 1.0) {
        this.completeTask(character, activeTask)
        this.activeTasks.delete(characterId)
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
    character.state = CharacterState.IDLE
    this.eventBus.emit('character:state-changed', {
      characterId: character.id,
      from: CharacterState.WORKING,
      to: CharacterState.IDLE
    })

    const index = this.pendingTasks.findIndex(t => t.id === task.id)
    if (index !== -1) {
      this.pendingTasks.splice(index, 1)
    }

    this.eventBus.emit('task:completed', {
      characterId: character.id,
      taskId: task.id,
      taskType: task.type
    })

    this.logger.debug(`Completed task ${task.type} for ${character.name}`)
  }

  private executeGather(character: Character, task: Task): void {
    if (!task.targetPosition) {
      this.logger.warn(`executeGather: task has no targetPosition`)
      return
    }

    this.logger.debug(`${character.name} attempting to harvest at (${task.targetPosition.x}, ${task.targetPosition.y})`)

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
    } else {
      this.logger.warn(`${character.name} failed to harvest at (${task.targetPosition.x}, ${task.targetPosition.y})`)
    }
  }

  private executeHarvest(character: Character, task: Task): void {
    this.executeGather(character, task)
  }

  private isTaskSuitable(character: Character, task: Task): boolean {
    const preferredTasks = PROFESSION_TASKS[character.profession] || []
    return preferredTasks.includes(task.type) || task.type === TaskType.MOVE
  }

  private estimateTaskDuration(character: Character, task: Task): number {
    const baseDuration = 3000

    let taskMultiplier = 1.0
    switch (task.type) {
      case TaskType.GATHER:
        taskMultiplier = 2.0
        break
      case TaskType.HARVEST:
        taskMultiplier = 1.5
        break
      case TaskType.BUILD:
        taskMultiplier = 3.0
        break
    }

    const preferredTasks = PROFESSION_TASKS[character.profession] || []
    const efficiency = preferredTasks.includes(task.type) ? 0.8 : 1.0

    return Math.floor(baseDuration * taskMultiplier * efficiency)
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
}
