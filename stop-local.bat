@echo off
setlocal EnableDelayedExpansion
title trAIlhead - stop local server
cd /d "%~dp0"

REM Stops any local dev server on ports 3000-3009 (Node.js only).
set "FOUND="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":300[0-9] .*LISTENING"') do (
  tasklist /fi "PID eq %%p" /fi "IMAGENAME eq node.exe" 2>nul | findstr /i "node.exe" >nul
  if not errorlevel 1 (
    taskkill /f /t /pid %%p >nul 2>&1
    if not errorlevel 1 (
      echo Stopped local server - process %%p
      set "FOUND=1"
    )
  )
)
if not defined FOUND echo No local server was running.

if /i not "%~1"=="quiet" pause
