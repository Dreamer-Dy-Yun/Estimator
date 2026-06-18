# Backend API Specification

Last updated: 2026-06-18

이 문서는 `dashboard-app`이 현재 소비하는 백엔드 API의 행위 기준을 정의한다. endpoint별 빠른 표는 `dashboard-api-contract-catalog.md`를 함께 본다.

## 1. Global contract

- Base path: `/api/v1`
- 인증은 cookie 기반 세션을 사용한다.
- 프론트 HTTP client는 `credentials: include`로 요청한다.
- 요청/응답 field 이름은 TypeScript DTO와 1:1로 맞춘다.
- 타입 이름은 참고값이고, 실제 path/query/body 배치는 `httpDashboardRequests.ts`의 직렬화 기준을 따른다.

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

| HTTP | ApiFailureKind |
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

`GET /auth/session`은 미인증 상태에서 401을 반환할 수 있고, 프론트 어댑터는 이를 세션 없음으로 처리해 `null`로 노출한다. 서버가 `200 null`을 택해도 되지만, 프론트 계약의 의미는 `AuthSession | null`이다.

## 3. Admin

Admin endpoint는 관리자 세션을 요구한다.

| API | Method | Path | Request | Response |
|---|---|---|---|---|
| `getAdminUsers` | GET | `/admin/users` | none | `AdminUserSummary[]` |
| `createAdminUser` | POST | `/admin/users` | body `CreateAdminUserPayload` | `AdminUserSummary` |
| `updateAdminUser` | PATCH | `/admin/users/{uuid}` | path `uuid`, body `UpdateAdminUserPayload` | `AdminUserSummary` |
| `resetAdminUserPassword` | POST | `/admin/users/{uuid}/password-reset` | path `uuid` | `ResetAdminUserPasswordResult` |
| `deleteAdminUser` | DELETE | `/admin/users/{uuid}` | path `uuid` | none |
| `getAdminGptKeys` | GET | `/admin/gpt-keys` | none | `AdminGptKeySummary[]` |
| `createAdminGptKey` | POST | `/admin/gpt-keys` | body `CreateAdminGptKeyPayload` | `AdminGptKeySummary` |
| `updateAdminGptKey` | PATCH | `/admin/gpt-keys/{uuid}` | path `uuid`, body `UpdateAdminGptKeyPayload` | `AdminGptKeySummary` |
| `rotateAdminGptKey` | POST | `/admin/gpt-keys/{uuid}/rotate` | path `uuid`, body `{ plainKey: string }` | `AdminGptKeySummary` |
| `testAdminGptKey` | POST | `/admin/gpt-keys/{uuid}/test` | path `uuid` | `AdminGptKeyTestResult` |
| `deleteAdminGptKey` | DELETE | `/admin/gpt-keys/{uuid}` | path `uuid` | none |
| `getAdminGoogleSheetConfigs` | GET | `/admin/google-sheets` | query `companyUuid?` | `AdminGoogleSheetConfigSummary[]` |
| `createAdminGoogleSheetConfig` | POST | `/admin/google-sheets` | body `CreateAdminGoogleSheetConfigPayload` | `AdminGoogleSheetConfigSummary` |
| `updateAdminGoogleSheetConfig` | PATCH | `/admin/google-sheets/{uuid}` | path `uuid`, body `UpdateAdminGoogleSheetConfigPayload` | `AdminGoogleSheetConfigSummary` |
| `deleteAdminGoogleSheetConfig` | DELETE | `/admin/google-sheets/{uuid}` | path `uuid`, query `companyUuid` | none |

비밀키 원문은 생성/회전 요청에서만 전달된다. 목록/조회 응답은 마스킹된 메타데이터만 반환한다.

## 4. Scope

### companyUuid

| 작업 | 규칙 |
|---|---|
| read/list | `companyUuid` 생략 가능 API가 있다. 생략은 전체 회사 조회 의미로 사용될 수 있다. |
| mutation/import/job | 구체 `companyUuid` 필수이다. |
| 전체 회사 sentinel | 프론트의 `ALL_COMPANY_UUID`는 서버 계약값이 아니다. mutation에는 사용할 수 없다. |

### Product comparison subject

상품 API는 회사 UUID 대신 subject query를 사용한다.

| subject | fields |
|---|---|
| base | `baseRole`, `baseKind`, `baseSourceId?` |
| comparison | `comparisonRole`, `comparisonKind`, `comparisonSourceId?` |

