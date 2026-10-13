@echo off
rem SportsLeague: doble clic para construir, arrancar y cargar la demo (requiere Docker Desktop).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1" %*
echo.
pause
