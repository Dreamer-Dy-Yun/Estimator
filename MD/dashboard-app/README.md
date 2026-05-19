# dashboard-app 문서

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-04-23 |
| 최종 수정일 | 2026-05-20 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app` 문서 |

## 안내

이 폴더는 [`dashboard-app`](../../dashboard-app) 프론트엔드의 제품 설명, 구조, 테스트, 경계 문서를 보관합니다.

문서 작성·보존 기준은 [../README.md](../README.md)를 따릅니다. 날짜가 붙은 작업 이력 문서는 유지 문서에 내용이 흡수되면 [../HISTORY](../HISTORY)로 이동합니다.

| 문서 | 설명 |
|------|------|
| [frontend-overview.md](./frontend-overview.md) | 목적, 화면, 기능, 데이터 흐름, UX 메모 |
| [source-boundary-map.md](./source-boundary-map.md) | 소스 경계 마스터 인덱스. 어떤 기능을 보려면 어떤 boundary 문서를 열어야 하는지 안내 |
| [boundaries/](./boundaries/README.md) | 기능별 상세 경계 문서. API, 분석 화면, 후보군, 드로워, 관리자, 공통 모듈로 분리 |
| [module-hardening.md](./module-hardening.md) | 하드닝 완료 모듈, 공개 계약, 수정 허가 규칙 |
| [test-strategy.md](./test-strategy.md) | Vitest 테스트 전략과 우선순위 |
| [qa-current-behavior.md](./qa-current-behavior.md) | 현재 화면/데이터/키보드/API 동작 기준 QA 문서. 기능 변경 시 반드시 갱신 |
| [qa-state-contracts.md](./qa-state-contracts.md) | 로딩, 빈 값, 실패, 권한, stale, 비활성 상태 표시 기준 |
| [ui-patterns.md](./ui-patterns.md) | 버튼, 카드, 패널, 리스트, 드로워, 모달, toast, tooltip UI 패턴 기준 |
| [inner-candidate-list-sse-plan.md](./inner-candidate-list-sse-plan.md) | 이너 후보군 조회·추천·오더 지표 SSE 분리 계획 |

백엔드 API 계약은 [../backend-api/README.md](../backend-api/README.md)를 참고합니다.

앱 실행 진입 README는 [`dashboard-app/README.md`](../../dashboard-app/README.md)입니다.
