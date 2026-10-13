@echo off
rem SportsLeague: detiene todos los contenedores. Los datos (bases de datos) se conservan.
cd /d "%~dp0"
echo Deteniendo SportsLeague...
docker compose down
echo.
echo Listo. Para borrar tambien las bases de datos y empezar de cero: docker compose down -v
echo.
pause
