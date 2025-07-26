@echo off
echo Starting ML Backend Server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ and add it to your PATH
    pause
    exit /b 1
)

REM Navigate to ml_backend directory
if not exist "ml_backend" (
    echo Error: ml_backend directory not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

cd ml_backend

REM Check if requirements are installed
echo Checking dependencies...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Start the Flask app
echo.
echo Starting Flask server on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
python app.py

pause
