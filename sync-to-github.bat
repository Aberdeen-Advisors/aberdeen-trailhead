@echo off
REM Sync this folder to main on github.com/Aberdeen-Advisors/aberdeen-trailhead
cd /d "%~dp0"

echo Staging and committing...
git add -A
git commit -m "HorizonView update %date% %time%"

echo Pulling latest main...
git pull --rebase origin main
if errorlevel 1 (
    echo.
    echo Pull failed - resolve conflicts, then run: git rebase --continue
    pause
    exit /b 1
)

echo Pushing to main...
git push origin HEAD:main
if errorlevel 1 (
    echo.
    echo Push failed. Check your GitHub sign-in and write access.
    pause
    exit /b 1
)

echo.
echo Done - main is up to date.
pause
