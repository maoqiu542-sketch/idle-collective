@echo off
chcp 65001 >nul
title Idle Collective - 生产环境启动

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║                                               ║
echo  ║       🎮 Idle Collective - 生产模式 🎮        ║
echo  ║                                               ║
echo  ╚═══════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo  正在构建游戏...
echo.

call npm run build

if %errorlevel% neq 0 (
    echo.
    echo  [错误] 构建失败
    pause
    exit /b 1
)

echo.
echo  [√] 构建完成
echo.
echo  正在启动游戏...
echo.

call npm start

if %errorlevel% neq 0 (
    echo.
    echo  [错误] 启动失败
    pause
)
