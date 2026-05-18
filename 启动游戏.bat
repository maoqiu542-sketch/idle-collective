@echo off
chcp 65001 >nul
title Idle Collective - 游戏启动器

echo.
echo  =====================================================
echo.
echo       Idle Collective 启动器
echo.
echo  =====================================================
echo.
echo  Checking environment...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Please install Node.js first.
    echo  Download: https://nodejs.org/
    pause
    exit /b 1
)

echo  [OK] Node.js is installed
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo  [INFO] First time running, installing dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed
    echo.
)

echo  Starting game...
echo.
echo  =====================================================
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Failed to start game
    pause
)
