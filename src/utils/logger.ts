/**
 * 日志工具
 * @module utils/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class Logger {
  private level: LogLevel = 'info'
  private prefix: string = ''
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  constructor(prefix?: string) {
    if (prefix) {
      this.prefix = `[${prefix}] `
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level]
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    const levelPrefix = `[${timestamp}] [${level.toUpperCase()}]`
    return `${levelPrefix} ${this.prefix}${message}`
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args)
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args)
    }
  }
}

export default Logger
