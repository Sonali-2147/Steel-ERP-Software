@echo off
cd /d "%~dp0"
echo Starting Steel ERP...
echo.
echo Please wait while the server starts...
echo.
node start-app.mjs
pause
