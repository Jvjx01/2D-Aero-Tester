@echo off
echo ==========================================
echo   Wind Tunnel Aero Tester - Launcher
echo ==========================================

echo [1/4] Starting MongoDB...
start "MongoDB" mongod --dbpath="C:\data\db"

echo [2/4] Starting Backend Server...
cd server
start "Wind Tunnel Server" npm start

echo [3/4] Starting Client...
cd ../client
start "Wind Tunnel Client" npm run dev

echo [4/4] Opening Browser...
timeout /t 5 >nul
start http://localhost:5173

echo ==========================================
echo   Launched! Check the opened windows.
echo ==========================================
pause
