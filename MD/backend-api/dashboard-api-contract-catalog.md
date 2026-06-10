# Dashboard API Contract Catalog

Last updated: 2026-06-10

Purpose: current backend implementation contract for the frontend in `dashboard-app`.

This catalog intentionally contains only the current API shape. Previous shapes are archived under `OLD/2026-06-10-before-current-api-rewrite/` and summarized in `CHANGELOG.md`.

## 1. Common

- Base path: `/api/v1`.
- Date-only fields: `YYYY-MM-DD`.
- Timestamps: ISO 8601 string.
- Auth: cookie/session with `credentials: include`.
- Error body: `{ message: string, code?: string, details?: unknown }`.
- Read scope: `companyUuid?`; omitted means all-company read only where listed.
- Company-owned mutation, import, candidate job, and candidate SSE scope: `companyUuid` required.
- Product drawer comparison scope: subject fields, not top-level `companyUuid`.

## 2. Subject DTOs

Type source: `dashboard-app/src/api/types/subject.ts`.

```ts
type ComparisonSubjectKind = 'competitor-channel' | 'self-company'
type ComparisonSubjectRole = 'base' | 'comparison'

interface ComparisonBaseSubjectRef {
  role: 'base'
  kind: 'self-company'
  sourceId?: string
}

type ComparisonComparisonSubjectRef =
  | { role: 'comparison'; kind: 'competitor-channel'; sourceId: string }
  | { role: 'comparison'; kind: 'self-company'; sourceId?: string }

type ComparisonSubject<TRef> = TRef & {
  id: string
  label: string
}
```

HTTP query encoding:

```http
baseRole=base
baseKind=self-company
baseSourceId={COMPANY.uuid}
comparisonRole=comparison
comparisonKind=competitor-channel
comparisonSourceId={COMPETITOR_CHANNEL.id}
```

All-company self-company subject omits `baseSourceId` or `comparisonSourceId`.

## 3. Auth and admin user

Type source: `dashboard-app/src/api/types/auth.ts`.

| Frontend function | Method/path | Request | Response |
|---|---|---|---|
| `getCurrentAuthSession` | GET `/auth/session` | none | `AuthSession`; 401 maps to `null` |
| `login` | POST `/auth/login` | `LoginRequest` | `LoginResult` |
| `updateCurrentUser` | PATCH `/auth/me` | `UpdateAuthUserPayload` | `AuthSession` |
| `changeCurrentUserPassword` | POST `/auth/me/password` | `ChangePasswordPayload` | empty |
| `logout` | POST `/auth/logout` | none | empty |
| `getAdminUsers` | GET `/admin/users` | none | `AdminUserSummary[]` |
| `createAdminUser` | POST `/admin/users` | `CreateAdminUserPayload` | `AdminUserSummary` |
| `updateAdminUser` | PATCH `/admin/users/{uuid}` | `UpdateAdminUserPayload` | `AdminUserSummary` |
| `resetAdminUserPassword` | POST `/admin/users/{uuid}/password-reset` | none | `ResetAdminUserPasswordResult` |
| `deleteAdminUser` | DELETE `/admin/users/{uuid}` | none | empty |

Key DTOs:

```ts
interface AuthUser {
  uuid: string
  loginId: string
  name: string
  role: 'admin' | 'user'
  mustChangePassword: boolean
}

interface AuthSession {
  user: AuthUser
  expiresAt: string
}

interface AdminUserSummary extends AuthUser {
  note: string | null
  isActive: boolean
  dbUpdatedAt: string
}

interface ResetAdminUserPasswordResult {
  temporaryPassword: string
  mustChangePassword: boolean
  dbUpdatedAt: string
}
```

## 4. Admin GPT key

Type source: `dashboard-app/src/api/types/admin-gpt-key.ts`.

