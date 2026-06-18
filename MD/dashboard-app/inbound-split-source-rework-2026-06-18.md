# Inbound Split Source Rework - 2026-06-18

## Goal

분할입고 설정의 제안 수량 계산을 차수별 기간 수요와 실제 공급 흐름 기준으로 재정의한다.

## Scope

- `getSecondaryInboundSplitSource` 계약을 분할입고 계산 전용 source API로 정리한다.
- 분할입고 제안 계산은 각 차수 기간의 판매 예측을 먼저 집계한 뒤, 계산 기준일 재고와 기존 오더 입고 예정량을 차감한다.
- 차수별로 기존 오더 중간 입고량 반영 여부를 사용자가 선택할 수 있게 한다.
- 선택값은 확정 차수 정보와 주문 스냅샷에 저장한다.

## Principles

- 계산 기준일은 `calculationBaseDate`이며, 보통 화면을 연 오늘 날짜를 사용한다.
- 금번 오더의 분할 차수 제안 범위는 `coverageStartDate`부터 `coverageEndDate` 전일까지다.
- 현재 재고는 `supplyBySize` 안에서 `calculationBaseDate`의 공급점으로 표현한다.
- 기존 오더 입고 예정량은 금번 오더 수량과 무관한 외부 공급점이며, `supplyBySize` 안에서 사이즈별 복수 일자 데이터로 표현한다.
- 공급점에는 별도 `kind`를 두지 않는다. 기준일 공급점은 현재 재고로, 이후 공급점은 기존 오더 입고 예정량으로 해석한다.
- 제안 수량은 사이즈별 기간 부족량을 기준으로 계산한다. 전체 확정 총량과 사이즈별 합계가 일부 흔들릴 수 있더라도 기간별 제안 흐름을 우선한다.

## API Contract

`getSecondaryInboundSplitSource` request:

- path/query: `skuGroupKey`
- query/body params: `productIdentity`, `calculationBaseDate`, `coverageStartDate`, `coverageEndDate`, `base`

`getSecondaryInboundSplitSource` response:

- `productId`
- `productIdentity`
- `calculationBaseDate`
- `coverageStartDate`
- `coverageEndDate`
- `supplyBySize: Record<size, { date, qty }[]>`
- `salesForecastByDate: Record<date, Record<size, qty>>`

`getSecondaryStockOrderCalc` request:

- body params: `skuGroupKey`, `productIdentity`, `base`, `periodStart`, `periodEnd`, `calculationBaseDate`, `currentOrderInboundDueDate`, `forecastPeriodEndMonth?`, `orderCoverageDays`, `dailyMean?`

`getSecondaryStockOrderCalc` response:

- `productIdentity`
- `existingOrderInboundSupplyBySize: Record<size, { date, qty }[]>`
- `display.totalOrderBalance*`: aggregate of all A points.
- `display.expectedInboundOrderBalance*`: aggregate of A points with `date < currentOrderInboundDueDate`.
- `display.currentStockQty*`: current stock as of `calculationBaseDate`.

## Calculation Flow

1. `calculationBaseDate`의 공급점을 사이즈별 기초 재고로 적재한다.
2. 첫 차수 입고일 전까지의 판매 예측과 기존 오더 입고 예정량을 반영해 예상 재고를 전진시킨다.
3. 각 차수는 `[차수 입고일, 다음 차수 입고일)` 구간을 담당한다.
4. 마지막 차수는 `[마지막 차수 입고일, coverageEndDate)` 구간을 담당한다.
5. 각 구간에서 판매 예측을 누적하고, 공급점과 이월 재고를 반영해 사이즈별 최대 부족량을 산정한다.
6. 부족량을 올림 처리해 해당 차수의 사이즈별 제안 수량으로 사용한다.
7. 차수의 `ignoreExistingOrderInbound`가 `true`면 해당 구간 내부의 기존 오더 입고 예정 공급점은 제안 계산에서 제외한다.

## Result

- 분할 차수 수나 차수 날짜가 바뀌면 각 기간의 담당 수요가 달라지므로 제안 수량도 함께 바뀐다.
- 현재 재고와 기존 오더 입고 예정량은 동일한 `supplyBySize` 구조로 계산에 들어간다.
- `ignoreExistingOrderInbound`는 차수별 확정 정보와 주문 스냅샷 v7에 보존된다.
- API 문서와 프론트 경계 문서는 신규 계약 기준으로 갱신한다.

## Non-goals and Follow-up Candidates

- 백엔드 엔드포인트 구현은 이번 범위가 아니다.
- 기존 fixture 원천 파일의 내부 구조를 즉시 신규 API 응답 구조로 재작성하지는 않는다. mock adapter가 API 계약 형태로 변환한다.
- 적용 후 확정 수량을 제안 수량으로 자동 덮어쓸지 여부는 별도 UX 정책으로 다룬다.
