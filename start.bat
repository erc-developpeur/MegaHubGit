@echo off
title MegaHubGit Launcher
color 0A

echo.
echo  ====================================
echo   MegaHubGit - Local Git Dashboard
echo  ====================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download it from: https://nodejs.org
    pause
    exit /b 1
)

:: Install backend deps if needed
if not exist "backend\node_modules" (
    echo [1/2] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
)

:: Install frontend deps if needed
if not exist "frontend\node_modules" (
    echo [2/2] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
)

echo  Starting MegaHubGit...
echo.
echo  Backend  -> http://localhost:3001
echo  Frontend -> http://localhost:5173
echo.
echo  Opening browser in 3 seconds...
echo.

:: Start backend in background
start "MegaHubGit Backend" /min cmd /c "cd backend && npm start"

:: Wait a moment for backend to boot
timeout /t 2 /nobreak >nul

:: Open browser
start http://localhost:5173

:: Start frontend (visible window)
cd frontend
npm run dev

pause
