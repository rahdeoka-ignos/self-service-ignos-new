@echo off
title Self-Service Ignos Launcher
cd /d "%~dp0"

echo ====================================================
echo   Menjalankan Self-Service Ignos...
echo   1. Backend Server : node server.js
echo   2. Frontend Dev   : npm run dev
echo ====================================================
echo.

:: Menjalankan Backend Server di jendela terpisah
start "Ignos - Backend Server" cmd /k "node server.js"

:: Menjalankan Frontend Dev (Vite) di jendela terpisah
start "Ignos - Frontend Dev" cmd /k "npm run dev"

timeout /t 2 >nul
exit
