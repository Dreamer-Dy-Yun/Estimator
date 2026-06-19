# Backend API Specification

Last updated: 2026-06-19

이 문서는 `dashboard-app`이 현재 사용하는 백엔드 API의 구현 기준이다.
endpoint별 path/query/body/response 목록은 [dashboard-api-contract-catalog.md](./dashboard-api-contract-catalog.md)를 함께 본다.

## 1. Global contract

- Base path: `/api/v1`
- 인증: cookie 기반 session
- Frontend HTTP client: `credentials: include`
- JSON field명은 TypeScript DTO field명과 1:1로 맞춘다.
- TypeScript 타입에 포함된 field가 항상 HTTP body에 들어가는 것은 아니다. 실제 path/query/body 배치는 `httpDashboardRequests.ts`와 contract catalog를 따른다.
- 백엔드는 존재하지 않는 business 값을 임의 기본값으로 채워 성공처럼 반환하지 않는다.
- 필수값 누락, scope 오류, subject 오류, stale/mismatched product identity는 4xx 오류로 드러낸다.

### Success

| 종류 | 응답 |
|---|---|
| read/list | `200` + typed payload |
| mutation | `200` + typed payload 또는 `204` |
| SSE | `text/event-stream` |

### Error

```ts
interface ApiErrorResponse {
  message: string
  code?: string
  details?: unknown
}
```

| HTTP | Frontend failure kind |
|---|---|
| 401 | auth |
| 403 | permission |
| 404 | not-found |
| 408, 504 | timeout |
| 409 | conflict |
| 422 | validation |
| other 4xx | client |
| 5xx | server |
| others | unknown |

## 2. Auth/session

| API | Method | Path | Request | Response |
|---|---|---|---|---|
| `getCurrentAuthSession` | GET | `/auth/session` | none | `AuthSession | null` |
| `login` | POST | `/auth/login` | body `LoginRequest` | `LoginResult` |
| `updateCurrentUser` | PATCH | `/auth/me` | body `UpdateAuthUserPayload` | `AuthSession` |
| `changeCurrentUserPassword` | POST | `/auth/me/password` | body `ChangePasswordPayload` | none |
| `logout` | POST | `/auth/logout` | none | none |

`GET /auth/session`은 미인증 상태를 `AuthSession | null` 기준으로 처리한다. 서버가 401을 반환하면 frontend는 session 없음으로 해석할 수 있다.

## 3. Scope

### companyUuid

| 작업 | 규칙 |
|---|---|
| read/list | API에 따라 `companyUuid?` 생략 가능 |
| mutation/import/job/SSE | concrete `companyUuid` 필요 |
| all-company sentinel | frontend 내부 `ALL_COMPANY_UUID`를 mutation/job에 그대로 보내지 않는다 |

### Product comparison subject

상품/secondary API는 top-level `companyUuid` 대신 subject query를 사용한다.

| subject | query fields | 규칙 |
|---|---|---|
| base | `baseRole`, `baseKind`, `baseSourceId?` | `baseRole=base`, 현재 기본 `baseKind=self-company` |
| comparison | `comparisonRole`, `comparisonKind`, `comparisonSourceId?` | `comparisonRole=comparison` |

- `kind=competitor-channel`이면 `sourceId`가 필수이다.
- `comparison.kind`는 `competitor-channel` 또는 `self-company`가 가능하다.
- backend는 잘못된 role/kind/source 조합을 임의 기본값으로 대체하지 말고 실패시켜야 한다.

## 4. Product drawer / Secondary 핵심 계약

### `getSecondaryDailyTrend`

Endpoint:

- Method: `GET`
- Path: `/products/{skuGroupKey}/secondary/daily-trend`
- Path params: `skuGroupKey`
- Query: `startDate`, `endDate`, `forecastDays`, `size?`, base subject fields, comparison subject fields
- Body: none
- Response: `SecondaryDailyTrendSource`

`SecondaryDailyTrendParams`:

```ts
interface SecondaryDailyTrendParams {
  skuGroupKey: string
  startDate: string
  endDate: string
  forecastDays: number
  size?: string | null
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
}
```

직렬화 규칙:

- `skuGroupKey`는 path param이다.
- `startDate`, `endDate`, `forecastDays`, `size?`는 query이다.
- `base`와 `comparison`은 subject query로 풀어서 보낸다.
- `size`를 생략하거나 `null`이면 전체 사이즈 aggregate이다.
- 이 endpoint에는 `currentOrderInboundDueDate`, `nextOrderInboundDueDate`, `selfWeightPct`, `bufferStock` 같은 stock-order 전용 값을 보내지 않는다.

