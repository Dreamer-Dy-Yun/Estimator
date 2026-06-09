# Dashboard API Contract Catalog

Last updated: 2026-06-09

Purpose: backend implementation contract for the current frontend. This document lists current DTO and endpoint shapes only. No previous payload shape is part of this contract.

## 1. Common

- Base path: `/api/v1`.
- Dates: date-only fields use `YYYY-MM-DD`; timestamps use ISO 8601 strings.
- `companyUuid` omitted means all-company read only for read-like endpoints.
- Mutation, import, job start, and job SSE endpoints require one concrete `companyUuid`.
- Frontend internal sentinel `ALL_COMPANY_UUID` must never reach the backend.

### Failure kinds

| Status/source | Frontend kind | Meaning |
|---|---|---|
| 401 | `auth` | Missing or invalid session |
| 403 | `permission` | No role/company/data access |
| 408, 504 | `timeout` | Request or gateway timeout |
| 404 | `not-found` | Resource missing in visible scope |
| 409 | `conflict` | Duplicate or state conflict |
| 422 | `validation` | Payload/business validation failure |
| Other 4xx | `client` | Unclassified client request failure |
| 5xx except 504 | `server` | Backend failure |
| Network/parse/SSE protocol | `network`, `parse`, `stream-protocol`, `unknown` | Client-side normalization |

Standard error body: `{ message: string, code?: string, details?: unknown }`.

### SSE

- Use `text/event-stream`.
- Frontend listens to the default EventSource `message` event.
- Send JSON in `data:` lines; do not require named `event:` listeners.
- Job SSE must validate the same `companyUuid` scope as job start.

## 2. Auth

| API | Method/path | Request | Response |
|---|---|---|---|
| `getCurrentSession` | GET `/auth/session` | none | `AuthSession`; 401 maps to `null` |
| `login` | POST `/auth/login` | `{ loginId, password }` | `{ session: AuthSession }` |
| `updateCurrentUser` | PATCH `/auth/me` | `{ loginId }` | `AuthSession` |
| `changeCurrentUserPassword` | POST `/auth/me/password` | `{ currentPassword, newPassword }` | empty |
| `logout` | POST `/auth/logout` | none | empty |

`AuthUser`: `uuid`, `loginId`, `name`, `role: admin | user`, `mustChangePassword`.
`AuthSession`: `user`, `expiresAt`.

## 3. Admin

### Users

`AdminUserSummary`: `uuid`, `loginId`, `name`, `role`, `mustChangePassword`, `note`, `isActive`, `dbUpdatedAt`.

| API | Method/path | Request | Response |
|---|---|---|---|
| `getAdminUsers` | GET `/admin/users` | none | `AdminUserSummary[]` |
| `createAdminUser` | POST `/admin/users` | `{ loginId, password, name, note, role, isActive }` | `AdminUserSummary` |
| `updateAdminUser` | PATCH `/admin/users/{uuid}` | `{ uuid, loginId, name, note, role, isActive }` | `AdminUserSummary` |
| `resetAdminUserPassword` | POST `/admin/users/{uuid}/password-reset` | none | `{ temporaryPassword, mustChangePassword, dbUpdatedAt }` |
| `deleteAdminUser` | DELETE `/admin/users/{uuid}` | none | empty |

### GPT keys

Purpose: `ai-comment | candidate-recommendation | test | all`. Test status: `untested | success | failed`.
`AdminGptKeySummary`: `uuid`, `name`, `purpose`, `model`, `maskedKey`, `isActive`, `note`, `lastUsedAt`, `lastTestedAt`, `lastTestStatus`, `dbUpdatedAt`.

### Google Sheet configs

Purpose: `db-schema | upload-template | operation-reference | test`.
`AdminGoogleSheetConfigSummary`: `uuid`, `name`, `purpose`, `serviceAccountEmail`, `maskedServiceAccountKey`, `spreadsheetUrl`, `spreadsheetId`, `isActive`, `note`, `dbUpdatedAt`.

## 4. Company

GET `/companies` returns `CompanySummary[]`: `uuid`, `name`.

## 5. Inventory arrival

