# dashboard-app documentation index

Last updated: 2026-06-02

## 문서 구조

- [frontend-overview.md](./frontend-overview.md): 앱 기능/흐름 개요, 책임 요약
- [source-boundary-map.md](./source-boundary-map.md): 폴더별 소유권 맵
- [boundaries/README.md](./boundaries/README.md): boundary 문서 색인 및 갱신 규칙
- [boundaries/repository-runtime.md](./boundaries/repository-runtime.md): 런타임, 배포, e2e 경계
- [boundaries/api-contracts.md](./boundaries/api-contracts.md): API, mock/http 계약
- [boundaries/auth-admin.md](./boundaries/auth-admin.md): 인증/관리자 경계
- [boundaries/analysis-pages.md](./boundaries/analysis-pages.md): 분석 페이지 경계
- [boundaries/candidate-stash.md](./boundaries/candidate-stash.md): 후보군 경계
- [boundaries/product-drawer.md](./boundaries/product-drawer.md): 드로워/2차 화면/스냅샷 경계
- [boundaries/shared-modules.md](./boundaries/shared-modules.md): 공통 모듈 경계
- [boundaries/style-facades.md](./boundaries/style-facades.md): CSS 파사드 경계
- [qa-state-contracts.md](./qa-state-contracts.md): 상태/계약 QA 규약
- [qa-current-behavior.md](./qa-current-behavior.md): 현재 동작 기록
- [failure-ux-matrix.md](./failure-ux-matrix.md): 실패 UX 매핑
- [test-strategy.md](./test-strategy.md): 테스트 전략
- [module-hardening.md](./module-hardening.md): 모듈 하드닝 상태
- [deployment-hardening.md](./deployment-hardening.md): 배포 하드닝 노트
- [e2e-strategy.md](./e2e-strategy.md): e2e 테스트 전략
- [hardening-status.md](./hardening-status.md): 하드닝 진행 상태
- [inner-candidate-list-sse-plan.md](./inner-candidate-list-sse-plan.md): 내부 SSE 개선 계획

## 읽기 우선순위

1. 변경이 생기면 먼저 `source-boundary-map.md` 확인
2. API 타입/계약 변경이면 `boundaries/api-contracts.md` + `../backend-api/dashboard-api-contract-catalog.md`
3. API endpoint, 요청/응답 schema, 에러 형식이 바뀌면 `../backend-api/backend-api-spec.md`도 함께 갱신
4. API runtime mode, CI, e2e, 배포 규칙 변경이면 `boundaries/repository-runtime.md`
5. 화면 책임 변경이면 `frontend-overview.md` + 해당 영역 boundary 문서
