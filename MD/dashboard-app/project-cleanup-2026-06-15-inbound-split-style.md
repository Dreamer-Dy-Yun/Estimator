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

## 2026-06-23 cleanup update

- Size-order and split-inbound tables now keep leading sticky columns at fixed widths, distribute the remaining frame width across size columns without a max-width cap, and use horizontal scrolling only after size columns reach their minimum readable width.
- Split-inbound sticky divider colors and offsets are owned by dialog-level CSS variables. The approved `-1px` sticky divider offsets remain unchanged, but the values are no longer hidden as repeated magic literals.
- Mock catalog now includes `TEST_SIZE_20`, a dedicated 20-size scroll verification product. It stays behind `src/api/mock` and is covered by mock API/catalog tests, so UI components do not import test data directly.

## 2026-06-24 variant preparation update

- Split-inbound dialog/table entry files are now stable facades. Current UI lives in `InboundSplitScheduleDialogV0` and `InboundSplitScheduleTableV0`.
- `InboundSplitScheduleDialogV1` and `InboundSplitScheduleTableV1` start as V0 copies for UI-only iteration.
- Variant props are centralized in `inboundSplitScheduleVariantTypes.ts`; DTOs, calculation policy, draft state, Apply/Close transfer, and API/mock contracts remain shared.

## 2026-06-24 V1 source-summary update

- V1 was the active split-inbound presentation variant during this update. It is now retained as the source-summary experiment behind the mock-only variant selector.
- The V1 dialog height is expanded to `90vh`.
- V1 renders a source-summary table above the editable split table from the existing `inboundSplitSource`.
- The source-summary table uses `inboundSplitSource.sizeInfo[size].baseStock` for the opening-stock row and `inboundSplitSource.expectation[size][]` for existing-order inbound rows.
- The source-summary table and editable split table share the same size-column width calculation and synchronize horizontal scroll position.
- The source-summary table has a capped vertical viewport, so many existing-order inbound dates scroll inside the source section instead of consuming the editable split-table area.
- The V1 source-summary viewport shows up to `header + 8 body rows`; inside it, the header and opening-stock row remain vertically sticky while later inbound-date rows scroll.
- The source-summary sticky width maps `입고일 + 수량합` to the editable table's `차수 + 입고일 + 지표 + 수량합` width so both size sections start at the same x position.

## 2026-06-24 variant cleanup update

- V0/V1 detailed ownership moved to `MD/dashboard-app/boundaries/inbound-split-variants.md`.
- `source-boundary-map.md` now keeps only the product-drawer boundary summary and points to the variant document for UI-version details.
- V1 source summary row styling moved from `inboundSplitRows.module.css` to `inboundSplitTable.module.css`, where the source summary table geometry already lives.
- `inboundSplitRows.module.css` is again scoped to the editable split table row states.

## 2026-06-24 V2 preparation update

- V2 was added as a V0-based copy for the next split-inbound UI experiment.
- `InboundSplitScheduleDialogV2.tsx` and `InboundSplitScheduleTableV2.tsx` start from the V0 implementation.
- `InboundSplitScheduleVariant` now accepts `v2`; this was later promoted to the default presentation in the V2 active detail update below.

## 2026-06-24 V2 active detail update

- V2 is now the default split-inbound dialog variant.
- V2 keeps the same DTO, draft hook, planning model, and Apply/Close contract as V0/V1.
- `InboundSplitScheduleDialogV2.tsx` owns expand-all/collapse-all UI state.
- `InboundSplitScheduleTableV2.tsx` renders editable suggested/confirmed rows and delegates expanded source-detail rows to `InboundSplitScheduleDetailRowsV2.tsx`.
- `inboundSplitScheduleDetailRows.ts` builds 0-zone and round-zone display rows from `calculationBaseDate`, `inboundSplitSource.sizeInfo`, and `inboundSplitSource.expectation`.

## 2026-06-24 V2 UI final cleanup update

- Mock API mode now exposes a V0/V1/V2 selector below the `분할 입고 설정` button. HTTP API mode does not render this selector and stays fixed to V2.
- V2 detail row styles moved to `inboundSplitDetailRows.module.css`; `inboundSplitRows.module.css` is again limited to editable summary/suggested/confirmed row states.
- V2 detail total rows now merge the date and metric cells into `기간 내 입고 예정`, matching the opening stock row's merged label pattern.
- The toolbar's whole-table expand/collapse controls are a single toggle button.

## Verification

- `npm run check:encoding`
- `npm run test:run`
- `npm run build`
- `git diff --check`
