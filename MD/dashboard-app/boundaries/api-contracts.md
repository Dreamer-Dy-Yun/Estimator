# Dashboard API Boundary

Last updated: 2026-06-19

이 문서는 `dashboard-app` 안에서 API 계약을 어디에서 정의하고, 화면이 그 계약을 어떻게 소비하는지 정리한다.
백엔드 endpoint 구현 기준은 `MD/backend-api/backend-api-spec.md`와 `MD/backend-api/dashboard-api-contract-catalog.md`가 우선이다.

## 1. 기본 원칙

- 화면, 훅, 컴포넌트는 `src/api` 밖의 mock 구현을 직접 import하지 않는다.
- API 타입은 `src/api/types/*`의 interface를 기준으로 둔다.
- HTTP adapter와 mock adapter는 같은 `DashboardApi` interface를 구현한다.
- 백엔드가 제공하지 않는 business 값은 frontend에서 조용히 생성하지 않는다.
- 필수값 누락, API 실패, product identity mismatch, stale async 응답은 성공처럼 숨기지 않는다.
- TypeScript 타입에 포함된 값이 항상 HTTP body로 가는 것은 아니다. 실제 직렬화는 `httpDashboardRequests.ts`와 backend catalog를 따른다.

## 2. 주요 파일 책임

| 파일 | 책임 |
|---|---|
| `src/api/types/index.ts` | API 타입 export 진입점 |
| `src/api/types/dashboard-api.ts` | frontend 업무 API interface |
| `src/api/requests/dashboardRequests.ts` | HTTP/mock adapter 선택점 |
| `src/api/requests/httpDashboardRequests.ts` | 실제 HTTP path/query/body 직렬화 기준 |
| `src/api/requests/mockDashboardRequests.ts` | mock adapter 진입점 |
| `src/api/mock/*` | API 계약을 표현하는 mock backend 대체 구현 |
| `src/snapshot/orderSnapshotTypes.ts` | 후보 상세 저장 snapshot v8 타입 |
| `src/snapshot/parseOrderSnapshot.ts` | snapshot parse/validation 경계 |

## 3. 요청 직렬화 기준

| 구분 | 기준 |
|---|---|
| path param | `skuGroupKey`, `stashUuid`, `itemUuid`, `jobId` 등 URL path에 들어간다. |
| query | GET filter, subject query, DELETE 단건 scope, SSE query가 들어간다. |
| body | POST/PATCH payload와 bulk DELETE payload가 들어간다. |
| SSE query | `requestId`, `companyUuid`, subject fields, 기간 등이 query string으로 전달된다. |
| multipart | 엑셀 업로드는 `FormData`로 `file`, `companyUuid`를 전달한다. |

예: `SecondaryAiCommentParams` 타입에는 `skuGroupKey`가 있지만 HTTP body에는 들어가지 않는다. `skuGroupKey`는 `/products/{skuGroupKey}/secondary/ai-comment` path param으로 직렬화된다.

## 4. Company scope

| 작업 | `companyUuid` 처리 |
|---|---|
| read/list | API별로 optional 가능 |
| mutation/import/job/SSE | concrete company UUID 필요 |
| all-company sentinel | `ALL_COMPANY_UUID`를 backend로 그대로 보내지 않는다 |

`normalizeCompanyScopeParams`, `normalizeCompanyMutationScopeParams`, `getRequiredCompanyUuidForMutationScope`가 이 경계를 담당한다.

## 5. Product comparison subject

상품 API는 top-level `companyUuid` 대신 subject query를 사용한다.

| subject | fields |
|---|---|
| base | `baseRole`, `baseKind`, `baseSourceId?` |
| comparison | `comparisonRole`, `comparisonKind`, `comparisonSourceId?` |

- `baseRole`은 `base`, `comparisonRole`은 `comparison`이다.
- `comparisonKind=competitor-channel`이면 `comparisonSourceId`가 필수이다.
- comparison은 competitor channel뿐 아니라 self-company도 가능하다.
- frontend는 comparison target API가 준 값만 선택지로 사용하고 임의 생성하지 않는다.

## 6. Product / Secondary API 소비 경계

| API | 화면상 역할 |
|---|---|
| `getProductDrawerBundle` | primary drawer 기본 상품 bundle |
| `getProductComparisonTargets` | 비교 대상 목록 |
| `getProductMonthlyTrend` | 월간 판매 추세 source |
| `getProductSalesInsight` | 기간/비교 subject 기준 판매 인사이트 |
| `getProductSecondaryDetail` | secondary drawer 기준 상세/비교/사이즈 비중 |
| `getSecondaryDailyTrend` | 일간 판매/입고/재고 그래프 source |
| `getSecondaryStockOrderCalc` | 오더 상세 추천과 분할입고 planning source |
| `getSecondaryStockOrderCalc().inboundSplitSource` | 오더 상세 추천 row와 분할입고 제안 row의 공유 source |

### `getSecondaryDailyTrend`

응답 형태:

```ts
{
  size: string | null
  baseStock: number | null
  data: {
    base: Record<date, { sale: number; inbound: number }>
    comparison: Record<date, { sale: number; inbound: number | null }>
  }
}
```

규칙:

- `size?` query가 없으면 전체 사이즈 aggregate이다.
- `size?` query가 있으면 해당 사이즈 기준이다.
- 이 endpoint에는 입고일, `selfWeightPct`, `bufferStock` 같은 stock-order 값을 추가하지 않는다.
- 그래프 컴포넌트는 이 source에서 chart point를 파생한다.
- `baseStock`은 첫 날짜 전 기초 재고이고, `data.base[date].inbound`는 날짜별 입고량이다.

