import { EventBus } from '@core/EventBus'
import { Logger } from '@utils/logger'
import { ResourceType } from '@app-types/map.types'

const INITIAL_RESOURCES: [ResourceType, number][] = [
  [ResourceType.WOOD, 180],
  [ResourceType.STONE, 120],
  [ResourceType.FOOD, 90],
  [ResourceType.GOLD, 260],
  [ResourceType.CORE_PARTS, 0],
]

export class ResourceManager {
  private eventBus: EventBus
  private logger: Logger
  private resources: Map<ResourceType, number>

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
    this.logger = new Logger('ResourceManager')
    this.resources = new Map(INITIAL_RESOURCES)

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventBus.on('resource:collected', (event: { characterId: string; type: ResourceType; amount: number }) => {
      this.add(event.type, event.amount)
    })

    // 角色进食时消耗食物资源
    this.eventBus.on('character:ate', (event: { characterId: string; amount: number }) => {
      const consumed = this.consume(ResourceType.FOOD, 1)
      if (consumed) {
        this.logger.debug(`Character ${event.characterId} ate food, hunger +${event.amount}`)
      } else {
        this.logger.warn(`Character ${event.characterId} tried to eat but no food available`)
      }
    })
  }

  get(type: ResourceType): number {
    return this.resources.get(type) || 0
  }

  getAll(): Map<ResourceType, number> {
    return new Map(this.resources)
  }

  add(type: ResourceType, amount: number): void {
    const current = this.resources.get(type) || 0
    this.resources.set(type, current + amount)
    this.logger.debug(`Resource added: ${type} +${amount} (total: ${current + amount})`)
  }

  consume(type: ResourceType, amount: number): boolean {
    const current = this.resources.get(type) || 0
    if (current < amount) {
      this.logger.warn(`Insufficient resource: ${type} (has ${current}, needs ${amount})`)
      return false
    }
    this.resources.set(type, current - amount)
    this.logger.debug(`Resource consumed: ${type} -${amount} (remaining: ${current - amount})`)
    return true
  }

  canAfford(type: ResourceType, amount: number): boolean {
    return (this.resources.get(type) || 0) >= amount
  }

  canAffordMultiple(costs: [ResourceType, number][]): boolean {
    return costs.every(([type, amount]) => this.canAfford(type, amount))
  }

  consumeMultiple(costs: [ResourceType, number][]): boolean {
    if (!this.canAffordMultiple(costs)) return false
    
    for (const [type, amount] of costs) {
      this.consume(type, amount)
    }
    return true
  }

  setResources(resources: Map<ResourceType, number>): void {
    this.resources = new Map(resources)
  }

  serialize(): [ResourceType, number][] {
    return Array.from(this.resources.entries())
  }

  deserialize(data: [ResourceType, number][]): void {
    this.resources = new Map(data)
  }
}
