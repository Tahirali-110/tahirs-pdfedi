@echo off
echo ============================================================
echo Launching Adobe Acrobat Studio PDF Editor
echo ============================================================
echo.
echo Starting FastAPI Backend in a new window...
start "PDF Editor - Backend (FastAPI)" cmd /c "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting React Frontend in a new window...
start "PDF Editor - Frontend (Vite)" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo Both services are starting!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
echo Done!