POST `/inventory-arrival-dates/collect-from-sheet` returns collected inventory arrival rows. This is authenticated-user scope, not admin-only scope.

## 6. Sales analysis

Common query fields: `startDate?`, `endDate?`, `companyUuid?`, `brand?`, `category?`, `codeQuery?`, `colorCode?`, `nameQuery?`.

| API | Method/path | Extra query | Response |
|---|---|---|---|
| `getSelfSales` | GET `/sales/self` | common | `SelfSalesRow[]` |
| `getCompetitorSales` | GET `/sales/competitor` | common + `competitorChannelId?` | `CompetitorSalesRow[]` |
| `getSelfScatterGrid` | GET `/sales/self/scatter-grid` | common + bucket params | `ScatterSalesGridResponse` |
| `getCompetitorScatterGrid` | GET `/sales/competitor/scatter-grid` | common + `competitorChannelId?` + bucket params | `ScatterSalesGridResponse` |
| `getSalesFilterMeta` | GET `/sales/filter-meta` | common | filter options |

`SelfSalesRow`: `id`, `skuGroupKey`, `rank`, `rankPercentile`, `brand`, `category`, `code`, `productName`, `colorCode`, `avgPrice`, `qty`, `amount`, `avgCost`, `marginRate`, `feeRate`, `opMarginRate`, `opMarginAmount`.

`CompetitorSalesRow`: same product identity fields plus `competitorAvgPrice`, `competitorQty`, `competitorAmount`, `selfAvgPrice`, `selfQty`, `selfAmount`.

`ScatterSalesGridResponse`: `cells`, `meta`. `cells[].skuIds` contains `skuGroupKey` values.

## 7. Product drawer

| API | Method/path | Query/body | Response |
|---|---|---|---|
| `getProductDrawerBundle` | GET `/products/{skuGroupKey}/drawer-bundle` | `baseRole`, `baseKind`, `baseSourceId?` | `{ summary: ProductPrimarySummary }` |
| `getProductComparisonTargets` | GET `/products/comparison-targets` | `baseRole`, `baseKind`, `baseSourceId?` | `ProductComparisonTarget[]` |
| `getProductMonthlyTrend` | GET `/products/{skuGroupKey}/monthly-trend` | `startDate`, `endDate`, `forecastMonths`, `baseRole`, `baseKind`, `baseSourceId?`, `comparisonRole`, `comparisonKind`, `comparisonSourceId?` | `ProductMonthlyTrend` |
| `getProductSalesInsight` | GET `/products/{skuGroupKey}/sales-insight` | `startDate`, `endDate`, `baseRole`, `baseKind`, `baseSourceId?`, `comparisonRole`, `comparisonKind`, `comparisonSourceId?` | `ProductSalesInsight` |
| `getProductSecondaryDetail` | GET `/products/{skuGroupKey}/secondary-detail` | `baseRole`, `baseKind`, `baseSourceId?`, `comparisonRole`, `comparisonKind`, `comparisonSourceId?`, `minOpMarginPct?` | `ProductSecondaryDetail` |
| `getSecondaryDailyTrend` | GET `/products/{skuGroupKey}/secondary/daily-trend` | `startDate`, `endDate`, `forecastDays`, `baseRole`, `baseKind`, `baseSourceId?`, `comparisonRole`, `comparisonKind`, `comparisonSourceId?` | `SecondaryDailyTrendPoint[]` |
| `getSecondaryAiComment` | POST `/products/{skuGroupKey}/secondary/ai-comment` | `SecondaryAiCommentParams` | `{ prompt, answer, generatedAt }` |
| `getSecondaryStockOrderCalc` | POST `/secondary/stock-order-calc` | `SecondaryStockOrderCalcParams` | `SecondaryStockOrderCalcResult` |

`ProductPrimarySummary`: `skuGroupKey`, `productName`, `brand`, `category`, `code`, `colorCode`, `price`, `qty`, `availableStock`, optional `monthlySalesTrend` fallback. Monthly chart source is the monthly-trend endpoint.

