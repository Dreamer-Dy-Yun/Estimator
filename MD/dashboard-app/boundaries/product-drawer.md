# Product Drawer Boundary

Last updated: 2026-06-15

## Responsibility

Product drawer owns primary summary display, secondary detail display, secondary calculations, AI comment request, and snapshot creation/restore. It does not own analysis page filters, candidate stash storage, or backend persistence.

## Main files

| File | Responsibility |
|---|---|
| `ProductDrawer.tsx` | Drawer shell, secondary pane state, and drawer-level keyboard ownership |
| `useProductComparisonTargets.ts` | Base subject to comparison target list state, comparison mode, missing target state |
| `ProductDrawerSecondaryPane.tsx` | Secondary loading/error/detail branching |
| `secondary/ProductSecondaryDrawer.tsx` | Secondary state orchestration |
| `secondary/hooks/useSecondaryDrawerRequests.ts` | Secondary API request wiring |
| `secondary/hooks/useSecondaryDailyTrend.ts` | Daily trend request |
| `secondary/hooks/useSecondaryStockOrderCalc.ts` | Stock-order calculation request |
| `secondary/hooks/useSecondaryAiCommentState.ts` | Manual AI comment request state and optional snapshot context handoff |
| `secondary/hooks/useSecondaryForecastModel.ts` | Snapshot and calculation model connection |
| `secondary/secondarySnapshot.ts` | Current secondary state to snapshot |
| `secondary/cards/InboundSplitScheduleDialog.tsx` | Split inbound schedule draft dialog UI |
| `secondary/cards/SizeOrderConfirmQuantityRow.tsx` | Size-order confirmed quantity and applied split rows renderer |
| `secondary/cards/inboundSplitScheduleModel.ts` | Split inbound schedule draft row/quantity table model |
| `secondary/cards/inboundSplitSuggestionModel.ts` | Source-based split inbound suggested quantity calculation |
| `src/snapshot/*` | Snapshot type/parser/tests |

## API boundaries

- Primary bundle: `getProductDrawerBundle`.
- Monthly trend: `getProductMonthlyTrend`.
- Sales insight: `getProductSalesInsight`.
- Comparison targets: `getProductComparisonTargets`.
- Secondary detail: `getProductSecondaryDetail`.
- Secondary daily trend: `getSecondaryDailyTrend`.
- Secondary inbound split source: `getSecondaryInboundSplitSource`.
- Secondary AI comment: `getSecondaryAiComment`.
- Stock-order calculation: `getSecondaryStockOrderCalc`.
- API access is owned by `src/api/client.ts` and `src/api/requests/*`; product mock behavior is owned by `src/api/mock/dashboardApi.ts`, `mockProductComparisonApi.ts`, `mockProductSecondaryDetailApi.ts`, and request adapters. Drawer UI/components must not import mock modules directly.

## Trend request policy

- Monthly trend: last 24 completed months ending at previous month; 12 forecast months; 36 visible months max.
- Daily trend: selected start month first day through yesterday plus current lead-time forecast days.
- Daily trend API returns aggregate source flow and `forecastStartDate`; frontend derives chart point fields such as `idx`, `month`, `isForecast`, `stockBar`, and line split values.
- `periodShade` and `forecastShade` are UI chart ranges, not API fields.

## Snapshot contract

- Current type: `OrderSnapshotDocument` v4.
- Snapshot stores restore values only.
- Parser/restore behavior enforces:
  - top-level `skuGroupKey`, `drawer1.summary.skuGroupKey`, `drawer2.comparisonBasis.skuGroupKey` must match.
  - `drawer2.baseSubject` must be a base self-company subject.
  - `drawer2.comparisonSubject` must be a comparison subject; competitor-channel subjects require `sourceId`.
  - `drawer2.stockOrderRequest.leadTimeDays` and `context.dailyTrendLeadTimeDays` must match.
  - size keys in `drawer2.sizeOrders` must be unique and match `drawer2.stockOrderResult.display.sizeRows` keys.
  - `drawer2.stockOrderResult.display` total rows must equal sum of each size row.
  - `drawer2.confirmed.rounds[].qtyBySize` size keys must match `drawer2.sizeOrders[].size`.
