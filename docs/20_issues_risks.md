# Issues and Risks

| Item | Type | Severity | Mitigation | Status |
|---|---|---|---|---|
| 초대형 폴더 최초 스캔 지연 | Performance | Medium | 인메모리 캐시 + depth 제한 + 하위 지연 로딩, 갱신은 캐시만 비움 | mitigated |
| Pretendard 폰트 원본 부재 | UI | Low | 시스템 sans-serif 폴백, `static/fonts/` 에 넣으면 적용 | active |
| 폴더 열기·드라이브 브라우저 Windows 전용 | Portability | Low | `os.name` 확인 후 미지원 시 501 반환 | mitigated |
| 5000~6000 포트 모두 사용 중 | Operational | Low | 범위 자동 탐색, 실패 시 예외 발생 | mitigated |
| config.json 경로 노출 | Privacy | Low | `.gitignore` 로 Git 제외 | mitigated |
| 단일 exe 패키징 미검증 | Deployment | Low | 필요 시 PyInstaller 등으로 패키징 검토 | active |
