@echo off
chcp 65001 >nul
title Idle Collective - Dev Launcher

echo.
echo  ============================================================
echo.
echo           Idle Collective - Dev Environment Launcher
echo.
echo  ============================================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found
    echo  Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  [INFO] First time running, installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo  Starting dev server and Electron...
echo  Press Ctrl+C to stop
echo.
echo  ============================================================
echo.

npx concurrently -k "npm run dev" "npx wait-on http://localhost:3000 && npx electron ."

pause
