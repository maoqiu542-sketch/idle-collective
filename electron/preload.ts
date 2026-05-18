import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  setTitle: (title: string) => ipcRenderer.send('set-title', title),

  saveGame: (data: string) => ipcRenderer.invoke('save-game', data),
  loadGame: () => ipcRenderer.invoke('load-game'),
  getSavePath: () => ipcRenderer.invoke('get-save-path'),

  toggleFloat: () => ipcRenderer.invoke('toggle-float-mode'),
  toggleFloatMode: () => ipcRenderer.invoke('toggle-float-mode'),
  onFloatSnapshotUpdate: (callback: (snapshot: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: unknown) => callback(snapshot)
    ipcRenderer.on('float-snapshot-update', listener)
    return () => {
      ipcRenderer.removeListener('float-snapshot-update', listener)
    }
  },
  publishFloatSnapshot: (snapshot: unknown) => ipcRenderer.send('publish-float-snapshot', snapshot),
  onFloatModeChanged: (callback: (val: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, val: boolean) => callback(val)
    ipcRenderer.on('float-mode-changed', listener)
    return () => {
      ipcRenderer.removeListener('float-mode-changed', listener)
    }
  },

  ensureOnlineServer: () => ipcRenderer.invoke('ensure-online-server'),
  getOnlineHostHint: () => ipcRenderer.invoke('get-online-host-hint'),

  startGlobalActivityMonitor: () => ipcRenderer.invoke('start-global-activity-monitor'),
  stopGlobalActivityMonitor: () => ipcRenderer.invoke('stop-global-activity-monitor'),
  getGlobalActivityMonitorStatus: () => ipcRenderer.invoke('get-global-activity-monitor-status'),
  onGlobalActivity: (callback: (activity: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, activity: unknown) => callback(activity)
    ipcRenderer.on('global-activity', listener)
    return () => {
      ipcRenderer.removeListener('global-activity', listener)
    }
  },
})
