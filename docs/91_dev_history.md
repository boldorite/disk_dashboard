# Dev History

## Summary
- Project: 디스크 폴더관리 대시보드 (disk_dashboard)
- Current status: active (role: deploy)
- Last updated: 2026-07-08
- Machine: changjo-pc (창조관 사무실 Dell PC / PHYSICS 계정)
- Main outcome: FastAPI 기반 폴더관리 대시보드 구현, CHO Wiki 표준 구조 편입
- 원본 dev history: 본 파일

## Timeline

### 2026-07-08 초기 구현 및 CHO Wiki 편입
#### User Request
- 폴더관리 버튼 → 폴더선택관리 창, 그 폴더와 이하 폴더의 폴더트리/파일수/전체용량을 보여주는 대시보드
- FastAPI, 포트 5000~6000, 완전초기화·갱신, `yonsei_design_claude.md` 컬러스킴, 제목 "폴더관리 Dashboard"
- 로고는 `NUMP 일러스트.ai` 사용, 폴더 탐색/갱신 속도 우선
- 다중 선택(체크박스 · Ctrl-클릭 · Shift-클릭), 막대바 기준(디스크 전체 / 상위폴더), 폴더 클릭 시 탐색기 열기(창 최전면)
- 레이아웃 정리(막대 기준·상태 텍스트 헤더로, 요약 한 줄 박스, 로고 크기, 여백 최소화)
- CHO Wiki 표준 구조 세팅

#### Work Done
- FastAPI 백엔드(`app.py`): 폴더 재귀 스캔/캐시, `/api/folders·tree·subtree·browse·reset·refresh·open`, 포트 자동 선택, 브라우저 자동 오픈
- 프론트(`static/`): 폴더트리(접기/펼치기, 고정 컬럼 정렬), 막대바 기준 토글, 다중 선택 모달, 요약 한 줄 박스, 헤더 정리
- 로고: `NUMP 일러스트.ai`(PDF 호환) → PyMuPDF 로 `static/nump_logo.png` 변환
- 폴더 열기: `explorer` + ctypes 로 창 최전면 처리(Windows)
- CHO Wiki 표준 구조 편입: `.llmwiki`, `README.md`, `docs/*`, `.gitignore`

#### Files Changed
- `app.py`, `static/index.html`, `static/style.css`, `static/app.js`, `static/nump_logo.png`
- `requirements.txt`, `run.bat`
- `.llmwiki`, `README.md`, `docs/*`, `.gitignore`

#### Decisions
- 스캔 속도 우선(캐시 + depth 제한 + 지연 로딩)
- 막대바 기준 토글(디스크 / 상위폴더)
- 로고 `.ai` → PNG 변환
- `config.json` Git 제외

#### Problems
- 초대형 폴더 최초 스캔 지연 → 캐시/지연 로딩으로 완화
- Pretendard 폰트 원본 부재 → 시스템 폰트 폴백
- Windows 콘솔 한글 인코딩(cp1252) → stdout UTF-8 재설정

#### Next Actions
- 실제 직원 PC(changjo-PC)에서 배포/실행 검증
- 완료 조건 최종 확정, 필요 시 단일 exe 패키징 검토

### 2026-07-08 폴더 열기 개선 및 단일 exe 패키징
#### User Request
- 폴더 열기 시 탐색기 창이 브라우저 뒤로 가지 않고 꼭 맨 앞에 뜨게 해달라
- 단일 exe 1개로 만들어달라

#### Work Done
- 폴더 열기(`/api/open`) 최전면 로직 강화: 최소화→복원 + 잠깐 topmost 토글 + AttachThreadInput, best-effort 처리(앞으로 가져오기 실패해도 열기는 성공)
- PyInstaller `--onefile` 로 단일 exe 빌드(`dist/폴더관리Dashboard.exe`, 약 17MB)
  - frozen 대응: `static/` 은 `sys._MEIPASS` 번들에서 읽고, `config.json` 은 exe 옆에 저장(재실행 유지)
  - 안정성 위해 uvicorn `http="h11"`, `ws="none"` 로 고정(네이티브 의존 제거)
  - 로고(`static/nump_logo.png`) → `app.ico` 변환해 exe 아이콘 적용
  - `build_exe.bat` 빌드 스크립트 추가
- exe 실행 검증: 포트 자동 선택, 페이지·정적·폴더 스캔·폴더 열기 정상

#### Files Changed
- `app.py` (frozen 경로 처리, uvicorn h11/ws none, 폴더 열기 최전면 강화)
- `build_exe.bat`, `app.ico`
- `.gitignore` (build/·dist/·*.spec 제외)
- `README.md`, `docs/02_setup.md`, `docs/90_decisions.md`, `docs/99_next_tasks.md`

#### Decisions
- exe 는 소스로 재빌드(빌드 산출물 build/·dist/·*.spec 은 Git 미포함), `app.ico` 만 커밋
- uvicorn 은 exe 안정성을 위해 h11/ws none 사용

#### Next Actions
- 실제 직원 PC(changjo-PC)에서 exe 단독 실행(신규 설치 기준) 검증