`ProductComparisonSubjectRef`: `role: base | comparison`, `kind: competitor-channel | self-company`, `sourceId`. `role` identifies the response column position, `kind` selects the backend source table/domain, and `sourceId` is the id inside that domain. For `self-company`, frontend state may hold the internal all-company sentinel, but the HTTP adapter omits `baseSourceId` or `comparisonSourceId` for all-company reads. The backend must not receive the frontend sentinel value. For `competitor-channel`, `sourceId` is a competitor channel id and is always sent. The current product drawer supports `base.kind = self-company`; unsupported base kinds should fail validation instead of falling back.

`ProductComparisonTarget`: comparison option DTO for the target list. Fields: `id`, `role: comparison`, `kind`, `sourceId`, `label`. `id` is an opaque UI selection id and clients must not synthesize it from `kind/sourceId`. Self-company targets exclude the current `base.sourceId`; all-company self comparison may use the frontend all-company sentinel in UI state, but HTTP requests omit `comparisonSourceId` for that all-company subject. An empty target list is a valid unavailable state, not an error fallback signal; the UI should show that no comparison target is available.

`ProductSalesInsight`: `skuGroupKey`, `targetPeriodDays`, `base`, `comparison`, `baseMetrics`, `comparisonMetrics`. Both `base` and `comparison` are `ProductComparisonSubject` objects with `id`, `role`, `kind`, `sourceId`, `label`. `baseMetrics` follows the base subject. `comparisonMetrics` follows the comparison subject. Competitor comparison subjects may omit self-owned cost/margin fields as `null`, while self-company comparison subjects return the same metric shape as self sales.

`ProductDrawerBundle`: `{ summary }` only. It is base-only because the primary summary is not comparison-dependent. It still uses the subject query shape so the backend can resolve the base self-company source without receiving the frontend sentinel.

Frontend facade hardening: `getProductDrawerBundle` and `getProductSecondaryDetail` require explicit subject params. Do not represent all-company reads by omitting the params object; send an explicit `base` subject and let the HTTP adapter omit only the matching `SourceId` query field.

### Product comparison targets breaking change: 2026-06-09

Before:

```http
GET /products/comparison-targets?companyUuid={companyUuid?}
```

After:

```http
GET /products/comparison-targets?baseRole=base&baseKind=self-company&baseSourceId={companyUuid}
```

Changed contract:

- Existing `companyUuid?` is replaced by a `base` subject.
- `baseRole` must be `base`.
- `baseKind` currently accepts only `self-company`.
- `baseSourceId` is a concrete self-company UUID.
- Omit `baseSourceId` for all-company reads. The frontend internal `ALL_COMPANY_UUID` sentinel must not reach the backend.
- Returned comparison candidates must carry `role: 'comparison'`.
- If there is no available comparison target, return an empty array; the frontend does not synthesize a default target.

Backend handling note:

- The backend chooses the base reference table from `baseKind`, then returns only comparison targets available for that base.
- The current frontend sends only self-company bases. If another base kind is added later, update `ProductComparisonBaseSubjectRef.kind` and this API document together.

### Product sales insight breaking change: 2026-06-09

Before:

```ts
{
  companyUuid?: string
  startDate: string
  endDate: string
  comparisonTargetKind: 'competitor-channel' | 'self-company'
  comparisonTargetSourceId: string
}
```

After:

```ts
{
  startDate: string
  endDate: string
  base: {
    role: 'base'
    kind: 'self-company'
    sourceId: string
  }
  comparison: {
    role: 'comparison'
    kind: 'competitor-channel' | 'self-company'
    sourceId: string
  }
}
```

GET query fields:

```txt
startDate
endDate
baseRole
baseKind
baseSourceId?
comparisonRole
comparisonKind
comparisonSourceId?
```

Response field changes:

| Before | After |
|---|---|
| `comparisonTarget` | `comparison` |
| `self` | `baseMetrics` |
| `comparison` metrics column | `comparisonMetrics` |
| no base subject object | `base` |

Backend handling:

