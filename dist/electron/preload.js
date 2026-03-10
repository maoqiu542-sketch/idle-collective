"use strict";
/**
 * Electron 预加载脚本
 * @module electron/preload
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    saveGame: (data) => {
        return electron_1.ipcRenderer.invoke('save-game', data);
    },
    loadGame: () => {
        return electron_1.ipcRenderer.invoke('load-game');
    },
    getSavePath: () => {
        return electron_1.ipcRenderer.invoke('get-save-path');
    },
    onWindowFocus: (callback) => {
        electron_1.ipcRenderer.on('window-focus', callback);
        return () => electron_1.ipcRenderer.removeListener('window-focus', callback);
    },
    onWindowBlur: (callback) => {
        electron_1.ipcRenderer.on('window-blur', callback);
        return () => electron_1.ipcRenderer.removeListener('window-blur', callback);
    },
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map