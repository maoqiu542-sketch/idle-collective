@echo off
chcp 65001 >nul
title Idle Collective - Package

echo.
echo  =====================================================
echo.
echo       Idle Collective - Package & Release
echo.
echo  =====================================================
echo.

cd /d "%~dp0"

echo  Packaging game...
echo  This may take a few minutes...
echo.

call npm run package

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Package failed
    pause
    exit /b 1
)

echo.
echo  [OK] Package completed!
echo  Executable is in release directory
echo.
pause