| Frontend function | Method/path | Request | Response |
|---|---|---|---|
| `getAdminGptKeys` | GET `/admin/gpt-keys` | none | `AdminGptKeySummary[]` |
| `createAdminGptKey` | POST `/admin/gpt-keys` | `CreateAdminGptKeyPayload` | `AdminGptKeySummary` |
| `updateAdminGptKey` | PATCH `/admin/gpt-keys/{uuid}` then optional POST `/admin/gpt-keys/{uuid}/rotate` | `UpdateAdminGptKeyPayload` | `AdminGptKeySummary` |
| `rotateAdminGptKey` | POST `/admin/gpt-keys/{uuid}/rotate` | `{ plainKey }` | `AdminGptKeySummary` |
| `testAdminGptKey` | POST `/admin/gpt-keys/{uuid}/test` | none | `AdminGptKeyTestResult` |
| `deleteAdminGptKey` | DELETE `/admin/gpt-keys/{uuid}` | none | empty |

Raw keys may be present only in create/update/rotate request bodies. Responses expose `maskedKey`, never raw key.

## 5. Admin Google Sheet

Type source: `dashboard-app/src/api/types/admin-google-sheet.ts`.

| Frontend function | Method/path | Request | Response |
|---|---|---|---|
| `getAdminGoogleSheetConfigs` | GET `/admin/google-sheets?companyUuid?` | optional scope | `AdminGoogleSheetConfigSummary[]` |
| `createAdminGoogleSheetConfig` | POST `/admin/google-sheets` | `CreateAdminGoogleSheetConfigPayload` | `AdminGoogleSheetConfigSummary` |
| `updateAdminGoogleSheetConfig` | PATCH `/admin/google-sheets/{uuid}` | `UpdateAdminGoogleSheetConfigPayload` | `AdminGoogleSheetConfigSummary` |
| `deleteAdminGoogleSheetConfig` | DELETE `/admin/google-sheets/{uuid}?companyUuid=...` | concrete company query | empty |

Backend stores service account JSON and returns `serviceAccountEmail`, `maskedServiceAccountKey`, `spreadsheetUrl`, `spreadsheetId`.

## 6. Company

Type source: `dashboard-app/src/api/types/company.ts`.

| Frontend function | Method/path | Request | Response |
|---|---|---|---|
| `getCompanies` | GET `/companies` | none | `CompanySummary[]` |

`CompanySummary`: `{ uuid: string; name: string }`.

The frontend owns its internal all-company sentinel. Backend should return real companies only unless a product decision explicitly changes this contract.

## 7. Inventory arrival

Type source: `dashboard-app/src/api/types/inventory-arrival.ts`.

| Frontend function | Method/path | Request | Response |
|---|---|---|---|
| `collectInventoryArrivalDates` | POST `/inventory-arrival-dates/collect-from-sheet` | `{ companyUuid }` | `InventoryArrivalCollectionResult` |

Response:

```ts
interface InventoryArrivalCollectionResult {
  status: 'success' | 'partial' | 'failed'
  collectedCount: number
  failedCount: number
  message: string
  collectedAt: string
}
```

## 8. Sales analysis

Type sources: `dashboard-app/src/api/types/sales.ts`, `dashboard-app/src/types.ts`.

Common query:

```ts
interface SelfSalesParams {
  companyUuid?: string
  startDate?: string
  endDate?: string
  brand?: string
  category?: string
  codeQuery?: string
  colorCode?: string
  nameQuery?: string
}
```

| Frontend function | Method/path | Query | Response |
|---|---|---|---|
| `getSelfSales` | GET `/sales/self` | common | `SelfSalesRow[]` |
| `getCompetitorSales` | GET `/sales/competitor` | common + `competitorChannelId?` | `CompetitorSalesRow[]` |
| `getSelfSalesScatterGrid` | GET `/sales/self/scatter-grid` | common + bucket params | `ScatterSalesGridResponse` |
| `getCompetitorSalesScatterGrid` | GET `/sales/competitor/scatter-grid` | common + `competitorChannelId?` + bucket params | `ScatterSalesGridResponse` |
| `getSalesFilterMeta` | GET `/sales/filter-meta` | `companyUuid?` | `SalesFilterMeta` |

