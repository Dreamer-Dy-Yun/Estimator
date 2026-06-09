# Order Snapshot Backend Contract

Last updated: 2026-06-09

`OrderSnapshotDocument` is the persisted candidate item snapshot. It is a screen-restore contract for the current product drawer state.

## Top level

| Field | Required | Meaning |
|---|:---:|---|
| `schemaVersion` | Y | `3` |
| `skuGroupKey` | Y | Product group key |
| `savedAt` | Y | Snapshot creation timestamp |
| `context` | Y | Restore/request basis |
| `drawer1` | Y | Primary drawer snapshot |
| `drawer2` | Y | Secondary drawer snapshot |

Top-level `companyUuid` is not part of v3. Scoped restore data belongs in `drawer2.baseSubject.sourceId`.

## `context`

Fields: `periodStart`, `periodEnd`, `forecastMonths`, `dailyTrendStartMonth`, `dailyTrendLeadTimeDays`.
`dailyTrendLeadTimeDays` must equal `drawer2.stockOrderRequest.leadTimeDays` after parse/validate.

## `drawer1.summary`

Fields: `skuGroupKey`, `productName`, `brand`, `category`, `code`, `colorCode`, `price`, `qty`, `availableStock`.

## `drawer2`

Required fields: `baseSubject`, `comparisonSubject`, `comparisonBasis`, `stockOrderRequest`, `selfWeightPct`, `bufferStock`, `aiComment`, `confirmedTotals`, `sizeOrders`.

Optional fields: `stockOrderResult`, `unitEconomics`.

### `baseSubject`

Fields: `role`, `kind`, optional `sourceId`.

- `role` must be `base`.
- `kind` currently must be `self-company`.
- Omitted `sourceId` means all-company base scope.
- Concrete single-company scope is stored as `sourceId`.

### `comparisonSubject`

Fields: `role`, `kind`, `id`, `label`, optional `sourceId`.

- `role` must be `comparison`.
- `kind` is `competitor-channel` or `self-company`.
- `id` is an opaque comparison option id.
- `label` is the display name stored with the snapshot.
- `competitor-channel` requires `sourceId`.
- `self-company` may omit `sourceId` for all-company comparison.

### `comparisonBasis`

Fields: `skuGroupKey`, `comparisonPrice`, `comparisonQty`, `comparisonRatioBySize`.
`comparisonRatioBySize` values are 0..1 ratios keyed by size.

### `stockOrderRequest`

Fields: `currentOrderInboundDueDate`, `nextOrderInboundDueDate`, `leadTimeDays`, optional `dailyMeanOverride`.

### `stockOrderResult`

Fields: `trendDailyMean`, `dailyMean`, `sigma`, `display`, `safetyStockCalc`, `forecastQtyCalc`.

`display`: `currentStockQtyTotal`, `totalOrderBalanceTotal`, `expectedInboundOrderBalanceTotal`, `sizeRows[]`.
`sizeRows[]`: `size`, `currentStockQty`, `totalOrderBalance`, `expectedInboundOrderBalance`.
`sizeRows[].size` must match the `sizeOrders[].size` set. Totals must equal row sums.

### Consistency checks enforced by snapshot parser

- `skuGroupKey` is canonical at three points:
  - top-level `skuGroupKey`
  - `drawer1.summary.skuGroupKey`
  - `drawer2.comparisonBasis.skuGroupKey`
  All three must match exactly.
- `drawer2.baseSubject.role` must be `base`; `drawer2.baseSubject.kind` must be `self-company`.
- `drawer2.comparisonSubject.role` must be `comparison`; `drawer2.comparisonSubject.kind` must be `competitor-channel` or `self-company`.
- `drawer2.comparisonSubject.sourceId` is required for `competitor-channel`.
- `drawer2.sizeOrders[].size` values must be unique.
- `drawer2.stockOrderResult.display.sizeRows[]` size set must match `drawer2.sizeOrders[]` size set.
- `drawer2.confirmedTotals.orderQty` must equal `sum(drawer2.sizeOrders[].confirmQty)`.
- `drawer2.stockOrderResult.display` total fields must equal sums of each size row field.
- `context.dailyTrendLeadTimeDays` must equal `drawer2.stockOrderRequest.leadTimeDays`.

### `unitEconomics`

Fields: `unitPrice`, `unitCost`, `expectedFeeRatePct`.

### `aiComment`

Fields: `prompt`, `answer`, `generatedAt`. `generatedAt` can be `null`.

### `confirmedTotals`

Required fields: `orderQty`, `expectedSalesAmount`, `expectedOpProfit`, `expectedOpProfitRatePct`.
`orderQty` must equal the sum of `sizeOrders[].confirmQty`.

### `sizeOrders[]`

Fields: `size`, `baseSharePct`, `comparisonSharePct`, `blendedSharePct`, `forecastQty`, `recommendedQty`, `confirmQty`.

## Storage rules

- Store snapshot JSON in candidate item `details`.
- Do not store API wrapper fields inside the snapshot document.
- `isLatestLlmComment` is item metadata, not a snapshot field.
- Reject values that cannot be validated against this contract.
