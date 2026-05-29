# Order Snapshot Backend Contract

Last updated: 2026-05-29

`OrderSnapshotDocumentV2` is the persisted candidate item snapshot. It is a screen-restore contract for the current product drawer state.

## Top level

| Field | Required | Meaning |
|---|:---:|---|
| `schemaVersion` | Y | `2` |
| `skuGroupKey` | Y | Product group key |
| `companyUuid` | N | Company scope. New single-company snapshots should include it. |
| `savedAt` | Y | Snapshot creation timestamp |
| `context` | Y | Restore/request basis |
| `drawer1` | Y | Primary drawer snapshot |
| `drawer2` | Y | Secondary drawer snapshot |

## `context`

Fields: `periodStart`, `periodEnd`, `forecastMonths`, `dailyTrendStartMonth`, `dailyTrendLeadTimeDays`.
`dailyTrendLeadTimeDays` must equal `drawer2.stockOrderRequest.leadTimeDays` after parse/validate.

## `drawer1.summary`

Fields: `skuGroupKey`, `productName`, `brand`, `category`, `code`, `colorCode`, `price`, `qty`, `availableStock`.

## `drawer2`

Required fields: `competitorBasis`, `competitorChannelId`, `competitorChannelLabel`, `stockOrderRequest`, `selfWeightPct`, `bufferStock`, `aiComment`, `confirmedTotals`, `sizeOrders`.

Optional fields: `stockOrderResult`, `unitEconomics`.

### `competitorBasis`

Fields: `skuGroupKey`, `competitorPrice`, `competitorQty`, `competitorRatioBySize`.
`competitorRatioBySize` values are 0..1 ratios.

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
  - `drawer2.competitorBasis.skuGroupKey`
  All three must match exactly.
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

Fields: `size`, `selfSharePct`, `competitorSharePct`, `blendedSharePct`, `forecastQty`, `recommendedQty`, `confirmQty`.

## Storage rules

- Store snapshot JSON in candidate item `details`.
- Do not store API wrapper fields inside the snapshot document.
- `isLatestLlmComment` is item metadata, not a snapshot field.
- Reject values that cannot be validated against this contract.
