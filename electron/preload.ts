/**
 * Electron 预加载脚本
 * @module electron/preload
 */

import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  saveGame: (data: string): Promise<boolean> => {
    return ipcRenderer.invoke('save-game', data)
  },

  loadGame: (): Promise<string | null> => {
    return ipcRenderer.invoke('load-game')
  },

  getSavePath: (): Promise<string> => {
    return ipcRenderer.invoke('get-save-path')
  },

  onWindowFocus: (callback: () => void) => {
    ipcRenderer.on('window-focus', callback)
    return () => ipcRenderer.removeListener('window-focus', callback)
  },

  onWindowBlur: (callback: () => void) => {
    ipcRenderer.on('window-blur', callback)
    return () => ipcRenderer.removeListener('window-blur', callback)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
