# Backend API Changelog

## 2026-06-18 existing-order inbound supply source

- Added `SecondaryProductIdentity` to stock-order and inbound-split source requests/responses. Fields: `productUuid?`, `skuGroupKey`, `brand`, `code`, `colorCode`.
- `getSecondaryStockOrderCalc` body now includes `productIdentity`, `calculationBaseDate`, and `currentOrderInboundDueDate`.
- `SecondaryStockOrderCalcResult` now returns `existingOrderInboundSupplyBySize`, the A source: existing ordered but not-yet-inbound quantities keyed by size and expected inbound date.
- `display.totalOrderBalance*` is the aggregate of all A points. `display.expectedInboundOrderBalance*` is the aggregate of A points with `date < currentOrderInboundDueDate`.
- `getSecondaryInboundSplitSource` query now includes product identity fields. `supplyBySize` keeps the same point shape: current stock on `calculationBaseDate`, then existing-order inbound supply points from A.
- `OrderSnapshotDocument` schema is now v7 and persists `stockOrderResult.productIdentity` plus `stockOrderResult.existingOrderInboundSupplyBySize`. v4/v5/v6 snapshots remain parseable as legacy inputs.

## 2026-06-17 dashboard runtime config for candidate order metrics

- Added `GET /dashboard/runtime-config`.
- Response includes `candidateOrderMetricComparison: ProductComparisonTarget | null`.
- Candidate stash order metric SSE no longer depends on the detail header calling `getProductComparisonTargets({ base })`.
- The frontend reads runtime config once after auth and passes the configured comparison subject into each `subscribeCandidateOrderMetrics` request.
- `candidateOrderMetricComparison: null` means candidate order metrics are unavailable; frontend does not synthesize a first channel/default target.

## 2026-06-15 secondary daily trend and split-inbound source clarification

- `getSecondaryDailyTrend` current contract is `SecondaryDailyTrendSource`, not the old chart-ready `SecondaryDailyTrendPoint[]`.
- Backend must send `baseStockAtStart` as opening stock immediately before `dateStart` and `flowByDate[date].base.inbound` as required numeric per-date base inbound. The frontend derives `stockBar`, `inboundAccumBar`, `idx`, `month`, and `isForecast`.
- Returning old chart-only fields does not make current frontend stock bars visible. Stock bars depend on `baseStockAtStart` plus daily `base.inbound` and `base.sale`.
- `flowByDate` must cover every date from `dateStart` through inclusive `dateEnd`. `comparisonStockAtStart` is reserved; the current frontend accepts `null` and does not render comparison stock bars.
- `flowByDate[date].comparison.inbound` may be `null`; `flowByDate[date].base.inbound` must not be `null`. The frontend now rejects daily-trend response identity mismatches for `productId`, `dateStart`, `dateEnd`, or `forecastStartDate`.
- `getSecondaryInboundSplitSource` is source-only for split-inbound shortage suggestions. It does not receive split count, selected split dates, current popup draft quantities, or split result rows.
- `getSecondaryInboundSplitSource` now uses `calculationBaseDate`, `coverageStartDate`, and exclusive `coverageEndDate`. `supplyBySize[size][]` contains current stock on `calculationBaseDate` and existing-order inbound supply points. `salesForecastByDate[date][size]` contains sales forecast only; existing-order inbound is no longer mixed into the daily sales cell.
- Split inbound confirmed rounds now store `ignoreExistingOrderInbound`. The current UI exposes this as one schedule-level toggle and writes the same value to all rounds on apply.

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
