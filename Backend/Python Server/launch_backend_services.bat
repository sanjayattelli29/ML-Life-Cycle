@echo off
REM Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
	echo Python is not installed or not added to PATH. Please install Python 3.12+ and add it to your system PATH.
	pause
	exit /b
)

REM Install requirements
echo Installing Python requirements...
python -m pip install -r "python-codes-b\requirements_all.txt"
if %errorlevel% neq 0 (
	echo Failed to install requirements. Please check the error messages above.
	pause
	exit /b
)

REM Launch DataVizAI backend services
echo Starting backend services...
start "" /min python "python-codes-b\run_all_services_exe.py"
echo Successfully backend is executed with endpoints, please check these endpoints.
echo.
REM Wait 15 seconds for services to start
timeout /t 15 /nobreak >nul
echo Opening dashboard in browser...
start "" "https://ml-life-cycle.netlify.app/dashboard"
echo.
echo If you see any errors above, please resolve them and run again.
pause
exit /b
