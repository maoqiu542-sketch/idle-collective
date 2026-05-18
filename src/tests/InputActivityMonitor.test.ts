import { describe, expect, it, vi } from 'vitest'
import { InputActivityMonitor } from '../../electron/inputActivityMonitor'

function createWindowEventHarness() {
  let handler: ((event: unknown, input: { type: string; isAutoRepeat?: boolean }) => void) | null = null

  return {
    window: {
      webContents: {
        on: vi.fn((eventName: string, callback: typeof handler) => {
          if (eventName === 'before-input-event') {
            handler = callback
          }
        }),
      },
    },
    emit(input: { type: string; isAutoRepeat?: boolean }) {
      handler?.({}, input)
    },
  }
}

describe('InputActivityMonitor', () => {
  it('emits fallback activity for both keyDown and mouseDown when global hook is unavailable', () => {
    const monitor = new InputActivityMonitor()
    const harness = createWindowEventHarness()
    const events: Array<{ source: string }> = []

    ;(monitor as any).enabled = true
    ;(monitor as any).usingGlobalHook = false
    ;(monitor as any).lastEmitAt = -Infinity
    monitor.onActivity(event => events.push({ source: event.source }))

    monitor.attachWindowFallback(harness.window as any)

    harness.emit({ type: 'keyDown', isAutoRepeat: false })
    ;(monitor as any).lastEmitAt = -Infinity
    harness.emit({ type: 'mouseDown' })

    expect(events).toEqual([{ source: 'window' }, { source: 'window' }])
  })

  it('removes the keyup handler when monitoring stops', () => {
    const monitor = new InputActivityMonitor()
    const off = vi.fn()
    const stop = vi.fn()
    const keydownHandler = vi.fn()
    const keyupHandler = vi.fn()
    const mouseHandler = vi.fn()

    ;(monitor as any).enabled = true
    ;(monitor as any).uiohook = { off, stop }
    ;(monitor as any).keydownHandler = keydownHandler
    ;(monitor as any).keyupHandler = keyupHandler
    ;(monitor as any).mouseHandler = mouseHandler

    monitor.stop()

    expect(off).toHaveBeenCalledWith('keydown', keydownHandler)
    expect(off).toHaveBeenCalledWith('keyup', keyupHandler)
    expect(off).toHaveBeenCalledWith('mousedown', mouseHandler)
    expect((monitor as any).keyupHandler).toBeNull()
  })
})
