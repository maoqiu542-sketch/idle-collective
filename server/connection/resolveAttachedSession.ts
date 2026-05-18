import type { OnlineMessage } from '../../src/types/online.types'

export interface AttachedSessionState {
  roomCode: string | null
  playerId: string | null
}

export interface ResolvedAttachedSession {
  roomCode: string
  playerId: string
}

export function resolveAttachedSession(
  _message: OnlineMessage,
  attachment: AttachedSessionState,
): ResolvedAttachedSession | null {
  if (!attachment.roomCode || !attachment.playerId) {
    return null
  }

  return {
    roomCode: attachment.roomCode,
    playerId: attachment.playerId,
  }
}
