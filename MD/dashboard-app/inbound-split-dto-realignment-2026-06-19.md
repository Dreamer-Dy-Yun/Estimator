# Inbound Split DTO Realignment - 2026-06-19

## Goal

분할입고 설정, 오더 상세 추천 수량, 일간 판매추이 mock/API 계약이 서로 다른 DTO와 계산 경로를 사용하지 않도록 현재 기준으로 재정렬한다.

## Scope

- `SecondaryDailyTrendSource`를 `{ size, baseStock, data: { base, comparison } }` 형태로 정리한다.
- `SecondaryStockOrderCalcResult.inboundSplitSource`를 `{ total, sizeInfo, expectation, confirmed }` 형태로 정리한다.
- 분할입고 계산은 오더 상세 추천 총량과 같은 source를 사용한다.
- mock, snapshot parser, snapshot fixture, API 타입, boundary/API 문서를 같은 계약으로 맞춘다.

## Principles

- 일간 추이 API에는 `size?`만 추가한다. 입고일, 가중치, 오더 계산 전용 필드는 넘기지 않는다.
- 분할입고 범위는 `[currentOrderInboundDueDate, nextOrderInboundDueDate)`이다.
- 1차 분할 제안 총합은 오더 상세 추천 총량과 같은 planning 함수에서 산정되어야 한다.
- 2차 이상에서는 각 차수 구간의 `total.sales` 수요, `sizeInfo[size].salesRate`, `sizeInfo[size].baseStock`, `expectation[size][]`, 현오더 입고 전 기존 입고예정량, UI 여유재고 목표를 반영한다. 수요는 `[n차 입고일, n+1차 입고일)`, n차에 반영되는 기오더 입고 예정량은 `[n-1차 입고일, n차 입고일)` 기준이다.
- 현재 재고는 `sizeInfo[size].baseStock`이다. 기존 오더 입고 예정량은 `expectation[size][]`이다.
- `ignoreExistingOrderInbound`는 n차에 반영되는 `[n-1차 입고일, n차 입고일)` 기존 주문 입고예정량 반영 여부를 제어한다. 시작 재고와 현오더 입고 전 기존 입고예정량은 항상 적용한다.

## Plan

1. API 타입과 export 이름을 신규 DTO 기준으로 맞춘다.
2. daily trend source builder, hook, validator를 신규 DTO로 맞춘다.
3. stock-order-calc mock이 상세 추천과 분할입고 source를 같은 입력에서 만들도록 한다.
4. 분할입고 계산 모델을 `total`, `sizeInfo`, `expectation` 기준으로 정리한다.
5. snapshot 저장/파싱/fixture를 신규 source 구조로 맞춘다.
6. backend API 문서와 dashboard boundary 문서를 현재 계약으로 갱신한다.

## Result

- `SecondaryDailyTrendSource`에서 이전 일자별 flow 형태를 제거하고 `baseStock`과 `data.base/data.comparison`으로 통일했다.
- `inboundSplitSource`에서 이전 공급점 형태를 제거하고 `total`, `sizeInfo`, `expectation`, `confirmed`로 통일했다.
- 기존 오더 입고 예정 포인트 타입은 분할입고 source가 아니라 A 데이터임이 드러나도록 명칭을 정리했다.
- 분할입고 1차 제안 총합은 오더 상세 추천 총량과 같은 planning 함수에서 나온다. `total.suggestion`은 backend source 집계값으로만 둔다.
- `ignoreExistingOrderInbound` 활성 상태에서도 차수 수만 바뀌어 제안 총합이 크게 달라지면 안 된다. 다만 차수별 정수화 때문에 소량 차이는 발생할 수 있다.
- 수동 row total 재배분은 사이즈별 추천 합계가 아니라 `sizeInfo.salesRate` 기준으로 정렬했다.
- backend API spec, catalog, snapshot contract, frontend overview, source boundary, product drawer boundary, API boundary 문서를 갱신했다.

## Non-goals / Follow-up

- 백엔드 실제 endpoint 구현은 이번 범위가 아니다.
- 기존 historical note 전체를 삭제하지는 않는다. 다만 현재 계약을 오해시키는 필드명은 현행 문서에서 제거한다.
- 테스트와 빌드는 별도 지시가 있을 때 실행한다.
