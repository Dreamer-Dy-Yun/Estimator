# dashboard-app documentation index

Last updated: 2026-06-19

## 목적

이 폴더는 `dashboard-app`의 현재 화면 구조, source boundary, API/mock 계약, QA/검증 기준을 설명한다. 코드 변경으로 기능 책임이나 데이터 계약이 바뀌면 이 문서군도 함께 갱신한다.

## 핵심 문서

| 문서 | 역할 |
|------|------|
| [frontend-overview.md](./frontend-overview.md) | 앱의 주요 화면, 데이터 흐름, 사용자 결정 저장 흐름 개요 |
| [source-boundary-map.md](./source-boundary-map.md) | 폴더/파일 책임 지도와 갱신 규칙 |
| [boundaries/README.md](./boundaries/README.md) | 기능별 boundary 문서 색인 |
| [boundaries/api-contracts.md](./boundaries/api-contracts.md) | frontend API facade, HTTP/mock adapter, DTO 책임 |
| [boundaries/product-drawer.md](./boundaries/product-drawer.md) | 상품 드로어, secondary 주문 계산, 분할 입고, snapshot 경계 |
| [boundaries/candidate-stash.md](./boundaries/candidate-stash.md) | 후보군, 추천, 상세확정, order metric SSE 경계 |
| [boundaries/analysis-pages.md](./boundaries/analysis-pages.md) | 자사/경쟁사 분석 목록, 필터, scatter/list 경계 |
| [boundaries/auth-admin.md](./boundaries/auth-admin.md) | 인증, 세션, 관리자 화면 경계 |
| [boundaries/repository-runtime.md](./boundaries/repository-runtime.md) | build, deploy, e2e, runtime 환경 경계 |
| [boundaries/style-facades.md](./boundaries/style-facades.md) | CSS Modules facade와 style-parts import 규칙 |
| [boundaries/shared-modules.md](./boundaries/shared-modules.md) | 공통 UI, hook, model, utility 경계 |
| [inbound-split-dto-realignment-2026-06-19.md](./inbound-split-dto-realignment-2026-06-19.md) | current inbound split and daily trend DTO realignment result note |
| [inbound-split-stock-order-source-unification-2026-06-18.md](./inbound-split-stock-order-source-unification-2026-06-18.md) | stock-order-calc and split-inbound planning source unification result note |

## 검증/운영 문서

| 문서 | 역할 |
|------|------|
| [test-strategy.md](./test-strategy.md) | 단위 테스트, E2E, encoding check 기준 |
| [e2e-strategy.md](./e2e-strategy.md) | Playwright smoke/full 시나리오 기준 |
| [deployment-hardening.md](./deployment-hardening.md) | GitHub Pages 배포와 runtime config 검증 기준 |
| [failure-ux-matrix.md](./failure-ux-matrix.md) | API/SSE 실패와 stale 상태 UX 기준 |
| [qa-state-contracts.md](./qa-state-contracts.md) | QA에서 지켜야 하는 상태/계약 불변 조건 |
| [qa-current-behavior.md](./qa-current-behavior.md) | 현재 확인된 화면/API 동작 기준 |
| [module-hardening.md](./module-hardening.md) | 하드닝 완료 모듈과 수정 제한 |
| [hardening-status.md](./hardening-status.md) | 하드닝 진행 현황 |

## 백엔드/API 문서 연결

API endpoint, request, response, error, SSE 계약은 `MD/backend-api`가 백엔드 구현 기준이다.

| 문서 | 역할 |
|------|------|
| [../backend-api/README.md](../backend-api/README.md) | 백엔드 API 문서 진입점 |
| [../backend-api/dashboard-api-contract-catalog.md](../backend-api/dashboard-api-contract-catalog.md) | endpoint catalog와 DTO mapping |
| [../backend-api/backend-api-spec.md](../backend-api/backend-api-spec.md) | 인증, scope, validation, error, SSE 구현 규칙 |
| [../backend-api/order-snapshot-backend-contract.md](../backend-api/order-snapshot-backend-contract.md) | `OrderSnapshotDocument` v8 저장 계약 |

## 현재 중요 경계

- 화면/훅/컴포넌트는 mock이나 HTTP 구현을 직접 import하지 않고 `src/api/client.ts`를 통해 접근한다.
- mock은 UI fallback이 아니라 API 계약의 대체 구현이다.
- 상품 드로어는 `base`/`comparison` subject 계약을 사용한다. all-company sentinel은 HTTP boundary에서 sourceId 생략으로 표현한다.
- secondary daily trend는 `{ size, baseStock, data: { base, comparison } }` 형태의 `SecondaryDailyTrendSource`를 받는다. 화면은 source에서 chart point를 파생한다.
- secondary inbound split source is `getSecondaryStockOrderCalc().inboundSplitSource` with `{ total, sizeInfo, expectation, confirmed }`. Split count/date/result rows and `excludeSegmentExistingOrderInbound` are UI/snapshot state, not stock-order-calc request fields.
- 분할 입고 확정은 2차수 이상일 때 `drawer2.confirmed.rounds`로 저장되고, 1차수는 직접 확정 수량으로 접힌다.
- 후보군 order metric은 runtime config의 `candidateOrderMetricComparison`을 사용한다. 화면이 임의 comparison default를 만들지 않는다.
- snapshot 저장 계약은 `OrderSnapshotDocument` v8다.

## 갱신 규칙

- 기능 책임이나 source ownership이 바뀌면 [source-boundary-map.md](./source-boundary-map.md)를 갱신한다.
- 세부 기능 변경은 해당 [boundaries](./boundaries/README.md) 문서를 갱신한다.
- API 계약 변경은 dashboard boundary 문서와 backend API 문서를 함께 갱신한다.
- 날짜가 붙은 `project-cleanup-YYYY-MM-DD.md`는 결과 기록이다. 현재 기준은 이 index와 boundary 문서에 반영해야 한다.