Common row identity fields:

```ts
id
skuGroupKey
brand
category
code
productName
colorCode
thumbnailUrl: string | null
```

`thumbnailUrl` is a DB/API supplied small product thumbnail URL. `null` means no thumbnail.

`ScatterSalesGridResponse`:

```ts
interface ScatterSalesGridResponse {
  cells: ScatterGridCell[]
  meta: {
    xAxis: { min; max; bucketSize }
    yAxis: { min; max; bucketSize }
  }
}
```

`cells[].skuIds` contains `skuGroupKey` strings.

Note: the current frontend can also build scatter cells from already loaded list rows for small data. The scatter-grid endpoints remain the HTTP adapter contract for larger data/server-side binning and must match list filters when used.

## 9. Product drawer and comparison

Type sources: `dashboard-app/src/api/types/drawer.ts`, `dashboard-app/src/api/types/secondary.ts`.

| Frontend function | Method/path | Query/body | Response |
|---|---|---|---|
| `getProductDrawerBundle` | GET `/products/{skuGroupKey}/drawer-bundle` | base subject query | `ProductDrawerBundle` |
| `getProductComparisonTargets` | GET `/products/comparison-targets` | base subject query | `ProductComparisonTarget[]` |
| `getProductMonthlyTrend` | GET `/products/{skuGroupKey}/monthly-trend` | date range, `forecastMonths`, base subject, comparison subject | `ProductMonthlyTrend` |
| `getProductSalesInsight` | GET `/products/{skuGroupKey}/sales-insight` | date range, base subject, comparison subject | `ProductSalesInsight` |
| `getProductSecondaryDetail` | GET `/products/{skuGroupKey}/secondary-detail` | base subject, comparison subject, `minOpMarginPct?` | `ProductSecondaryDetail` |
| `getSecondaryDailyTrend` | GET `/products/{skuGroupKey}/secondary/daily-trend` | date range, `forecastDays`, base subject, comparison subject | `SecondaryDailyTrendPoint[]` |
| `getSecondaryAiComment` | POST `/products/{skuGroupKey}/secondary/ai-comment` | `SecondaryAiCommentParams` body without path `skuGroupKey` | `SecondaryAiCommentResult` |
| `getSecondaryStockOrderCalc` | POST `/secondary/stock-order-calc` | `SecondaryStockOrderCalcParams` | `SecondaryStockOrderCalcResult` |

`SecondaryAiCommentParams` body:

```ts
interface SecondaryAiCommentParams {
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  base: ComparisonBaseSubjectRef
  comparison: ComparisonComparisonSubjectRef
  candidateItemUuid?: string | null
  snapshotForAiComment?: OrderSnapshotDocument
}
```

The HTTP adapter puts `skuGroupKey` in the path and sends the remaining fields as the POST body.

Example AI comment body:

```json
{
  "periodStart": "2025-01-01",
  "periodEnd": "2025-12-31",
  "forecastMonths": 12,
  "base": { "role": "base", "kind": "self-company", "sourceId": "hana-company-uuid" },
  "comparison": { "role": "comparison", "kind": "competitor-channel", "sourceId": "kream" },
  "candidateItemUuid": "candidate-item-uuid",
  "snapshotForAiComment": { "schemaVersion": 3 }
}
```

Example sales insight request:

```http
GET /api/v1/products/A-101%7C030/sales-insight
  ?startDate=2025-06-10
  &endDate=2026-06-10
  &baseRole=base
  &baseKind=self-company
  &baseSourceId=hana-company-uuid
  &comparisonRole=comparison
  &comparisonKind=competitor-channel
  &comparisonSourceId=kream
```

Example self-company comparison:

```http
GET /api/v1/products/A-101%7C030/monthly-trend
  ?startDate=2024-06-01
  &endDate=2026-06-30
  &forecastMonths=12
  &baseRole=base
  &baseKind=self-company
  &baseSourceId=hana-company-uuid
  &comparisonRole=comparison
  &comparisonKind=self-company
  &comparisonSourceId=t1-company-uuid
```

