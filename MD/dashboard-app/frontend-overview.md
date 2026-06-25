# dashboard-app Frontend Overview

Last updated: 2026-06-19

## 목적

`dashboard-app`은 자사/경쟁사 판매 분석, 상품 드로어 기반 주문 계획, 후보군 관리, 관리자 설정을 제공하는 React SPA다. 앱은 mock mode와 HTTP mode를 모두 지원하지만, 화면은 adapter 구현을 직접 알지 않는다. 데이터 접근은 `src/api` facade 뒤에 두고, 화면은 API 계약과 상태 결과만 소비한다.

## 주요 사용자 흐름

- 로그인 후 세션과 회사 목록을 로딩한다.
- 헤더의 회사 선택은 read API scope를 결정한다. `전체`는 프론트 내부 sentinel이며, HTTP 요청에서는 `companyUuid` 생략으로 표현한다.
- 자사/경쟁사 분석 페이지는 기간, 회사, 채널, 필터 조건으로 판매 목록과 scatter/list UI를 조회한다.
- 분석 목록에서 상품 드로어를 열어 summary, 월간 추세, sales insight, secondary 주문 계산을 본다.
- secondary 드로어에서 입고일, 버퍼, 단가/원가/수수료, 자사/비교 가중치, 사이즈별 확정 수량을 조정한다.
- 분할 입고 다이얼로그는 API source를 기반으로 차수별 제안 수량을 계산하고, 사용자가 차수/사이즈 확정 수량을 조정한다. Dialog draft is split into a date phase and a quantity phase: before date lock, split count/date edits are allowed and confirmed quantities follow suggestions; after date lock, dates are disabled and confirmed total/size quantity edits plus reset-to-suggested are enabled.
- 후보군은 선택 회사 기준으로 stash, item, 추천, 상세확정, order metric SSE, Excel upload/download를 처리한다.
- 저장된 후보 item의 `confirmedOrderSnapshot`는 `OrderSnapshotDocument` v8이며, snapshot row는 저장값을 우선 표시한다.
- 관리자 화면은 사용자, GPT key, Google Sheets 설정을 관리한다.

## Source Layout

| 경로 | 책임 |
|------|------|
| `src/api` | API facade, request adapter, DTO, mock backend 대체 구현 |
| `src/auth` | 세션, 로그인, 권한 가드, 현재 사용자 profile |
| `src/admin` | 관리자 설정 UI |
| `src/dashboard/pages` | 분석 페이지와 후보군 페이지 entry |
| `src/dashboard/components` | 분석 목록, 상품 드로어, 후보군, 공통 dashboard UI |
| `src/dashboard/components/product-drawer` | 상품 드로어 shell, primary/secondary pane, snapshot 저장/복원 |
| `src/dashboard/components/candidate-stash` | 후보군 목록, 추천, item detail, SSE, mutation |
| `src/dashboard/hooks` | 화면 요청/선택/필터 상태 hook |
| `src/dashboard/model` | 화면 view-model과 순수 계산 모델 |
| `src/snapshot` | `OrderSnapshotDocument` 타입, parser, validation |
| `src/components` | 앱 공통 UI component |
| `src/utils` | React/API에 의존하지 않는 순수 utility |

## API / Mock 흐름

- `src/api/client.ts`가 화면 public facade다.
- `src/api/requests/*`가 mock/HTTP adapter와 endpoint mapping을 소유한다.
- `src/api/types/*`가 frontend DTO/interface 계약을 소유한다.
- `src/api/mock/*`는 API 계약 대체 구현이며 화면 fallback이 아니다.
- HTTP mode에서 endpoint, query/body, SSE 경로는 [../backend-api/dashboard-api-contract-catalog.md](../backend-api/dashboard-api-contract-catalog.md)와 맞아야 한다.
- backend 구현 주의사항은 [../backend-api/backend-api-spec.md](../backend-api/backend-api-spec.md)를 기준으로 한다.

## Analysis Pages

- `SelfPage`와 `CompetitorPage`는 분석 조건과 결과 조회 흐름을 소유한다.
- 기간/필터 입력은 draft와 applied 상태를 분리한다.
- list row의 썸네일은 API row summary의 `thumbnailUrl: string | null`을 표시한다. UI가 product code나 color code로 운영 이미지 URL을 만들지 않는다.
- scatter grid는 현재 list/filter 결과를 기반으로 UI에서 계산한다. 대량 데이터 전환 시 backend aggregate로 분리할 수 있다.
- 후보군 bulk add는 단일 회사 scope에서만 동작한다.

## Product Drawer

- product drawer는 primary summary, 월간 추세, sales insight, secondary detail, AI comment, 주문 계산, snapshot 저장/복원을 소유한다.
- bundle은 base-only summary를 받는다.
- 1차 드로워 상품 이미지는 `ProductDrawerBundle.summary.imageUrl: string | null`을 표시한다. 리스트/후보군의 `thumbnailUrl`과 다른 필드이며, UI가 상품명이나 품번으로 placeholder URL을 합성하지 않는다.
- 월간 추세, sales insight, secondary detail, daily trend는 `base`/`comparison` subject 계약을 사용한다.
- comparison target이 없거나 현재 scope에서 유효하지 않으면 unavailable 상태로 표시한다. 화면이 fake target이나 첫 번째 target을 무조건 합성하지 않는다.
- AI comment는 수동 POST 요청이다. 필요하면 현재 계산 상태를 `snapshotForAiComment`로 함께 보낸다.
- snapshot 저장 계약은 `OrderSnapshotDocument` v8다. `drawer2.sizeOrders[]`는 share/forecast/recommendation row를 저장하고, 확정 수량은 `drawer2.confirmed.rounds[]`에 저장한다.

