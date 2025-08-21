@echo off
title DataVizAI Executable Builder

echo ===============================================
echo    DataVizAI Executable Builder
echo ===============================================
echo.

echo Step 1: Installing PyInstaller...
pip install pyinstaller
echo.

echo Step 2: Installing project requirements...
pip install -r requirements_all.txt
echo.

echo Step 3: Cleaning previous builds...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist
echo.

echo Step 4: Building executable...
echo This may take several minutes...
pyinstaller --clean DataVizAI_Launcher.spec
echo.

if exist "dist\DataVizAI_Launcher.exe" (
    echo ===============================================
    echo    BUILD SUCCESSFUL!
    echo ===============================================
    echo.
    echo Executable created: dist\DataVizAI_Launcher.exe
    
    echo.
    echo Creating launcher script...
    echo @echo off > dist\launch_datavizai.bat
    echo title DataVizAI Services >> dist\launch_datavizai.bat
    echo echo Starting DataVizAI Services... >> dist\launch_datavizai.bat
    echo echo. >> dist\launch_datavizai.bat
    echo echo Services will be available at: >> dist\launch_datavizai.bat
    echo echo - ML Backend: http://localhost:5000 >> dist\launch_datavizai.bat
    echo echo - Data Quality: http://localhost:1289 >> dist\launch_datavizai.bat
    echo echo - Data Preprocessing: http://localhost:1290 >> dist\launch_datavizai.bat
    echo echo - GANs Service: http://localhost:4321 >> dist\launch_datavizai.bat
    echo echo. >> dist\launch_datavizai.bat
    echo echo Press Ctrl+C to stop all services >> dist\launch_datavizai.bat
    echo echo. >> dist\launch_datavizai.bat
    echo DataVizAI_Launcher.exe >> dist\launch_datavizai.bat
    echo pause >> dist\launch_datavizai.bat
    
    echo.
    echo Files created in dist folder:
    dir dist
    echo.
    echo ===============================================
    echo    DISTRIBUTION READY!
    echo ===============================================
    echo.
    echo You can now:
    echo 1. Copy the 'dist' folder to any Windows computer
    echo 2. Run 'launch_datavizai.bat' to start all services
    echo 3. Or run 'DataVizAI_Launcher.exe' directly
    echo.
) else (
    echo ===============================================
    echo    BUILD FAILED!
    echo ===============================================
    echo.
    echo Please check the error messages above.
)

pause