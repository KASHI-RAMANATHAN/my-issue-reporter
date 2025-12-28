@echo off
echo Starting Campus Issue Reporter Application...
echo.
echo Opening two terminals:
echo  1. Backend server (http://localhost:8000)
echo  2. Frontend dev server (http://localhost:3000)
echo.
echo Backend Terminal:
start cmd /k "cd backend && python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000"
echo.
timeout /t 3
echo Frontend Terminal:
start cmd /k "cd frontend && npm start"
echo.
echo Both servers should now be running. Check the opened terminals for status.
echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:8000
