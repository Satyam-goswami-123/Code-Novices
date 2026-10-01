# One-click launcher for KSP SCRB AI
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting KSP SCRB AI..." -ForegroundColor Cyan

# Backend
Start-Process powershell -ArgumentList "-NoExit","-Command",
  "cd '$root\backend'; .\.venv\Scripts\Activate.ps1; python run.py"

Start-Sleep -Seconds 2

# Frontend
Start-Process powershell -ArgumentList "-NoExit","-Command",
  "cd '$root\frontend'; npm run dev"

Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"

Write-Host "Backend -> http://localhost:8000 (docs at /docs)" -ForegroundColor Green
Write-Host "Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host "Login: inspector / inspector123" -ForegroundColor Yellow
