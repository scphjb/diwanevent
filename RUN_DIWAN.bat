@echo off
title Diwan Event Enterprise - Orchestrator
color 0A

echo ====================================================
echo    DIWAN EVENT ENTERPRISE - MODERN ARCHITECTURE
echo ====================================================
echo.

:: 1. Start Unified Backend (API + Webhooks + Hardware Gateway)
echo [1/2] Launching Unified Backend (FastAPI)...
start "Diwan Backend" cmd /k "cd attendance_system && venv\Scripts\activate && uvicorn app.main:app --reload --reload-dir app --port 8000"

:: 2. Start Frontend Dashboard
echo [2/2] Launching Dashboard (Vite)...
start "Diwan Dashboard" cmd /k "cd dashboard && npm run dev"

echo.
echo ----------------------------------------------------
echo ALL SYSTEMS ARE RUNNING ON UNIFIED FASTAPI CORE.
echo API: http://localhost:8000
echo Dashboard: http://localhost:5173
echo Hardware Gateway: ws://localhost:8000/api/v1/hardware/ws
echo ----------------------------------------------------
pause
