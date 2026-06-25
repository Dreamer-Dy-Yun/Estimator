# dashboard-app boundaries

Last updated: 2026-06-19

## 목적

이 폴더는 `dashboard-app`의 기능 책임과 source ownership을 기능별로 나눈 기준 문서다. 변경할 파일을 고르기 전에 해당 boundary를 먼저 확인한다. 문서가 실제 코드 흐름과 어긋나면 코드 변경과 같은 작업 단위에서 갱신한다.

## Boundary 문서

| 문서 | 영역 | 주요 근거 파일 | 갱신 조건 |
|------|------|----------------|-----------|
| [api-contracts.md](./api-contracts.md) | API facade, HTTP/mock adapter, DTO, 실패 정규화 | `src/api/**` | endpoint, request/response, mock/http 선택, error/SSE 계약 변경 |
| [auth-admin.md](./auth-admin.md) | 인증, 세션, 권한 가드, 관리자 화면 | `src/auth/**`, `src/admin/**`, `src/App.tsx` | 로그인/세션/권한/관리자 API 또는 화면 책임 변경 |
| [analysis-pages.md](./analysis-pages.md) | 자사/경쟁사 분석 페이지 | `src/dashboard/pages/**`, analysis components/hooks/model | 분석 조건, 필터, list/scatter, bulk add 진입 변경 |
| [candidate-stash.md](./candidate-stash.md) | 후보군, 추천, 상세확정, order metric SSE | `src/dashboard/components/candidate-stash/**` | stash/item mutation, recommendation, SSE, Excel, snapshot item 표시 변경 |
| [product-drawer.md](./product-drawer.md) | 상품 드로어, secondary 주문 계산, 분할 입고, snapshot | `src/dashboard/components/product-drawer/**`, `src/snapshot/**` | 드로어 요청, 계산, AI comment, snapshot, split inbound 흐름 변경 |
| [shared-modules.md](./shared-modules.md) | 공통 UI, hook, model, utility | `src/components`, `src/dashboard/hooks`, `src/dashboard/model`, `src/utils` | 공통 module의 public 책임 또는 사용 규칙 변경 |
| [style-facades.md](./style-facades.md) | CSS Modules facade와 style-parts | `*.module.css`, `*style-parts/**` | CSS import 경로, facade ownership, style-parts 분리 변경 |
| [repository-runtime.md](./repository-runtime.md) | build, deploy, e2e, runtime 환경 | `.github`, `package.json`, `vite.config.ts`, `e2e/**` | script, workflow, deploy, Playwright, runtime env 변경 |

## 현재 주의 경계

- `src/api/client.ts`는 화면 public API facade다. 화면과 hook은 mock/HTTP 구현을 직접 import하지 않는다.
- 상품 드로어 read-like API는 `companyUuid` 대신 `base`/`comparison` subject 계약을 사용한다.
- secondary daily trend는 `{ size, baseStock, data: { base, comparison } }` source contract를 받고 chart point는 프론트에서 파생한다.
- secondary inbound split source is `getSecondaryStockOrderCalc().inboundSplitSource` with `{ total, sizeInfo, expectation, confirmed }`. Split count/date/result rows and `excludePeriodExistingOrderInbound` are UI/snapshot state, not stock-order-calc request fields.
- 2차수 이상 분할 입고 확정은 `drawer2.confirmed.rounds`에 저장한다.
- 후보군 order metric SSE는 runtime config의 `candidateOrderMetricComparison`을 사용한다.
- CSS `style-parts/**`는 각 facade CSS module만 import한다.

## 운영 규칙

- boundary 문서는 과거 작업 기록이 아니라 현재 코드 기준이다.
- 책임이 모호하면 먼저 “어느 계층이 소유하는가”를 정리한 뒤 코드 변경 범위를 잡는다.
- API 계약 변경은 `MD/backend-api` 문서와 함께 갱신한다.
- 하드닝 완료 모듈은 [../module-hardening.md](../module-hardening.md)를 확인하고, 필요 시 사용자 허가를 받는다.
