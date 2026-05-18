@echo off
chcp 65001 >nul
title Idle Collective - Build and Run

echo.
echo  =====================================================
echo.
echo       Idle Collective - Production Build
echo.
echo  =====================================================
echo.

cd /d "%~dp0"

echo  Building game...
echo.

call npm run build

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo  [OK] Build completed
echo.

REM Check if it's a development build or production
echo  Starting game...
echo.

call npm run dev:electron

pause
