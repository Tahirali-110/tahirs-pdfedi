@echo off
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause

