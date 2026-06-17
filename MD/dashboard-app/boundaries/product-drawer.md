# Product Drawer Boundary

Last updated: 2026-06-16

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
| `secondary/cards/SizeOrderCard.tsx` | Size-order card composition and split-inbound controller/dialog wiring |
| `secondary/cards/useInboundSplitScheduleController.ts` | Parent-level split-inbound state transfer, source readiness, applied rows, and Apply/Close integration |
| `secondary/cards/InboundSplitScheduleDialog.tsx` | Split-inbound dialog shell, focus trap, toolbar, error, and footer actions |
| `secondary/cards/useInboundSplitScheduleDraft.ts` | Open dialog draft state, count/date/quantity edits, and draft totals |
| `secondary/cards/InboundSplitScheduleTable.tsx` | Split-inbound fixed-header/fixed-column table rendering |
| `secondary/cards/inboundSplitScheduleTableClasses.ts` | Split-inbound table class composition, changed-confirmation class, and aria diff label helpers |
| `secondary/cards/inboundSplitScheduleTypes.ts` | Split-inbound UI event/request type aliases shared across dialog/controller/tests |
| `secondary/cards/SizeOrderConfirmQuantityRows.tsx` | Size-order confirmed quantity and applied split rows renderer |
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
- Daily trend API returns aggregate source flow and `forecastStartDate`; frontend validates response identity against the requested SKU/window, then derives chart point fields such as `idx`, `month`, `isForecast`, `stockBar`, and line split values.
- `periodShade` and `forecastShade` are UI chart ranges, not API fields.

## Snapshot contract

- Current type: `OrderSnapshotDocument` v4.
- Snapshot stores restore values only.
- `drawer1.monthlySalesTrend[]` stores the `ProductMonthlyTrendChartPoint[]` display model used by the primary monthly sales trend chart. It is required because monthly trend is part of the drawer restore contract.
- `drawer2.sizeOrders[]` stores `SecondarySizeOrderRestoreRow[]`, the rendered size-order row without `confirmQty`.
- `drawer2.stockOrderResult` stores `SecondaryStockOrderCalcResult` so saved snapshots restore the same calculation/display object used by the size-order card.
- `drawer2.stockOrderRequest`, `drawer2.unitEconomics`, `drawer2.aiComment`, and `drawer2.confirmed.rounds[]` use the corresponding frontend input/state models instead of snapshot-owned duplicate shapes.
- Parser/restore behavior enforces:
  - top-level `skuGroupKey`, `drawer1.summary.skuGroupKey`, `drawer2.comparisonBasis.skuGroupKey` must match.
  - `drawer2.baseSubject` must be a base self-company subject.
  - `drawer2.comparisonSubject` must be a comparison subject; competitor-channel subjects require `sourceId`.
  - `drawer2.stockOrderRequest.leadTimeDays` and `context.dailyTrendLeadTimeDays` must match.
  - size keys in `drawer2.sizeOrders` must be unique and match `drawer2.stockOrderResult.display.sizeRows` keys.
  - `drawer2.stockOrderResult.display` total rows must equal sum of each size row.
  - `drawer2.confirmed.rounds[].qtyBySize` size keys must match `drawer2.sizeOrders[].size`.
- `drawer2.stockOrderResult.display.sizeRows[]` is size-keyed.
- `drawer2.stockOrderResult` no longer stores `safetyStockCalc` or `forecastQtyCalc`; recommendation rows are stored in `drawer2.sizeOrders[]`.
- `drawer2.aiComment` has `prompt`, `answer`, `generatedAt`.
- `drawer2.confirmed.rounds[]` is the confirmed quantity source of truth.
- `drawer2.sizeOrders[]` stores share/forecast/recommendation rows only; it does not store confirmed quantity.
- Daily chart series are re-fetched, not stored.

## Scope rules

- Product drawer read-like APIs use subject refs instead of top-level `companyUuid`.
- Bundle is base-only and returns `{ summary }`.
- Monthly trend, sales insight, secondary detail, and daily trend use base/comparison subject refs. `base.kind` is currently `self-company`; `comparison.kind` may be `competitor-channel` or `self-company`.
- Secondary inbound split source and secondary stock-order calculation are base-only product drawer APIs.
- AI comment is a manual POST generation request. The frontend path owns `skuGroupKey`; the body sends base/comparison subject refs, period/forecast context, optional `candidateItemUuid`, and optional `snapshotForAiComment` when the current secondary drawer calculation should be the comment basis.
- The frontend may keep `ALL_COMPANY_UUID` in subject state for all-company reads, but HTTP requests omit `baseSourceId` or `comparisonSourceId` instead of sending the sentinel.
- Empty comparison target lists are valid unavailable states. The drawer must not replace them with the first target, a fake target, or a generic API error.
- A first returned API/mock target may be used only as a UI default when no saved target exists and the target list is non-empty.
- Deleted, unauthorized, or current-scope-missing selected targets are unavailable states; they require explicit re-selection and must not be silently replaced by a fake subject.
- Arrow key ownership belongs to the stable `ProductDrawer` shell, not content/loading child panels. While the drawer is open, `ArrowUp`/`ArrowDown` are terminal events: navigation may be ignored during an in-flight adjacent move, but the event must not leak to list focus handlers or close the secondary pane.
- Primary sales metrics keeps a stable card shell while comparison data is loading. Target clicks may update request state, but they must not replace the card with a different loading layout or resize the product image/card column.
- Split inbound schedule is secondary-drawer state and is persisted in `drawer2.confirmed.rounds`. It may edit round count, inbound dates, per-round confirmed quantity, and per-size confirmed quantity in a fixed-header/fixed-column dialog. The table keeps current column minimums, expands to fill the table frame when there is spare width, and keeps horizontal scrolling when the minimum width overflows. The dialog owns only a local draft while open; Close discards the draft, and Apply passes cloned rows to `useInboundSplitScheduleController`, which updates `confirmed.rounds` and confirmation quantities through callbacks supplied by `SizeOrderCard`. Open/Apply require both a valid split source, completed stock-order calculation, and strictly increasing inbound dates; if readiness drops while open, the dialog is closed and remounted rather than reusing stale draft state. Overall confirmed totals are computed from editable round/size values and may exceed suggested quantities. Suggested quantities are read-only model output built from `getSecondaryInboundSplitSource`, immutable recommended quantity by size, and the screen-owned split dates. Suggestions must represent shortage only: if projected stock plus known inbound covers interval demand, the suggested quantity is `0`; the model must not force leftover confirmed quantity into later rounds. The API source contains only `dateStart`, `dateEnd`, `stockBySize`, and per-date/per-size expected `sale`/known `inbound`; it does not receive split count or split result rows. `useSecondaryInboundSplitSource` validates the returned date range, stock sizes, and every date/size `sale`/`inbound` cell before exposing the source to the UI. Invalid source shape, invalid date order, or draft recalculation failure is surfaced as an inline split-source error instead of being converted to empty rows, and Apply is disabled while a draft error is visible. If applied split rows are 2 rounds or more, `SizeOrderConfirmQuantityRows.tsx` displays the split confirmed sum and read-only per-size values; if the split is 1 round or not applied, it keeps the existing direct confirmed-quantity input available. Split/confirmed quantity edits do not by themselves mark the confirmed snapshot baseline dirty; live calculation-input edits such as inbound dates, weights, buffer stock, unit economics, forecast inputs, or stock-order result changes clear both direct confirmed quantities and applied split rounds. Integer allocation stays in `inboundSplitScheduleModel.ts`, source-based suggestion policy stays in `inboundSplitSuggestionModel.ts`, draft quantity input/row-total redistribution stays in `inboundSplitDraftQuantityModel.ts`, and date interval/order validity stays in `inboundSplitScheduleDatePolicy.ts`.
- Split inbound date interval labels are view-only UI derived from the schedule draft. `ProductSecondaryDrawerContent` passes `orderInputFields.minOrderDate` as `inboundSplitWorkDate`, `useInboundSplitScheduleController` forwards it to the dialog, and `InboundSplitScheduleTable` displays the first round interval from that work date and later round intervals from the previous round date. The split table must not construct `today` internally. The same date policy is reused by the dialog Apply guard and controller persistence guard, so button state and saved rows cannot diverge. The date input itself is the shared `src/components/DateInputWithWeekday.tsx`; the split table owns only the split-specific interval label and invalid-order styling.
- Split inbound UI responsibilities are separated by feature layer: `useInboundSplitScheduleController.ts` owns parent state transfer and applied rows, `useInboundSplitScheduleDraft.ts` owns open-dialog draft editing, `InboundSplitScheduleDialog.tsx` owns modal shell behavior, `InboundSplitScheduleTable.tsx` owns table rendering and row-derived summary totals, `inboundSplitScheduleDatePolicy.ts` owns date validity, `inboundSplitDraftQuantityModel.ts` owns draft quantity normalization/redistribution, `inboundSplitScheduleTotals.ts` owns row summary aggregation, `inboundSplitScheduleTableClasses.ts` owns class/diff-label helpers, and `inboundSplitScheduleTypes.ts` owns shared aliases.
- Integrated order numeric inputs keep numeric state and snapshot values unchanged. SalesForecastCard may format quantity/price text inputs with thousands separators, then strip separators before emitting numeric changes; percentage inputs keep decimal-friendly numeric editing.
- Candidate detail drawer opened from a single-company candidate keeps the same company scope through reads and mutations.
- Secondary mutations require concrete `companyUuid`.

## Style boundaries

- Primary drawer components must not import `secondary/secondaryDrawer.module.css`.
- `primary/cards/SalesMetricsCard.module.css` owns the primary sales metrics card styles.
- `secondary/secondaryDrawer.module.css` is the secondary drawer public style facade.
- `secondary/style-parts/**` files are internal to the secondary facade and must not be imported directly from primary components.
- Split inbound styles stay behind the secondary facade. `inboundSplitDialogShell.module.css` owns the modal shell and shared split-inbound CSS variables, `inboundSplitTable.module.css` owns table/sticky-column geometry, sticky offsets, and fill/scroll width behavior, `inboundSplitRows.module.css` owns summary/round row states, same-round no-divider styling, round dividers, changed-confirmation text color, sticky body-cell widths, split input sizing, and inbound-date interval text, `inboundSplitControls.module.css` owns the card/dialog count controls, and `inboundSplitResponsive.module.css` owns only media-query overrides.
- The secondary drawer top meta/action row stays in the secondary scroll container as a sticky header. Product metadata and candidate action buttons remain visible while the secondary pane scrolls vertically; the sticky behavior is owned by the secondary layout style part, not by shared drawer shell CSS.

