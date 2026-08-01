@echo off
title VoiceNotes AI
cd /d "%~dp0"
npx electron .
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start. Did you run setup.bat first?
    pause
)