`role`은 각각 `base`, `comparison`으로 고정한다. `kind=competitor-channel`이면 `sourceId`가 필수이다. 잘못된 조합은 명시적 4xx로 실패해야 하며, 서버가 임의 기본값으로 대체하지 않는다.

## 5. System/runtime

| API | Method | Path | Request | Response |
|---|---|---|---|---|
| `getCompanies` | GET | `/companies` | none | `CompanySummary[]` |
| `collectInventoryArrivalDates` | POST | `/inventory-arrival-dates/collect-from-sheet` | body `{ companyUuid }` | `InventoryArrivalCollectionResult` |
| `getDashboardRuntimeConfig` | GET | `/dashboard/runtime-config` | none | `DashboardRuntimeConfig` |

`DashboardRuntimeConfig`는 인증 후 읽는 런타임 설정이다. 비교 채널 기본값 등을 서버에서 통제해야 하는 경우 이 계약으로 제공한다.

## 6. Sales

| API | Method | Path | Request | Response |
|---|---|---|---|---|
| `getSelfSales` | GET | `/sales/self` | query sales filter + `companyUuid?` | `SelfSalesRow[]` |
| `getCompetitorSales` | GET | `/sales/competitor` | query sales filter + `competitorChannelId?`, `companyUuid?` | `CompetitorSalesRow[]` |
| `getSelfSalesScatterGrid` | GET | `/sales/self/scatter-grid` | query grid filter + `companyUuid?` | `ScatterSalesGridResponse` |
| `getCompetitorSalesScatterGrid` | GET | `/sales/competitor/scatter-grid` | query grid filter + `competitorChannelId?`, `companyUuid?` | `ScatterSalesGridResponse` |
| `getSalesFilterMeta` | GET | `/sales/filter-meta` | query `companyUuid?` | `SalesFilterMeta` |

필터는 KPI, rank, chart, list 계산 전에 적용한다. `competitorChannelId` 생략은 경쟁 채널 전체를 `skuGroupKey` 기준으로 집계한다는 뜻이다.

## 7. Product drawer / Secondary

| API | Method | Path | Request | Response |
|---|---|---|---|---|
| `getProductDrawerBundle` | GET | `/products/{skuGroupKey}/drawer-bundle` | path `skuGroupKey`, query base subject | `ProductDrawerBundle` |
| `getProductComparisonTargets` | GET | `/products/comparison-targets` | query base subject | `ProductComparisonTarget[]` |
| `getProductMonthlyTrend` | GET | `/products/{skuGroupKey}/monthly-trend` | path `skuGroupKey`, query period/forecast/base/comparison | `ProductMonthlyTrend` |
| `getProductSalesInsight` | GET | `/products/{skuGroupKey}/sales-insight` | path `skuGroupKey`, query period/base/comparison | `ProductSalesInsight` |
| `getProductSecondaryDetail` | GET | `/products/{skuGroupKey}/secondary-detail` | path `skuGroupKey`, query base/comparison/`minOpMarginPct?` | `ProductSecondaryDetail` |
| `getSecondaryDailyTrend` | GET | `/products/{skuGroupKey}/secondary/daily-trend` | path `skuGroupKey`, query period/forecast/base/comparison | `SecondaryDailyTrendSource` |
| `getSecondaryInboundSplitSource` | GET | `/products/{skuGroupKey}/secondary/inbound-split-source` | path `skuGroupKey`, query flattened product identity fields, `calculationBaseDate`, `coverageStartDate`, `coverageEndDate`, base subject | `SecondaryInboundSplitSource` |
| `getSecondaryAiComment` | POST | `/products/{skuGroupKey}/secondary/ai-comment` | path `skuGroupKey`, body params without `skuGroupKey` | `SecondaryAiCommentResult` |
| `getSecondaryCompetitorChannels` | GET | `/secondary/competitor-channels` | none | `SecondaryCompetitorChannel[]` |
| `getSecondaryStockOrderCalc` | POST | `/secondary/stock-order-calc` | body `SecondaryStockOrderCalcParams` | `SecondaryStockOrderCalcResult` |

Secondary 주요 규칙:

- `/secondary/stock-order-calc`는 주문량 계산의 백엔드 단일 계산점이다.
- `/secondary/daily-trend`는 일별 예측 소스이다.
- `/secondary/inbound-split-source`는 입고 분할 원천값만 반환한다.

`SecondaryProductIdentity` fields: `productUuid?`, `skuGroupKey`, `brand`, `code`, `colorCode`. Backend should echo this identity in stock-order and inbound-split responses so the frontend can reject mismatched product data. `productUuid` is optional only for legacy/mock data; when the backend has a SKU/product UUID, include it.

