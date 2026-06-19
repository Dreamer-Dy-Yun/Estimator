# Project cleanup - 2026-06-18

## Goal

Apply a MulAg-assisted cleanup pass for variable and function names whose meaning did not match their actual feature boundary.

## Scope

- Secondary inbound split local naming.
- Boundary docs for product drawer and source ownership.
- Backend changelog stale snapshot schema note.
- MulAg plan/todo/review records.

## Result

- Removed the first-round split date alias and validated split round dates directly against `currentOrderInboundDueDate <= date < nextOrderInboundDueDate`.
- Renamed multi-round split confirmed state to `splitRoundRows`, `splitRoundConfirmBySize`, `splitRoundConfirmTotal`, and `splitRoundsControlDirectConfirm`.
- Renamed row-total redistribution to `redistributeInboundSplitRowTotalBySuggestedTotals`.
- Renamed interval allocation helpers around whole-period sales and size-rate allocation.
- Renamed dialog total helper to `currentConfirmedTotal`.
- Updated docs that still referred to `inboundSplitWorkDate` as the active current name.
- Corrected backend changelog snapshot schema wording so the current contract points to `OrderSnapshotDocument` v8.
- Rewrote current README/API/boundary documents so they point to the current `DashboardApi`, HTTP request serialization, product drawer boundary, source-only inbound split API, and `OrderSnapshotDocument` v8 contract.
- Clarified that Korean text appearing broken in PowerShell output is not by itself file corruption; UTF-8 decoding and encoding checks are the verification basis.
- Follow-up MulAg pass after the 5.3 cleanup/deploy found and fixed `forecastCalc` naming in secondary drawer internals, empty split-draft global toggle defaulting, duplicated secondary API response guards, and current-schema snapshot fallback leakage.
- Backend/API docs now spell out the current `getSecondaryStockOrderCalc().inboundSplitSource` shape `{ total, sizeInfo, expectation, confirmed }` and the schedule-level UI toggle vs per-round snapshot storage rule.

## Deferred

- Snapshot DTO decoupling from UI/API render model aliases.
- Backend data migration remains separate if parser-side v4 migration is not enough for persisted production snapshots.
- Candidate insight/export DTO wording such as `competitorSalesSourceLabel` and `comparisonSubjectLabel`.
- Mock state semantics such as `hasConfirmedOrderSnapshot`.
- Snapshot alias cleanup such as `OrderSnapshotDocument`.
- Backend implementation work for the documented API endpoints.

## Validation

- Initial pass: automated tests/build were not run.
- Follow-up pass: run focused tests, encoding check, and build before completion.
