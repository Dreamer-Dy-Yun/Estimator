# Product Drawer Boundary

Last updated: 2026-06-09

## Responsibility

Product drawer owns primary summary display, secondary detail display, secondary calculations, AI comment request, and snapshot creation/restore. It does not own analysis page filters, candidate stash storage, or backend persistence.

## Main files

| File | Responsibility |
|---|---|
| `ProductDrawer.tsx` | Drawer shell and secondary pane state |
| `useProductComparisonTargets.ts` | Base subject to comparison target list state, comparison mode, missing target state |
| `ProductDrawerSecondaryPane.tsx` | Secondary loading/error/detail branching |
| `secondary/ProductSecondaryDrawer.tsx` | Secondary state orchestration |
| `secondary/hooks/useSecondaryDrawerRequests.ts` | Secondary API request wiring |
| `secondary/hooks/useSecondaryDailyTrend.ts` | Daily trend request |
| `secondary/hooks/useSecondaryStockOrderCalc.ts` | Stock-order calculation request |
| `secondary/hooks/useSecondaryAiCommentState.ts` | Manual AI comment request state |
| `secondary/hooks/useSecondaryForecastModel.ts` | Snapshot and calculation model connection |
| `secondary/secondarySnapshot.ts` | Current secondary state to snapshot |
| `src/snapshot/*` | Snapshot type/parser/tests |

## API boundaries

- Primary bundle: `getProductDrawerBundle`.
- Monthly trend: `getProductMonthlyTrend`.
- Sales insight: `getProductSalesInsight`.
- Comparison targets: `getProductComparisonTargets`.
- Secondary detail: `getProductSecondaryDetail`.
- Secondary daily trend: `getSecondaryDailyTrend`.
- Secondary AI comment: `getSecondaryAiComment`.
- Stock-order calculation: `getSecondaryStockOrderCalc`.

## Trend request policy

- Monthly trend: last 24 completed months ending at previous month; 12 forecast months; 36 visible months max.
- Daily trend: selected start month first day through yesterday; forecast rows use current lead-time days.
- Actual/forecast split comes from API `isForecast`.
- `periodShade` and `forecastShade` are UI chart ranges, not API fields.

## Snapshot contract

- Current type: `OrderSnapshotDocumentV2`.
- Snapshot stores restore values only.
- Parser/restore behavior enforces:
  - top-level `skuGroupKey`, `drawer1.summary.skuGroupKey`, `drawer2.competitorBasis.skuGroupKey` must match.
  - `drawer2.stockOrderRequest.leadTimeDays` and `context.dailyTrendLeadTimeDays` must match.
  - size keys in `drawer2.sizeOrders` must be unique and match `drawer2.stockOrderResult.display.sizeRows` keys.
  - `drawer2.stockOrderResult.display` total rows must equal sum of each size row.
  - `drawer2.confirmedTotals.orderQty` must match `sum(drawer2.sizeOrders[].confirmQty)`.
- `drawer2.stockOrderResult.display.sizeRows[]` is size-keyed.
- `drawer2.aiComment` has `prompt`, `answer`, `generatedAt`.
- `drawer2.confirmedTotals` is required.
- Daily chart series are re-fetched, not stored.

## Scope rules

- Read-like drawer APIs may omit `companyUuid` for all-company reads.
- Sales insight and comparison target APIs use base/comparison subject refs. `base.kind` is currently `self-company`; `comparison.kind` may be `competitor-channel` or `self-company`.
- The frontend may keep `ALL_COMPANY_UUID` in subject state for all-company reads, but HTTP requests omit `baseSourceId` or `comparisonSourceId` instead of sending the sentinel.
- Empty comparison target lists are valid unavailable states. The drawer must not replace them with the first target, a fake target, or a generic API error.
- Candidate detail drawer opened from a single-company candidate keeps the same `companyUuid` through reads and mutations.
- Secondary mutations require concrete `companyUuid`.

## Style boundaries

- Primary drawer components must not import `secondary/secondaryDrawer.module.css`.
- `primary/cards/SalesMetricsCard.module.css` owns the primary sales metrics card styles.
- `secondary/secondaryDrawer.module.css` is the secondary drawer public style facade.
- `secondary/style-parts/**` files are internal to the secondary facade and must not be imported directly from primary components.
