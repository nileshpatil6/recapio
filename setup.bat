@echo off
title VoiceNotes AI - Setup
color 0B
echo ==========================================
echo   VoiceNotes AI (Electron) - Setup
echo ==========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org  (LTS version recommended)
    echo Make sure to check "Add to PATH" during installation.
    pause
    exit /b 1
)
echo [OK] Node.js found: 
node --version

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Please reinstall Node.js.
    pause
    exit /b 1
)
echo [OK] npm found.

echo.
echo Installing dependencies...
echo (This downloads Electron and may take 1-2 minutes)
echo.

call npm install

if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    echo Try running this window as Administrator.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo How to run:
echo   Double-click run.bat
echo.
echo First steps:
echo   1. The floating bar appears in the bottom-right corner
echo   2. Click [+] or press Win+Shift+N to open the main window
echo   3. Go to Settings and paste your FREE Gemini API key
echo   4. Get your key at: https://aistudio.google.com/app/apikey
echo.
echo System audio (calls, apps):
echo   - Enable "Stereo Mix" in Windows Sound settings (Recording tab)
echo   - OR install free VB-Cable from vb-audio.com
echo.
pause
