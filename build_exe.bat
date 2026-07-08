@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM 단일 exe 빌드 (dist\폴더관리Dashboard.exe)
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)
.venv\Scripts\python.exe -m pip install --quiet pyinstaller pillow

REM 로고 -> 아이콘 (없으면 생성)
if not exist "app.ico" (
  .venv\Scripts\python.exe -c "from PIL import Image; im=Image.open('static/nump_logo.png').convert('RGBA'); s=max(im.size); c=Image.new('RGBA',(s,s),(255,255,255,0)); c.paste(im,((s-im.size[0])//2,(s-im.size[1])//2),im); c.save('app.ico',sizes=[(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)])"
)

.venv\Scripts\pyinstaller --noconfirm --onefile --clean ^
  --name "폴더관리Dashboard" ^
  --icon app.ico ^
  --add-data "static;static" ^
  --collect-submodules uvicorn ^
  --hidden-import h11 ^
  --hidden-import anyio ^
  app.py

echo.
echo   빌드 완료: dist\폴더관리Dashboard.exe
pause