`getSecondaryInboundSplitSource` serializes product identity as GET query fields, not a nested object: `productSkuGroupKey`, `productUuid?`, `productBrand`, `productCode`, `productColorCode`. `productSkuGroupKey` must match the path `skuGroupKey`.

`SecondaryStockOrderCalcParams` body fields: `skuGroupKey`, `productIdentity`, `base`, `periodStart`, `periodEnd`, `calculationBaseDate`, `currentOrderInboundDueDate`, `forecastPeriodEndMonth?`, `orderCoverageDays`, `dailyMean?`.
`forecastPeriodEndMonth` is the `YYYY-MM` month key that contains the final included coverage date. With `[currentOrderInboundDueDate, nextOrderInboundDueDate)`, this is normally the month of `nextOrderInboundDueDate - 1 day`. `orderCoverageDays` is the coverage day count used by the order calculation and snapshot context.

`SecondaryStockOrderCalcResult` response fields:

- `productIdentity`: same identity as requested.
- `existingOrderInboundSupplyBySize`: `Record<size, { date, qty }[]>`. This is A, the existing ordered but not-yet-inbound quantity schedule collected from the backend-managed Google Sheet staging data. It must not include the draft/current order quantities being edited in the drawer.
- `display.totalOrderBalanceTotal` and `display.sizeRows[].totalOrderBalance`: aggregate of all `existingOrderInboundSupplyBySize[size][]` points by size.
- `display.expectedInboundOrderBalanceTotal` and `display.sizeRows[].expectedInboundOrderBalance`: aggregate of `existingOrderInboundSupplyBySize[size][]` points with `date < currentOrderInboundDueDate`.
- `display.currentStockQtyTotal` and `display.sizeRows[].currentStockQty`: current stock by size as of `calculationBaseDate`.

`SecondaryInboundSplitSource` response fields:

- `productId`: same product key as the path `skuGroupKey`.
- `productIdentity`: same identity as requested.
- `calculationBaseDate`: inventory simulation base date. The frontend sends today as this value.
- `coverageStartDate`: current order inbound date. Split round dates must be on or after this date.
- `coverageEndDate`: next order inbound date, exclusive. The final covered sales date is `coverageEndDate - 1 day`.
- `supplyBySize`: `Record<size, { date, qty }[]>`. A point on `calculationBaseDate` is current stock. Later points are existing-order inbound quantities from A and are unrelated to the draft/current order being split.
- `salesForecastByDate`: `Record<date, Record<size, number>>`, covering every date where `calculationBaseDate <= date < coverageEndDate`.

The API remains source-only. It does not receive split count, selected split dates, draft row quantities, or `ignoreExistingOrderInbound`; those are UI/snapshot state used by the frontend suggestion model.
- 적용된 차수별 분할 결과는 API source가 아니라 `OrderSnapshotDocument.drawer2.confirmed.rounds`에 저장된다.
- 비교 대상이 없으면 빈 배열을 반환할 수 있으며, 이는 정상적인 사용 불가 상태이다.

Compact inbound-split source example:

```json
{
  "productId": "TEST-SHOE__210",
  "productIdentity": { "productUuid": "sku-uuid", "skuGroupKey": "TEST-SHOE__210", "brand": "Brand", "code": "TEST-SHOE", "colorCode": "210" },
  "calculationBaseDate": "2026-06-18",
  "coverageStartDate": "2026-12-17",
  "coverageEndDate": "2027-06-17",
  "supplyBySize": {
    "230": [
      { "date": "2026-06-18", "qty": 12 },
      { "date": "2027-01-12", "qty": 20 }
    ]
  },
  "salesForecastByDate": {
    "2026-12-17": { "230": 1.4 }
  }
}
```

## 8. Candidate stash/item

