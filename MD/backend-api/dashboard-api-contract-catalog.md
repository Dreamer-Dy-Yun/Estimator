# Dashboard API Contract Catalog

Last updated: 2026-06-19

이 문서는 백엔드 endpoint 작성자가 `dashboard-app`의 현재 API 요청을 빠르게 구현할 수 있도록 path params, query, body, response를 분리해서 정리한다.
실제 frontend 직렬화 기준은 `dashboard-app/src/api/requests/httpDashboardRequests.ts`이다.

## 1. Common

- Base path: `/api/v1`
- 인증: cookie 기반 session, `credentials: include`
- Error response: `{ message: string, code?: string, details?: unknown }`
- GET read/list API는 API별로 `companyUuid?`를 허용할 수 있다.
- mutation/import/job/SSE API는 concrete `companyUuid`를 요구한다.
- product drawer 계열은 `companyUuid` 대신 comparison subject query를 사용한다.

## 2. Subject query fields

| subject | query fields | 규칙 |
|---|---|---|
| base | `baseRole`, `baseKind`, `baseSourceId?` | `baseRole=base` |
| comparison | `comparisonRole`, `comparisonKind`, `comparisonSourceId?` | `comparisonRole=comparison` |

`competitor-channel` subject는 `sourceId`가 필수이다.

## 3. Auth

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
| `getCurrentAuthSession` | GET | `/auth/session` | none | none | none | `AuthSession | null` |
| `login` | POST | `/auth/login` | none | none | `LoginRequest` | `LoginResult` |
| `updateCurrentUser` | PATCH | `/auth/me` | none | none | `UpdateAuthUserPayload` | `AuthSession` |
| `changeCurrentUserPassword` | POST | `/auth/me/password` | none | none | `ChangePasswordPayload` | none |
| `logout` | POST | `/auth/logout` | none | none | none | none |

## 4. Admin

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
| `getAdminUsers` | GET | `/admin/users` | none | none | none | `AdminUserSummary[]` |
| `createAdminUser` | POST | `/admin/users` | none | none | `CreateAdminUserPayload` | `AdminUserSummary` |
| `updateAdminUser` | PATCH | `/admin/users/{uuid}` | `uuid` | none | `UpdateAdminUserPayload` | `AdminUserSummary` |
| `resetAdminUserPassword` | POST | `/admin/users/{uuid}/password-reset` | `uuid` | none | none | `ResetAdminUserPasswordResult` |
| `deleteAdminUser` | DELETE | `/admin/users/{uuid}` | `uuid` | none | none | none |
| `getAdminGptKeys` | GET | `/admin/gpt-keys` | none | none | none | `AdminGptKeySummary[]` |
| `createAdminGptKey` | POST | `/admin/gpt-keys` | none | none | `CreateAdminGptKeyPayload` | `AdminGptKeySummary` |
| `updateAdminGptKey` | PATCH | `/admin/gpt-keys/{uuid}` | `uuid` | none | `UpdateAdminGptKeyPayload` | `AdminGptKeySummary` |
| `rotateAdminGptKey` | POST | `/admin/gpt-keys/{uuid}/rotate` | `uuid` | none | `{ plainKey: string }` | `AdminGptKeySummary` |
| `testAdminGptKey` | POST | `/admin/gpt-keys/{uuid}/test` | `uuid` | none | none | `AdminGptKeyTestResult` |
| `deleteAdminGptKey` | DELETE | `/admin/gpt-keys/{uuid}` | `uuid` | none | none | none |
| `getAdminGoogleSheetConfigs` | GET | `/admin/google-sheets` | none | `companyUuid?` | none | `AdminGoogleSheetConfigSummary[]` |
| `createAdminGoogleSheetConfig` | POST | `/admin/google-sheets` | none | none | `CreateAdminGoogleSheetConfigPayload` | `AdminGoogleSheetConfigSummary` |
| `updateAdminGoogleSheetConfig` | PATCH | `/admin/google-sheets/{uuid}` | `uuid` | none | `UpdateAdminGoogleSheetConfigPayload` | `AdminGoogleSheetConfigSummary` |
| `deleteAdminGoogleSheetConfig` | DELETE | `/admin/google-sheets/{uuid}` | `uuid` | `companyUuid` | none | none |

