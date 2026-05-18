/**
 * 配置管理器
 * @module data/config/ConfigManager
 */

import { ProductionBuildingConfig } from '@app-types/production-building.types'
import { EquipmentConfig } from '@app-types/equipment.types'
import { BossConfig, BossStage } from '@app-types/combat.types'
import { TechnologyConfig } from '@app-types/technology.types'

interface GameConfig {
  version: string
  map: {
    width: number
    height: number
    defaultTerrain: string
  }
  character: {
    maxCount: number
    baseStats: {
      health: number
      mood: number
    }
    moodDecayRate: number
    healthRegenRate: number
  }
  economy: {
    sellMultiplier: number
    expandCost: number
    expandSize: number
  }
  game: {
    tickRate: number
    autoSaveInterval: number
  }
}

export interface ConfigSource {
  loadJson<T>(path: string): Promise<T | null>
}

export class BrowserConfigSource implements ConfigSource {
  async loadJson<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(path)
      if (!response.ok) return null
      return await response.json() as T
    } catch {
      return null
    }
  }
}

export class ConfigManager {
  private gameConfig: GameConfig | null = null
  private productionBuildingConfigs: ProductionBuildingConfig[] = []
  private equipmentConfigs: EquipmentConfig[] = []
  private bossConfigs: BossConfig[] = []
  private techConfigs: TechnologyConfig[] = []
  private loaded = false
  private configSource: ConfigSource

  constructor(configSource: ConfigSource = new BrowserConfigSource()) {
    this.configSource = configSource
  }

  async loadAllConfigs(): Promise<void> {
    if (this.loaded) return

    try {
      await Promise.all([
        this.loadGameConfig(),
        this.loadProductionBuildingConfigs(),
        this.loadEquipmentConfigs(),
        this.loadBossConfigs(),
        this.loadTechConfigs(),
      ])
      this.loaded = true
    } catch (error) {
      console.error('[ConfigManager] Failed to load configs:', error)
      this.loadDefaults()
    }
  }

  private async loadGameConfig(): Promise<void> {
    const data = await this.configSource.loadJson<GameConfig>('data/game-config.json')
    if (data) {
      this.gameConfig = data
      return
    }

    this.gameConfig = this.getDefaultGameConfig()
  }

  private async loadProductionBuildingConfigs(): Promise<void> {
    const data = await this.configSource.loadJson<any>('data/production-building-config.json')
    if (data?.productionBuildings) {
      this.productionBuildingConfigs = Object.entries(data.productionBuildings).map(
        ([id, config]: [string, any]) => ({
          id,
          type: config.type,
          name: config.name,
          description: config.description,
          size: config.size,
          cost: config.cost,
          buildTime: config.buildTime,
          productionInterval: config.production?.interval,
          outputResource: config.production?.type,
          outputAmount: config.production?.amount,
          workerSkill: config.workerSkill ?? null,
          requiresTech: config.requiresTech,
        })
      )
      return
    }

    this.productionBuildingConfigs = this.getDefaultProductionBuildingConfigs()
  }

  private async loadEquipmentConfigs(): Promise<void> {
    const data = await this.configSource.loadJson<any>('data/equipment-config.json')
    if (data?.equipments) {
      this.equipmentConfigs = Object.entries(data.equipments).map(([id, config]: [string, any]) => ({
        id,
        ...config,
      }))
      return
    }

    this.equipmentConfigs = this.getDefaultEquipmentConfigs()
  }

  private async loadTechConfigs(): Promise<void> {
    const data = await this.configSource.loadJson<any>('data/tech-config.json')
    if (Array.isArray(data?.techs)) {
      this.techConfigs = data.techs
      return
    }

    this.techConfigs = []
  }

  private async loadBossConfigs(): Promise<void> {
    const data = await this.configSource.loadJson<any>('data/boss-config.json')
    if (data?.bosses) {
      this.bossConfigs = Object.entries(data.bosses).map(([id, config]: [string, any]) => ({
        id,
        name: config.name,
        level: config.level,
        stage: (config.stage as BossStage) ?? BossStage.EARLY,
        baseHp: config.baseHp || config.stats?.hp || 100,
        baseAtk: config.baseAtk || config.stats?.atk || 10,
        baseDef: config.baseDef || config.stats?.def || 5,
        baseSpeed: config.baseSpeed || 1.5,
        rewards: normalizeBossRewards(config.rewards).map((r: any) => ({
          type: r.type as 'gold' | 'equipment' | 'exp',
          amount: r.amount || 0,
          dropRate: r.dropRate || 1,
        })),
      }))
      return
    }

    this.bossConfigs = this.getDefaultBossConfigs()
  }

  private loadDefaults(): void {
    this.gameConfig = this.getDefaultGameConfig()
    this.productionBuildingConfigs = this.getDefaultProductionBuildingConfigs()
    this.equipmentConfigs = this.getDefaultEquipmentConfigs()
    this.bossConfigs = this.getDefaultBossConfigs()
    this.techConfigs = []
    this.loaded = true
  }

  private getDefaultGameConfig(): GameConfig {
    return {
      version: '1.0.0',
      map: { width: 100, height: 100, defaultTerrain: 'grass' },
      character: {
        maxCount: 10,
        baseStats: { health: 100, mood: 100 },
        moodDecayRate: 0.1,
        healthRegenRate: 0.05,
      },
      economy: { sellMultiplier: 1, expandCost: 1000, expandSize: 5 },
      game: { tickRate: 100, autoSaveInterval: 300000 },
    }
  }

