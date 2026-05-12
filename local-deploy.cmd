@echo off
setlocal
cd /d "%~dp0"

echo Starting local production preview...
echo.
echo (If it's the first run, dependencies will be installed.)
echo.

call npm run local

echo.
echo Server stopped.
pause

