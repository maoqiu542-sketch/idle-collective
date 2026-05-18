@echo off
chcp 65001 >nul
title Idle Collective - Online Launcher

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-online-dev.ps1"

if %errorlevel% neq 0 (
    echo.
    echo Launcher exited with an error.
    pause
)
