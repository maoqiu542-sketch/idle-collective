import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  gameAssetsManifest,
  getBossAssetPath,
  getBuildingAssetPath,
  getProfessionAssetPath,
  getCharacterPortraitAssetPath,
  getResourceNodeAssetPath,
  getResourceUiAssetPath,
  stagedGameAssetsManifest,
  getTerrainAssetPath
} from '@data/assets/artAssets'
import { runtimeArtBindings } from '@data/assets/runtime-art-bindings'
import { TerrainType, ResourceType } from '@app-types/map.types'
import { ProductionBuildingType } from '@app-types/production-building.types'

const projectRoot = process.cwd()

function toAbsolutePublicPath(publicPath: string) {
  return path.join(projectRoot, 'public', publicPath.replace(/^\//, '').replace(/\//g, path.sep))
}

describe('art asset manifest', () => {
  it('contains generated runtime assets', () => {
    expect(Object.keys(gameAssetsManifest.assets).length).toBeGreaterThan(20)
    expect(gameAssetsManifest.generatedAt).toBeTruthy()
  })

  it('resolves terrain, resource, and building art to existing files', () => {
    const resolvedPaths = [
      getTerrainAssetPath(TerrainType.GRASS, '32'),
      getResourceNodeAssetPath(ResourceType.WOOD, '32'),
      getResourceUiAssetPath(ResourceType.GOLD, '32'),
      getBuildingAssetPath(ProductionBuildingType.LUMBER_MILL, '64'),
      getProfessionAssetPath('gatherer', '64'),
      getCharacterPortraitAssetPath('farmer', '64'),
      getBossAssetPath('boss_01', '64')
    ]

    for (const resolvedPath of resolvedPaths) {
      expect(resolvedPath).toBeTruthy()
      expect(fs.existsSync(toAbsolutePublicPath(resolvedPath!))).toBe(true)
    }
  })

  it('falls back for unmapped building types without breaking lookups', () => {
    const fallbackPath = getBuildingAssetPath(ProductionBuildingType.WELL, '64')
    expect(fallbackPath).toContain('ui_building_default')
    expect(fs.existsSync(toAbsolutePublicPath(fallbackPath!))).toBe(true)
  })

  it('keeps runtime binding coverage for first-stage asset groups', () => {
    expect(Array.isArray(runtimeArtBindings.terrain.grass)).toBe(true)
    expect(runtimeArtBindings.terrain.grass[0]).toBe('terrain_grass')
    expect(runtimeArtBindings.resourceNodes.wood).toBe('resource_tree')
    expect(runtimeArtBindings.buildings.lumber_mill).toBe('building_lumber_mill')
    expect(runtimeArtBindings.resourceUi.core_parts).toBe('ui_resource_core_parts')
    expect(runtimeArtBindings.characterPortraits.farmer).toBe('character_portrait_farmer')
    expect(runtimeArtBindings.bossPortraits.boss_01).toBe('boss_portrait_01')
  })

  it('uses deterministic terrain variants for different map coordinates', () => {
    const a = getTerrainAssetPath(TerrainType.GRASS, '32', { x: 0, y: 0 })
    const b = getTerrainAssetPath(TerrainType.GRASS, '32', { x: 7, y: 11 })

    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(fs.existsSync(toAbsolutePublicPath(a!))).toBe(true)
    expect(fs.existsSync(toAbsolutePublicPath(b!))).toBe(true)
  })

  it('only points manifest asset files at existing runtime exports', () => {
    for (const asset of Object.values(gameAssetsManifest.assets)) {
      for (const publicPath of Object.values(asset.files)) {
        expect(fs.existsSync(toAbsolutePublicPath(publicPath))).toBe(true)
      }
    }
  })

  it('exposes a staging manifest without mutating the live manifest shape', () => {
    expect(stagedGameAssetsManifest.generatedAt).toBeTruthy()
    expect(stagedGameAssetsManifest.fallbacks.character).toBe(gameAssetsManifest.fallbacks.character)
  })
})
