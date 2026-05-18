import { describe, expect, it } from 'vitest'
import { Game } from '@core/Game'
import { CharacterState } from '@app-types/character.types'

describe('Game manual harvest', () => {
  it('should grant resources immediately when manually harvesting a resource tile', async () => {
    const game = new Game({ mapWidth: 20, mapHeight: 20 })
    await game.initialize()

    const mapData = game.getMapSystem().getMapData()
    const tileWithResource = mapData?.tiles
      .flatMap((row, y) => row.map((tile, x) => ({ tile, x, y })))
      .find(entry => entry.tile.resource && entry.tile.resource.amount > 0)

    expect(tileWithResource).toBeTruthy()
    if (!tileWithResource?.tile.resource) {
      return
    }

    const before = game.getResource(tileWithResource.tile.resource.type)
    const result = game.tryManualHarvest(tileWithResource.x, tileWithResource.y)
    const after = game.getResource(tileWithResource.tile.resource.type)

    expect(result.success).toBe(true)
    expect(result.amount).toBe(5)
    expect(after).toBe(before + 5)
  })

  it('should restore saved gathering characters to idle when active tasks are reset', async () => {
    const game = new Game({ mapWidth: 20, mapHeight: 20 })
    await game.initialize()

    const saveData = game.createSaveData('Busy character save')
    saveData.characters = saveData.characters.map(character => ({
      ...character,
      state: CharacterState.GATHERING,
    }))

    const restoredGame = new Game({ mapWidth: 20, mapHeight: 20 })
    restoredGame.restoreFromSaveData(saveData)

    expect(restoredGame.getCharacterManager().getAll().map(character => character.state))
      .toEqual(saveData.characters.map(() => CharacterState.IDLE))
  })
})
