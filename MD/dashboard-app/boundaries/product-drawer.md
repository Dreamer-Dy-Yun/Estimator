# Product Drawer Boundary

Last updated: 2026-06-18

상품 드로어는 판매 목록에서 선택한 상품의 상세 분석, 오더 제안, 확정 수량, 후보 스냅샷 저장을 연결한다. 이 문서는 화면 책임과 API/계산/저장 경계를 구분한다.

## 1. 드로어 구성

| 영역 | 책임 |
|---|---|
| Primary drawer | 상품 요약, 월간 추세, 판매 인사이트, 기본 재고/판매 정보를 표시한다. |
| Secondary drawer | 오더 수량 산정, 사이즈별 추천/확정, AI 코멘트, 입고 분할을 처리한다. |
| Candidate snapshot | 후보 항목에 저장되는 `OrderSnapshotDocument` v7를 생성/파싱한다. |

드로어 UI는 API 응답을 표시하고 사용자 결정을 저장한다. 백엔드 계산값을 화면에서 임의 보정해 계약 불일치를 숨기지 않는다.

## 2. 데이터 로딩 경계

| 데이터 | API | 비고 |
|---|---|---|
| 기본 번들 | `getProductDrawerBundle` | 상품 요약, 재고, 기본 상세값 |
| 비교 대상 | `getProductComparisonTargets` | 비교 채널/자사 비교 대상 목록 |
| 월간 추세 | `getProductMonthlyTrend` | 기간/비교 주체 기반 월간 추세 |
| 판매 인사이트 | `getProductSalesInsight` | 기간/채널 민감 분석 데이터 |
| Secondary 상세 | `getProductSecondaryDetail` | 오더 계산 입력/결과, 사이즈 제안, AI 코멘트 |
| 일별 추세 | `getSecondaryDailyTrend` | 일 단위 예측 흐름 |
| 입고 분할 소스 | `getSecondaryInboundSplitSource` | 계산 기준일, 커버리지, 일자/사이즈별 판매예측, 날짜별 공급 포인트 소스 |

`getProductDrawerBundle`에 모든 데이터를 과적재하지 않는다. 기간 또는 비교 주체에 민감한 데이터는 별도 API로 둔다.

## 3. 비교 주체 계약

상품 드로어 API는 `companyUuid` 단독 기준이 아니라 subject query를 사용한다.

| subject | 필드 | 의미 |
|---|---|---|
| base | `baseRole`, `baseKind`, `baseSourceId?` | 기준 주체. 현재 기본값은 자사이다. |
| comparison | `comparisonRole`, `comparisonKind`, `comparisonSourceId?` | 비교 주체. 경쟁 채널 또는 자사 비교가 가능하다. |

`competitor-channel` 비교는 `sourceId`가 필수이다. 프론트는 비교 대상을 임의 생성하지 않고, 대상 목록 API가 준 값만 선택지로 사용한다.

## 4. Secondary 오더 수량 경계

| 값 | 설명 |
|---|---|
| 추천 수량 | 오더 상세에서 제안되는 수량이다. 계산 결과 또는 현재 추천 합계가 기준이다. |
| 확정 수량 | 사용자가 최종 적용한 수량이다. 오더 상세과 입고 분할 설정이 같은 값을 참조해야 한다. |
| 수동 확정 변경 | 사용자가 오더 상세에서 확정 수량을 바꾸면 이후 표시와 분할 기준은 그 값을 따라야 한다. |

추천 수량과 확정 수량은 같은 값이 아니다. 추천은 계산/제안이고, 확정은 사용자의 현재 결정이다.

## 5. 입고 분할 경계

입고 분할은 차수별 입고일과 차수별 확정 수량을 사용자가 조정하는 UI이다.

| 개념 | 기준 |
|---|---|
| 첫 차수 기준일 | `currentOrderInboundDueDate`를 사용한다. |
| 다음 입고 기준 | `nextOrderInboundDueDate`를 사용한다. |
| 일예측 합산 구간 | 각 차수의 입고일부터 다음 차수 입고일 전일까지이다. 마지막 차수는 다음 오더 입고일 전일까지이다. |
| 적용 결과 | `drawer2.confirmed.rounds`에 차수별 `date`, `qtyBySize`로 저장된다. |

분할 계산은 현재 다음 원칙을 따른다.

