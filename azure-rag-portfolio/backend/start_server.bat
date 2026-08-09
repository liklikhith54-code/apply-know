@echo off
cd /d "%~dp0.."
echo ===================================================
echo      STARTING AZURE AI + RAG FASTAPI BACKEND
echo ===================================================
echo.
echo Launching Uvicorn server on port 8000...
python -m uvicorn backend.main:app --port 8000 --reload
echo.
pause
