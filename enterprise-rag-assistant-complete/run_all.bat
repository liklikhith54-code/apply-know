@echo off
cd /d "%~dp0"
echo ===================================================
echo      LAUNCHING ENTERPRISE RAG KNOWLEDGE ASSISTANT (COMPLETE)
echo ===================================================
echo.

echo 1. Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Enterprise RAG Assistant" cmd /k "python -m uvicorn app.main:app --port 8000 --reload"

echo 2. Opening web browser to the playground...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:8000/

echo.
echo ===================================================
echo      ALL SYSTEMS ONLINE! 🚀
echo ===================================================
echo.
echo Note: Keep the command prompt window open while testing.
echo.
pause
