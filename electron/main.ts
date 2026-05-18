/**
 * Electron 主进程入口
 * @module electron/main
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as cp from 'child_process'
import { InputActivityMonitor } from './inputActivityMonitor'

let mainWindow: BrowserWindow | null = null
let floatWindow: BrowserWindow | null = null
const inputActivityMonitor = new InputActivityMonitor()

const FLOAT_WIDTH = 420
const FLOAT_HEIGHT = 118

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

async function getLoadURL(): Promise<string> {
  if (isDev) {
    return process.env.IDLE_COLLECTIVE_DEV_URL || 'http://127.0.0.1:3000'
  }
  return `file://${path.join(__dirname, '../renderer/index.html')}`
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Idle Collective',
    icon: path.join(__dirname, '../assets/icon.png'),
    frame: true,
    backgroundColor: '#1a1a2e',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  const loadURL = await getLoadURL()
  await mainWindow.loadURL(loadURL)
  inputActivityMonitor.attachWindowFallback(mainWindow)

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function createFloatWindow(): Promise<void> {
  if (floatWindow) return

  floatWindow = new BrowserWindow({
    width: FLOAT_WIDTH,
    height: FLOAT_HEIGHT,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  })

  const loadURL = await getLoadURL()
  await floatWindow.loadURL(`${loadURL}?view=float`)
  inputActivityMonitor.attachWindowFallback(floatWindow)
  floatWindow.show()

  floatWindow.on('closed', () => {
    floatWindow = null
  })

  floatWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'mouseDown') {
      if (mainWindow) {
        restoreMainWindow()
      }
    }
  })
}

function showFloat(): void {
  if (mainWindow) {
    mainWindow.hide()
  }
  createFloatWindow()
}

function restoreMainWindow(): void {
  if (floatWindow && !floatWindow.isDestroyed()) {
    floatWindow.close()
    floatWindow = null
  }
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
}

function syncConfig() {
  const possiblePaths = [
    path.join(__dirname, '../scripts/sync-config.js'),
    path.join(__dirname, '../../scripts/sync-config.js'),
    path.join(process.cwd(), 'scripts', 'sync-config.js')
  ]

  let syncScriptPath: string | null = null
  for (const pathOption of possiblePaths) {
    if (fs.existsSync(pathOption)) {
      syncScriptPath = pathOption
      break
    }
  }

  if (syncScriptPath) {
    try {
      cp.execSync('node ' + syncScriptPath, {
        cwd: path.dirname(syncScriptPath),
        encoding: 'utf-8'
      })
    } catch (error) {
      console.error('Config sync failed:', (error as Error).message)
    }
  }
}

app.whenReady().then(() => {
  syncConfig()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('save-game', async (_event, data: string) => {
  const fs = await import('fs')
  const savePath = path.join(app.getPath('userData'), 'save.json')
  fs.writeFileSync(savePath, data, 'utf-8')
  return true
})

ipcMain.handle('load-game', async () => {
  const fs = await import('fs')
  const savePath = path.join(app.getPath('userData'), 'save.json')
  if (fs.existsSync(savePath)) {
    return fs.readFileSync(savePath, 'utf-8')
  }
  return null
})

ipcMain.handle('get-save-path', () => {
  return app.getPath('userData')
})

ipcMain.handle('toggle-float-mode', () => {
  if (floatWindow && !floatWindow.isDestroyed()) {
    restoreMainWindow()
  } else {
    showFloat()
  }
  const isActive = floatWindow !== null
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('float-mode-changed', isActive)
  }
  return isActive
})

ipcMain.on('publish-float-snapshot', (_event, snapshot: unknown) => {
  if (floatWindow && !floatWindow.isDestroyed()) {
    floatWindow.webContents.send('float-snapshot-update', snapshot)
  }
})

ipcMain.handle('start-global-activity-monitor', () => {
  return inputActivityMonitor.start()
})

ipcMain.handle('stop-global-activity-monitor', () => {
  return inputActivityMonitor.stop()
})

ipcMain.handle('get-global-activity-monitor-status', () => {
  return inputActivityMonitor.getStatus()
})

inputActivityMonitor.onActivity((activity) => {
  for (const window of [mainWindow, floatWindow]) {
    if (window && !window.isDestroyed()) {
      window.webContents.send('global-activity', activity)
    }
  }
})

function getLanAddresses(): { host: string; family: string }[] {
  const interfaces = os.networkInterfaces()
  const addresses: { host: string; family: string }[] = []
  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push({ host: addr.address, family: 'IPv4' })
      }
    }
  }
  return addresses
}

function getBestLanAddress(): string | null {
  const addrs = getLanAddresses()
  const preferred = addrs.find(a => a.host.startsWith('192.168.') || a.host.startsWith('10.') || a.host.startsWith('172.'))
  return preferred?.host ?? addrs[0]?.host ?? null
}

let onlineServerProcess: cp.ChildProcess | null = null
const ONLINE_SERVER_PORT = 8787

ipcMain.handle('ensure-online-server', async () => {
  if (onlineServerProcess) {
    const lanAddr = getBestLanAddress()
    return {
      ok: true,
      localServerUrl: `ws://localhost:${ONLINE_SERVER_PORT}`,
      inviteServerUrl: lanAddr ? `${lanAddr}:${ONLINE_SERVER_PORT}` : null,
      port: ONLINE_SERVER_PORT,
    }
  }

  return new Promise((resolve) => {
    const serverScript = path.join(__dirname, '../server/index.js')

    if (!fs.existsSync(serverScript)) {
      resolve({
        ok: false,
        localServerUrl: '',
        inviteServerUrl: null,
        port: 0,
        error: '服务器模块未找到，请重新打包',
      })
      return
    }

    const dataDir = path.join(app.getPath('userData'), 'online-rooms')
    console.log(`[Idle Collective] Starting online server, dataDir: ${dataDir}`)

    const child = cp.fork(serverScript, [], {
      env: {
        ...process.env,
        IDLE_ONLINE_PORT: String(ONLINE_SERVER_PORT),
        IDLE_ONLINE_DATA_DIR: dataDir,
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })

    const timeout = setTimeout(() => {
      child.kill()
      resolve({
        ok: false,
        localServerUrl: '',
        inviteServerUrl: null,
        port: 0,
        error: '启动联机服务超时',
      })
    }, 15000)

    child.on('message', (msg: any) => {
      if (msg === 'online-server-ready') {
        clearTimeout(timeout)
        onlineServerProcess = child
        const lanAddr = getBestLanAddress()
        resolve({
          ok: true,
          localServerUrl: `ws://localhost:${ONLINE_SERVER_PORT}`,
          inviteServerUrl: lanAddr ? `${lanAddr}:${ONLINE_SERVER_PORT}` : null,
          port: ONLINE_SERVER_PORT,
        })
      }
    })

    child.on('exit', (code) => {
      clearTimeout(timeout)
      if (onlineServerProcess === child) {
        onlineServerProcess = null
      }
      resolve({
        ok: false,
        localServerUrl: '',
        inviteServerUrl: null,
        port: 0,
        error: `联机服务意外退出 (退出码: ${code})`,
      })
    })

    child.on('error', (err) => {
      clearTimeout(timeout)
      onlineServerProcess = null
      resolve({
        ok: false,
        localServerUrl: '',
        inviteServerUrl: null,
        port: 0,
        error: err.message,
      })
    })
  })
})

ipcMain.handle('get-online-host-hint', async () => {
  const lanAddrs = getLanAddresses()
  const port = ONLINE_SERVER_PORT
  const bestLanAddr = getBestLanAddress()
  return {
    localServerUrl: `ws://localhost:${port}`,
    inviteServerUrl: bestLanAddr ? `${bestLanAddr}:${port}` : null,
    lanHosts: lanAddrs.map(a => a.host),
    port,
  }
})

app.on('will-quit', () => {
  if (onlineServerProcess) {
    onlineServerProcess.kill()
    onlineServerProcess = null
  }
})
