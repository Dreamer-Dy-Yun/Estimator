# Product Drawer Boundary

Last updated: 2026-06-24

상품 드로어는 판매 목록에서 선택한 상품의 상세 분석, secondary 오더 제안, 확정 수량, 후보 snapshot 저장을 연결한다.
이 문서는 화면 책임과 API/계산/저장 경계를 구분한다.

## 1. Drawer 구성

| 영역 | 책임 |
|---|---|
| Primary drawer | 상품 요약, 월간 추세, 판매 인사이트, 기본 재고/판매 정보를 표시한다. |
| Secondary drawer | 오더 수량 계산, 사이즈별 추천/확정, AI 코멘트, 입고 분할을 처리한다. |
| Candidate snapshot | 후보 item에 저장되는 `OrderSnapshotDocument` v8을 생성/복원한다. |

화면은 API 응답을 표시하고 사용자 결정을 저장한다. 백엔드 계산값을 화면에서 임의 보정해 계약 불일치를 숨기지 않는다.

## 2. Data loading 경계

| 데이터 | API | 비고 |
|---|---|---|
| 기본 bundle | `getProductDrawerBundle` | 상품 요약, 재고, 기본 상세값 |
| 비교 대상 | `getProductComparisonTargets` | 비교 채널/self-company target 목록 |
| 월간 추세 | `getProductMonthlyTrend` | 기간/비교 subject 기반 월간 추세 |
| 판매 인사이트 | `getProductSalesInsight` | 기간/비교 subject 기준 판매 분석 |
| Secondary 상세 | `getProductSecondaryDetail` | 오더 계산 입력, 사이즈 비중, 단가/비교 기준 |
| 일간 추세 | `getSecondaryDailyTrend` | 일 단위 판매/입고/재고 그래프 source |
| Stock order calc | `getSecondaryStockOrderCalc` | 오더 상세 추천과 분할입고 planning source |

`getProductDrawerBundle`이 모든 데이터를 과적재하지 않는다. 기간 또는 비교 subject에 민감한 데이터는 별도 API로 읽는다.

## 3. 비교 subject 계약

상품 드로어 API는 top-level `companyUuid` 대신 subject query를 사용한다.

| subject | fields | 의미 |
|---|---|---|
| base | `baseRole`, `baseKind`, `baseSourceId?` | 기준 subject. 현재 기본은 자사이다. |
| comparison | `comparisonRole`, `comparisonKind`, `comparisonSourceId?` | 비교 subject. 경쟁 채널 또는 self-company 비교가 가능하다. |

`competitor-channel` comparison은 `sourceId`가 필수이다. 화면은 comparison target API가 준 값만 선택지로 사용한다.

## 4. 추천 수량과 확정 수량

| 값 | 의미 |
|---|---|
| 추천 수량 | 오더 상세에서 계산/제안하는 수량이다. 현재 stock-order planning 결과와 UI 여유재고 기준을 반영한다. |
| 확정 수량 | 사용자가 최종 적용한 수량이다. 오더 상세와 입고 분할 설정은 같은 확정 상태를 참조해야 한다. |
| 수동 확정 변경 | 사용자가 오더 상세에서 확정 수량을 바꾸면 이후 표시와 분할 기준은 그 값을 따라야 한다. |

추천 수량과 확정 수량은 같은 값이 아니다. 추천은 계산/제안이고, 확정은 사용자의 현재 결정이다.

## 5. Stock order calc 응답

`getSecondaryStockOrderCalc`는 secondary 오더 계산의 기준 응답이다.

주요 응답:

- `productIdentity`: 요청 상품 identity echo. mismatch 응답은 거부한다.
- `existingOrderInboundSupplyBySize`: A, 기존에 주문했지만 아직 입고되지 않은 수량의 size/date source.
- `display.currentStockQty*`: 현재 재고.
- `display.totalOrderBalance*`: A 전체 집계.
- `display.expectedInboundOrderBalance*`: A 중 `date < currentOrderInboundDueDate`인 집계.
- `inboundSplitSource`: 오더 상세 추천과 분할입고 제안의 공유 planning source.

`existingOrderInboundSupplyBySize`와 `inboundSplitSource.expectation`은 현재 드로어에서 편집 중인 금번/분할 오더를 포함하지 않는다.

## 6. 일간 추세 source

`getSecondaryDailyTrend` 응답은 다음 형태이다.

```ts
{
  size: string | null
  baseStock: number | null
  data: {
    base: Record<date, { sale: number; inbound: number }>
    comparison: Record<date, { sale: number; inbound: number | null }>
  }
}
```

규칙:

- `size?`가 없으면 전체 사이즈 aggregate이다.
- `size?`가 있으면 해당 size 기준으로 응답한다.
- 이 API는 그래프 source이며 분할입고 planning source가 아니다.
- stock-order 전용 값인 입고일, `selfWeightPct`, `bufferStock`을 이 API에 추가하지 않는다.

## 7. Split inbound planning source

`inboundSplitSource`는 `getSecondaryStockOrderCalc` 응답 안에 포함된다. 별도 endpoint가 아니다.

| 제공값 | 용도 |
|---|---|
| `total.suggestion` | backend source 추천 집계값. UI 최종 추천 총량 shortcut이 아니다. |
| `total.sales` | `[currentOrderInboundDueDate, nextOrderInboundDueDate)` 전체 상품 일 판매 예측 |
| `sizeInfo[size].salesRate` | size별 판매/share ratio |
| `sizeInfo[size].baseStock` | size별 기초 재고. 음수 허용 |
| `expectation[size][]` | 기존 오더 미래 입고 예정량 |
| `confirmed` | backend가 제공할 수 있는 초기 phase source |

