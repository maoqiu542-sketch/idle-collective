import { describe, expect, it } from 'vitest'
import {
  buildOnlineInvite,
  parseOnlineInvite,
  extractRoomCodeFromInvite,
  extractServerUrlFromInvite,
} from '@net/OnlineInvite'

describe('buildOnlineInvite', () => {
  it('应生成完整的邀请口令', () => {
    const result = buildOnlineInvite('H6TLS3', '192.168.1.23', 8787)
    expect(result).toBe('IC1:H6TLS3@192.168.1.23:8787')
  })

  it('应能处理不同端口', () => {
    const result = buildOnlineInvite('AB12CD', '10.0.0.5', 9999)
    expect(result).toBe('IC1:AB12CD@10.0.0.5:9999')
  })
})

describe('parseOnlineInvite', () => {
  describe('完整口令格式 IC1:ROOM@HOST:PORT', () => {
    it('应正确解析完整口令', () => {
      const result = parseOnlineInvite('IC1:H6TLS3@192.168.1.23:8787')
      expect('error' in result).toBe(false)
      if ('error' in result) return
      expect(result.roomCode).toBe('H6TLS3')
      expect(result.serverHost).toBe('192.168.1.23')
      expect(result.serverPort).toBe(8787)
      expect(result.serverUrl).toBe('ws://192.168.1.23:8787')
    })

    it('应正确解析含默认端口的完整口令（无端口号）', () => {
      const result = parseOnlineInvite('IC1:H6TLS3@192.168.1.23')
      expect('error' in result).toBe(false)
      if ('error' in result) return
      expect(result.roomCode).toBe('H6TLS3')
      expect(result.serverHost).toBe('192.168.1.23')
      expect(result.serverPort).toBe(8787)
      expect(result.serverUrl).toBe('ws://192.168.1.23:8787')
    })
  })

  describe('简写口令格式 ROOM@HOST:PORT', () => {
    it('应正确解析无IC1前缀的口令', () => {
      const result = parseOnlineInvite('H6TLS3@192.168.1.23:8787')
      expect('error' in result).toBe(false)
      if ('error' in result) return
      expect(result.roomCode).toBe('H6TLS3')
      expect(result.serverHost).toBe('192.168.1.23')
      expect(result.serverPort).toBe(8787)
      expect(result.serverUrl).toBe('ws://192.168.1.23:8787')
    })
  })

  describe('纯房间码 fallback', () => {
    it('应使用 fallbackServerUrl 解析纯房间码', () => {
      const result = parseOnlineInvite('H6TLS3', 'ws://192.168.1.23:8787')
      expect('error' in result).toBe(false)
      if ('error' in result) return
      expect(result.roomCode).toBe('H6TLS3')
      expect(result.serverUrl).toBe('ws://192.168.1.23:8787')
    })

    it('纯房间码无 fallback 时应返回错误', () => {
      const result = parseOnlineInvite('H6TLS3')
      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('服务器地址')
      }
    })

    it('纯房间码 fallback 格式错误时应返回错误', () => {
      const result = parseOnlineInvite('H6TLS3', 'invalid-url::::')
      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('服务器地址')
      }
    })
  })

  describe('无效输入', () => {
    it('空字符串应返回错误', () => {
      const result = parseOnlineInvite('')
      expect('error' in result).toBe(true)
    })

    it('纯空格应返回错误', () => {
      const result = parseOnlineInvite('   ')
      expect('error' in result).toBe(true)
    })

    it('格式错误的邀请口令应返回错误', () => {
      const result = parseOnlineInvite('!!!wrong@#$%')
      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('格式不正确')
      }
    })

    it('端口号超出范围应返回错误', () => {
      const result = parseOnlineInvite('IC1:H6TLS3@192.168.1.23:99999')
      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toContain('端口')
      }
    })

    it('无效房间码应返回错误', () => {
      const result = parseOnlineInvite('IC1:!!!@192.168.1.23:8787')
      expect('error' in result).toBe(true)
    })
  })

  describe('边缘情况', () => {
    it('应处理前后有空格的口令', () => {
      const result = parseOnlineInvite('  IC1:H6TLS3@192.168.1.23:8787  ')
      expect('error' in result).toBe(false)
      if ('error' in result) return
      expect(result.roomCode).toBe('H6TLS3')
    })

    it('小写房间码应转为大写', () => {
      const result = parseOnlineInvite('IC1:h6tls3@192.168.1.23:8787')
      expect('error' in result).toBe(false)
      if ('error' in result) return
      expect(result.roomCode).toBe('H6TLS3')
    })
  })
})

describe('extractRoomCodeFromInvite', () => {
  it('应从完整口令中提取房间码', () => {
    expect(extractRoomCodeFromInvite('IC1:H6TLS3@192.168.1.23:8787')).toBe('H6TLS3')
  })

  it('无效口令应返回 null', () => {
    expect(extractRoomCodeFromInvite('')).toBeNull()
  })
})

describe('extractServerUrlFromInvite', () => {
  it('应从完整口令中提取服务器地址', () => {
    expect(extractServerUrlFromInvite('IC1:H6TLS3@192.168.1.23:8787')).toBe('ws://192.168.1.23:8787')
  })

  it('无效口令应返回 null', () => {
    expect(extractServerUrlFromInvite('')).toBeNull()
  })
})