`ProductDrawerBundle`: `{ summary: ProductPrimarySummary }`.

`ProductComparisonTarget` fields:

```ts
id
role: 'comparison'
kind: 'competitor-channel' | 'self-company'
sourceId?: string
label
```

`ProductSalesInsight` fields:

```ts
skuGroupKey
targetPeriodDays: { start; end }
base
comparison
baseMetrics
comparisonMetrics
```

## 10. Secondary competitor channels

| Frontend function | Method/path | Request | Response |
|---|---|---|---|
| `getSecondaryCompetitorChannels` | GET `/secondary/competitor-channels` | none | `SecondaryCompetitorChannel[]` |

Successful response is cached by the frontend master-data cache.

## 11. Candidate stash and candidate items

Type sources: `dashboard-app/src/api/types/candidate.ts`, `dashboard-app/src/api/types/candidate-order-metrics.ts`.

| Frontend function | Method/path | Request | Response |
|---|---|---|---|
| `getCandidateStashes` | GET `/candidate-stashes?companyUuid?` | optional read scope | `CandidateStashSummary[]` |
| `createCandidateStash` | POST `/candidate-stashes` | `CreateCandidateStashPayload` | `CandidateStashSummary` |
| `updateCandidateStash` | PATCH `/candidate-stashes/{stashUuid}` | body without path `stashUuid` | `CandidateStashSummary` |
| `deleteCandidateStash` | DELETE `/candidate-stashes/{stashUuid}?companyUuid=...` | concrete company query | empty |
| `duplicateCandidateStash` | POST `/candidate-stashes/{stashUuid}/duplicate` | `CompanyMutationScopeParams` | empty |
| `getCandidateItemsByStash` | GET `/candidate-stashes/{stashUuid}/items` | data reference period + optional company | `CandidateItemListResult` |
| `getCandidateRecommendations` | GET `/candidate-stashes/{stashUuid}/recommendations` | data reference period, `limit?`, `cursor?`, optional company | `CandidateRecommendationResult` |
| `appendCandidateItem` | POST `/candidate-stashes/{stashUuid}/items` | single item with snapshot | empty |
| `appendCandidateItems` | POST `/candidate-stashes/{stashUuid}/items/bulk` | `skuGroupKeys`, optional `competitorChannelId`, company | `AppendCandidateItemsResponse` |
| `updateCandidateItem` | PATCH `/candidate-items/{itemUuid}` | body without path `itemUuid` | `CandidateItemDetail` |
| `getCandidateItemByUuid` | GET `/candidate-items/{itemUuid}?companyUuid?` | optional company | `CandidateItemDetail | null` |
| `deleteCandidateItem` | DELETE `/candidate-items/{itemUuid}?companyUuid=...` | concrete company query | empty |
| `deleteCandidateItems` | DELETE `/candidate-stashes/{stashUuid}/items` | `{ itemUuids, companyUuid }` | empty |
| `getCandidateStashExcelTemplateDownload` | GET `/candidate-stashes/excel-template` | browser download URL | file |
| `uploadCandidateStashExcel` | POST `/candidate-stashes/import/excel` | multipart `file`, `companyUuid` | `CandidateStashExcelUploadResult` |

`CandidateItemSummary` and `CandidateReferenceItemSummary` include `thumbnailUrl: string | null`.

`CandidateStashItemSummary` is a slim status DTO and does not include thumbnail.

Example candidate stash create body:

```json
{
  "companyUuid": "hana-company-uuid",
  "name": "기본 후보군 A",
  "note": "초기 목록 데이터",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-12-31",
  "forecastMonths": 12
}
```

Example bulk append body:

```json
{
  "companyUuid": "hana-company-uuid",
  "skuGroupKeys": ["A-101|030", "B-152|020"],
  "competitorChannelId": "kream"
}
```

Example update item body:

