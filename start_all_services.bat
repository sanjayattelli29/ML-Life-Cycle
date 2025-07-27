@echo off
echo ========================================
echo  Data-VizAI Combined Services Launcher
echo ========================================
echo.

REM Change to the script directory
cd /d "%~dp0"

echo Starting all Flask services...
echo.

REM Start ML Backend (port 5000)
echo [1/3] Starting ML Backend on port 5000...
start "ML Backend" /min cmd /k "cd src\python-codes\ml_backend && python app.py"
timeout /t 3 /nobreak >nul

REM Start Data Quality Metrics (port 1289)
echo [2/3] Starting Data Quality Metrics on port 1289...
start "Data Quality" /min cmd /k "cd src\python-codes\metric-quality && python app.py"
timeout /t 3 /nobreak >nul

REM Start Data Preprocessing (port 1290)
echo [3/3] Starting Data Preprocessing on port 1290...
start "Data Preprocessing" /min cmd /k "cd src\python-codes\pre-processing && python preprocessing_api.py"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All services are starting...
echo ========================================
echo.
echo Service Endpoints:
echo  ML Backend:          http://localhost:5000
echo  Data Quality:        http://localhost:1289
echo  Data Preprocessing:  http://localhost:1290
echo.
echo Check the individual console windows for service status.
echo Close the console windows to stop the services.
echo.
pause
