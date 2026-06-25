# Backend API Changelog

## 2026-06-25 candidate order export inbound rounds

- `CandidateItemOrderExport` now includes `inboundRounds[]`.
- Each round has `{ round, inboundDate, sizeOrderQty[] }`; the frontend Excel download uses this DTO to expand rows by round with fixed `차수` and `입고 예정일` columns without a separate export endpoint.
- `inboundExpectedDate` remains as a legacy/fallback summary field. Backends should fill `inboundRounds` from saved snapshot confirmed rounds when a candidate item has a confirmed order snapshot.

## 2026-06-25 primary drawer image contract

- `ProductDrawerBundle.summary` now includes `imageUrl: string | null` for the large primary drawer product image.
- `imageUrl` is separate from list/candidate `thumbnailUrl`; clients must not synthesize it from product text fields.

## 2026-06-19 inbound split and daily trend DTO realignment

- `getSecondaryDailyTrend` now returns `{ size, baseStock, data: { base, comparison } }`. The only size-specific query addition is `size?`.
- `getSecondaryStockOrderCalc().inboundSplitSource` now uses `{ total, sizeInfo, expectation, confirmed }`.
- `total.suggestion` is a backend-provided source recommendation aggregate. Frontend final recommendations may differ when UI-only planning inputs such as buffer stock apply.
- `total.sales` is the whole-product daily sales forecast over `[currentOrderInboundDueDate, nextOrderInboundDueDate)`.
- `sizeInfo[size].baseStock` is current/opening stock; `expectation[size][]` is existing-order future inbound and excludes the draft/current order.
- The previous supply-point source shape is no longer the current API contract.

## 2026-06-18 existing-order inbound supply source

- Added `SecondaryProductIdentity` to stock-order and inbound-split source requests/responses. Fields: `productUuid?`, `skuGroupKey`, `brand`, `code`, `colorCode`.
- `getSecondaryStockOrderCalc` body now includes `productIdentity`, `calculationBaseDate`, and `currentOrderInboundDueDate`.
- `SecondaryStockOrderCalcResult` now returns `existingOrderInboundSupplyBySize`, the A source: existing ordered but not-yet-inbound quantities keyed by size and expected inbound date.
- `display.totalOrderBalance*` is the aggregate of all A points. `display.expectedInboundOrderBalance*` is the aggregate of A points with `date < currentOrderInboundDueDate`.
- `getSecondaryStockOrderCalc().inboundSplitSource` is returned inside stock-order-calc and is the shared source for order detail recommendation and split inbound planning.
- `OrderSnapshotDocument` schema is now v8 and persists `stockOrderResult.productIdentity`, `stockOrderResult.existingOrderInboundSupplyBySize`, and `stockOrderResult.inboundSplitSource`. v4/v5/v6/v7 snapshots remain parseable as legacy inputs.

## 2026-06-17 dashboard runtime config for candidate order metrics

- Added `GET /dashboard/runtime-config`.
- Response includes `candidateOrderMetricComparison: ProductComparisonTarget | null`.
- Candidate stash order metric SSE no longer depends on the detail header calling `getProductComparisonTargets({ base })`.
- The frontend reads runtime config once after auth and passes the configured comparison subject into each `subscribeCandidateOrderMetrics` request.
- `candidateOrderMetricComparison: null` means candidate order metrics are unavailable; frontend does not synthesize a first channel/default target.

## 2026-06-15 secondary daily trend and split-inbound source clarification

- `getSecondaryDailyTrend` current contract is `SecondaryDailyTrendSource`, not the old chart-ready `SecondaryDailyTrendPoint[]`.
- Current daily trend source shape is now `{ size, baseStock, data: { base, comparison } }`; older field names from this dated clarification are superseded.
- `getSecondaryStockOrderCalc().inboundSplitSource` is source-only for split-inbound shortage suggestions. It does not receive split count, selected split dates, current popup draft quantities, or split result rows.
- Current inbound split source shape is now `{ total, sizeInfo, expectation, confirmed }`; older supply-point field names from this dated clarification are superseded.
- Split inbound confirmed rounds now store `excludeSegmentExistingOrderInbound`. The current UI exposes this as one schedule-level toggle and writes the same value to all rounds on apply.
- Current planning semantics after v4 stock-flow update: demand uses `[round n inbound date, round n+1 inbound date)`, existing-order inbound from the same interval is applied on its actual inbound date, and `excludeSegmentExistingOrderInbound` excludes that same-round inbound interval.

## 2026-06-10 current API rewrite

- `getProductComparisonTargets({ base })` now has explicit empty/error semantics: `200 []` means no available target, non-2xx means API failure, and the frontend does not synthesize a default target.
- Candidate order metric SSE is not opened when the frontend has no selected comparison target; non-snapshot metric cells are marked unavailable/failed client-side instead of asking the backend to choose a default.
- Mock preview may run with `VITE_USE_MOCK_API=true` and no backend base URL; HTTP/production mode requires the backend base URL.
- Candidate order metric SSE now requires the selected comparison subject on every request:
  - `comparisonRole`, `comparisonKind`, `comparisonSourceId?`
  - Snapshot rows project `OrderSnapshotDocument.drawer2`; non-snapshot rows use secondary order calculation without daily trend rendering data.
- Archived previous backend API docs to `OLD/2026-06-10-before-current-api-rewrite/`.
- Rewrote `dashboard-api-contract-catalog.md` as current-contract-only backend implementation catalog.
- Kept implementation guidance in `backend-api-spec.md`.
- Auth/profile ownership is explicit: `PATCH /auth/me` owns `loginId`/`name`, duplicate login id must return `409 conflict`, and `PATCH /admin/users/{uuid}` owns only `note`/`role`/`isActive`.
- Comparison APIs now use the subject contract:
  - `baseRole`, `baseKind`, `baseSourceId?`
  - `comparisonRole`, `comparisonKind`, `comparisonSourceId?`
- Product drawer bundle is base-only and returns `{ summary }`.
- Product monthly trend, sales insight, secondary detail, daily trend, AI comment, and stock-order calc are separate endpoints.
- Analysis list and candidate list row summaries include `thumbnailUrl: string | null`.
- Candidate item `confirmedOrderSnapshot` remains `OrderSnapshotDocument | null`; current snapshot schema is version `7`.
- Candidate order metric SSE uses `requestId` and emits `item`, `itemFailed`, and `completed`.

## Previous docs

- `OLD/2026-06-10-before-current-api-rewrite/backend-api-spec.md`
- `OLD/2026-06-10-before-current-api-rewrite/dashboard-api-contract-catalog.md`
