@echo off
chcp 65001 >nul
title Idle Collective - 打包发布

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║                                               ║
echo  ║       🎮 Idle Collective - 打包发布 🎮        ║
echo  ║                                               ║
echo  ╚═══════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo  正在打包游戏...
echo  这可能需要几分钟时间...
echo.

call npm run package

if %errorlevel% neq 0 (
    echo.
    echo  [错误] 打包失败
    pause
    exit /b 1
)

echo.
echo  [√] 打包完成！
echo  可执行文件位于 release 目录
echo.
pause