## 5. System / Runtime

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
| `getCompanies` | GET | `/companies` | none | none | none | `CompanySummary[]` |
| `collectInventoryArrivalDates` | POST | `/inventory-arrival-dates/collect-from-sheet` | none | none | `{ companyUuid }` | `InventoryArrivalCollectionResult` |
| `getDashboardRuntimeConfig` | GET | `/dashboard/runtime-config` | none | none | none | `DashboardRuntimeConfig` |

## 6. Sales

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
| `getSelfSales` | GET | `/sales/self` | none | sales filter + `companyUuid?` | none | `SelfSalesRow[]` |
| `getCompetitorSales` | GET | `/sales/competitor` | none | sales filter + `competitorChannelId?`, `companyUuid?` | none | `CompetitorSalesRow[]` |
| `getSelfSalesScatterGrid` | GET | `/sales/self/scatter-grid` | none | sales grid filter + `companyUuid?` | none | `ScatterSalesGridResponse` |
| `getCompetitorSalesScatterGrid` | GET | `/sales/competitor/scatter-grid` | none | sales grid filter + `competitorChannelId?`, `companyUuid?` | none | `ScatterSalesGridResponse` |
| `getSalesFilterMeta` | GET | `/sales/filter-meta` | none | `companyUuid?` | none | `SalesFilterMeta` |

## 7. Product drawer / Secondary

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
| `getProductDrawerBundle` | GET | `/products/{skuGroupKey}/drawer-bundle` | `skuGroupKey` | base subject fields | none | `ProductDrawerBundle` |
| `getProductComparisonTargets` | GET | `/products/comparison-targets` | none | base subject fields | none | `ProductComparisonTarget[]` |
| `getProductMonthlyTrend` | GET | `/products/{skuGroupKey}/monthly-trend` | `skuGroupKey` | `startDate`, `endDate`, `forecastMonths`, base subject fields, comparison subject fields | none | `ProductMonthlyTrend` |
| `getProductSalesInsight` | GET | `/products/{skuGroupKey}/sales-insight` | `skuGroupKey` | `startDate`, `endDate`, base subject fields, comparison subject fields | none | `ProductSalesInsight` |
| `getProductSecondaryDetail` | GET | `/products/{skuGroupKey}/secondary-detail` | `skuGroupKey` | base subject fields, comparison subject fields, `minOpMarginPct?` | none | `ProductSecondaryDetail` |
| `getSecondaryDailyTrend` | GET | `/products/{skuGroupKey}/secondary/daily-trend` | `skuGroupKey` | `startDate`, `endDate`, `forecastDays`, `size?`, base subject fields, comparison subject fields | none | `SecondaryDailyTrendSource` |
| `getSecondaryAiComment` | POST | `/products/{skuGroupKey}/secondary/ai-comment` | `skuGroupKey` | none | `SecondaryAiCommentParams` without `skuGroupKey` | `SecondaryAiCommentResult` |
| `getSecondaryCompetitorChannels` | GET | `/secondary/competitor-channels` | none | none | none | `SecondaryCompetitorChannel[]` |
| `getSecondaryStockOrderCalc` | POST | `/secondary/stock-order-calc` | none | none | `SecondaryStockOrderCalcParams` | `SecondaryStockOrderCalcResult` |

### `ProductDrawerBundle`

Response:

```ts
interface ProductDrawerBundle {
  summary: ProductPrimarySummary
}

interface ProductPrimarySummary {
  skuGroupKey: string
  productUuid?: string | null
  productName: string
  brand: string
  category: string
  code: string
  colorCode: string
  imageUrl: string | null
  price: number
  qty: number
  availableStock: number
  monthlySalesTrend?: MonthlySalesPoint[]
}
```

`imageUrl` is the primary drawer product image URL. It is separate from list/candidate `thumbnailUrl`; clients must not synthesize it from product text fields.

### `getSecondaryDailyTrend`

Query fields:

- `startDate`
- `endDate`
- `forecastDays`
- `size?`
- `baseRole`, `baseKind`, `baseSourceId?`
- `comparisonRole`, `comparisonKind`, `comparisonSourceId?`

Response:

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

Rules:

- `size` omitted/null means all-size aggregate.
- `endDate` is the historical baseline end date; `forecastDays` extends the returned date range after `endDate`.
- `data.base` and `data.comparison` must cover every display date where `startDate <= date <= endDate + forecastDays`.
- `size` is the only size-specific query addition.
- Do not add stock-order-only query values such as inbound dates or `selfWeightPct`.
- `data.base[date].inbound` is daily inbound, not accumulated inbound.

### `getSecondaryStockOrderCalc`

