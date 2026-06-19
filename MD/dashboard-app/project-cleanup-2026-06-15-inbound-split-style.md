# Inbound Split Schedule Cleanup

> Current-contract note: this is a dated cleanup result note. For the current product-drawer boundary, API request contract, and snapshot contract, use `MD/dashboard-app/source-boundary-map.md`, `MD/dashboard-app/boundaries/product-drawer.md`, `MD/dashboard-app/boundaries/api-contracts.md`, `MD/backend-api/backend-api-spec.md`, `MD/backend-api/dashboard-api-contract-catalog.md`, and `MD/backend-api/order-snapshot-backend-contract.md`.

## Goal

Clean up the secondary drawer split-inbound schedule UI by feature responsibility without changing the API/mock source contract or shortage recommendation behavior.

## Scope

- `secondary/cards/InboundSplitScheduleDialog.tsx`
- `secondary/cards/InboundSplitScheduleTable.tsx`
- `secondary/cards/SizeOrderCard.tsx`
- `secondary/cards/SizeOrderConfirmQuantityRows.tsx`
- `secondary/cards/useInboundSplitScheduleController.ts`
- `secondary/cards/useInboundSplitScheduleDraft.ts`
- `secondary/cards/inboundSplitScheduleTableClasses.ts`
- `secondary/cards/inboundSplitScheduleTypes.ts`
- `src/api/types/secondary.ts`
- `src/api/mock/secondaryDailyTrendBuilders.ts`
- `src/api/mock/secondaryStockOrderCalcApi.ts`
- `secondary/style-parts/inboundSplit*.module.css`
- Boundary notes under `MD/dashboard-app`
- Backend-facing contract notes under `MD/backend-api`

## Event Flow

1. `SizeOrderCard` renders the size-order card and delegates split-inbound state transfer to `useInboundSplitScheduleController`.
2. `useInboundSplitScheduleController` opens the dialog only when `inboundSplitSource` is loaded and valid, builds initial rows, and applies returned rows to parent confirmed quantities.
3. `InboundSplitScheduleDialog` owns only modal shell behavior: focus trap, toolbar, error display, table frame, and footer actions.
4. `useInboundSplitScheduleDraft` owns the open dialog draft: split count, inbound dates, row totals, size quantities, and draft totals.
5. `InboundSplitScheduleTable` renders the fixed-header/fixed-column table from draft state and emits edit events back to the draft hook.
6. Close discards the local draft. Apply clones rows and returns them to the controller, which mutates parent confirmation state.

## Problems Found

- Split-inbound palette variables were split between dialog and table selectors, so shell/table/row color ownership was unclear.
- Row CSS had accumulated overlapping summary/sticky overrides, including multiple selectors trying to restate the same summary-row background.
- Footer action styling lived in the row style part even though it belongs to the dialog shell.
- `InboundSplitScheduleDialog.tsx` repeated fixed sticky class combinations and repeated diff-label calculations inline.
- `SizeOrderCard.tsx` mixed size-order card composition with split-inbound source readiness, dialog session state, draft errors, applied rows, and Apply/Close mutation.
- Dialog draft state and table rendering were still in one component, making names like `splitDialog*` and `splitConfirmLocked` harder to map to feature responsibilities.

## Plan

1. Move shared split-inbound palette and table-dimension variables to the dialog root.
2. Keep `inboundSplitTable.module.css` focused on table geometry and sticky offsets.
3. Keep `inboundSplitRows.module.css` focused on summary/suggested/confirmed row states.
4. Move parent split-inbound state transfer into `useInboundSplitScheduleController`.
5. Move local draft editing into `useInboundSplitScheduleDraft`.
6. Move table rendering into `InboundSplitScheduleTable` and table class helpers into `inboundSplitScheduleTableClasses`.
7. Update boundary documentation and verify with tests, build, encoding check, and browser computed-style inspection.

## Result

- Split-inbound style parts now have one explicit owner per responsibility.
- Redundant row/sticky summary overrides were removed.
- `InboundSplitScheduleDialog.tsx` stays below the 300-line project limit.
- `SizeOrderCard.tsx` now composes the card and delegates split-inbound behavior to `useInboundSplitScheduleController`.
- `InboundSplitScheduleDialog.tsx` is now a modal shell; draft editing and table rendering live in dedicated units.
- Split table width keeps current column minimums, fills spare frame width when there are few size columns, and preserves horizontal scrolling when the minimum width overflows.
- Suggested and confirmed rows inside the same round share one background and no internal divider. Round boundaries and the total-summary boundary keep explicit darker green dividers.
- Initial cleanup did not change split-inbound API source, mock fixture loading, shortage suggestion logic, or Apply/Close state transfer behavior.
- Secondary daily trend mock source conversion was fixed separately in this cleanup window so mock `baseStock` and per-date inbound match the current `SecondaryDailyTrendSource` contract.
- Forecast daily trend mock comparison sales now remains numeric in forecast rows so the source contract does not silently turn unavailable comparison sales into zero.
- Split-inbound fixture slicing now rejects `dateEnd <= dateStart` instead of returning a successful empty source.

## Backend-facing API Notes

- `getSecondaryDailyTrend` expects `SecondaryDailyTrendSource`, not chart-ready `SecondaryDailyTrendPoint[]`. Backend must provide `{ size, baseStock, data: { base, comparison } }`; `data.base[date].inbound` is per-date base inbound rather than an accumulated chart bar.
- `getSecondaryDailyTrend.data.base` must cover every date from `startDate` through inclusive `endDate`. `data.comparison[date].inbound` may be `null`.
- `getSecondaryStockOrderCalc().inboundSplitSource`는 stock-order-calc response field이며 response는 `{ total, sizeInfo, expectation, confirmed }`를 반환한다.

## 2026-06-16 hardening update

- Split-inbound Open/Apply now requires both a valid source and completed stock-order calculation. If source/calculation readiness drops while the dialog is open, the controller closes and remounts the dialog.
- Live calculation-input changes clear `drawer2.confirmed.rounds` together with direct confirmed quantities so confirmed split rounds cannot persist on a stale recommendation basis.
- `getSecondaryDailyTrend.data.base[date].inbound` is now a required numeric field. `data.comparison[date].inbound` remains nullable. The frontend validates the requested `size` before deriving chart points.
- Regression coverage was added for split controller readiness/apply paths, daily-trend source validation, daily-trend hook error surfacing, inbound-date equality prevention, mock role parity, and forecast-model split reset.

## Verification

- `npm run check:encoding`
- `npm run test:run`
- `npm run build`
- `git diff --check`
