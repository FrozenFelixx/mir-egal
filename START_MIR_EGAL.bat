@echo off
chcp 65001 >nul
title MIR EGAL - Game Server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js ist nicht installiert.
  echo Bitte Node.js LTS von https://nodejs.org herunterladen und installieren.
  echo Danach diese Datei erneut starten.
  echo.
  pause
  exit /b 1
)
echo.
echo ============================================
echo   MIR EGAL - Multiplayer Game Server
echo ============================================
echo.
echo Nach dem Start im Browser oeffnen:
echo     http://localhost:3000
 echo.
echo Dieses Fenster offen lassen, solange ihr spielt.
echo.
start "" "http://localhost:3000"
node server.js
if errorlevel 1 (
  echo.
  echo Der Server wurde unerwartet beendet.
  pause
)
