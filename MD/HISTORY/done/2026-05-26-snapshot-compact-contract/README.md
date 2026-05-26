# 2026-05-26 snapshot compact contract

Status: completed and validated. This note records PLAN-116 and TODO-112 through TODO-114.

## Goal

Compact the product drawer order snapshot contract so new candidate item details do not store hidden legacy fields or broad UI/API objects. The snapshot must keep only the fields needed for restore and AI judgment, and the frontend docs plus backend API docs must describe the same contract.

## Scope

- dashboard-app/src/snapshot/orderSnapshotTypes.ts
- dashboard-app/src/snapshot/parseOrderSnapshot.ts
- dashboard-app/src/snapshot/parseOrderSnapshot.test.ts
- dashboard-app/src/api/mock/orderSnapshotForCandidate.ts
- dashboard-app/src/dashboard/components/product-drawer/secondary/secondarySnapshot.ts
- dashboard-app/src/dashboard/components/product-drawer/secondary/useSecondaryDrawerDetail.ts
- dashboard-app/src/dashboard/components/product-drawer/secondary/model/secondaryDrawerCalc.ts
- dashboard-app/src/dashboard/components/product-drawer/ProductDrawerSecondaryPane.tsx
- dashboard-app/src/dashboard/drawer/mergePrimarySummaryFromSnapshot.ts
- MD/backend-api/backend-api-spec.md
- MD/backend-api/dashboard-api-contract-catalog.md
- MD/dashboard-app/boundaries/product-drawer.md
- MD/dashboard-app/source-boundary-map.md

## Principles

- New snapshot payloads do not use drawer2.secondary as a current field.
- Legacy drawer2.secondary is accepted only as parser input and normalized into drawer2.competitorSalesBasis.
- drawer1.summary is a compact summary for product identity, display metadata, and period KPI fields only.
- Current compact summaries must not pad missing ProductPrimarySummary fields with empty arrays, zeroes, or fabricated recommendation quantities.
- Parsed current snapshots are not enough to reconstruct a full legacy ProductPrimarySummary without the live bundle.
- Backend implementations may store the snapshot as JSON, but should still validate the documented field meanings.

## Result

- Added an explicit product drawer snapshot boundary.
- Aligned backend spec and API catalog on drawer2.competitorSalesBasis.
- Documented that drawer1.summary no longer stores sizeMix, seasonality, recommendedOrderQty, or monthlySalesTrend.
- Documented drawer2.secondary as a legacy normalize input, not a new output field.
- Made parser and builders follow the explicit-fields-only snapshot contract.
- Documented drawer2.stockInputs as the current 9-field required object.
- Removed current-contract treatment of excluded fields such as forecastQtyCalc.
- Documented current `OrderSnapshotDocumentV2` naming and optional top-level `companyUuid?: string` for snapshot v2 company scope.
- Documented the scope-safe hydrate rule: same company UUID for single-company scope, or both unscoped for all-company scope.

## Deployment notes

- 2026-05-26: Deployment trigger pushed after GitHub workflow dispatch returned HTTP 500.

## Validation

- npm run lint: passed.
- npm run test:run: passed, 51 files / 280 tests.
- npm run build -- --base=/Estimator/: passed.
- git diff --check: passed. Only CRLF conversion warnings were reported.
- Encoding scan: no BOM, no U+FFFD, no CRLF literal artifact in the checked files.

## Follow-up candidates

- Coordinate backend persistence and frontend runtime rollout so new snapshots consistently include `companyUuid` for single-company details.

## Non-goals

- No backend DB migration was performed.
- Existing stored legacy snapshots were not migrated in the database.

## Worker C addendum

- Reinforced API/backend/frontend docs around current `OrderSnapshotDocumentV2` naming.
- Documented optional top-level `companyUuid?: string` and exact scope-safe hydrate behavior.
- Added regression intent for compact `drawer2` key behavior, including optional `stockDisplay`.
- Tests were not run in this Worker C pass by request.
