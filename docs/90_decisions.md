# Decisions

## 2026-07-08 - 스캔 속도 우선: 캐시 + 지연 로딩
- Decision: 전체 폴더는 1회 스캔 후 인메모리 캐시, 트리는 depth 2까지만 내려보내고 하위는 클릭 시 `/api/subtree` 로 로딩한다.
- Reason: 초기 폴더 탐색/갱신 속도 우선.
- Alternatives: 매 요청마다 전체 트리 반환.
- Consequences: 최초 스캔 비용은 필요하나 이후 조회/확장은 즉시.
- Status: accepted

## 2026-07-08 - 막대바 기준 토글(디스크 / 상위폴더)
- Decision: 막대바 분모를 디스크 드라이브 전체 용량과 상위 폴더 크기 중 선택할 수 있게 한다.
- Reason: 디스크 점유율은 직관적이나 개별 폴더는 대부분 0에 가까움 → 상위폴더 기준으로 구조 파악을 보완.
- Alternatives: 한 가지 기준 고정.
- Consequences: 최소 3px 슬라이버 + 툴팁으로 작은 폴더도 표시.
- Status: accepted

## 2026-07-08 - 로고는 .ai → PNG 변환
- Decision: `NUMP 일러스트.ai`(PDF 호환)를 PyMuPDF 로 PNG 변환해 사용한다.
- Reason: 브라우저가 `.ai` 를 직접 표시하지 못함.
- Alternatives: 별도 PNG/SVG 로고 준비.
- Status: accepted

## 2026-07-08 - config.json Git 제외
- Decision: 등록 폴더 경로가 담긴 `config.json` 은 Git 원격에 올리지 않는다.
- Reason: 로컬 설정/경로 노출 방지.
- Alternatives: 예시 config 만 커밋.
- Status: accepted
