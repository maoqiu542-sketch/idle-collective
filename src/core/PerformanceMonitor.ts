export interface PerformanceMetrics {
  fps: number
  frameTime: number
  updateTime: number
  eventProcessTime: number
  memoryUsage: number
  entityCount: number
  timestamp: number
}

export interface PerformanceThresholds {
  maxFrameTime: number
  maxUpdateTime: number
  maxEventTime: number
  maxMemoryMB: number
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  maxFrameTime: 16,
  maxUpdateTime: 10,
  maxEventTime: 5,
  maxMemoryMB: 100
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private thresholds: PerformanceThresholds
  private maxMetricsHistory: number = 100
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private fpsUpdateTime: number = 0
  private currentFps: number = 60

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
  }

  startFrame(): void {
    this.lastFrameTime = performance.now()
  }

  endFrame(): PerformanceMetrics {
    const now = performance.now()
    const frameTime = now - this.lastFrameTime
    this.frameCount++

    if (now - this.fpsUpdateTime >= 1000) {
      this.currentFps = this.frameCount
      this.frameCount = 0
      this.fpsUpdateTime = now
    }

    const metrics: PerformanceMetrics = {
      fps: this.currentFps,
      frameTime,
      updateTime: 0,
      eventProcessTime: 0,
      memoryUsage: this.getMemoryUsage(),
      entityCount: 0,
      timestamp: Date.now()
    }

    this.metrics.push(metrics)
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift()
    }

    return metrics
  }

  measureUpdate(updateFn: () => void): number {
    const start = performance.now()
    updateFn()
    return performance.now() - start
  }

  private getMemoryUsage(): number {
    if ((performance as any).memory) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / (1024 * 1024)
    }
    return 0
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        fps: 60,
        frameTime: 0,
        updateTime: 0,
        eventProcessTime: 0,
        memoryUsage: 0,
        entityCount: 0,
        timestamp: Date.now()
      }
    }

    const sum = this.metrics.reduce((acc, m) => ({
      fps: acc.fps + m.fps,
      frameTime: acc.frameTime + m.frameTime,
      updateTime: acc.updateTime + m.updateTime,
      eventProcessTime: acc.eventProcessTime + m.eventProcessTime,
      memoryUsage: acc.memoryUsage + m.memoryUsage,
      entityCount: acc.entityCount + m.entityCount,
      timestamp: Date.now()
    }), {
      fps: 0,
      frameTime: 0,
      updateTime: 0,
      eventProcessTime: 0,
      memoryUsage: 0,
      entityCount: 0,
      timestamp: 0
    })

    return {
      fps: sum.fps / this.metrics.length,
      frameTime: sum.frameTime / this.metrics.length,
      updateTime: sum.updateTime / this.metrics.length,
      eventProcessTime: sum.eventProcessTime / this.metrics.length,
      memoryUsage: sum.memoryUsage / this.metrics.length,
      entityCount: sum.entityCount / this.metrics.length,
      timestamp: Date.now()
    }
  }

  checkThresholds(metrics: PerformanceMetrics): string[] {
    const warnings: string[] = []

    if (metrics.frameTime > this.thresholds.maxFrameTime) {
      warnings.push(`Frame time ${metrics.frameTime.toFixed(2)}ms exceeds threshold ${this.thresholds.maxFrameTime}ms`)
    }

    if (metrics.updateTime > this.thresholds.maxUpdateTime) {
      warnings.push(`Update time ${metrics.updateTime.toFixed(2)}ms exceeds threshold ${this.thresholds.maxUpdateTime}ms`)
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryMB) {
      warnings.push(`Memory usage ${metrics.memoryUsage.toFixed(2)}MB exceeds threshold ${this.thresholds.maxMemoryMB}MB`)
    }

    return warnings
  }

  reset(): void {
    this.metrics = []
    this.frameCount = 0
    this.currentFps = 60
  }
}
