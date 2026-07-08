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
