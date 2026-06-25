# Inbound Split Source Rework

Last updated: 2026-06-19

이 문서는 2026-06-18 분할입고 source 정리 작업의 결과를 현재 계약 기준으로 다시 정리한 노트이다.
과거의 per-round toggle 또는 단순 차수 총량 선분배 설명은 현재 기준이 아니다.

## Goal

- 분할입고 source를 `getSecondaryStockOrderCalc().inboundSplitSource`로 통합한다.
- 오더 상세 추천 row와 분할입고 제안 row가 같은 source와 같은 planning 함수를 쓰게 한다.
- 기존 주문 입고 예정량(A), 현재 재고, size 비중, 일 판매 예측의 의미를 API 계약에서 분리한다.

## Current API contract

`getSecondaryStockOrderCalc` request body:

- `skuGroupKey`
- `productIdentity`
- `base`, `comparison`
- `periodStart`, `periodEnd`
- `calculationBaseDate`
- `currentOrderInboundDueDate`
- `nextOrderInboundDueDate`
- `forecastPeriodEndMonth?`
- `orderCoverageDays`
- `selfWeightPct`
- `dailyMean?`

`getSecondaryStockOrderCalc` response:

- `productIdentity`
- `existingOrderInboundSupplyBySize: Record<size, { date, qty }[]>`
- `display.currentStockQty*`
- `display.totalOrderBalance*`
- `display.expectedInboundOrderBalance*`
- `inboundSplitSource`

`inboundSplitSource`:

- `total: { suggestion, sales }`
- `sizeInfo: Record<size, { salesRate, baseStock }>`
- `expectation: Record<size, { date, inbound }[]>`
- `confirmed: { total_phase, data }`

## Field meaning

- `existingOrderInboundSupplyBySize` is A, the date-level source for existing ordered but not-yet-inbound quantities.
- `display.totalOrderBalance*` is the aggregate of all A points.
- `display.expectedInboundOrderBalance*` is the aggregate of A points with `date < currentOrderInboundDueDate`.
- `inboundSplitSource.total.suggestion` is a backend source aggregate, not the frontend final recommendation shortcut.
- `inboundSplitSource.total.sales` covers `[currentOrderInboundDueDate, nextOrderInboundDueDate)`.
- `inboundSplitSource.sizeInfo[size].salesRate` is the size sales/share ratio.
- `inboundSplitSource.sizeInfo[size].baseStock` is opening stock by size and may be negative.
- `inboundSplitSource.expectation[size][]` is existing-order future inbound and excludes the draft/current order.

## Planning semantics

1. Whole order coverage is `[currentOrderInboundDueDate, nextOrderInboundDueDate)`.
2. Round demand uses `[round n inbound date, round n+1 inbound date)`.
3. The last round's next date is `nextOrderInboundDueDate`.
4. Current v4 stock-flow semantics use `[round n inbound date, round n+1 inbound date)` for both demand and existing-order inbound application; inbound is added on its actual date before daily sales are subtracted.
5. `excludePeriodExistingOrderInbound` excludes the same-round inbound interval from that stock flow.
6. Existing inbound before `currentOrderInboundDueDate` remains applied as opening-stock-side supply.
7. Split count, split dates, draft row quantities, `bufferStock`, and `excludePeriodExistingOrderInbound` are UI/snapshot state, not stock-order-calc request fields.
8. 2+ rounds may create small integer-rounding differences because stock is carried between round intervals.

## Result

- `getSecondaryStockOrderCalc().inboundSplitSource` is the only split-inbound planning source.
- The secondary drawer no longer requests a separate inbound split source.
- Daily trend remains a graph source; it is not used as the split-inbound planning source.
- Snapshot v8 stores applied split rows in `drawer2.confirmed.rounds`.