- `companyUuid` is no longer part of `getProductSalesInsight`; it is represented by `base.kind/sourceId` in frontend state and by `baseKind/baseSourceId?` on the HTTP query.
- `comparisonTargetKind` and `comparisonTargetSourceId` are no longer top-level query fields; they are represented by `comparison.kind/sourceId` in frontend state and by `comparisonKind/comparisonSourceId?` on the HTTP query.
- For `self-company` subjects, omitted `baseSourceId` or `comparisonSourceId` means all-company read. Do not accept the frontend `ALL_COMPANY_UUID` sentinel as an API value.
- `baseRole` must be `base`; `comparisonRole` must be `comparison`.
- Do not resolve a missing base or comparison subject to the current company, all-company, or the first available comparison target.
- Invalid role/kind shape should be treated as validation failure. Missing or unauthorized subjects should be reported explicitly.

`ProductSecondaryDetail`: `skuGroupKey`, `comparisonPrice`, `comparisonQty`, `comparisonRatioBySize`, `sizeRows`.

`ProductSecondarySizeRow`: `size`, `selfRatio`, `confirmedQty`, `avgPrice`, `qty`, `availableStock`.

`SecondaryDailyTrendPoint`: `date`, `idx`, `month`, `sales`, `stockBar`, `inboundAccumBar`, `baseSales`, `comparisonSales`, `isForecast`.

Monthly trend request: last 24 completed months ending at previous month; `forecastMonths` is 12; chart max is 36 months.
Daily trend request: `startDate` is selected start month first day; `endDate` is yesterday; `forecastDays` is current lead-time days.

## 8. Candidate stash

Candidate flows require single-company scope except read-like list endpoints that explicitly allow optional scope.

| API | Method/path | Scope | Notes |
|---|---|---|---|
| `getCandidateStashes` | GET `/candidate-stashes` | optional read | list |
| `createCandidateStash` | POST `/candidate-stashes` | required | mutation |
| `updateCandidateStash` | PATCH `/candidate-stashes/{stashUuid}` | required | mutation |
| `deleteCandidateStash` | DELETE `/candidate-stashes/{stashUuid}` | required | mutation |
| `duplicateCandidateStash` | POST `/candidate-stashes/{stashUuid}/duplicate` | required | mutation |
| `getCandidateItemsByStash` | GET `/candidate-stashes/{stashUuid}/items` | required | period read |
| `getCandidateRecommendations` | GET `/candidate-stashes/{stashUuid}/recommendations` | required | recommendation read |
| `appendCandidateItem` | POST `/candidate-stashes/{stashUuid}/items` | required | singular append with snapshot |
| `appendCandidateItems` | POST `/candidate-stashes/{stashUuid}/items/bulk` | required | bulk append without snapshot |
| `updateCandidateItem` | PATCH `/candidate-items/{itemUuid}` | required | `details` or `null` |
| `deleteCandidateItem` | DELETE `/candidate-items/{itemUuid}` | required | mutation |
| `startCandidateDetailBulkConfirm` | POST `/candidate-detail-confirmation-jobs` | required | job start |
| job SSE endpoints | GET `.../events` | required | default message event |

`AppendCandidateItemPayload`: `companyUuid`, `stashUuid`, `skuGroupKey`, `details`, `isLatestLlmComment`.
`AppendCandidateItemsPayload`: `companyUuid`, `stashUuid`, `skuGroupKeys`, optional `competitorChannelId`.
`AppendCandidateItemsResponse`: `candidateItems: CandidateStashItemSummary[]`.

Recommendation append results in frontend are `applied`, `stale`, `no-op`, `empty-selection`.

## 9. Order snapshot JSON

Full snapshot details are in `order-snapshot-backend-contract.md` and LLM field descriptions are in `order-snapshot-llm-field-guide.md`.

`OrderSnapshotDocument`: `schemaVersion`, `skuGroupKey`, `savedAt`, `context`, `drawer1`, `drawer2`.

Current snapshot rules:

- `schemaVersion` is `3`.
- top-level `companyUuid` is not part of the snapshot; company scope is represented by `drawer2.baseSubject.sourceId` when scoped.
- `drawer2` stores `baseSubject`, `comparisonSubject`, and `comparisonBasis`.
- `drawer2.stockOrderResult.display.sizeRows[]` is size-keyed.
- `drawer2.confirmedTotals` is required.
- `drawer2.aiComment` contains `prompt`, `answer`, `generatedAt`.
- `details` and `isLatestLlmComment` are API wrapper fields, not snapshot fields.
