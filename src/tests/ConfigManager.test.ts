import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfigManager } from '@data/config/ConfigManager'
import { ProductionBuildingType } from '@app-types/production-building.types'

describe('ConfigManager production building mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should not assign output resources to non-producing buildings when reading config JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input.includes('production-building-config.json')) {
          return {
            ok: true,
            json: async () => ({
              productionBuildings: {
                warehouse: {
                  type: ProductionBuildingType.WAREHOUSE,
                  name: '仓库',
                  description: '提高周转',
                  size: { width: 2, height: 2 },
                  cost: { wood: 20, stone: 10, gold: 0 },
                  buildTime: 20000,
                  workerSkill: null,
                },
                lumber_mill: {
                  type: ProductionBuildingType.LUMBER_MILL,
                  name: '伐木场',
                  description: '产木材',
                  size: { width: 2, height: 2 },
                  cost: { wood: 50, stone: 20, gold: 0 },
                  buildTime: 20000,
                  production: { interval: 60000, type: 'wood', amount: 8 },
                  workerSkill: 'gathering',
                },
              },
            }),
          }
        }

        return {
          ok: true,
          json: async () => ({}),
        }
      })
    )

    const manager = new ConfigManager()
    await manager.loadAllConfigs()

    const configs = manager.getProductionBuildingConfigs()
    const warehouse = configs.find(config => config.type === ProductionBuildingType.WAREHOUSE)
    const lumberMill = configs.find(config => config.type === ProductionBuildingType.LUMBER_MILL)

    expect(warehouse?.outputResource).toBeUndefined()
    expect(warehouse?.outputAmount).toBeUndefined()
    expect(warehouse?.productionInterval).toBeUndefined()

    expect(lumberMill?.outputResource).toBe('wood')
    expect(lumberMill?.outputAmount).toBe(8)
    expect(lumberMill?.productionInterval).toBe(60000)
  })
})
