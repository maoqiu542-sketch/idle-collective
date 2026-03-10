/**
 * Electron 主进程入口
 * @module electron/main
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as childProcess from 'child_process'

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow(): void {
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
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function syncConfig() {
  console.log('🔄 Auto-syncing config files...')
  
  // 尝试不同的路径位置
  const possiblePaths = [
    path.join(__dirname, '../scripts/sync-config.js'), // 生产环境
    path.join(__dirname, '../../scripts/sync-config.js'), // 开发环境
    path.join(process.cwd(), 'scripts', 'sync-config.js') // 当前工作目录
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
      const result = childProcess.execSync('node ' + syncScriptPath, {
        cwd: path.dirname(syncScriptPath),
        encoding: 'utf-8'
      })
      console.log('✅ Config sync result:', result)
    } catch (error) {
      console.error('❌ Config sync failed:', (error as Error).message)
    }
  } else {
    console.warn('⚠️ Sync script not found in any location')
  }
}

app.whenReady().then(() => {
  // 自动同步配置文件
  syncConfig()
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
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
