@echo off
chcp 65001 >nul
title Idle Collective - 游戏启动器

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║                                               ║
echo  ║       🎮 Idle Collective 启动器 🎮            ║
echo  ║                                               ║
echo  ╚═══════════════════════════════════════════════╝
echo.
echo  正在检查环境...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [错误] 未检测到 Node.js，请先安装 Node.js
    echo  下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo  [√] Node.js 已安装
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo  [!] 首次运行，正在安装依赖...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo  [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo  [√] 依赖安装完成
    echo.
)

echo  正在启动游戏...
echo.
echo  ═══════════════════════════════════════════════
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo  [错误] 游戏启动失败
    pause
)
