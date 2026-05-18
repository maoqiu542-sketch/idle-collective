const INVITE_PREFIX = 'IC1:'

export interface ParsedInvite {
  roomCode: string
  serverHost: string
  serverPort: number
  serverUrl: string
}

export function buildOnlineInvite(roomCode: string, serverHost: string, serverPort: number): string {
  return `${INVITE_PREFIX}${roomCode}@${serverHost}:${serverPort}`
}

export function parseOnlineInvite(input: string, fallbackServerUrl?: string): ParsedInvite | { error: string } {
  const trimmed = input.trim()

  if (!trimmed) {
    return { error: '邀请口令不能为空' }
  }

  let roomCode: string
  let host: string
  let port: number

  const hasPrefix = trimmed.startsWith(INVITE_PREFIX)
  const body = hasPrefix ? trimmed.slice(INVITE_PREFIX.length) : trimmed

  const atIndex = body.lastIndexOf('@')

  if (atIndex === -1) {
    roomCode = body.toUpperCase()
    if (!/^[A-Z0-9]{1,12}$/.test(roomCode)) {
      return { error: '邀请口令格式不正确，请输入完整的邀请口令或纯房间码' }
    }

    if (!fallbackServerUrl) {
      return { error: '未设置服务器地址，请在高级设置中填写服务器地址后重试' }
    }

    const parsed = parseUrl(fallbackServerUrl)
    if (!parsed) {
      return { error: '当前服务器地址格式不正确，请检查高级设置' }
    }

    host = parsed.host
    port = parsed.port
  } else {
    roomCode = body.slice(0, atIndex).toUpperCase()
    if (!/^[A-Z0-9]{1,12}$/.test(roomCode)) {
      return { error: '邀请口令中的房间码格式不正确' }
    }

    const addressPart = body.slice(atIndex + 1)
    const colonIndex = addressPart.lastIndexOf(':')
    if (colonIndex === -1) {
      host = addressPart
      port = 8787
    } else {
      host = addressPart.slice(0, colonIndex)
      const portStr = addressPart.slice(colonIndex + 1)
      port = parseInt(portStr, 10)
      if (isNaN(port) || port < 1 || port > 65535) {
        return { error: `邀请口令中的端口号不正确: ${portStr}` }
      }
    }

    if (!host || host.length > 255) {
      return { error: '邀请口令中的主机地址不正确' }
    }
  }

  const serverUrl = `ws://${host}:${port}`

  return {
    roomCode,
    serverHost: host,
    serverPort: port,
    serverUrl,
  }
}

function parseUrl(url: string): { host: string; port: number } | null {
  let cleaned = url.trim()
  cleaned = cleaned.replace(/^wss?:\/\//, '')

  const colonIndex = cleaned.lastIndexOf(':')
  if (colonIndex === -1) {
    if (cleaned.length > 0 && cleaned.length <= 255) {
      return { host: cleaned, port: 8787 }
    }
    return null
  }

  const host = cleaned.slice(0, colonIndex)
  const port = parseInt(cleaned.slice(colonIndex + 1), 10)
  if (!host || isNaN(port) || port < 1 || port > 65535) {
    return null
  }

  return { host, port }
}

export function extractRoomCodeFromInvite(input: string): string | null {
  const result = parseOnlineInvite(input, 'ws://localhost:8787')
  if ('error' in result) return null
  return result.roomCode
}

export function extractServerUrlFromInvite(input: string): string | null {
  const result = parseOnlineInvite(input, 'ws://localhost:8787')
  if ('error' in result) return null
  return result.serverUrl
}
