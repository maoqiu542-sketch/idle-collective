import { describe, expect, it } from 'vitest'
import { resolveAttachedSession } from '../../server/connection/resolveAttachedSession'
import type { OnlineMessage } from '@app-types/online.types'

describe('resolveAttachedSession', () => {
  it('uses the server-attached player identity instead of trusting the incoming message', () => {
    const message: OnlineMessage = {
      protocolVersion: 1,
      type: 'player:action',
      roomCode: 'ROOM01',
      playerId: 'spoofed-player',
      payload: { type: 'refreshRecruitmentShop' },
    }

    const result = resolveAttachedSession(message, {
      roomCode: 'ROOM01',
      playerId: 'actual-player',
    })

    expect(result).toEqual({
      roomCode: 'ROOM01',
      playerId: 'actual-player',
    })
  })

  it('returns null when the socket is not attached to a room session yet', () => {
    const message: OnlineMessage = {
      protocolVersion: 1,
      type: 'player:action',
      payload: { type: 'refreshRecruitmentShop' },
    }

    expect(resolveAttachedSession(message, { roomCode: null, playerId: null })).toBeNull()
  })
})
