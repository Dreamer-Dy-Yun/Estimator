# Dashboard API Contract Catalog

Last updated: 2026-06-18

이 문서는 백엔드 endpoint 작성자가 빠르게 참조할 수 있도록 현재 `dashboard-app`의 API 요청을 path/query/body/response 기준으로 정리한다. 실제 프론트 요청 직렬화 기준은 `dashboard-app/src/api/requests/httpDashboardRequests.ts`이다.

## 1. 공통 규칙

- Base path: `/api/v1`
- 인증: cookie 기반 세션, `credentials: include`
- 에러 응답: `{ message: string, code?: string, details?: unknown }`
- 읽기 API의 `companyUuid`는 선택값일 수 있다.
- mutation/import/job API의 `companyUuid`는 필수이다.
- 상품 API의 비교 주체는 subject query field를 사용한다.

## 2. Subject query fields

| subject | query fields | 규칙 |
|---|---|---|
| base | `baseRole`, `baseKind`, `baseSourceId?` | `baseRole=base`, 기본 `baseKind=self-company` |
| comparison | `comparisonRole`, `comparisonKind`, `comparisonSourceId?` | `comparisonRole=comparison` |

`competitor-channel` subject는 `sourceId`가 필수이다.

## 3. Auth / Admin

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
| `getCurrentAuthSession` | GET | `/auth/session` | none | none | none | `AuthSession | null` |
| `login` | POST | `/auth/login` | none | none | `LoginRequest` | `LoginResult` |
| `updateCurrentUser` | PATCH | `/auth/me` | none | none | `UpdateAuthUserPayload` | `AuthSession` |
| `changeCurrentUserPassword` | POST | `/auth/me/password` | none | none | `ChangePasswordPayload` | none |
| `logout` | POST | `/auth/logout` | none | none | none | none |
| `getAdminUsers` | GET | `/admin/users` | none | none | none | `AdminUserSummary[]` |
| `createAdminUser` | POST | `/admin/users` | none | none | `CreateAdminUserPayload` | `AdminUserSummary` |
| `updateAdminUser` | PATCH | `/admin/users/{uuid}` | `uuid` | none | `UpdateAdminUserPayload` | `AdminUserSummary` |
| `resetAdminUserPassword` | POST | `/admin/users/{uuid}/password-reset` | `uuid` | none | none | `ResetAdminUserPasswordResult` |
| `deleteAdminUser` | DELETE | `/admin/users/{uuid}` | `uuid` | none | none | none |

## 4. Admin configuration

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
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
| `getSelfSales` | GET | `/sales/self` | none | `startDate?`, `endDate?`, `brand?`, `category?`, `codeQuery?`, `colorCode?`, `nameQuery?`, `companyUuid?` | none | `SelfSalesRow[]` |
| `getCompetitorSales` | GET | `/sales/competitor` | none | sales filter + `competitorChannelId?` | none | `CompetitorSalesRow[]` |
| `getSelfSalesScatterGrid` | GET | `/sales/self/scatter-grid` | none | sales grid filter + `companyUuid?` | none | `ScatterSalesGridResponse` |
| `getCompetitorSalesScatterGrid` | GET | `/sales/competitor/scatter-grid` | none | sales grid filter + `competitorChannelId?` | none | `ScatterSalesGridResponse` |
| `getSalesFilterMeta` | GET | `/sales/filter-meta` | none | `companyUuid?` | none | `SalesFilterMeta` |

## 7. Product drawer / Secondary

| API | Method | Path | Path params | Query | Body | Response |
|---|---|---|---|---|---|---|
| `getProductDrawerBundle` | GET | `/products/{skuGroupKey}/drawer-bundle` | `skuGroupKey` | base subject fields | none | `ProductDrawerBundle` |
| `getProductComparisonTargets` | GET | `/products/comparison-targets` | none | base subject fields | none | `ProductComparisonTarget[]` |
| `getProductMonthlyTrend` | GET | `/products/{skuGroupKey}/monthly-trend` | `skuGroupKey` | `startDate`, `endDate`, `forecastMonths`, base subject fields, comparison subject fields | none | `ProductMonthlyTrend` |
| `getProductSalesInsight` | GET | `/products/{skuGroupKey}/sales-insight` | `skuGroupKey` | `startDate`, `endDate`, base subject fields, comparison subject fields | none | `ProductSalesInsight` |
| `getProductSecondaryDetail` | GET | `/products/{skuGroupKey}/secondary-detail` | `skuGroupKey` | base subject fields, comparison subject fields, `minOpMarginPct?` | none | `ProductSecondaryDetail` |
| `getSecondaryDailyTrend` | GET | `/products/{skuGroupKey}/secondary/daily-trend` | `skuGroupKey` | `startDate`, `endDate`, `forecastDays`, base subject fields, comparison subject fields | none | `SecondaryDailyTrendSource` |
| `getSecondaryAiComment` | POST | `/products/{skuGroupKey}/secondary/ai-comment` | `skuGroupKey` | none | `SecondaryAiCommentParams` without `skuGroupKey` | `SecondaryAiCommentResult` |
| `getSecondaryCompetitorChannels` | GET | `/secondary/competitor-channels` | none | none | none | `SecondaryCompetitorChannel[]` |
| `getSecondaryStockOrderCalc` | POST | `/secondary/stock-order-calc` | none | none | `SecondaryStockOrderCalcParams` | `SecondaryStockOrderCalcResult` |
`SecondaryProductIdentity`: `productUuid?`, `skuGroupKey`, `brand`, `code`, `colorCode`.
`SecondaryStockOrderCalcParams`: `skuGroupKey`, `productIdentity`, `base`, `comparison`, `periodStart`, `periodEnd`, `calculationBaseDate`, `currentOrderInboundDueDate`, `nextOrderInboundDueDate`, `forecastPeriodEndMonth?`, `orderCoverageDays`, `selfWeightPct`, `dailyMean?`.
`forecastPeriodEndMonth` uses `YYYY-MM` and represents the month containing the final included coverage date (`nextOrderInboundDueDate - 1 day` for the current split/order window). `orderCoverageDays` is the order coverage day count.