## Secondary Daily / Inbound Split

- daily trend API는 `SecondaryDailyTrendSource`를 반환한다. chart-ready `stockBar`, `inboundAccumBar`, `idx`, `month`, `isForecast`는 프론트에서 파생한다.
- `SecondaryDailyTrendSource.baseStock`은 선택 size 또는 전체 기준의 기초 재고이고, `data.base[date].inbound`는 해당 일자의 입고 수량이다. `size` query가 없으면 전체 기준, 있으면 해당 사이즈 기준이다.
- stock-order calc API는 A 원천인 `existingOrderInboundSupplyBySize[size][]`를 반환한다. `미입고 총 잔량(EA)`은 A 전체 집계이고, 펼침 행은 `date < currentOrderInboundDueDate`, `currentOrderInboundDueDate <= date < nextOrderInboundDueDate`, `date >= nextOrderInboundDueDate`로 나눈 A 집계이다. `display.expectedInboundOrderBalance*`는 `date < currentOrderInboundDueDate`인 A 집계로 계산에 사용하지만, 오더 상세 표에는 별도 `현오더 입고전 미입고잔량(EA)` 행을 표시하지 않는다.
- `getSecondaryStockOrderCalc().inboundSplitSource`는 `total.suggestion`, `total.sales`, `sizeInfo`, `expectation`, `confirmed`를 제공한다. 현재 재고는 `sizeInfo[size].baseStock`, 기 주문 입고 예정 수량(A)은 `expectation[size][]`로 분리한다.
- split count, selected split dates, row totals, per-size confirmed quantities는 화면 draft state다.
- 입고 분할 차수 날짜는 `currentOrderInboundDueDate <= date < nextOrderInboundDueDate` 범위로 검증한다. 첫 차수는 금번 입고일과 같은 날짜를 허용한다.
- 2차수 이상으로 Apply하면 `drawer2.confirmed.rounds`와 직접 확정 수량이 함께 갱신된다. 1차수 Apply는 rounds를 비우고 직접 확정 수량으로 접는다.
- 분할 입고 제안은 오더 상세 추천과 같은 planning 함수로 계산한다. 각 차수 구간의 `total.sales` 수요, `sizeInfo[size].salesRate`, `sizeInfo[size].baseStock`, `expectation[size][]`, 현오더 입고 전 기존 입고예정량, UI 재고 하한을 반영한다. 구간은 `[n차 입고일, n+1차 입고일)`이고, 같은 구간의 `expectation`은 실제 입고일에 더한 뒤 일별 판매예측을 차감한다. 제안 수량은 구간 중 최저 예상 재고가 UI 재고 하한보다 낮아지는 만큼이다. `excludeSegmentExistingOrderInbound`는 해당 구간의 `expectation`만 제외한다. `total.suggestion`은 백엔드 source 집계값이며 UI 여유재고가 적용된 최종 추천 총량을 대체하지 않는다.

## Candidate Stash

- 후보군 업무는 단일 회사 scope에서만 동작한다.
- 전체 회사 선택 상태에서는 후보군 side-effect 진입을 막는다.
- 추천 append 상태는 `applied`, `stale`, `no-op`, `empty-selection`으로 구분한다.
- order metric SSE는 runtime config가 제공한 `candidateOrderMetricComparison`을 사용한다.
- snapshot item은 저장된 `OrderSnapshotDocument.drawer2` 값을 투영하고, non-snapshot item은 선택된 comparison 기준으로 secondary order calculation을 재사용한다.
- 후보군 오더 엑셀은 item/order metric의 `orderExport` DTO만 사용한다. `inboundRounds[]`는 동적 컬럼이 아니라 `차수`, `입고 예정일` 고정 컬럼으로 행 확장하며 별도 상세 조회를 만들지 않는다.
- SSE 실패는 대상 row/cell의 실패 상태로 표시하고 기존 목록을 비우지 않는다.

## 관리자

- `PATCH /auth/me`는 현재 사용자의 `loginId`, `name` 수정 흐름이다.
- `PATCH /admin/users/{uuid}`는 관리자 제어 필드인 `note`, `role`, `isActive`만 소유한다.
- GPT key와 Google Sheets 설정은 관리자 화면과 admin API boundary가 소유한다.

## 문서 연결

- source ownership 변경: [source-boundary-map.md](./source-boundary-map.md)
- 기능별 책임 변경: [boundaries/README.md](./boundaries/README.md)
- API 계약 변경: [boundaries/api-contracts.md](./boundaries/api-contracts.md), [../backend-api/dashboard-api-contract-catalog.md](../backend-api/dashboard-api-contract-catalog.md)
- 상품 드로어/snapshot 변경: [boundaries/product-drawer.md](./boundaries/product-drawer.md), [../backend-api/order-snapshot-backend-contract.md](../backend-api/order-snapshot-backend-contract.md)
