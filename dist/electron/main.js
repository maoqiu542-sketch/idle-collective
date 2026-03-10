"use strict";
/**
 * Electron 主进程入口
 * @module electron/main
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const childProcess = __importStar(require("child_process"));
let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
function syncConfig() {
    console.log('🔄 Auto-syncing config files...');
    // 尝试不同的路径位置
    const possiblePaths = [
        path.join(__dirname, '../scripts/sync-config.js'), // 生产环境
        path.join(__dirname, '../../scripts/sync-config.js'), // 开发环境
        path.join(process.cwd(), 'scripts', 'sync-config.js') // 当前工作目录
    ];
    let syncScriptPath = null;
    for (const pathOption of possiblePaths) {
        if (fs.existsSync(pathOption)) {
            syncScriptPath = pathOption;
            break;
        }
    }
    if (syncScriptPath) {
        try {
            const result = childProcess.execSync('node ' + syncScriptPath, {
                cwd: path.dirname(syncScriptPath),
                encoding: 'utf-8'
            });
            console.log('✅ Config sync result:', result);
        }
        catch (error) {
            console.error('❌ Config sync failed:', error.message);
        }
    }
    else {
        console.warn('⚠️ Sync script not found in any location');
    }
}
electron_1.app.whenReady().then(() => {
    // 自动同步配置文件
    syncConfig();
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.ipcMain.handle('save-game', async (_event, data) => {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const savePath = path.join(electron_1.app.getPath('userData'), 'save.json');
    fs.writeFileSync(savePath, data, 'utf-8');
    return true;
});
electron_1.ipcMain.handle('load-game', async () => {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const savePath = path.join(electron_1.app.getPath('userData'), 'save.json');
    if (fs.existsSync(savePath)) {
        return fs.readFileSync(savePath, 'utf-8');
    }
    return null;
});
electron_1.ipcMain.handle('get-save-path', () => {
    return electron_1.app.getPath('userData');
});
//# sourceMappingURL=main.js.map