# Daily trend size query update

## Goal

일간 판매추이에서 사이즈 선택 시 전체 집계값에 사이즈 비중을 곱하지 않고, 선택 사이즈를 API query로 전달해 실제 사이즈 기준 판매/입고/재고 데이터를 조회한다.

## Scope

- `getSecondaryDailyTrend` 요청에 optional `size` query를 추가한다.
- `size`가 없거나 `null`이면 전체 사이즈 기준으로 조회한다.
- `size`가 있으면 해당 사이즈 기준의 일간 판매, 입고, 재고 흐름을 응답해야 한다.
- Mock 데이터의 사이즈별 실제 값 구성은 후속 작업으로 둔다.

## Principles

- 판매추이 API 호출과 재고/발주 계산 API 호출은 분리 유지한다.
- 분할입고 설정은 계속 `getSecondaryStockOrderCalc().inboundSplitSource`를 기준 소스로 사용한다.
- 사이즈별 재고/입고는 비율 배분으로 만들지 않는다.
- 프론트는 선택 사이즈를 query로 넘기고 응답값을 그대로 렌더링한다.

## Result

- `SecondaryDailyTrendParams.size?: string | null` 계약을 추가했다.
- `SecondaryDailyTrendSource`를 `{ size, baseStock, data: { base, comparison } }` 형태로 맞췄다.
- HTTP 요청 query에 `size`를 포함하도록 변경했다.
- 일간 판매추이 사이즈 선택 상태를 카드 내부 state에서 요청 모델 state로 올렸다.
- 사이즈 선택 시 `useSecondaryDailyTrend`가 `getSecondaryDailyTrend`를 다시 호출한다.
- 기존 비율 기반 `sales/stock/inbound` 스케일링 로직을 제거했다.

## Follow-up candidates

- Mock daily trend source가 `size` query를 받았을 때 분할입고 `inboundSplitSource`와 겹치는 날짜/사이즈의 판매예측, 기존재고, 입고예정값이 일치하도록 fixture를 만든다.
- Mock daily trend source가 `size` query별 실제 값을 반환하도록 확장한다.
