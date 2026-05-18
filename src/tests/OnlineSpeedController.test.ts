import { describe, expect, it } from 'vitest'
import { OnlineSpeedController } from '@domain/online/OnlineSpeedController'

describe('OnlineSpeedController', () => {
  it('increases by 0.01 for each accepted activity pulse', () => {
    const controller = new OnlineSpeedController()

    controller.recordActivity('player-a', 1000, 1)
    controller.recordActivity('player-a', 1200, 1)

    expect(controller.getState(1200).multiplier).toBe(1.02)
  })

  it('caps speed multiplier at 3.00', () => {
    const controller = new OnlineSpeedController()

    controller.recordActivity('player-a', 1000, 500)

    expect(controller.getState(1000).multiplier).toBe(3)
  })

  it('does not decay during the five second idle grace window', () => {
    const controller = new OnlineSpeedController()

    controller.recordActivity('player-a', 1000, 50)

    expect(controller.getState(5999).multiplier).toBe(1.5)
  })

  it('decays by 0.01 per idle second after the grace window', () => {
    const controller = new OnlineSpeedController()

    controller.recordActivity('player-a', 1000, 50)

    expect(controller.getState(7000).multiplier).toBe(1.49)
    expect(controller.getState(8000).multiplier).toBe(1.48)
  })

  it('continues increasing from the current decayed multiplier when input resumes', () => {
    const controller = new OnlineSpeedController()

    controller.recordActivity('player-a', 1000, 50)
    expect(controller.getState(8000).multiplier).toBe(1.48)

    controller.recordActivity('player-b', 8000, 1)

    expect(controller.getState(8000).multiplier).toBe(1.49)
  })

  it('rate limits excessive pulses per player per second', () => {
    const controller = new OnlineSpeedController({ maxPulsesPerPlayerPerSecond: 20 })

    const result = controller.recordActivity('player-a', 1000, 40)

    expect(result.acceptedPulses).toBe(20)
    expect(result.rejectedPulses).toBe(20)
    expect(controller.getState(1000).multiplier).toBe(1.2)
  })
})
