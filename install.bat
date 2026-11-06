@echo off
echo ============================================================
echo Installing PDF Editor Backend and Frontend Dependencies
echo ============================================================
echo.

echo [1/2] Installing Python backend packages...
python -m pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies. Please check Python installation.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Installing React frontend npm packages...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install npm packages. Please check Node.js installation.
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ============================================================
echo Installation Completed Successfully!
echo You can now start the application using: run.bat
echo ============================================================
pause