- `drawer2.stockOrderResult.display.sizeRows[]` is size-keyed.
- `drawer2.aiComment` has `prompt`, `answer`, `generatedAt`.
- `drawer2.confirmed.rounds[]` is the confirmed quantity source of truth.
- `drawer2.sizeOrders[]` stores share/forecast/recommendation rows only; it does not store confirmed quantity.
- Daily chart series are re-fetched, not stored.

## Scope rules

- Product drawer read-like APIs use subject refs instead of top-level `companyUuid`.
- Bundle is base-only and returns `{ summary }`.
- Monthly trend, sales insight, secondary detail, and daily trend use base/comparison subject refs. `base.kind` is currently `self-company`; `comparison.kind` may be `competitor-channel` or `self-company`.
- AI comment is a manual POST generation request. The frontend path owns `skuGroupKey`; the body sends base/comparison subject refs, period/forecast context, optional `candidateItemUuid`, and optional `snapshotForAiComment` when the current secondary drawer calculation should be the comment basis.
- The frontend may keep `ALL_COMPANY_UUID` in subject state for all-company reads, but HTTP requests omit `baseSourceId` or `comparisonSourceId` instead of sending the sentinel.
- Empty comparison target lists are valid unavailable states. The drawer must not replace them with the first target, a fake target, or a generic API error.
- A first returned API/mock target may be used only as a UI default when no saved target exists and the target list is non-empty.
- Deleted, unauthorized, or current-scope-missing selected targets are unavailable states; they require explicit re-selection and must not be silently replaced by a fake subject.
- Arrow key ownership belongs to the stable `ProductDrawer` shell, not content/loading child panels. While the drawer is open, `ArrowUp`/`ArrowDown` are terminal events: navigation may be ignored during an in-flight adjacent move, but the event must not leak to list focus handlers or close the secondary pane.
- Primary sales metrics keeps a stable card shell while comparison data is loading. Target clicks may update request state, but they must not replace the card with a different loading layout or resize the product image/card column.
- Split inbound schedule is secondary-drawer state and is persisted in `drawer2.confirmed.rounds`. It may edit round count, inbound dates, per-round confirmed quantity, and per-size confirmed quantity in a fixed-header/fixed-column dialog. The dialog owns only a local draft while open; Close discards the draft, and Apply returns rows to `SizeOrderCard` for parent state mutation. Overall confirmed totals are computed from editable round/size values and may exceed suggested quantities. Suggested quantities are read-only model output built from `getSecondaryInboundSplitSource`, current confirmed quantity by size, and the screen-owned split dates. Suggestions must represent shortage only: if projected stock plus known inbound covers interval demand, the suggested quantity is `0`; the model must not force leftover confirmed quantity into later rounds. The API source contains only `dateStart`, `dateEnd`, `stockBySize`, and per-date/per-size expected `sale`/known `inbound`; it does not receive split count or split result rows. `useSecondaryInboundSplitSource` validates the returned date range, stock sizes, and every date/size `sale`/`inbound` cell before exposing the source to the UI. Invalid source shape or draft recalculation failure is surfaced as an inline split-source error instead of being converted to empty rows, and Apply is disabled while a draft error is visible. If applied split rows are 2 rounds or more, `SizeOrderConfirmQuantityRow.tsx` displays the split confirmed sum and read-only per-size values; if the split is 1 round or not applied, it keeps the existing direct confirmed-quantity input available. Integer redistribution is owned by `inboundSplitScheduleModel.ts` and source-based suggestion policy is owned by `inboundSplitSuggestionModel.ts`, so later allocation-policy changes stay inside those models.
- Integrated order numeric inputs keep numeric state and snapshot values unchanged. SalesForecastCard may format quantity/price text inputs with thousands separators, then strip separators before emitting numeric changes; percentage inputs keep decimal-friendly numeric editing.
- Candidate detail drawer opened from a single-company candidate keeps the same company scope through reads and mutations.
- Secondary mutations require concrete `companyUuid`.

## Style boundaries

- Primary drawer components must not import `secondary/secondaryDrawer.module.css`.
- `primary/cards/SalesMetricsCard.module.css` owns the primary sales metrics card styles.
- `secondary/secondaryDrawer.module.css` is the secondary drawer public style facade.
- `secondary/style-parts/**` files are internal to the secondary facade and must not be imported directly from primary components.
- The secondary drawer top meta/action row stays in the secondary scroll container as a sticky header. Product metadata and candidate action buttons remain visible while the secondary pane scrolls vertically; the sticky behavior is owned by the secondary layout style part, not by shared drawer shell CSS.

