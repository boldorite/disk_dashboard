@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [setup] creating venv...
  python -m venv .venv
  .venv\Scripts\python.exe -m pip install --upgrade pip
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)

echo.
echo   폴더관리 Dashboard 시작...  (브라우저는 자동으로 열립니다)
echo.

.venv\Scripts\python.exe app.py
pause
