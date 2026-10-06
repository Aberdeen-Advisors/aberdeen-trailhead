@echo off
setlocal
title trAIlhead - one-time setup
cd /d "%~dp0"
set "REPO=https://github.com/Aberdeen-Advisors/aberdeen-trailhead.git"

echo ============================================================
echo   trAIlhead / HorizonView - one-time local setup
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node.js is not installed.
  echo     Install the LTS version from https://nodejs.org and run this again.
  goto :fail
)
for /f "delims=" %%v in ('node -v') do set "NODEVER=%%v"
echo [OK] Node.js %NODEVER%

where git >nul 2>&1
if errorlevel 1 (
  echo [X] Git is not installed.
  echo     Install it from https://git-scm.com/download/win and run this again.
  goto :fail
)
echo [OK] Git found
echo.

if exist ".git\" (
  echo [OK] This folder is already connected to GitHub.
  goto :install
)

echo This folder is not connected to GitHub yet - it looks like a ZIP download.
echo Connecting it to %REPO%
echo A GitHub sign-in window may pop up.
echo.
git init -q -b main
git remote add origin %REPO%
git fetch origin main
if errorlevel 1 (
  echo.
  echo [X] Could not reach the GitHub repo. Check your sign-in and access.
  rmdir /s /q .git
  goto :fail
)
REM Point at GitHub's history WITHOUT touching any files yet.
git reset -q origin/main
git branch -q --set-upstream-to=origin/main main

set "DIFF="
for /f %%f in ('git status --porcelain') do set "DIFF=1"
if not defined DIFF (
  echo [OK] Your files already match GitHub.
  goto :install
)

echo.
echo These files in this folder differ from what is on GitHub:
git status --short
echo.
echo   G = Use the GitHub version - recommended if you have not edited anything yet
echo   K = Keep my local files and push them later
choice /c GK /m "Which do you want"
if errorlevel 2 goto :install
git reset -q --hard origin/main
echo [OK] Folder now matches GitHub.

:install
echo.
echo Installing packages - the first time takes a few minutes...
call npm install
if errorlevel 1 (
  echo [X] npm install failed - see the errors above.
  goto :fail
)
echo.
echo ============================================================
echo   Setup complete. Double-click start-local.bat to run the site.
echo ============================================================
pause
exit /b 0

:fail
echo.
echo Setup did not finish.
pause
exit /b 1
