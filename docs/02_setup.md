# Setup

## Requirements
- Windows (폴더 열기 / 드라이브 브라우저 기능)
- Python 3.11+ (개발 확인: 3.14)
- FastAPI, uvicorn[standard], pymupdf — `requirements.txt`

## Run
```powershell
run.bat                     # 최초: venv 생성 + 설치 + 실행

# 수동 실행
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```
- 포트: 5000~6000 중 빈 포트 자동 선택 후 브라우저 자동 오픈.

## 단일 exe 빌드
```powershell
build_exe.bat            # PyInstaller --onefile 로 dist\폴더관리Dashboard.exe 생성
```
- 산출물: `dist\폴더관리Dashboard.exe` (약 17MB, Python 설치 없이 실행)
- exe 더블클릭 → 포트 자동 선택 + 브라우저 자동 오픈. 콘솔 창에서 `Ctrl+C` 로 종료.
- `config.json`(등록 폴더)은 **exe 와 같은 폴더**에 저장되어 재실행해도 유지됨.
- 내부: `static/` 은 exe 에 번들, uvicorn 은 `http=h11`/`ws=none` 로 고정.
- `build/`, `dist/`, `*.spec` 은 빌드 산출물이라 Git 에 포함하지 않는다(소스로 재빌드).

## Notes
- Pretendard `woff2` 폰트를 `static/fonts/` 에 넣으면 정확한 폰트 적용(없으면 시스템 sans-serif 폴백).
- `config.json` 은 실행 시 자동 생성되며 등록 폴더 목록을 저장(Git 미포함).
- 로고를 다시 만들려면 `NUMP 일러스트.ai` 를 PyMuPDF 로 PNG 변환:
  ```python
  import fitz
  doc = fitz.open("NUMP 일러스트.ai")
  page = doc[0]; r = page.rect
  mat = fitz.Matrix(512 / max(r.width, r.height), 512 / max(r.width, r.height))
  page.get_pixmap(matrix=mat, alpha=True).save("static/nump_logo.png")
  ```
