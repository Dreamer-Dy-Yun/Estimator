# API 계약 정리 기록

- 지시: 사용자 요청(2026-05-08), "API 계약 검토 후 과도한 데이터/중복 요청/복잡한 요청이 있으면 고쳐"
- 작성: Codex, 2026-05-08

## Goal

1차 프론트 완성 전에 프론트 목업 편의 때문에 남아 있던 API 과적재와 중복 호출을 줄인다.

## Scope

- 상품 drawer 기본 번들에서 사용하지 않는 재고 시계열과 월간 판매추이 의존을 제거한다.
- 후보군 발주 엑셀 다운로드를 후보별 상세 N회 조회가 아닌 단일 API 계약으로 이동한다.
- 후보군 일괄 삭제를 개별 DELETE 반복이 아닌 bulk API 계약으로 이동한다.
- 운영 API 응답에 들어가면 안 되는 mock 전용 경쟁채널 보정값을 mock 내부 모델로 숨긴다.

## Principles

- 화면 컴포넌트는 백엔드 소유 데이터를 직접 조립하기보다 `src/api` 계약만 호출한다.
- mock은 운영 API 모양을 흉내 내되, mock 데이터 생성용 필드는 public DTO에 노출하지 않는다.
- 월간/일간/기간/채널 민감 데이터는 drawer bundle에 넣지 않고 기능별 API가 책임진다.

## Result

- `getProductDrawerBundle(id)`는 상품 요약만 반환한다. `forecastMonths`, `stockTrend`, bundle 내 월간 추이 데이터는 제거했다.
- `getProductMonthlyTrend`, `getProductSalesInsight`, `getSecondaryDailyTrend`, `getSecondaryStockOrderCalc`가 기간/채널/계산성 데이터를 담당한다.
- `downloadCandidateStashOrderExcel(stashUuid, userName)`을 추가해 UI의 후보별 상세 N회 조회를 제거했다.
- `deleteCandidateItems(stashUuid, itemUuids)`를 추가해 일괄 삭제 API 경계를 만들었다.
- `SecondaryCompetitorChannel` public 타입은 `{ id, label }`만 가진다. `priceSkew`, `qtySkew`는 `src/api/mock` 내부 타입으로 분리했다.
- `CandidateStashSummary` public 응답에서 `createdByUserUuid`를 제거했다. 소유자 필터링은 세션 기반 백엔드 책임이고, 일반 목록 화면에는 owner UUID가 필요 없다.

## Follow-Up Candidates

- 2차 발주 계산은 아직 화면 상호작용을 위해 일부 클라이언트 계산 fallback을 유지한다. 운영 백엔드가 준비되면 `getSecondaryStockOrderCalc` 응답에 사이즈별 추천/확정 계산 근거까지 포함해 fallback 비중을 더 줄일 수 있다.
- 추천 결과는 현재 `CandidateItemListResult`와 같은 모양을 유지한다. 응답량이 커지면 `recommendedItemUuids + reason/badgeNames` 형태로 줄이는 것을 검토한다.
