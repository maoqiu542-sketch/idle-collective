import { BrowserWindow } from 'electron'

export interface InputActivityEvent {
  count: number
  timestamp: number
  source: 'global' | 'window'
}

type ActivityCallback = (event: InputActivityEvent) => void

interface UiohookModule {
  uIOhook: {
    on(event: string, callback: (payload?: unknown) => void): void
    off(event: string, callback: (payload?: unknown) => void): void
    start(): void
    stop(): void
  }
}

export class InputActivityMonitor {
  private enabled = false
  private usingGlobalHook = false
  private error: string | null = null
  private callbacks = new Set<ActivityCallback>()
  private activeKeys = new Set<string>()
  private lastEmitAt = 0
  private readonly minIntervalMs = 50
  private keydownHandler: ((payload?: unknown) => void) | null = null
  private keyupHandler: ((payload?: unknown) => void) | null = null
  private mouseHandler: ((payload?: unknown) => void) | null = null
  private uiohook: UiohookModule['uIOhook'] | null = null

  start(): { enabled: boolean; global: boolean; error?: string } {
    if (this.enabled) {
      return { enabled: true, global: this.usingGlobalHook, ...(this.error ? { error: this.error } : {}) }
    }

    this.enabled = true
    this.error = null

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const maybeModule = require('uiohook-napi') as UiohookModule
      this.uiohook = maybeModule.uIOhook
      this.keydownHandler = (payload?: any) => {
        const key = String(payload?.keycode ?? payload?.keyCode ?? 'unknown')
        if (this.activeKeys.has(key)) return
        this.activeKeys.add(key)
        this.emitActivity('global')
      }
      this.mouseHandler = () => this.emitActivity('global')
      this.keyupHandler = (payload?: any) => {
        const key = String(payload?.keycode ?? payload?.keyCode ?? 'unknown')
        this.activeKeys.delete(key)
      }

      this.uiohook.on('keydown', this.keydownHandler)
      this.uiohook.on('keyup', this.keyupHandler)
      this.uiohook.on('mousedown', this.mouseHandler)
      this.uiohook.start()
      this.usingGlobalHook = true
    } catch (error) {
      this.usingGlobalHook = false
      this.error = error instanceof Error ? error.message : '全局输入监听不可用'
    }

    return { enabled: true, global: this.usingGlobalHook, ...(this.error ? { error: this.error } : {}) }
  }

  stop(): { enabled: boolean } {
    this.enabled = false
    this.activeKeys.clear()
    if (this.uiohook) {
      try {
        if (this.keydownHandler) this.uiohook.off('keydown', this.keydownHandler)
        if (this.keyupHandler) this.uiohook.off('keyup', this.keyupHandler)
        if (this.mouseHandler) this.uiohook.off('mousedown', this.mouseHandler)
        this.uiohook.stop()
      } catch {
        // Ignore hook shutdown errors.
      }
    }
    this.uiohook = null
    this.keydownHandler = null
    this.keyupHandler = null
    this.mouseHandler = null
    this.usingGlobalHook = false
    return { enabled: false }
  }

  getStatus(): { enabled: boolean; global: boolean; error?: string } {
    return { enabled: this.enabled, global: this.usingGlobalHook, ...(this.error ? { error: this.error } : {}) }
  }

  onActivity(callback: ActivityCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  attachWindowFallback(window: BrowserWindow): void {
    window.webContents.on('before-input-event', (_event, input) => {
      if (!this.enabled || this.usingGlobalHook) return
      if (input.type === 'keyDown' && !input.isAutoRepeat) {
        this.emitActivity('window')
        return
      }
      if (input.type === 'mouseDown') {
        this.emitActivity('window')
      }
    })
  }

  private emitActivity(source: 'global' | 'window'): void {
    const now = Date.now()
    if (now - this.lastEmitAt < this.minIntervalMs) return
    this.lastEmitAt = now
    const event: InputActivityEvent = { count: 1, timestamp: now, source }
    this.callbacks.forEach(callback => callback(event))
  }
}