- 차수별 전체 확정 수량을 먼저 산정한다.
- 해당 차수 총량을 사이즈별 제안 비율에 따라 배분한다.
- 사이즈별 총합 보존을 위해 차수별 총량을 바꾸지 않는다.
- 반올림 잔여는 차수 내부에서 조정한다.

이 방식은 차수 분할과 수동 확정 변경의 배분 기준을 하나로 맞추기 위한 것이다.

## 6. 입고 분할 소스 API

`getSecondaryInboundSplitSource`는 source-only API이다.

| 제공값 | 용도 |
|---|---|
| 일자별 예측 수요 | 차수별 기간 수요 합산 |
| 사이즈별 기준 비중/수량 | 차수 총량을 사이즈로 배분할 때 사용하는 기준 |
| 기준 상품/재고 관련 값 | UI 표시와 계산 보조 |

이 API는 사용자가 적용한 분할 rows를 저장하거나 반환하지 않는다. 저장된 분할 결과와 `ignoreExistingOrderInbound` 옵션은 후보 스냅샷의 `drawer2.confirmed.rounds`가 소유한다.

## 7. 스냅샷 경계

현재 저장 스냅샷은 `OrderSnapshotDocument` v7이다.

| 영역 | 저장 의미 |
|---|---|
| `drawer1.summary` | 상품 기본 정보와 가용 재고 |
| `drawer2.stockOrderRequest` | 오더 계산에 사용한 입고일/오더 커버리지 일수/수요 override |
| `drawer2.stockOrderResult` | 계산 결과. 선택 필드 |
| `drawer2.sizeOrders` | 사이즈별 제안/추천 |
| `drawer2.confirmed.rounds` | 사용자가 확정한 차수별 수량 |
| `drawer2.aiComment` | AI 코멘트 프롬프트/응답/생성 시점 |

후보 항목에서 드로어를 열 때 저장 스냅샷이 있으면 해당 값이 우선이다. API 최신값은 사용자가 재계산/재적용할 때 반영한다.

## 8. UI 문구 경계

Secondary 상품 드로어의 한국어 UI 문구는 `product-secondary/ko.ts`를 우선 사용한다. 문구만 바꾸는 작업도 의미가 바뀌면 관련 문서와 테스트 기대값을 함께 검토한다.

현재 입고 분할 적용 경고 문구는 다음 의미를 가져야 한다.

> 입고 분할 변경 시, 각 사이즈의 전체 확정 수량에 변동이 생길 수 있습니다.

이는 차수별 총량 우선 배분으로 인해 사이즈별 전체 합계가 최초 확정값과 달라질 수 있음을 사용자에게 알리는 문구이다.

## 9. 변경 시 확인 항목

- 오더 상세의 추천/확정 수량 출처가 분리되어 있는가
- 수동 확정 변경이 입고 분할 기준에 반영되는가
- 차수별 합계와 사이즈별 표시가 같은 배분 규칙을 사용하는가
- `confirmed.rounds`가 저장 스냅샷에 정확히 반영되는가
- API/mock/문서의 field 이름이 현재 타입과 일치하는가

## Current inbound split source contract

- `getSecondaryInboundSplitSource` query: `calculationBaseDate`, `coverageStartDate`, `coverageEndDate`, base subject.
- `calculationBaseDate` is today and is the inventory simulation base.
- `coverageStartDate` is the current order inbound date.
- `coverageEndDate` is the next order inbound date and is exclusive.
- `productIdentity` is echoed by stock-order and inbound-split source responses and is used to reject mismatched product data.
- `stockOrderResult.existingOrderInboundSupplyBySize` is A, the existing-order inbound schedule by size/date.
- `stockOrderResult.display.totalOrderBalance*` is the aggregate of all A points.
- `stockOrderResult.display.expectedInboundOrderBalance*` is the aggregate of A points with `date < currentOrderInboundDueDate`.
- `supplyBySize[size][]` contains current stock on `calculationBaseDate` and later existing-order inbound quantities from A.
- `salesForecastByDate[date][size]` contains sales forecast only.
- Round suggestions are derived by splitting gross sales forecast by round interval, then carrying stock/supply by size in date order.
- If a round has `ignoreExistingOrderInbound=true`, existing-order inbound supply points inside that round interval are excluded from the suggestion calculation.
