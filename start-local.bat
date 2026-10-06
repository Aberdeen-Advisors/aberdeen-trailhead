@echo off
setlocal
title trAIlhead - local dev server
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed - run setup-local.bat first.
  pause
  exit /b 1
)
if not exist "node_modules\" (
  echo Packages not installed yet - running npm install...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

REM Stop any server left running from an earlier start, so this one gets port 3000.
if exist "stop-local.bat" call stop-local.bat quiet

REM A raw "vercel env pull" writes [SENSITIVE] placeholders that would make the app
REM try to use fake keys. Move such a file aside so local demo keeps working.
if exist ".env.local" (
  findstr /l /c:"[SENSITIVE]" .env.local >nul
  if not errorlevel 1 (
    move /y ".env.local" ".env.vercel-pull" >nul
    echo NOTE: .env.local had hidden [SENSITIVE] values from Vercel.
    echo       Renamed it to .env.vercel-pull so it is not used.
    echo.
  )
)

REM Default = DEMO mode, no Microsoft sign-in. Your Vercel env vars are never touched.
REM If .env.local has real Power BI settings, Project Elevate is shown too, still
REM without sign-in. "start-local.bat sample" = sample projects only.
REM "start-local.bat live" = full live mode, including Microsoft sign-in.
if /i "%~1"=="live" goto :live
set "HV_MODE=demo"
if /i "%~1"=="sample" goto :sample
if not exist ".env.local" goto :sample
findstr /b /c:"POWERBI_CLIENT_SECRET=" .env.local | findstr /v /x /c:"POWERBI_CLIENT_SECRET=" /c:"POWERBI_CLIENT_SECRET=\"\"" >nul
if errorlevel 1 goto :sample
set "HV_LOCAL_LIVE_DATA=true"
echo Running with REAL Power BI data from .env.local - no sign-in needed.
goto :run

:sample
echo Running in DEMO mode - sample projects only, no sign-in needed.
goto :run

:live
if not exist ".env.local" (
  echo No .env.local file found - live mode needs one.
  pause
  exit /b 1
)
echo Running with the settings in .env.local

:run
echo.
echo   Public site : http://localhost:3000
echo   Portal      : http://localhost:3000/portal
echo.
echo   Save a file and the page updates by itself.
echo   For public\home.html and public\css\styles.css, refresh the browser.
echo   Close this window or press Ctrl+C to stop the server.
echo.
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"
call npm run dev
pause
