@echo off
cd /d "%~dp0"
echo ===================================================
echo      LAUNCHING FULL-STACK RAG PORTFOLIO APPLICATION
echo ===================================================
echo.

echo 1. Starting FastAPI Backend on port 8000...
start "Azure RAG Backend Server" cmd /k "python -m uvicorn backend.main:app --port 8000 --reload"

echo 2. Starting React Vite Frontend...
start "Azure RAG Frontend Dev" cmd /k "cd frontend && npm run dev"

echo 3. Opening web browser to the dashboard...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:5173

echo.
echo ===================================================
echo      ALL SYSTEMS ONLINE! 🚀
echo =================================================5
echo.
echo Note: Keep both command prompts open while testing.
echo.
pause
