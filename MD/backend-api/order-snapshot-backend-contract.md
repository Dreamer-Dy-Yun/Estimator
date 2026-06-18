# Order Snapshot Backend Contract

Last updated: 2026-06-17

`OrderSnapshotDocument` is the persisted candidate item snapshot. It is a screen-restore contract for the current product drawer state.

## Top level

| Field | Required | Meaning |
|---|:---:|---|
| `schemaVersion` | Y | `5` |
| `skuGroupKey` | Y | Product group key |
| `savedAt` | Y | Snapshot creation timestamp |
| `context` | Y | Restore/request basis |
| `drawer1` | Y | Primary drawer snapshot |
| `drawer2` | Y | Secondary drawer snapshot |

Top-level `companyUuid` is not part of v5. Scoped restore data belongs in `drawer2.baseSubject.sourceId`.

## `context`

Fields: `periodStart`, `periodEnd`, `forecastMonths`, `dailyTrendStartMonth`, `dailyTrendForecastDays`.
`dailyTrendForecastDays` must equal `drawer2.stockOrderRequest.orderCoverageDays` after parse/validate.

## `drawer1`

Required fields: `summary`, `monthlySalesTrend`.

`summary` fields: `skuGroupKey`, `productName`, `brand`, `category`, `code`, `colorCode`, `price`, `qty`, `availableStock`.

`monthlySalesTrend[]` stores the `ProductMonthlyTrendChartPoint[]` display model used directly by the primary monthly sales trend chart. It is not the `ProductMonthlyTrend` API source object, not a reshaped backend source object, and not wrapped in a separate `points` field.

Each point: `idx`, `date`, `actual`, `comparisonActual`, `forecastLink`, `isForecast`, `sales`, `comparisonSales`.

## `drawer2`

Required fields: `baseSubject`, `comparisonSubject`, `comparisonBasis`, `stockOrderRequest`, `selfWeightPct`, `bufferStock`, `aiComment`, `confirmed`, `sizeOrders`.

Required restore fields: `stockOrderResult`, `unitEconomics`.

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

Fields: `currentOrderInboundDueDate`, `nextOrderInboundDueDate`, `orderCoverageDays`, optional `dailyMeanOverride`.
The two inbound date fields follow the integrated sales forecast card input model `SalesForecastInboundDateFields`.

### `stockOrderResult`

Fields: `trendDailyMean`, `dailyMean`, `sigma`, `display`.
This block follows the frontend render/calc result type `SecondaryStockOrderCalcResult`.

`display`: `currentStockQtyTotal`, `totalOrderBalanceTotal`, `expectedInboundOrderBalanceTotal`, `sizeRows[]`.
`sizeRows[]`: `size`, `currentStockQty`, `totalOrderBalance`, `expectedInboundOrderBalance`.
`sizeRows[].size` must match the `sizeOrders[].size` set. Totals must equal row sums.

Recommendation basis lives in `drawer2.sizeOrders[]`, `drawer2.bufferStock`, `drawer2.stockOrderRequest`, and `drawer2.stockOrderResult.display`. Amount/profit projections are outside the current snapshot restore contract unless a separate API contract adds them.

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
- `drawer2.confirmed.rounds[].qtyBySize` size keys must match `drawer2.sizeOrders[].size`.
- `drawer2.stockOrderResult.display` total fields must equal sums of each size row field.
- `context.dailyTrendForecastDays` must equal `drawer2.stockOrderRequest.orderCoverageDays`.

### `unitEconomics`

Fields: `unitPrice`, `unitCost`, `expectedFeeRatePct`.
This block follows the integrated sales forecast card input model `SalesForecastUnitEconomicsFields`.

### `aiComment`

Fields: `prompt`, `answer`, `generatedAt`. `generatedAt` can be `null`.
This block follows the AI comment render model `SecondaryAiCommentView`.

### `confirmed`

Required fields: `rounds`.
`rounds[]` fields: `date`, `qtyBySize`.
`qtyBySize` is keyed by `sizeOrders[].size`.
Each round follows the split inbound schedule state model `SecondaryConfirmedRound`.
Round numbers are not stored. The frontend/backend derives `1차`, `2차`, ... from the array order.
Total quantity is not stored. Consumers derive it from `sum(confirmed.rounds[].qtyBySize)`.

### `sizeOrders[]`

Fields: `size`, `baseSharePct`, `comparisonSharePct`, `blendedSharePct`, `forecastQty`, `recommendedQty`.

`sizeOrders[]` follows `SecondarySizeOrderRestoreRow`, which is the render row `SecondarySizeOrderDisplayRow` without `confirmQty`. It owns share/recommendation rows only. Confirmed quantities are stored only in `drawer2.confirmed.rounds`.

## Storage rules

- Store snapshot JSON in candidate item `confirmedOrderSnapshot`.
- Do not store API wrapper fields inside the snapshot document.
- `isLatestLlmComment` is item metadata, not a snapshot field.
- Reject values that cannot be validated against this contract.