`SecondaryStockOrderCalcResult` response:

- `productIdentity`: echo of the requested product identity.
- `existingOrderInboundSupplyBySize`: A. `Record<size, { date, qty }[]>` for existing ordered but not-yet-inbound quantities collected from backend-managed Google Sheet staging data.
- `display.totalOrderBalance*`: aggregate of all A points.
- `display.expectedInboundOrderBalance*`: aggregate of A points with `date < currentOrderInboundDueDate`.
- `display.currentStockQty*`: current stock as of `calculationBaseDate`.
- `inboundSplitSource`: single source for detailed recommended quantities and split-inbound planning, included in `SecondaryStockOrderCalcResult`.



`SecondaryStockOrderCalcResult.inboundSplitSource` response fragment:

- `productId`
- `productIdentity`
- `calculationBaseDate`
- `coverageStartDate`
- `coverageEndDate`
- `supplyBySize: Record<size, { date, qty }[]>`
- `salesForecastByDate: Record<date, Record<size, number>>`

`supplyBySize[size][]` uses the same point shape as A. The `calculationBaseDate` point is current stock, and later points are existing-order inbound quantities unrelated to the draft/current order. `salesForecastByDate` contains sales forecast only and must not mix inbound quantities. This source is part of `getSecondaryStockOrderCalc`; it is not requested through a separate endpoint.

Example stock-order-calc request body:

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
  "comparison": { "role": "comparison", "kind": "competitor-channel", "id": "comparison:competitor-channel:kream", "label": "Kream", "sourceId": "kream" },
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
| `getCandidateStashExcelTemplateDownload` | GET | `/candidate-stashes/excel-template` | none | none | none | `CandidateStashExcelTemplateDownload` |
| `uploadCandidateStashExcel` | POST | `/candidate-stashes/import/excel` | none | none | multipart `file`, `companyUuid` | `CandidateStashExcelUploadResult` |


Candidate DTO fields:

- `CandidateItemDetail.confirmedOrderSnapshot`: saved `OrderSnapshotDocument | null`.
- `CandidateItemSummary.hasConfirmedOrderSnapshot`: saved snapshot existence flag.
- `CandidateItemInsightSummary.competitorSalesSourceLabel`: sales insight source label.
- `CandidateItemOrderExport.comparisonSubjectLabel`: order metric/export comparison subject label.
## 9. Job / SSE

| API | Method | Path | Path params | Query | Body | Response / Transport |
|---|---|---|---|---|---|---|
| `subscribeCandidateOrderMetrics` | GET | `/candidate-stashes/{stashUuid}/items/order-metrics/events` | `stashUuid` | `requestId`, `dataReferencePeriodStart`, `dataReferencePeriodEnd`, `candidateItemUuids`, `companyUuid`, comparison subject fields | none | SSE |
| `startCandidateDetailBulkConfirm` | POST | `/candidate-stashes/{stashUuid}/items/detail-confirmation-jobs` | `stashUuid` | none | `candidateItemUuids`, `dataReferencePeriodStart`, `dataReferencePeriodEnd`, `companyUuid` | `CandidateDetailBulkConfirmStartResult` |
| `subscribeCandidateDetailBulkConfirm` | GET | `/candidate-item-detail-confirmation-jobs/{jobId}/events` | `jobId` | `companyUuid` | none | SSE |
| `startCandidateStashLlmCommentJob` | POST | `/candidate-stashes/{stashUuid}/llm-comment-jobs` | `stashUuid` | none | `companyUuid` | `CandidateStashLlmCommentJobStartResult` |
| `subscribeCandidateStashLlmCommentJob` | GET | `/candidate-stash-llm-comment-jobs/{jobId}/events` | `jobId` | `companyUuid` | none | SSE |

SSE는 `text/event-stream`을 사용한다. 프론트는 `requestId` 또는 job id 기준으로 stale event를 버린다.

## 10. Reference

- HTTP adapter: `dashboard-app/src/api/requests/httpDashboardRequests.ts`
- API types: `dashboard-app/src/api/types/*`
- Snapshot type: `dashboard-app/src/snapshot/orderSnapshotTypes.ts`
- Snapshot parser: `dashboard-app/src/snapshot/parseOrderSnapshot.ts`
