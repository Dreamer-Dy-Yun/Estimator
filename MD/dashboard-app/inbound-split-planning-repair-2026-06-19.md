# 분할 입고 추천 수량 계산 복구 - 2026-06-19

## Goal

분할 입고와 오더 상세 추천 수량 계산에서 재고, 기존 주문 입고예정량, 여유재고 목표가 누락되지 않도록 복구한다.

## Scope

- `secondaryInboundSplitPlanning`의 추천 수량 산식
- TEST-SHOE 분할입고 검증 mock의 추천 수량 기준

## Principles

- 총 판매예측은 `total.sales`의 기간별 합계를 기준으로 한다.
- 사이즈별 수요는 `sizeInfo.salesRate`로 배분한다.
- 각 사이즈는 `sizeInfo.baseStock`을 시작 재고로 사용한다.
- 기존 주문 입고예정량은 n차 제안 계산 시 `[n-1차 입고일, n차 입고일)` 구간의 `expectation`만 재고에 더한다. 수요 계산 구간은 `[n차 입고일, n+1차 입고일)`로 별도다.
- 여유재고 설정은 `targetEndingStockQty`로 반영한다.
- 구간 종료 후 남은 재고는 다음 차수로 이월한다.

## Result

- 기존에는 `targetEndingStockQty`가 계산만 되고 사용되지 않았다.
- 기존에는 `sizeInfo.baseStock`과 `expectation`이 분할 추천량 산식에 직접 반영되지 않았다.
- 수정 후 추천량은 구간 수요, 시작 재고, 기존 주문 입고예정량, 목표 여유재고를 함께 반영한다.
- TEST-SHOE mock은 매일 1EA를 기존 주문 입고예정량으로 넣던 임시 데이터를 제거했다.
- TEST-SHOE mock의 `total.suggestion`은 backend source 집계값으로 산출한다. UI 여유재고가 적용된 최종 추천량은 frontend planning 함수가 별도 산정한다.

## Non-goals

- 실제 백엔드 API 구현은 포함하지 않는다.
- 화면 디자인과 버튼 위치는 별도 UI 패치 범위로 둔다.
