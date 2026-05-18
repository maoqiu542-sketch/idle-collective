import gameAssetsManifestJson from '../../../public/textures/manifests/game-assets-manifest.json'
import stagedGameAssetsManifestJson from '../../../public/textures/manifests/staged-game-assets-manifest.json'
import { runtimeArtBindings } from './runtime-art-bindings'
import { TerrainType, ResourceType } from '@app-types/map.types'
import { ProductionBuildingType } from '@app-types/production-building.types'
import { ProfessionType } from '@app-types/character.types'
import { CharacterProfession } from '@app-types/character-shop.types'

export type AssetSize = '32' | '64' | '128'
export type ManifestScope = 'live' | 'staged'
interface AssetLookupOptions {
  scope?: ManifestScope
}

interface RuntimeAssetEntry {
  category: string
  targetKey: string
  version: string
  status: string
  sourceKind: string
  approvedVariant: string | null
  files: Partial<Record<AssetSize, string>>
}

type TerrainBindingEntry = string | string[]

interface GameAssetsManifest {
  version: string
  generatedAt: string
  assets: Record<string, RuntimeAssetEntry>
  mapping: typeof runtimeArtBindings
  fallbacks: {
    terrain: string
    resource: string
    building: string
    character: string
    boss: string
  }
}

const gameAssetsManifest = gameAssetsManifestJson as GameAssetsManifest
const stagedGameAssetsManifest = stagedGameAssetsManifestJson as GameAssetsManifest

function selectManifest(scope: ManifestScope = 'live'): GameAssetsManifest {
  return scope === 'staged' ? stagedGameAssetsManifest : gameAssetsManifest
}

function pickSizedFile(entry: RuntimeAssetEntry | undefined, size: AssetSize): string | null {
  if (!entry) {
    return null
  }

  return entry.files[size] ?? entry.files['64'] ?? entry.files['32'] ?? entry.files['128'] ?? null
}

function pickVariantFromList(assetIds: TerrainBindingEntry | undefined, x = 0, y = 0): string | null {
  if (!assetIds) {
    return null
  }

  if (typeof assetIds === 'string') {
    return assetIds
  }

  if (assetIds.length === 0) {
    return null
  }

  const hash = Math.abs((x * 73856093) ^ (y * 19349663))
  return assetIds[hash % assetIds.length] ?? assetIds[0]
}

export function getAssetPathById(
  assetId: string | null | undefined,
  size: AssetSize,
  options?: AssetLookupOptions
): string | null {
  if (!assetId) {
    return null
  }

  const entry = selectManifest(options?.scope).assets[assetId]
  return pickSizedFile(entry, size)
}

export function getTerrainAssetPath(
  terrain: TerrainType | string,
  size: AssetSize = '32',
  coordinates?: { x: number; y: number }
): string | null {
  const manifest = selectManifest()
  const assetId =
    pickVariantFromList(
      manifest.mapping.terrain[terrain as keyof typeof manifest.mapping.terrain] as TerrainBindingEntry | undefined,
      coordinates?.x ?? 0,
      coordinates?.y ?? 0
    ) ??
    manifest.fallbacks.terrain
  return getAssetPathById(assetId, size)
}

export function getResourceNodeAssetPath(resource: ResourceType | string, size: AssetSize = '32'): string | null {
  const manifest = selectManifest()
  const assetId =
    manifest.mapping.resourceNodes[resource as keyof typeof manifest.mapping.resourceNodes] ??
    manifest.fallbacks.resource
  return getAssetPathById(assetId, size)
}

export function getResourceUiAssetPath(resource: ResourceType | string, size: AssetSize = '32'): string | null {
  const manifest = selectManifest()
  const assetId =
    manifest.mapping.resourceUi[resource as keyof typeof manifest.mapping.resourceUi] ??
    manifest.fallbacks.resource
  return getAssetPathById(assetId, size)
}

export function getBuildingAssetPath(
  buildingType: ProductionBuildingType | string,
  size: AssetSize = '64'
): string | null {
  const manifest = selectManifest()
  const assetId =
    manifest.mapping.buildings[buildingType as keyof typeof manifest.mapping.buildings] ??
    manifest.fallbacks.building
  return getAssetPathById(assetId, size)
}

export function getProfessionAssetPath(
  profession: ProfessionType | CharacterProfession | string,
  size: AssetSize = '64'
): string | null {
  const manifest = selectManifest()
  const assetId =
    manifest.mapping.professions[profession as keyof typeof manifest.mapping.professions] ??
    manifest.fallbacks.character
  return getAssetPathById(assetId, size)
}

export function getCharacterPortraitAssetPath(
  profession: ProfessionType | CharacterProfession | string,
  size: AssetSize = '64',
  options?: AssetLookupOptions
): string | null {
  const manifest = selectManifest(options?.scope)
  const assetId =
    manifest.mapping.characterPortraits?.[profession as keyof typeof manifest.mapping.characterPortraits] ??
    manifest.fallbacks.character
  return getAssetPathById(assetId, size, options)
}

export function getCharacterAssetPath(size: AssetSize = '64', options?: AssetLookupOptions): string | null {
  return getAssetPathById(selectManifest(options?.scope).fallbacks.character, size, options)
}

export function getBossAssetPath(
  bossIdOrSize: string | AssetSize = '64',
  sizeOrOptions: AssetSize | AssetLookupOptions = '64',
  maybeOptions?: AssetLookupOptions
): string | null {
  let bossId: string | null = null
  let size: AssetSize = '64'
  let scope: ManifestScope = 'live'

  if (bossIdOrSize === '32' || bossIdOrSize === '64' || bossIdOrSize === '128') {
    size = bossIdOrSize
  } else {
    bossId = bossIdOrSize
  }

  if (typeof sizeOrOptions === 'string') {
    size = sizeOrOptions
  } else if (sizeOrOptions?.scope) {
    scope = sizeOrOptions.scope
  }

  if (maybeOptions?.scope) {
    scope = maybeOptions.scope
  }

  const manifest = selectManifest(scope)
  const assetId = bossId
    ? manifest.mapping.bossPortraits?.[bossId as keyof typeof manifest.mapping.bossPortraits] ?? manifest.fallbacks.boss
    : manifest.fallbacks.boss
  return getAssetPathById(assetId, size, { scope })
}

export function getTerrainFallbackAssetPath(size: AssetSize = '32'): string | null {
  return getAssetPathById(selectManifest().fallbacks.terrain, size)
}

export function getResourceFallbackAssetPath(size: AssetSize = '32'): string | null {
  return getAssetPathById(selectManifest().fallbacks.resource, size)
}

export function getBuildingFallbackAssetPath(size: AssetSize = '64'): string | null {
  return getAssetPathById(selectManifest().fallbacks.building, size)
}

export function toBackgroundImage(assetPath: string | null | undefined): string | undefined {
  return assetPath ? `url("${assetPath}")` : undefined
}

export function getUiIconAssetPath(
  iconId: string,
  size: AssetSize = '32'
): string | null {
  return getAssetPathById(iconId, size)
}

export { gameAssetsManifest, stagedGameAssetsManifest, runtimeArtBindings }