  private getDefaultProductionBuildingConfigs(): ProductionBuildingConfig[] {
    return [
      {
        id: 'lumber_mill',
        type: 'lumber_mill' as any,
        name: '伐木场',
        description: '自动生产木材，是前期资源扩张的基础。',
        size: { width: 2, height: 2 },
        cost: { wood: 100, stone: 50, gold: 200 },
        buildTime: 30000,
        productionInterval: 60000,
        outputResource: 'wood',
        outputAmount: 5,
      },
      {
        id: 'quarry',
        type: 'quarry' as any,
        name: '采石场',
        description: '自动生产石材，支撑建筑升级与扩张。',
        size: { width: 2, height: 2 },
        cost: { wood: 150, stone: 80, gold: 300 },
        buildTime: 30000,
        productionInterval: 90000,
        outputResource: 'stone',
        outputAmount: 3,
      },
      {
        id: 'farm',
        type: 'farm' as any,
        name: '农场',
        description: '稳定生产食物，维持聚落运转。',
        size: { width: 2, height: 2 },
        cost: { wood: 80, stone: 40, gold: 150 },
        buildTime: 45000,
        productionInterval: 120000,
        outputResource: 'food',
        outputAmount: 4,
      },
      {
        id: 'warehouse',
        type: 'warehouse' as any,
        name: '仓库',
        description: '提高存储与周转效率。',
        size: { width: 2, height: 2 },
        cost: { wood: 20, stone: 10, gold: 0 },
        buildTime: 30000,
      },
      {
        id: 'kitchen',
        type: 'kitchen' as any,
        name: '厨房',
        description: '处理食物，提高生活恢复效率。',
        size: { width: 2, height: 1 },
        cost: { wood: 10, stone: 15, gold: 50 },
        buildTime: 30000,
      },
      {
        id: 'house',
        type: 'house' as any,
        name: '房屋',
        description: '提供居住空间，提高休息恢复与舒适度。',
        size: { width: 2, height: 2 },
        cost: { wood: 30, stone: 20, gold: 0 },
        buildTime: 40000,
      },
      {
        id: 'barracks',
        type: 'barracks' as any,
        name: '兵营',
        description: '训练与整备战斗成员。',
        size: { width: 3, height: 2 },
        cost: { wood: 100, stone: 80, gold: 300 },
        buildTime: 90000,
      },
      {
        id: 'trade_station',
        type: 'trade_station' as any,
        name: '贸易站',
        description: '自动将盈余木材、石材与食物转为金币。',
        size: { width: 2, height: 2 },
        cost: { wood: 120, stone: 60, gold: 150 },
        buildTime: 25000,
        requiresTech: 'production_tech_1',
      },
      {
        id: 'recruitment_station',
        type: 'recruitment_station' as any,
        name: '招募站',
        description: '商队到访时刷新候选成员。',
        size: { width: 2, height: 2 },
        cost: { wood: 60, stone: 30, gold: 120 },
        buildTime: 45000,
      },
      {
        id: 'research_desk',
        type: 'research_desk' as any,
        name: '研究台',
        description: '进行基础研究，推进科技解锁。',
        size: { width: 1, height: 1 },
        cost: { wood: 30, stone: 20, gold: 100 },
        buildTime: 30000,
      },
    ]
  }

  private getDefaultEquipmentConfigs(): EquipmentConfig[] {
    return [
      { id: 'sword', name: '铁剑', slot: 'weapon' as any, baseStats: { atk: 10 }, basePrice: 100 },
      { id: 'helmet', name: '铁盔', slot: 'helmet' as any, baseStats: { def: 5, hp: 20 }, basePrice: 80 },
    ]
  }

  private getDefaultBossConfigs(): BossConfig[] {
    return [
      {
        id: 'goblin',
        name: '哥布林首领',
        level: 1,
        stage: BossStage.EARLY,
        baseHp: 100,
        baseAtk: 10,
        baseDef: 5,
        rewards: [
          { type: 'gold', amount: 50, dropRate: 1 },
          { type: 'exp', amount: 10, dropRate: 1 },
        ],
      },
      {
        id: 'raider',
        name: '流寇头目',
        level: 3,
        stage: BossStage.MID,
        baseHp: 280,
        baseAtk: 20,
        baseDef: 10,
        rewards: [
          { type: 'gold', amount: 120, dropRate: 1 },
          { type: 'equipment', itemId: 'sword', amount: 1, dropRate: 0.2 } as any,
        ],
      },
    ]
  }

  getGameConfig(): GameConfig {
    return this.gameConfig || this.getDefaultGameConfig()
  }

  getProductionBuildingConfigs(): ProductionBuildingConfig[] {
    return this.productionBuildingConfigs
  }

  getEquipmentConfigs(): EquipmentConfig[] {
    return this.equipmentConfigs
  }

  getBossConfigs(): BossConfig[] {
    return this.bossConfigs
  }

  getTechConfigs(): TechnologyConfig[] {
    return this.techConfigs
  }

  isLoaded(): boolean {
    return this.loaded
  }
}

export default ConfigManager

function normalizeBossRewards(rawRewards: unknown): Array<{ type: string; amount: number; dropRate?: number }> {
  if (Array.isArray(rawRewards)) {
    return rawRewards
  }

  if (rawRewards && typeof rawRewards === 'object') {
    return Object.entries(rawRewards as Record<string, unknown>)
      .filter(([, amount]) => typeof amount === 'number')
      .map(([type, amount]) => ({ type, amount: amount as number, dropRate: 1 }))
  }

  return []
}
