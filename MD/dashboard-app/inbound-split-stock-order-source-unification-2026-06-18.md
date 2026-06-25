# Inbound Split Source Unification - 2026-06-18

## Goal

오더 상세 추천 수량과 분할 입고 제안 수량이 서로 다른 원천에서 계산되지 않도록 `stockOrderCalc`를 단일 계산 응답으로 정리한다.

## Scope

- `getSecondaryStockOrderCalc` 응답에 `inboundSplitSource`를 포함한다.
- legacy separate inbound split request path, fixture, hook 경로를 제거한다.
- 상세 추천 수량과 분할 입고 제안은 같은 판매예측/재고/기오더 입고 원천을 사용한다.
- `OrderSnapshotDocument`는 v8로 올리고 `stockOrderResult.inboundSplitSource`를 저장/복원 계약에 포함한다.

## Principles

- 같은 조건이면 1차 분할 제안 총합과 오더 상세 추천 수량 총합이 같은 원천에서 산정되어야 한다.
- 분할 차수, 차수별 날짜, 확정 수량, `excludeSegmentExistingOrderInbound`는 API 요청 값이 아니라 UI/snapshot 상태다.
- `inboundSplitSource.sizeInfo[size].baseStock`은 현재/기초 재고이고, `expectation[size][]`는 기 주문 입고 예정 수량(A)이다.
- `total.sales`는 전체 판매예측만 담고 입고 수량을 섞지 않는다.

## Plan

1. `SecondaryStockOrderCalcParams`에 `comparison`, `nextOrderInboundDueDate`, `selfWeightPct`를 명시한다.
2. `SecondaryStockOrderCalcResult`에 필수 `inboundSplitSource`를 추가한다.
3. 프론트 hook은 `stockOrderCalc.inboundSplitSource`를 분할 입고 설정으로 전달한다.
4. mock stock-order-calc는 상세 추천 row와 분할 source를 같은 입력에서 생성한다.
5. snapshot parser는 v7 이하 legacy snapshot에 한해 fallback source를 생성한다.
6. API/프론트 경계 문서에서 별도 inbound split source endpoint 설명을 제거한다.

## Result

- legacy separate inbound split source 경로는 제거했다.
- `useSecondaryDrawerRequests`는 분할 source를 별도 요청하지 않고 `stockOrderCalc.inboundSplitSource`에서 얻는다.
- `buildSecondarySizeOrderRows`는 `inboundSplitSource.total`, `sizeInfo`, `expectation`를 사용해 사이즈별 `forecastQty`와 `recommendedQty`를 만든다.
- 분할 입고 다이얼로그는 같은 source와 같은 planning 함수로 차수별 판매예측, 사이즈 비중, 시작 재고, 기존 주문 입고예정량, UI 여유재고 목표를 반영한다.
- backend API spec, contract catalog, product drawer boundary, source boundary, snapshot contract 문서를 현행 v8 기준으로 갱신했다.

## Non-goals / Follow-up

- 백엔드 실제 endpoint 구현은 이번 범위가 아니다.
- 분할 입고 UI의 배치/스타일 조정은 별도 UI 작업으로 다룬다.
- legacy v7 이하 snapshot은 parse fallback만 제공하며 신규 저장 계약은 v8이다.
