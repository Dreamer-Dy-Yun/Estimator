# Order Snapshot LLM Field Guide

Last updated: 2026-06-18

Use this guide when converting `OrderSnapshotDocument` v7 into an LLM prompt.

## Prompt rules

- Explain only values present in the snapshot or explicitly fetched API context.
- Do not infer stock/order values by array position.
- Read stock/order display rows from `drawer2.stockOrderResult.display.sizeRows[]` by `size`.
- Treat `drawer2.stockOrderResult.existingOrderInboundSupplyBySize` as the date-level source for existing-order inbound supply.
- Treat `totalOrderBalance` and `expectedInboundOrderBalance` as display aggregates, not as date-level supply rows.
- Do not describe `confirmedOrderSnapshot` or `isLatestLlmComment` as snapshot fields.
- Daily trend chart points are not stored in the snapshot.

## Field meanings

| Field | Meaning |
|---|---|
| `schemaVersion` | Snapshot schema version. |
| `skuGroupKey` | Product group key. |
| `savedAt` | Snapshot creation timestamp. |
| `context.periodStart`, `context.periodEnd` | Sales/analysis reference period. |
| `context.forecastMonths` | Monthly forecast horizon. |
| `context.dailyTrendStartMonth` | Daily trend restore start month. |
| `context.dailyTrendForecastDays` | Daily forecast/order coverage days. |
| `drawer1.summary` | Primary product identity, price, quantity, stock summary. `productUuid` can be present when backend provides a stable product identity. |
| `drawer2.baseSubject` | Base sales subject. Current base kind is `self-company`; `sourceId` scopes to one company when present. |
| `drawer2.comparisonSubject` | Comparison subject. It can be a competitor channel or another self-company target. |
| `drawer2.comparisonBasis` | Comparison baseline price, quantity, and size ratio. |
| `drawer2.stockOrderRequest` | User/order input dates and coverage days. |
| `drawer2.stockOrderResult.productIdentity` | Product identity echoed by stock-order-calc so the UI can reject mismatched results. |
| `drawer2.stockOrderResult.existingOrderInboundSupplyBySize` | Existing-order inbound supply by size and date. This excludes the current order being planned. |
| `drawer2.stockOrderResult.display.totalOrderBalanceTotal` | Total unreceived existing-order balance aggregate. |
| `drawer2.stockOrderResult.display.expectedInboundOrderBalanceTotal` | Existing-order inbound aggregate with `date < stockOrderRequest.currentOrderInboundDueDate`. |
| `drawer2.stockOrderResult` | Calculated stock/order recommendation basis. |
| `drawer2.unitEconomics` | Unit price, cost, and fee rate. |
| `drawer2.aiComment` | Stored AI prompt/answer metadata. |
| `drawer2.confirmed.rounds[]` | Confirmed inbound rounds. Quantities are keyed by size. The current UI writes the same `ignoreExistingOrderInbound` value to all rounds from one schedule-level toggle. |
| `drawer2.sizeOrders[]` | Size-level share, forecast, and recommendation rows. |

## Comment basis

- If `aiComment.answer` is empty, no saved comment exists.
- If `generatedAt` is `null`, the comment has not been generated for this snapshot.
- Use `baseSubject` and `comparisonSubject` to name the compared parties.
- Use `confirmed.rounds[]` for confirmed order quantities.
- Use `sizeOrders[]` only for share, forecast, and recommendation context.
- Use `existingOrderInboundSupplyBySize` when the comment needs date-level existing-order inbound context.
- Use `display.totalOrderBalanceTotal`, `display.expectedInboundOrderBalanceTotal`, and `display.sizeRows[]` when the comment only needs current table totals.
- Use `unitEconomics` with calculated amounts when discussing margin or profit.