`SecondaryDailyTrendSource`:

```ts
interface SecondaryDailyTrendSource {
  size: string | null
  baseStock: number | null
  data: {
    base: Record<string, { sale: number; inbound: number }>
    comparison: Record<string, { sale: number; inbound: number | null }>
  }
}
```

응답 규칙:

- `size`는 요청 size echo이다. 전체 aggregate이면 `null`이다.
- `baseStock`은 첫 응답일 전의 기초 재고이다. 첫 날짜의 inbound로 중복 표현하지 않는다.
- `data.base[date].sale`은 기준 subject의 일 판매량이다.
- `data.base[date].inbound`는 해당 날짜의 기준 subject 입고량이다. 알려진 0은 `0`으로 보낸다.
- `data.comparison[date].sale`은 비교 subject의 일 판매량이다.
- `data.comparison[date].inbound`는 현재 UI에서 비교 입고를 쓰지 않으므로 없으면 `null`이다.
- `data.base`와 `data.comparison`은 `startDate`부터 `endDate`까지 화면에 필요한 날짜를 빠짐없이 제공해야 한다.

### `getSecondaryStockOrderCalc`

Endpoint:

- Method: `POST`
- Path: `/secondary/stock-order-calc`
- Path params: none
- Query: none
- Body: `SecondaryStockOrderCalcParams`
- Response: `SecondaryStockOrderCalcResult`

`SecondaryStockOrderCalcParams`:

```ts
interface SecondaryStockOrderCalcParams {
  skuGroupKey: string
  productIdentity: {
    productUuid?: string | null
    skuGroupKey: string
    brand: string
    code: string
    colorCode: string
  }
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
  periodStart: string
  periodEnd: string
  calculationBaseDate: string
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  forecastPeriodEndMonth?: string
  orderCoverageDays: number
  selfWeightPct: number
  dailyMean?: number
}
```

요청 의미:

- `productIdentity`는 백엔드가 응답에서 echo해야 하며, frontend는 mismatched product data를 거부한다.
- `productUuid`는 backend가 안정 UUID를 갖고 있으면 포함한다. legacy/mock에서는 `null`일 수 있다.
- `calculationBaseDate`는 재고/기존 오더 입고 예정량을 해석하는 기준일이다.
- `currentOrderInboundDueDate`는 금번 오더 입고일이다.
- `nextOrderInboundDueDate`는 차기 오더 입고일이며 exclusive end이다.
- 오더 계산 범위는 `[currentOrderInboundDueDate, nextOrderInboundDueDate)`이다.
- `forecastPeriodEndMonth`는 보통 `nextOrderInboundDueDate - 1 day`가 속한 `YYYY-MM`이다.
- `orderCoverageDays`는 위 exclusive 범위의 커버 일수이다.
- `selfWeightPct`는 자사/비교 size mix blending에 쓰인다.
- `dailyMean`이 있으면 frontend override demand mean이고, 없으면 backend가 계산한다.

`SecondaryStockOrderCalcResult`:

```ts
interface SecondaryStockOrderCalcResult {
  productIdentity: SecondaryProductIdentity
  inboundSplitSource: SecondaryInboundSplitSource
  existingOrderInboundSupplyBySize: Record<string, { date: string; qty: number }[]>
  trendDailyMean: number
  dailyMean: number
  sigma: number
  display: {
    currentStockQtyTotal: number
    totalOrderBalanceTotal: number
    expectedInboundOrderBalanceTotal: number
    sizeRows: {
      size: string
      currentStockQty: number
      totalOrderBalance: number
      expectedInboundOrderBalance: number
    }[]
  }
}
```

응답 의미:

- `productIdentity`는 요청 identity echo이다.
- `existingOrderInboundSupplyBySize`는 A, 즉 기존에 주문했지만 아직 입고되지 않은 수량의 날짜별 원천이다. 현재 드로어에서 편집 중인 금번/분할 오더 수량을 포함하지 않는다.
- `display.currentStockQty*`는 `calculationBaseDate` 기준 현재 재고이다.
- `display.totalOrderBalance*`는 A 전체 집계이다.
- `display.expectedInboundOrderBalance*`는 A 중 `date < currentOrderInboundDueDate`인 집계이다.
- `trendDailyMean`, `dailyMean`, `sigma`는 주문량 계산에 쓰는 수요 지표이다.
- `inboundSplitSource`는 오더 상세 추천과 분할입고 제안이 공유하는 단일 planning source이다.

