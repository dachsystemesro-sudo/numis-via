@echo off
setlocal
cd /d "%SystemRoot%" 2>nul
where node.exe >nul 2>nul
if errorlevel 1 (
  echo ZASTAVENE: Node.js nie je dostupny. Nic sa nezmenilo.
  pause
  exit /b 1
)
node "%~dp0SPUSTIT.mjs"
set "NUMIS_RESULT=%ERRORLEVEL%"
echo.
echo Vypis si mozete precitat. Fotografie ani source-map.json nezverejnujte.
pause
exit /b %NUMIS_RESULT%
