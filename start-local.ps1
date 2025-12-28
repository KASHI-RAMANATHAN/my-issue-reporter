Write-Host "Starting Campus Issue Reporter Application..." -ForegroundColor Green
Write-Host ""
Write-Host "Opening two terminals:" -ForegroundColor Cyan
Write-Host "  1. Backend server (http://localhost:8000)" -ForegroundColor Yellow
Write-Host "  2. Frontend dev server (http://localhost:3000)" -ForegroundColor Yellow
Write-Host ""

Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend Dev Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm start"

Write-Host ""
Write-Host "Both servers should now be starting in new windows..." -ForegroundColor Green
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend API will be available at: http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "Note: You may need to set MongoDB connection string in backend/.env" -ForegroundColor Yellow
Write-Host "Current setting: MONGO_URL=mongodb://localhost:27017" -ForegroundColor Yellow