### `SecondaryInboundSplitSource`

```ts
interface SecondaryInboundSplitSource {
  total: {
    suggestion: number
    sales: Record<string, number>
  }
  sizeInfo: Record<string, {
    salesRate: number
    baseStock: number
  }>
  expectation: Record<string, {
    date: string
    inbound: number
  }[]>
  confirmed: {
    total_phase: number
    data: {
      phase: number
      inbound_date: string
      quantity: Record<string, number>
    }[]
  }
}
```

필드 의미:

- `total.suggestion`은 backend가 제공하는 source 추천 집계값이다.
- frontend는 `total.suggestion`을 UI 최종 추천 총량으로 직접 쓰지 않는다. UI 여유재고(`bufferStock`)와 split 옵션이 반영된 최종 추천은 같은 planning 함수에서 별도 산정한다.
- `total.sales`는 전체 상품 기준 일 판매 예측이며 `[currentOrderInboundDueDate, nextOrderInboundDueDate)` 모든 날짜를 포함해야 한다.
- `sizeInfo[size].salesRate`는 0..1 size sales/share ratio이다.
- `sizeInfo[size].baseStock`은 분할입고 planning의 size별 기초 재고이다. 음수도 허용한다.
- `expectation[size][]`는 기존 오더의 미래 입고 예정량이다. 현재 드로어에서 편집 중인 금번/분할 오더는 포함하지 않는다.
- `confirmed`는 backend가 초기 확정 phase를 제공할 때의 source이다. 사용자가 적용한 현재 UI split rows의 저장 주체는 snapshot이다.

분할입고 planning 규칙:

- `/secondary/stock-order-calc`는 split count, split dates, draft row quantities, `bufferStock`, `ignoreExistingOrderInbound`를 요청으로 받지 않는다.
- 상세 추천 row와 분할입고 제안 row는 모두 `inboundSplitSource`와 같은 frontend planning 함수를 사용해야 한다.
- 수요 구간은 `[round n inbound date, round n+1 inbound date)`이다. 마지막 round의 다음 기준일은 `nextOrderInboundDueDate`이다.
- n차에 반영되는 기존 오더 입고 예정량은 `[round n-1 inbound date, round n inbound date)`이다.
- 1차는 이전 차수 구간이 없으므로 `ignoreExistingOrderInbound` 여부와 무관하다.
- `expectedInboundOrderBalance`처럼 `currentOrderInboundDueDate` 전 입고 예정 집계는 opening stock 성격으로 항상 반영된다.
- `ignoreExistingOrderInbound=true`는 각 round의 previous-to-current inbound window에 있는 기존 오더 입고 예정량만 무시한다.
- 차수별 재고 이월과 정수화 때문에 2차 이상에서는 총합이 소폭 달라질 수 있다. 큰 총량 차이는 계산 오류로 본다.

Compact response fragment:

```json
{
  "total": {
    "suggestion": 1224,
    "sales": {
      "2026-12-17": 123,
      "2026-12-18": 35
    }
  },
  "sizeInfo": {
    "230": { "salesRate": 0.072, "baseStock": 520 },
    "240": { "salesRate": 0.102, "baseStock": 123 }
  },
  "expectation": {
    "230": [
      { "date": "2027-01-12", "inbound": 20 }
    ],
    "240": []
  },
  "confirmed": {
    "total_phase": 0,
    "data": []
  }
}
```

## 5. Candidate snapshot boundary

- 후보 item의 `confirmedOrderSnapshot`은 `OrderSnapshotDocument | null`이다.
- 현재 snapshot schema version은 `8`이다.
- snapshot은 화면 복원 계약이다. 최신 API 값을 자동으로 재계산해서 덮어쓰는 계약이 아니다.
- snapshot 상세 계약은 [order-snapshot-backend-contract.md](./order-snapshot-backend-contract.md)를 따른다.

## 6. SSE

- SSE endpoint는 `text/event-stream`을 사용한다.
- frontend는 `requestId` 또는 job id 기준으로 stale event를 버린다.
- SSE endpoint도 company scope와 권한을 검증해야 한다.

## 7. Documentation policy

API 계약 변경 시 함께 갱신해야 하는 대상:

- `dashboard-app/src/api/types/*`
- `dashboard-app/src/api/requests/httpDashboardRequests.ts`
- `dashboard-app/src/api/requests/mockDashboardRequests.ts`
- `MD/backend-api/backend-api-spec.md`
- `MD/backend-api/dashboard-api-contract-catalog.md`
- 관련 dashboard boundary 문서
