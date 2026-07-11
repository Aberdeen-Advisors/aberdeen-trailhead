@echo off
setlocal
REM ── Push HorizonView portal to github.com/Aberdeen-Advisors/aberdeen-trailhead ──
REM Safe to run repeatedly: first run initializes the repo and force-pushes
REM (replacing the old static-site history); later runs do a normal push.

cd /d "%~dp0"

set FIRSTPUSH=0

REM If .git is missing or broken (bad config from earlier attempt), start fresh.
git status >nul 2>&1
if errorlevel 1 (
    echo Initializing fresh git repository...
    if exist ".git" rmdir /s /q ".git"
    git init -b main
    git remote add origin https://github.com/Aberdeen-Advisors/aberdeen-trailhead.git
    set FIRSTPUSH=1
)

echo Staging changes...
git add -A

REM Commit only if there is something to commit.
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "HorizonView portal update %date% %time%"
) else (
    echo Nothing new to commit.
)

if "%FIRSTPUSH%"=="1" (
    echo First push: replacing old repo contents...
    git push -u origin main --force
) else (
    echo Syncing with GitHub first...
    git pull --rebase origin main
    git push origin main
)

if errorlevel 1 (
    echo.
    echo Push failed. Check your GitHub sign-in and that you have write access
    echo to Aberdeen-Advisors/aberdeen-trailhead.
) else (
    echo.
    echo Done. Vercel should pick up the deploy automatically.
)
pause
endlocal
