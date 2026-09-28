@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Enable Chrome AI (Windows)

echo ==========================================
echo       正在启用 Chrome Gemini AI 功能
echo ==========================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    node "%~dp0enable-chrome-ai-win.js"
) else (
    echo 未检测到 Node.js，正在尝试使用 PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0enable-chrome-ai.ps1"
)

echo.
pause