### `getSecondaryStockOrderCalc`

요청 body 주요 값:

- `skuGroupKey`
- `productIdentity`
- `base`, `comparison`
- `periodStart`, `periodEnd`
- `calculationBaseDate`
- `currentOrderInboundDueDate`
- `nextOrderInboundDueDate`
- `forecastPeriodEndMonth?`
- `orderCoverageDays`
- `selfWeightPct`
- `dailyMean?`

응답 주요 값:

- `productIdentity`: 요청 identity echo. mismatch이면 frontend가 거부한다.
- `existingOrderInboundSupplyBySize`: A. 기존에 주문했지만 아직 입고되지 않은 수량의 날짜별 source.
- `display.currentStockQty*`: `calculationBaseDate` 기준 현재 재고.
- `display.totalOrderBalance*`: A 전체 집계.
- `display.expectedInboundOrderBalance*`: A 중 `date < currentOrderInboundDueDate`인 집계.
- `inboundSplitSource`: 오더 상세 추천과 분할입고 제안이 공유하는 source.

`existingOrderInboundSupplyBySize`와 `inboundSplitSource.expectation`은 현재 드로어에서 편집 중인 금번/분할 오더 수량을 포함하지 않는다.
오더 상세의 `미입고 총 잔량(EA)` 펼침은 `existingOrderInboundSupplyBySize`를 `date < currentOrderInboundDueDate`, `currentOrderInboundDueDate <= date < nextOrderInboundDueDate`, `date >= nextOrderInboundDueDate`로 나눈 표시 전용 파생값이다.

## 7. Split inbound source 계약

`inboundSplitSource`는 `/secondary/stock-order-calc` 응답 안에 포함된다. 별도 endpoint가 아니다.

```ts
{
  total: {
    suggestion: number
    sales: Record<date, number>
  }
  sizeInfo: Record<size, { salesRate: number; baseStock: number }>
  expectation: Record<size, { date: string; inbound: number }[]>
  confirmed: {
    total_phase: number
    data: { phase: number; inbound_date: string; quantity: Record<size, number> }[]
  }
}
```

역할:

- `total.suggestion`: backend source 추천 집계값. UI 최종 추천 총량 shortcut이 아니다.
- `total.sales`: `[currentOrderInboundDueDate, nextOrderInboundDueDate)` 전체 상품 일 판매 예측.
- `sizeInfo[size].salesRate`: size별 판매/share ratio.
- `sizeInfo[size].baseStock`: size별 기초 재고. 음수 허용.
- `expectation[size][]`: 기존 오더 미래 입고 예정량.
- `confirmed`: backend가 초기 phase를 제공할 때의 source.

분할입고 UI 상태:

- split count, split dates, draft row quantities, `bufferStock`, `excludeSegmentExistingOrderInbound`는 `getSecondaryStockOrderCalc` 요청 필드가 아니다.
- 사용자가 적용한 분할 rows는 `OrderSnapshotDocument.drawer2.confirmed.rounds`가 저장한다.
- 현재 UI의 `excludeSegmentExistingOrderInbound`는 dialog 전체 toggle이고, apply 시 모든 `confirmed.rounds[]`에 같은 값으로 저장된다.

## 8. Planning 규칙

- 오더 상세 추천 row와 분할입고 제안 row는 같은 planning 함수를 사용한다.
- 한 차수의 수요는 `[round n inbound date, round n+1 inbound date)`에서 `total.sales`를 사용한다.
- 마지막 차수의 다음 기준일은 `nextOrderInboundDueDate`이다.
- n차에 반영되는 기존 오더 입고 예정량은 같은 구간 `[round n inbound date, round n+1 inbound date)`의 `expectation`이며, 실제 입고일에 더해 날짜순 재고 흐름에 반영한다.
- `expectedInboundOrderBalance`처럼 `currentOrderInboundDueDate` 전 입고 예정 집계는 opening stock 성격으로 항상 반영된다.
- 추천 수량은 구간 중 최저 예상 재고가 UI 재고 하한보다 낮아지는 만큼이다.
- `excludeSegmentExistingOrderInbound=true`는 같은 구간의 기존 오더 입고 예정량만 무시한다.
- 2차 이상은 구간별 재고 이월과 정수화 때문에 총합이 소폭 흔들릴 수 있다.

## 9. Snapshot 경계

현재 저장 snapshot은 `OrderSnapshotDocument` v8이다.

| 영역 | 저장 의미 |
|---|---|
| `drawer1.summary` | 상품 기본 정보와 가용 재고 |
| `drawer1.monthlySalesTrend` | primary 월간 추세 chart point |
| `drawer2.stockOrderRequest` | 입고일, 커버 일수, 수요 override |
| `drawer2.stockOrderResult` | stock-order-calc 응답 기반 계산/복원 source |
| `drawer2.sizeOrders` | size별 share/forecast/recommendation row |
| `drawer2.confirmed.rounds` | 사용자가 확정한 차수별 수량 |
| `drawer2.aiComment` | AI prompt/answer/generation metadata |

후보 item에 저장된 snapshot이 있으면 화면 복원 시 해당 값이 우선이다. 최신 API 값을 가져와서 사용자의 저장 결정을 자동으로 덮어쓰지 않는다.

## 10. 문서 갱신 규칙

API 계약이 바뀌면 함께 갱신한다.

- `src/api/types/*`
- `src/api/requests/httpDashboardRequests.ts`
- `src/api/requests/mockDashboardRequests.ts`
- `MD/backend-api/backend-api-spec.md`
- `MD/backend-api/dashboard-api-contract-catalog.md`
- 관련 boundary 문서
