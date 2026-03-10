/**
 * 错误处理工具
 * @module utils/errors
 */

/** 游戏错误基类 */
export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'GameError'
  }
}

/** 配置错误 */
export class ConfigError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context)
    this.name = 'ConfigError'
  }
}

/** 资源错误 */
export class ResourceError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'RESOURCE_ERROR', context)
    this.name = 'ResourceError'
  }
}

/** 角色错误 */
export class CharacterError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CHARACTER_ERROR', context)
    this.name = 'CharacterError'
  }
}

/** 建筑错误 */
export class BuildingError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BUILDING_ERROR', context)
    this.name = 'BuildingError'
  }
}
