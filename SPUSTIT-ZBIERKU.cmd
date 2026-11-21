@echo off
setlocal
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js nie je dostupny. Nic sa nemenilo.
  pause
  exit /b 1
)
node "%~dp0scripts\collection-assistant.mjs"
set "NUMIS_RESULT=%ERRORLEVEL%"
echo.
echo Toto je sukromny lokalny archiv. Identita a ocenenie zostavaju blokovane.
pause
exit /b %NUMIS_RESULT%
