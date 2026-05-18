import type { OnlineSpeedState } from '@app-types/online.types'

export interface OnlineSpeedControllerOptions {
  baseMultiplier?: number
  maxMultiplier?: number
  incrementPerPulse?: number
  idleDelayMs?: number
  decayPerSecond?: number
  maxPulsesPerPlayerPerSecond?: number
}

export interface ActivityPulseResult {
  acceptedPulses: number
  rejectedPulses: number
  state: OnlineSpeedState
}

interface PlayerPulseBucket {
  second: number
  count: number
}

export class OnlineSpeedController {
  private readonly baseMultiplier: number
  private readonly maxMultiplier: number
  private readonly incrementPerPulse: number
  private readonly idleDelayMs: number
  private readonly decayPerSecond: number
  private readonly maxPulsesPerPlayerPerSecond: number
  private multiplier: number
  private lastActivityAt: number | null = null
  private decayAppliedUntil: number | null = null
  private acceptedPulseCount = 0
  private playerBuckets = new Map<string, PlayerPulseBucket>()

  constructor(options: OnlineSpeedControllerOptions = {}) {
    this.baseMultiplier = options.baseMultiplier ?? 1
    this.maxMultiplier = options.maxMultiplier ?? 3
    this.incrementPerPulse = options.incrementPerPulse ?? 0.01
    this.idleDelayMs = options.idleDelayMs ?? 5000
    this.decayPerSecond = options.decayPerSecond ?? 0.01
    this.maxPulsesPerPlayerPerSecond = options.maxPulsesPerPlayerPerSecond ?? Number.MAX_SAFE_INTEGER
    this.multiplier = this.baseMultiplier
  }

  recordActivity(playerId: string, now: number = Date.now(), count: number = 1): ActivityPulseResult {
    const safeCount = Math.max(0, Math.floor(count))
    const acceptedPulses = this.consumeAllowedPulses(playerId, now, safeCount)
    const rejectedPulses = safeCount - acceptedPulses

    this.applyDecay(now)

    if (acceptedPulses > 0) {
      this.multiplier = Math.min(
        this.maxMultiplier,
        this.round(this.multiplier + acceptedPulses * this.incrementPerPulse)
      )
      this.lastActivityAt = now
      this.decayAppliedUntil = now + this.idleDelayMs
      this.acceptedPulseCount += acceptedPulses
    }

    return {
      acceptedPulses,
      rejectedPulses,
      state: this.getState(now),
    }
  }

  getState(now: number = Date.now()): OnlineSpeedState {
    this.applyDecay(now)
    const idleSinceMs = this.lastActivityAt === null ? null : Math.max(0, now - this.lastActivityAt)
    return {
      multiplier: this.round(this.multiplier),
      lastActivityAt: this.lastActivityAt,
      idleSinceMs,
      acceptedPulseCount: this.acceptedPulseCount,
    }
  }

  private consumeAllowedPulses(playerId: string, now: number, count: number): number {
    if (count <= 0) return 0
    const second = Math.floor(now / 1000)
    const bucket = this.playerBuckets.get(playerId)

    if (!bucket || bucket.second !== second) {
      const accepted = Math.min(count, this.maxPulsesPerPlayerPerSecond)
      this.playerBuckets.set(playerId, { second, count: accepted })
      return accepted
    }

    const remaining = Math.max(0, this.maxPulsesPerPlayerPerSecond - bucket.count)
    const accepted = Math.min(count, remaining)
    bucket.count += accepted
    return accepted
  }

  private applyDecay(now: number): void {
    if (this.lastActivityAt === null) return
    if (this.multiplier <= this.baseMultiplier) {
      this.multiplier = this.baseMultiplier
      return
    }

    const idleMs = now - this.lastActivityAt
    if (idleMs <= this.idleDelayMs) return

    const decayStart = this.decayAppliedUntil ?? (this.lastActivityAt + this.idleDelayMs)
    const decaySeconds = Math.floor((now - decayStart) / 1000)
    if (decaySeconds <= 0) return
    const decayed = this.multiplier - decaySeconds * this.decayPerSecond
    this.multiplier = Math.max(this.baseMultiplier, this.round(decayed))
    this.decayAppliedUntil = decayStart + decaySeconds * 1000
  }

  private round(value: number): number {
    return Number(value.toFixed(2))
  }
}
