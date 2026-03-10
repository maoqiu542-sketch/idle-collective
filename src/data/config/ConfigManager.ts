/**
 * 配置管理器
 * @module data/config/ConfigManager
 */

import { ProductionBuildingConfig } from '@app-types/production-building.types'
import { EquipmentConfig } from '@app-types/equipment.types'
import { BossConfig } from '@app-types/combat.types'

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

export class ConfigManager {
  private gameConfig: GameConfig | null = null
  private productionBuildingConfigs: ProductionBuildingConfig[] = []
  private equipmentConfigs: EquipmentConfig[] = []
  private bossConfigs: BossConfig[] = []
  private loaded = false

  async loadAllConfigs(): Promise<void> {
    if (this.loaded) return

    try {
      await Promise.all([
        this.loadGameConfig(),
        this.loadProductionBuildingConfigs(),
        this.loadEquipmentConfigs(),
        this.loadBossConfigs(),
      ])
      this.loaded = true
    } catch (error) {
      console.error('[ConfigManager] Failed to load configs:', error)
      this.loadDefaults()
    }
  }

  private async loadGameConfig(): Promise<void> {
    try {
      const response = await fetch('config/game-config.json')
      if (response.ok) {
        this.gameConfig = await response.json()
      }
    } catch {
      this.gameConfig = this.getDefaultGameConfig()
    }
  }

  private async loadProductionBuildingConfigs(): Promise<void> {
    try {
      const response = await fetch('config/production-building-config.json')
      if (response.ok) {
        const data = await response.json()
        if (data.productionBuildings) {
          this.productionBuildingConfigs = Object.entries(data.productionBuildings).map(([id, config]: [string, any]) => ({
            id,
            type: config.type,
            name: config.name,
            description: config.description,
            size: config.size,
            cost: config.cost,
            buildTime: config.buildTime,
            productionInterval: config.production?.interval || 60,
            outputResource: config.production?.type || 'wood',
            outputAmount: config.production?.amount || 1,
            workerSkill: config.workerSkill,
          }))
        }
      }
    } catch {
      this.productionBuildingConfigs = this.getDefaultProductionBuildingConfigs()
    }
  }

  private async loadEquipmentConfigs(): Promise<void> {
    try {
      const response = await fetch('config/equipment-config.json')
      if (response.ok) {
        const data = await response.json()
        if (data.equipments) {
          this.equipmentConfigs = Object.entries(data.equipments).map(([id, config]: [string, any]) => ({
            id,
            ...config,
          }))
        }
      }
    } catch {
      this.equipmentConfigs = this.getDefaultEquipmentConfigs()
    }
  }

  private async loadBossConfigs(): Promise<void> {
    try {
      const response = await fetch('config/boss-config.json')
      if (response.ok) {
        const data = await response.json()
        if (data.bosses) {
          this.bossConfigs = Object.entries(data.bosses).map(([id, config]: [string, any]) => ({
            id,
            name: config.name,
            level: config.level,
            baseHp: config.baseHp || 100,
            baseAtk: config.baseAtk || 10,
            baseDef: config.baseDef || 5,
            baseSpeed: config.baseSpeed || 1.5,
            rewards: (config.rewards || []).map((r: any) => ({
              type: r.type as 'gold' | 'equipment' | 'exp',
              amount: r.amount || 0,
              dropRate: r.dropRate || 1
            }))
          }))
        }
      }
    } catch {
      this.bossConfigs = this.getDefaultBossConfigs()
    }
  }

  private loadDefaults(): void {
    this.gameConfig = this.getDefaultGameConfig()
    this.productionBuildingConfigs = this.getDefaultProductionBuildingConfigs()
    this.equipmentConfigs = this.getDefaultEquipmentConfigs()
    this.bossConfigs = this.getDefaultBossConfigs()
    this.loaded = true
  }

  private getDefaultGameConfig(): GameConfig {
    return {
      version: '1.0.0',
      map: { width: 100, height: 100, defaultTerrain: 'grass' },
      character: { maxCount: 10, baseStats: { health: 100, mood: 100 }, moodDecayRate: 0.1, healthRegenRate: 0.05 },
      economy: { sellMultiplier: 1, expandCost: 1000, expandSize: 5 },
      game: { tickRate: 100, autoSaveInterval: 300000 },
    }
  }

  private getDefaultProductionBuildingConfigs(): ProductionBuildingConfig[] {
    return [
      { id: 'lumber_mill', type: 'lumber_mill' as any, name: '伐木场', description: '生产木材', size: { width: 2, height: 2 }, cost: { wood: 0, stone: 10, gold: 50 }, buildTime: 30000, productionInterval: 60000, outputResource: 'wood', outputAmount: 5 },
      { id: 'quarry', type: 'quarry' as any, name: '采石场', description: '生产石材', size: { width: 2, height: 2 }, cost: { wood: 10, stone: 0, gold: 50 }, buildTime: 30000, productionInterval: 90000, outputResource: 'stone', outputAmount: 3 },
      { id: 'ranch', type: 'ranch' as any, name: '牧场', description: '生产食物', size: { width: 3, height: 3 }, cost: { wood: 20, stone: 10, gold: 100 }, buildTime: 45000, productionInterval: 120000, outputResource: 'food', outputAmount: 4 },
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
      { id: 'goblin', name: '哥布林首领', level: 1, baseHp: 100, baseAtk: 10, baseDef: 5, rewards: [{ type: 'gold', amount: 50, dropRate: 1 }] },
      { id: 'dragon', name: '幼龙', level: 5, baseHp: 500, baseAtk: 30, baseDef: 15, rewards: [{ type: 'gold', amount: 200, dropRate: 1 }, { type: 'equipment', itemId: 'sword', amount: 1, dropRate: 0.3 }] },
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

  isLoaded(): boolean {
    return this.loaded
  }
}

export default ConfigManager