Body:

```ts
interface SecondaryStockOrderCalcParams {
  skuGroupKey: string
  productIdentity: SecondaryProductIdentity
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

Response:

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

`SecondaryInboundSplitSource` response fragment:

- `total.suggestion`
- `total.sales: Record<date, number>`
- `sizeInfo: Record<size, { salesRate, baseStock }>`
- `expectation: Record<size, { date, inbound }[]>`
- `confirmed.total_phase`
- `confirmed.data[]: { phase, inbound_date, quantity }[]`

Rules:

- `productIdentity` must echo the requested product identity.
- `existingOrderInboundSupplyBySize` is A, the existing ordered but not-yet-inbound schedule. It excludes the draft/current order.
- `display.totalOrderBalance*` is the aggregate of all A points.
- `display.expectedInboundOrderBalance*` is the aggregate of A points with `date < currentOrderInboundDueDate`.
- The frontend order-detail table derives the expandable `미입고 총 잔량(EA)` breakdown from `existingOrderInboundSupplyBySize` by `date < currentOrderInboundDueDate`, `currentOrderInboundDueDate <= date < nextOrderInboundDueDate`, and `date >= nextOrderInboundDueDate`.
- `total.sales` covers `[currentOrderInboundDueDate, nextOrderInboundDueDate)`.
- `total.suggestion` is backend source aggregate, not necessarily frontend final recommendation.
- `sizeInfo[size].baseStock` is opening/current stock and may be negative.
- `expectation[size][]` is existing-order future inbound and excludes the draft/current order.
- Frontend final recommendations simulate stock flow by round. For round n, demand uses `[round n inbound date, round n+1 inbound date)` and existing-order inbound from the same interval is added on its actual inbound date before daily sales are subtracted.
- The suggested quantity is the amount required to keep the interval's lowest projected stock at or above the UI stock floor. `excludeSegmentExistingOrderInbound=true` excludes only the same-round `expectation` interval from that flow.
- Split count, split dates, applied rows, `bufferStock`, and `excludeSegmentExistingOrderInbound` are not request fields.
- Request body field names `currentOrderInboundDueDate`, `nextOrderInboundDueDate`, and `orderCoverageDays` are the current serialized API contract and must be preserved as-is for this endpoint.

Example request body:

```json
{
  "skuGroupKey": "TEST-SHOE__210",
  "productIdentity": {
    "productUuid": "sku-uuid",
    "skuGroupKey": "TEST-SHOE__210",
    "brand": "Brand",
    "code": "TEST-SHOE",
    "colorCode": "210"
  },
  "base": { "role": "base", "kind": "self-company", "sourceId": "company-uuid" },
  "comparison": {
    "role": "comparison",
    "kind": "competitor-channel",
    "id": "comparison:competitor-channel:kream",
    "label": "Kream",
    "sourceId": "kream"
  },
  "periodStart": "2025-01-01",
  "periodEnd": "2025-12-31",
  "calculationBaseDate": "2026-06-18",
  "currentOrderInboundDueDate": "2026-12-17",
  "nextOrderInboundDueDate": "2027-06-17",
  "forecastPeriodEndMonth": "2027-06",
  "orderCoverageDays": 182,
  "selfWeightPct": 50,
  "dailyMean": 1.4
}
```

## 8. Candidate stash / item

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
| `getCandidateStashes` | GET | `/candidate-stashes` | none | `companyUuid?` | none | `CandidateStashSummary[]` |
| `getCandidateItemsByStash` | GET | `/candidate-stashes/{stashUuid}/items` | `stashUuid` | `dataReferencePeriodStart`, `dataReferencePeriodEnd`, `companyUuid?` | none | `CandidateItemListResult` |
| `getCandidateRecommendations` | GET | `/candidate-stashes/{stashUuid}/recommendations` | `stashUuid` | `dataReferencePeriodStart`, `dataReferencePeriodEnd`, `limit?`, `cursor?`, `companyUuid?` | none | `CandidateRecommendationResult` |
| `createCandidateStash` | POST | `/candidate-stashes` | none | none | `name`, `note?`, `periodStart`, `periodEnd`, `forecastMonths`, `companyUuid` | `CandidateStashSummary` |
| `updateCandidateStash` | PATCH | `/candidate-stashes/{stashUuid}` | `stashUuid` | none | `name`, `note?`, `companyUuid` | `CandidateStashSummary` |
| `deleteCandidateStash` | DELETE | `/candidate-stashes/{stashUuid}` | `stashUuid` | `companyUuid` | none | none |
| `duplicateCandidateStash` | POST | `/candidate-stashes/{stashUuid}/duplicate` | `stashUuid` | none | `companyUuid` | none |
| `appendCandidateItem` | POST | `/candidate-stashes/{stashUuid}/items` | `stashUuid` | none | `skuGroupKey`, `confirmedOrderSnapshot`, `isLatestLlmComment`, `companyUuid` | none |
| `appendCandidateItems` | POST | `/candidate-stashes/{stashUuid}/items/bulk` | `stashUuid` | none | `competitorChannelId?`, `skuGroupKeys`, `companyUuid` | `AppendCandidateItemsResponse` |
| `getCandidateItemByUuid` | GET | `/candidate-items/{itemUuid}` | `itemUuid` | `companyUuid?` | none | `CandidateItemDetail | null` |
| `updateCandidateItem` | PATCH | `/candidate-items/{itemUuid}` | `itemUuid` | none | `confirmedOrderSnapshot`, `isLatestLlmComment`, `companyUuid` | `CandidateItemDetail` |
| `deleteCandidateItem` | DELETE | `/candidate-items/{itemUuid}` | `itemUuid` | `companyUuid` | none | none |
| `deleteCandidateItems` | DELETE | `/candidate-stashes/{stashUuid}/items` | `stashUuid` | none | `itemUuids`, `companyUuid` | none |
| `getCandidateStashExcelTemplateDownload` | GET | `/candidate-stashes/excel-template` | none | none | none | download descriptor |
| `uploadCandidateStashExcel` | POST | `/candidate-stashes/import/excel` | none | none | multipart `file`, `companyUuid` | `CandidateStashExcelUploadResult` |

Candidate DTO notes:

- `CandidateItemDetail.confirmedOrderSnapshot`: saved `OrderSnapshotDocument | null`.
- `CandidateItemSummary.hasConfirmedOrderSnapshot`: saved snapshot existence flag.
- `CandidateItemInsightSummary.competitorSalesSourceLabel`: sales insight source label.
- `CandidateItemOrderExport.comparisonSubjectLabel`: comparison subject label used for order metric/export.
- `CandidateItemOrderExport.inboundRounds[]`: order export inbound schedule, one row per confirmed inbound round. Shape: `{ round: number, inboundDate: YYYY-MM-DD }`. Snapshot-backed items should map this from `confirmed.rounds[]`; non-snapshot live calculation may return an empty array when no confirmed inbound schedule exists.
- `CandidateItemOrderExport.inboundExpectedDate`: legacy/fallback single date field. Excel export uses `inboundRounds[]` first.

## 9. Job / SSE

| API | Method | Path | Path params | Query | Body | Response / Transport |
|---|---|---|---|---|---|---|
| `subscribeCandidateOrderMetrics` | GET | `/candidate-stashes/{stashUuid}/items/order-metrics/events` | `stashUuid` | `requestId`, `dataReferencePeriodStart`, `dataReferencePeriodEnd`, `candidateItemUuids`, `companyUuid`, comparison subject fields | none | SSE |
| `startCandidateDetailBulkConfirm` | POST | `/candidate-stashes/{stashUuid}/items/detail-confirmation-jobs` | `stashUuid` | none | `candidateItemUuids`, `dataReferencePeriodStart`, `dataReferencePeriodEnd`, `companyUuid` | `CandidateDetailBulkConfirmStartResult` |
| `subscribeCandidateDetailBulkConfirm` | GET | `/candidate-item-detail-confirmation-jobs/{jobId}/events` | `jobId` | `companyUuid` | none | SSE |
| `startCandidateStashLlmCommentJob` | POST | `/candidate-stashes/{stashUuid}/llm-comment-jobs` | `stashUuid` | none | `companyUuid` | `CandidateStashLlmCommentJobStartResult` |
| `subscribeCandidateStashLlmCommentJob` | GET | `/candidate-stash-llm-comment-jobs/{jobId}/events` | `jobId` | `companyUuid` | none | SSE |

## 10. Reference

- HTTP adapter: `dashboard-app/src/api/requests/httpDashboardRequests.ts`
- API types: `dashboard-app/src/api/types/*`
- Snapshot type: `dashboard-app/src/snapshot/orderSnapshotTypes.ts`
- Snapshot parser: `dashboard-app/src/snapshot/parseOrderSnapshot.ts`
