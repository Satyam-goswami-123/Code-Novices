@echo off
cd /d "%~dp0"
start "Abhedya Backend" powershell -NoExit -Command "cd backend; .\.venv\Scripts\Activate.ps1; python run.py"
start "1st Project Backend" powershell -NoExit -Command "cd ..\1st\1st\backend; python run.py"
timeout /t 2 /nobreak >nul
start "Abhedya Frontend" powershell -NoExit -Command "cd frontend; npm run dev"
start "1st Project Frontend" powershell -NoExit -Command "cd ..\1st\1st\frontend; npm run dev"
timeout /t 5 /nobreak >nul
start http://localhost:5173
echo Started. Login: inspector / inspector123
