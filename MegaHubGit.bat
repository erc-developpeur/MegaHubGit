@echo off
title MegaHubGit - Professional Launcher
color 0B
setlocal enabledelayedexpansion

echo.
echo  ############################################
echo  #                                          #
echo  #   🚀 MegaHubGit : Local Dashboard        #
echo  #                                          #
echo  ############################################
echo.

:: 1. Killing old processes to avoid EADDRINUSE
echo [!] Cleaning up old instances...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: 2. Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js missing! Download it at https://nodejs.org
    pause
    exit /b 1
)

:: 3. Backend Setup & Run
echo [1/2] Starting Backend (Port 3001)...
if not exist "backend\node_modules" (
    echo [!] Installing backend dependencies...
    cd backend && call npm install && cd ..
)
start "MegaHubGit-API" /min cmd /c "cd backend && npm start"

:: 4. Frontend Setup & Run
echo [2/2] Starting Frontend (Port 5173)...
if not exist "frontend\node_modules" (
    echo [!] Installing frontend dependencies...
    cd frontend && call npm install && cd ..
)

:: Wait for backend to be ready
timeout /t 2 /nobreak >nul

:: Try to open browser
echo.
echo [✓] System ready! Opening browser...
start http://localhost:5173

echo.
echo --------------------------------------------
echo  DASHBOARD IS RUNNING
echo  Press Ctrl+C in this window to stop.
echo --------------------------------------------
echo.

cd frontend
npm run dev

pause
