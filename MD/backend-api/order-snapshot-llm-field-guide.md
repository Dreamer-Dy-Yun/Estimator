# Order Snapshot LLM Field Guide

Last updated: 2026-06-14

Use this guide when converting `OrderSnapshotDocument` v5 into an LLM prompt.

## Prompt rules

- Explain only values present in the snapshot or explicitly fetched API context.
- Do not infer stock/order values by array position.
- Read stock/order display rows from `drawer2.stockOrderResult.display.sizeRows[]` by `size`.
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
| `drawer1.summary` | Primary product identity, price, quantity, stock summary. |
| `drawer2.baseSubject` | Base sales subject. Current base kind is `self-company`; `sourceId` scopes to one company when present. |
| `drawer2.comparisonSubject` | Comparison subject. It can be a competitor channel or another self-company target. |
| `drawer2.comparisonBasis` | Comparison baseline price, quantity, and size ratio. |
| `drawer2.stockOrderRequest` | User/order input dates and coverage days. |
| `drawer2.stockOrderResult` | Calculated stock/order recommendation basis. |
| `drawer2.unitEconomics` | Unit price, cost, and fee rate. |
| `drawer2.aiComment` | Stored AI prompt/answer metadata. |
| `drawer2.confirmed.rounds[]` | Confirmed inbound rounds. Quantities are keyed by size. |
| `drawer2.sizeOrders[]` | Size-level share, forecast, and recommendation rows. |

## Comment basis

- If `aiComment.answer` is empty, no saved comment exists.
- If `generatedAt` is `null`, the comment has not been generated for this snapshot.
- Use `baseSubject` and `comparisonSubject` to name the compared parties.
- Use `confirmed.rounds[]` for confirmed order quantities.
- Use `sizeOrders[]` only for share, forecast, and recommendation context.
- Use `unitEconomics` with calculated amounts when discussing margin or profit.
