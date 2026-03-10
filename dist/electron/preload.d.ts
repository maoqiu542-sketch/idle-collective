/**
 * Electron 预加载脚本
 * @module electron/preload
 */
declare const electronAPI: {
    saveGame: (data: string) => Promise<boolean>;
    loadGame: () => Promise<string | null>;
    getSavePath: () => Promise<string>;
    onWindowFocus: (callback: () => void) => () => Electron.IpcRenderer;
    onWindowBlur: (callback: () => void) => () => Electron.IpcRenderer;
};
export type ElectronAPI = typeof electronAPI;
export {};
//# sourceMappingURL=preload.d.ts.map