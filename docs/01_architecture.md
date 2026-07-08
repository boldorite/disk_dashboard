# Architecture

## Components
- `app.py`: FastAPI 백엔드. 폴더 재귀 스캔, 인메모리 캐시, 폴더 열기, 정적 파일 서빙, 포트 자동 선택.
- `static/index.html`, `static/style.css`, `static/app.js`: 프론트엔드(순수 HTML/CSS/JS).
- `static/nump_logo.png`: `NUMP 일러스트.ai`(PDF 호환)를 PyMuPDF로 변환한 로고.
- `config.json`: 등록 폴더 목록(로컬 자동 생성, Git 미포함).
- `run.bat`: venv 생성 + 패키지 설치 + 실행 런처.

## API
- `GET /` : 대시보드 HTML
- `GET /api/folders`, `POST /api/folders`, `DELETE /api/folders` : 등록 폴더 조회/추가/삭제
- `POST /api/reset` : 완전초기화(등록 폴더·캐시 삭제)
- `POST /api/refresh` : 갱신(캐시 비우기)
- `GET /api/tree` : depth 제한 트리 + `drive_total`(드라이브 전체 용량)
- `GET /api/subtree` : 캐시 기반 하위 노드 지연 로딩
- `GET /api/browse` : 드라이브/폴더 브라우저(폴더 선택용)
- `POST /api/open` : Windows 탐색기에서 폴더 열기 + 창 최전면

## Data Flow
등록 폴더 → `scan_dir` 재귀 스캔(파일수/용량, `os.scandir` 캐시 stat) → 인메모리 캐시 → `trim_tree(depth)` → 프론트 렌더. 하위 노드는 클릭 시 `/api/subtree` 로 캐시에서 즉시 로딩.

## Design
- 컬러스킴/폰트/로고는 `yonsei_design_claude.md` 기준(다크 기본 + 라이트 토글, Pretendard 로컬 폰트).
- 막대바 분모는 디스크 전체 용량 또는 상위 폴더 크기 중 토글.