```json
{
  "companyUuid": "hana-company-uuid",
  "details": { "schemaVersion": 3 },
  "isLatestLlmComment": true
}
```

Mutation endpoints that return no body may respond with `204 No Content`.

Excel upload is multipart:

```txt
POST /api/v1/candidate-stashes/import/excel
Content-Type: multipart/form-data

file=<xlsx file>
companyUuid=hana-company-uuid
```

## 12. Candidate SSE and jobs

| Frontend function | Method/path | Request | Event/response |
|---|---|---|---|
| `subscribeCandidateOrderMetrics` | SSE `/candidate-stashes/{stashUuid}/items/order-metrics/events` | `requestId`, data reference period, repeated `candidateItemUuids`, `companyUuid` | `CandidateOrderMetricEvent` |
| `startCandidateStashLlmCommentJob` | POST `/candidate-stashes/{stashUuid}/llm-comment-jobs` | `companyUuid` | `{ jobId, stashUuid, itemCount }` |
| `subscribeCandidateStashLlmCommentJob` | SSE `/candidate-stash-llm-comment-jobs/{jobId}/events` | `companyUuid` | `CandidateStashLlmCommentJobProgressEvent` |
| `startCandidateDetailBulkConfirm` | POST `/candidate-stashes/{stashUuid}/items/detail-confirmation-jobs` | item ids, data reference period, company | `{ jobId, stashUuid, itemCount }` |
| `subscribeCandidateDetailBulkConfirm` | SSE `/candidate-item-detail-confirmation-jobs/{jobId}/events` | `companyUuid` | `CandidateDetailBulkConfirmProgressEvent` |

Order metric event shape:

```ts
type CandidateOrderMetricEvent =
  | { type: 'item'; requestId; itemUuid; skuUuid; metric }
  | { type: 'itemFailed'; requestId; itemUuid; skuUuid; message }
  | { type: 'completed'; requestId; processedCount; failedCount }
```

Wire query uses repeated query params, not bracketed keys:

```http
GET /api/v1/candidate-stashes/stash-uuid/items/order-metrics/events
  ?requestId=req-001
  &dataReferencePeriodStart=2025-01-01
  &dataReferencePeriodEnd=2025-12-31
  &companyUuid=hana-company-uuid
  &candidateItemUuids=item-1
  &candidateItemUuids=item-2
```

SSE message examples:

```txt
data: {"type":"item","requestId":"req-001","itemUuid":"item-1","skuUuid":"sku-1","metric":{"itemUuid":"item-1","skuUuid":"sku-1","qty":100,"expectedOrderAmount":1000000,"expectedSalesAmount":1300000,"expectedOpProfit":120000,"orderExport":{"competitorChannelLabel":"크림","selfQty":80,"competitorQty":100,"expectedSalesQty":100,"expectedOrderAmount":1000000,"avgCost":10000,"avgPrice":13000,"feeRatePct":13,"opMarginRatePct":9,"inboundExpectedDate":"2026-04-01","sizeOrderQty":[{"size":"240","orderQty":10}]}}}

data: {"type":"completed","requestId":"req-001","processedCount":2,"failedCount":0}
```

Standard error body example:

```json
{
  "message": "Candidate item is not visible in the selected company scope.",
  "code": "CANDIDATE_ITEM_FORBIDDEN",
  "details": { "itemUuid": "item-1" }
}
```

## 13. Order snapshot

Type source:

- API alias: `dashboard-app/src/api/types/snapshot.ts`
- Actual schema: `dashboard-app/src/snapshot/orderSnapshotTypes.ts`

Rules:

- Candidate item `details` is `OrderSnapshotDocument | null`.
- Current snapshot schema version is `3`.
- `details` and `isLatestLlmComment` are wrapper API fields, not snapshot fields.
- Snapshot v3 stores `drawer2.baseSubject`, `drawer2.comparisonSubject`, and `drawer2.comparisonBasis`.
- Full snapshot details remain in `order-snapshot-backend-contract.md`.
