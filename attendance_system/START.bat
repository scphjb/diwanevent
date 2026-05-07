@echo off
title Diwan Event Manager
echo ==================================================
echo         Diwan Event Manager
echo ==================================================
echo.

:: 1. Start the Python server
echo [1/3] Starting server...
cd /d D:\diwan_event\attendance_system
start /min "Attendance Server" python main.py
timeout /t 3 /nobreak >nul

:: 2. Start Cloudflare Tunnel
echo [2/3] Starting Cloudflare tunnel...
start /min "Cloudflare Tunnel" cloudflared tunnel run
timeout /t 3 /nobreak >nul

:: 3. Open the admin page
echo [3/3] Opening admin panel...
start http://localhost:8000/admin

echo.
echo ==================================================
echo   System is running!
echo.
echo   LOCAL:
echo     Admin:     http://localhost:8000/admin
echo     Scanner:   http://localhost:8000/scanner
echo     Dashboard: http://localhost:8000/dashboard
echo.
echo   EXTERNAL (HTTPS):
echo     Scanner:   https://attendance.e-diwan.net/scanner
echo     Admin:     https://attendance.e-diwan.net/admin
echo     Dashboard: https://attendance.e-diwan.net/dashboard
echo.
echo   Password: 2026
echo ==================================================
echo.
echo   DO NOT CLOSE THIS WINDOW!
echo   Press any key to STOP the system...
echo.
pause >nul

:: Cleanup on exit
echo Stopping system...
taskkill /F /IM python3.13.exe 2>nul
taskkill /F /IM cloudflared.exe 2>nul
echo System stopped.
pause
