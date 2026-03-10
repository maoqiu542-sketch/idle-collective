@echo off
chcp 65001 >nul
title Idle Collective - 开发环境启动器

echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║                                                               ║
echo  ║           🎮 Idle Collective - 开发环境启动器 🎮            ║
echo  ║                                                               ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [错误] 未检测到 Node.js
    echo  请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  [!] 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo  [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

echo  正在启动开发服务器和 Electron...
echo  按 Ctrl+C 可停止所有服务
echo.
echo  ════════════════════════════════════════════════════════════════
echo.

npx concurrently -k "npm run dev" "npx wait-on http://localhost:3000 && npx electron ."

pause
