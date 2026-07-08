# 폴더관리 Dashboard (disk_dashboard)

연세대 미래캠 직원용 폴더관리 프로그램. 관리할 폴더를 등록하면 그 폴더와 이하 폴더의 **폴더트리 · 파일 갯수 · 전체 파일 사이즈**를 대시보드로 보여준다. FastAPI + 순수 HTML/CSS/JS.

- Machine: `changjo-pc` (창조관 사무실 Dell PC / PHYSICS 계정)
- Role: deploy
- Repo: https://github.com/boldorite/disk_dashboard.git

## 현재 상태
- FastAPI 백엔드(`app.py`) + 정적 프론트(`static/`) 구현 완료, 로컬 실행 확인 (2026-07-08).
- 폴더선택관리 모달: 서버측 폴더/드라이브 브라우저, 다중 선택(체크박스 · Ctrl-클릭 · Shift-클릭), 등록/제거, **갱신**, **완전초기화**.
- 폴더트리: 접기/펼치기, 막대바(**디스크 전체 / 상위폴더** 기준 토글), 파일수·용량 고정 컬럼 정렬, 접근불가 폴더 표시.
- 폴더 이름 클릭 → Windows 탐색기에서 폴더 열기(창 최전면).
- 포트 5000~6000 자동 선택, 브라우저 자동 오픈.
- `yonsei_design_claude.md` 컬러스킴(다크/라이트), NUMP 로고(`NUMP 일러스트.ai` → PNG 변환).

## 실행법
```powershell
# 최초 실행: run.bat 더블클릭 (venv 생성 + 패키지 설치 + 실행)
run.bat

# 또는 수동
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```
실행하면 브라우저가 `http://127.0.0.1:<빈 포트>` 로 자동 오픈됩니다.

### 단일 exe 배포
```powershell
build_exe.bat        # dist\폴더관리Dashboard.exe 생성 (약 17MB, Python 불필요)
```
exe 를 더블클릭하면 서버가 뜨고 브라우저가 열립니다. 등록 폴더(`config.json`)는 exe 와 같은 폴더에 저장됩니다.

## Key Documents
- Overview: [docs/00_overview.md](docs/00_overview.md)
- Architecture: [docs/01_architecture.md](docs/01_architecture.md)
- Setup: [docs/02_setup.md](docs/02_setup.md)
- Issues & Risks: [docs/20_issues_risks.md](docs/20_issues_risks.md)
- Decisions: [docs/90_decisions.md](docs/90_decisions.md)
- Dev history: [docs/91_dev_history.md](docs/91_dev_history.md)
- Next tasks: [docs/99_next_tasks.md](docs/99_next_tasks.md)
- Wiki pointer: [.llmwiki](.llmwiki)

## 완료 조건
직원 PC(changjo-PC)에서 폴더관리 대시보드가 정상 실행·배포되고, 폴더트리·파일수·용량이 정확히 표시됨.

## 주의
- 토큰/비밀번호/개인정보/내부계정은 어떤 파일에도 넣지 않는다.
- `config.json`(등록 폴더 경로), `.venv/` 는 Git 원격에 올리지 않는다.