이 API는 사용자가 적용한 분할 rows를 저장하거나 반환하는 endpoint가 아니다. 저장된 분할 결과와 `ignoreExistingOrderInbound` 옵션은 후보 snapshot의 `drawer2.confirmed.rounds`가 소유한다.

## 8. 분할입고 계산 규칙

분할입고는 차수별 입고일과 확정 수량을 조정하는 UI이다.

| 개념 | 기준 |
|---|---|
| 금번 오더 입고일 | `currentOrderInboundDueDate` |
| 차기 오더 입고일 | `nextOrderInboundDueDate` |
| 전체 주문 계산 범위 | `[currentOrderInboundDueDate, nextOrderInboundDueDate)` |
| 차수별 수요 | `[round n inbound date, round n+1 inbound date)` |
| 마지막 차수의 다음 기준일 | `nextOrderInboundDueDate` |
| n차 기존 오더 입고 예정량 | `[round n-1 inbound date, round n inbound date)` |

세부 규칙:

- 오더 상세 추천 row와 분할입고 제안 row는 같은 planning 함수를 사용한다.
- 한 차수의 전체 수요는 `total.sales`로 계산한다.
- size 배분은 `sizeInfo[size].salesRate`를 사용한다.
- size별 재고는 `sizeInfo[size].baseStock`에서 시작해 차수 간 이월된다.
- 기존 오더 입고 예정량은 `expectation[size][]`에서 온다.
- `display.expectedInboundOrderBalance*`처럼 `currentOrderInboundDueDate` 전 입고 예정 집계는 opening stock 성격으로 항상 반영된다.
- `ignoreExistingOrderInbound=true`는 각 차수의 previous-to-current window에 있는 기존 오더 입고 예정량만 무시한다.
- 1차는 previous-to-current window가 없으므로 `ignoreExistingOrderInbound` 여부와 무관하다.
- 2차 이상은 재고 이월과 정수화 때문에 총합이 소폭 달라질 수 있다.

## 9. 분할입고 UI variant 경계

분할입고 설정 화면은 frontend 내부에서 V0/V1/V2 variant로 나뉜다. Variant는 UI presentation만 다루며 API DTO, 계산 모델, draft 상태, snapshot 저장 계약을 나누지 않는다.

- 현재 기본 활성 화면은 V2이다.
- V0는 원형 화면 보존용이다.
- V1은 `inboundSplitSource.sizeInfo`와 `expectation`을 read-only source summary table로 표시하는 UI 실험본이다.
- V2는 전체/차수별 제안·확정 row 아래에 해당 구간의 기 오더 입고예정 상세를 펼쳐 보여준다.
- V0/V1/V2 선택 UI는 mock API 모드에서만 `분할 입고 설정` 버튼 아래에 노출된다. 실제 HTTP API 모드에서는 V2로 고정한다.
- Variant별 파일 책임과 CSS 책임은 `MD/dashboard-app/boundaries/inbound-split-variants.md`에서 관리한다.

## 10. Snapshot 경계

현재 저장 snapshot은 `OrderSnapshotDocument` v8이다.

| 영역 | 저장 의미 |
|---|---|
| `drawer1.summary` | 상품 기본 정보와 가용 재고 |
| `drawer1.monthlySalesTrend` | primary 월간 추세 chart point |
| `drawer2.stockOrderRequest` | 입고일, 커버 일수, 수요 override |
| `drawer2.stockOrderResult` | stock-order-calc 응답 기반 계산/복원 source |
| `drawer2.sizeOrders` | size별 share/forecast/recommendation row |
| `drawer2.confirmed.rounds` | 사용자가 확정한 차수별 수량과 `ignoreExistingOrderInbound` |
| `drawer2.aiComment` | AI prompt/answer/generation metadata |

후보 item에서 드로어를 열 때 저장 snapshot이 있으면 해당 값이 우선이다. API 최신값은 사용자의 저장 결정을 자동으로 덮어쓰지 않는다.

## 11. UI 문구 경계

Secondary 상품 드로어의 한국어 UI 문구는 `dashboard-app/src/dashboard/components/product-drawer/ko.ts`를 우선 사용한다.
입고 분할 적용 경고 문구는 다음 의미를 유지해야 한다.

> 입고 분할 변경 시, 각 사이즈의 전체 확정 수량에 변동이 생길 수 있습니다.

이는 차수별 총량 우선 배분과 size별 정수화 때문에 size 총합이 초기 확정값과 달라질 수 있음을 사용자에게 알리는 문구이다.

## 12. 변경 시 확인 항목

- 오더 상세 추천과 분할입고 제안이 같은 source/planning 함수를 쓰는가.
- 수동 확정 변경이 분할입고 기준과 snapshot 저장에 반영되는가.
- daily trend source와 stock-order planning source를 섞어 쓰지 않는가.
- `ignoreExistingOrderInbound`가 1차에는 영향을 주지 않는가.
- UI variant 변경이 API DTO, planning model, snapshot contract를 임의 변경하지 않는가.
- mock 전용 variant 선택 UI가 실제 API 모드에 노출되지 않는가.
- API/mock/문서의 field 이름과 의미가 현재 타입과 일치하는가.