| API | Method | Path | Request | Response |
|---|---|---|---|---|
| `getCandidateStashes` | GET | `/candidate-stashes` | query `companyUuid?` | `CandidateStashSummary[]` |
| `getCandidateItemsByStash` | GET | `/candidate-stashes/{stashUuid}/items` | path `stashUuid`, query period/company | `CandidateItemListResult` |
| `getCandidateRecommendations` | GET | `/candidate-stashes/{stashUuid}/recommendations` | path `stashUuid`, query period/paging/company | `CandidateRecommendationResult` |
| `createCandidateStash` | POST | `/candidate-stashes` | body payload + `companyUuid` | `CandidateStashSummary` |
| `updateCandidateStash` | PATCH | `/candidate-stashes/{stashUuid}` | path `stashUuid`, body payload + `companyUuid` | `CandidateStashSummary` |
| `deleteCandidateStash` | DELETE | `/candidate-stashes/{stashUuid}` | path `stashUuid`, query `companyUuid` | none |
| `duplicateCandidateStash` | POST | `/candidate-stashes/{stashUuid}/duplicate` | path `stashUuid`, body `companyUuid` | none |
| `appendCandidateItem` | POST | `/candidate-stashes/{stashUuid}/items` | path `stashUuid`, body payload + `companyUuid` | none |
| `appendCandidateItems` | POST | `/candidate-stashes/{stashUuid}/items/bulk` | path `stashUuid`, body payload + `companyUuid` | `AppendCandidateItemsResponse` |
| `getCandidateItemByUuid` | GET | `/candidate-items/{itemUuid}` | path `itemUuid`, query `companyUuid?` | `CandidateItemDetail | null` |
| `updateCandidateItem` | PATCH | `/candidate-items/{itemUuid}` | path `itemUuid`, body payload + `companyUuid` | `CandidateItemDetail` |
| `deleteCandidateItem` | DELETE | `/candidate-items/{itemUuid}` | path `itemUuid`, query `companyUuid` | none |
| `deleteCandidateItems` | DELETE | `/candidate-stashes/{stashUuid}/items` | path `stashUuid`, body `itemUuids`, `companyUuid` | none |
| `getCandidateStashExcelTemplateDownload` | GET | `/candidate-stashes/excel-template` | none | download descriptor |
| `uploadCandidateStashExcel` | POST | `/candidate-stashes/import/excel` | multipart `file`, `companyUuid` | `CandidateStashExcelUploadResult` |


Candidate DTO field ownership:

- `CandidateItemDetail.confirmedOrderSnapshot` is the saved `OrderSnapshotDocument | null`.
- `CandidateItemSummary.hasConfirmedOrderSnapshot` is the saved snapshot existence flag.
- `CandidateItemInsightSummary.competitorSalesSourceLabel` is the sales insight source label.
- `CandidateItemOrderExport.comparisonSubjectLabel` is the comparison subject label actually used for order metric/export.
Mutation은 stash/item 소유권과 company scope를 검증해야 한다. `updateCandidateItem` 응답은 DB commit/cache invalidation 이후의 최신 `CandidateItemDetail`이어야 한다.

## 9. Job/SSE

| API | Method | Path | Request | Transport |
|---|---|---|---|---|
| `subscribeCandidateOrderMetrics` | GET | `/candidate-stashes/{stashUuid}/items/order-metrics/events` | path `stashUuid`, query `requestId`, period, item UUID list, `companyUuid`, comparison subject | SSE |
| `startCandidateDetailBulkConfirm` | POST | `/candidate-stashes/{stashUuid}/items/detail-confirmation-jobs` | path `stashUuid`, body item UUID list, period, `companyUuid` | JSON |
| `subscribeCandidateDetailBulkConfirm` | GET | `/candidate-item-detail-confirmation-jobs/{jobId}/events` | path `jobId`, query `companyUuid` | SSE |
| `startCandidateStashLlmCommentJob` | POST | `/candidate-stashes/{stashUuid}/llm-comment-jobs` | path `stashUuid`, body `companyUuid` | JSON |
| `subscribeCandidateStashLlmCommentJob` | GET | `/candidate-stash-llm-comment-jobs/{jobId}/events` | path `jobId`, query `companyUuid` | SSE |

SSE endpoint는 권한, company scope, request/job id를 검증한다. 프론트는 stale requestId/job event를 반영하지 않는다.

## 10. Snapshot boundary

후보 상세 저장 payload는 `OrderSnapshotDocument` v7이다. 현재 타입과 parser는 다음 파일이 기준이다.

- `dashboard-app/src/snapshot/orderSnapshotTypes.ts`
- `dashboard-app/src/snapshot/parseOrderSnapshot.ts`

스냅샷은 후보 항목에 저장된 사용자 결정이다. API 최신값을 가져왔다고 해서 저장 스냅샷을 자동으로 덮지 않는다.

## 11. Documentation policy

API 계약 변경 시 다음을 같은 변경 단위로 맞춘다.

- `dashboard-app/src/api/types/*`
- `dashboard-app/src/api/requests/httpDashboardRequests.ts`
- `dashboard-app/src/api/requests/mockDashboardRequests.ts`
- `MD/backend-api/backend-api-spec.md`
- `MD/backend-api/dashboard-api-contract-catalog.md`
- 관련 dashboard boundary 문서
