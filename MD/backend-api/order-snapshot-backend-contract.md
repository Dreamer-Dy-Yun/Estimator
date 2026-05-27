# Order Snapshot Backend Contract

| 항목 | 내용 |
|------|------|
| 문서 목적 | 백엔드가 후보 아이템 `details`에 저장하고 검증할 오더 스냅샷 계약 |
| 기준 타입 | `OrderSnapshotDocumentV2` |
| 스키마 버전 | `schemaVersion: 2` |
| 저장 위치 | `CANDIDATE_ITEM.details` JSON |
| 프론트 기준 | `dashboard-app/src/snapshot/orderSnapshotTypes.ts`, `dashboard-app/src/snapshot/parseOrderSnapshot.ts` |

## 원칙

- 스냅샷은 별도 목록 리소스가 아니라 후보 아이템 상세의 저장 상태다.
- 백엔드는 JSON blob으로 저장할 수 있지만, 현재 계약 필드의 의미와 최소 구조는 검증한다.
- 백엔드는 저장된 스냅샷 값을 임의로 재계산해 덮어쓰지 않는다.
- 필수값이 없으면 `0`, 빈 배열, 현재 날짜 같은 값으로 보정하지 않는다.
- 단일 회사 스냅샷은 top-level `companyUuid`를 포함한다.
- 후보 아이템의 회사 scope와 스냅샷 `companyUuid`가 다르면 저장하거나 hydrate하지 않는다.
- 과거 저장분처럼 `companyUuid`가 없는 스냅샷은 current single-company snapshot으로 바로 hydrate하지 않는다. owning candidate item/stash company scope로 migration/backfill하고, scope를 확인할 수 없으면 legacy invalid 또는 명시적 unscoped 상태로 분리한다.
- `skuGroupKey`는 후보 아이템의 상품 단위 key와 일치해야 한다.
- top-level `skuGroupKey`, `drawer1.summary.skuGroupKey`, `drawer2.competitorBasis.skuGroupKey`, 후보 아이템의 `skuGroupKey`는 모두 일치해야 한다.
- `stockOrderResult`와 `unitEconomics`는 값이 없으면 객체를 생략하고, 객체가 있으면 하위 계약을 만족해야 한다.
- `competitorRatioBySize`는 0~1 ratio다. `selfWeightPct`, `expectedFeeRatePct`, `selfSharePct`, `competitorSharePct`, `blendedSharePct`는 0~100 percent다.
- `expectedOpProfitRatePct`는 영업이익률 percent point다. 예상 영업이익이 음수이면 음수일 수 있고, 계산 불가일 때만 `null`이다.
- `confirmedTotals`는 현재 스냅샷의 `sizeOrders[].confirmQty` 합계다. current `schemaVersion: 2` 스냅샷에서는 필수이며, 저장 후에는 상세확정 오더 총합으로 사용한다. 백엔드가 상세확정 스냅샷을 생성할 때도 같은 의미로 포함한다.

## 전체 구조

```json
{
  "schemaVersion": 2,
  "skuGroupKey": "string",
  "companyUuid": "string",
  "savedAt": "string",
  "context": {},
  "drawer1": {
    "summary": {}
  },
  "drawer2": {}
}
```

## Top-level

| 필드 | 타입 | 필수 | 백엔드 처리 기준 |
|------|------|:---:|------|
| `schemaVersion` | `2` | Y | 현재 저장 계약은 반드시 `2`다. 다른 값은 current 스냅샷으로 처리하지 않는다. |
| `skuGroupKey` | `string` | Y | 후보 아이템의 상품 단위 key와 일치해야 한다. DB row id나 size id와 혼용하지 않는다. |
| `companyUuid` | `string` | N | 단일 회사 scope에서는 필수로 저장한다. 값이 있으면 후보군과 후보 아이템의 회사 scope와 일치해야 한다. |
| `savedAt` | `string` | Y | 스냅샷 생성 또는 저장 시각이다. ISO timestamp 형식을 권장한다. |
| `context` | `object` | Y | 분석 기간과 예측 기준이다. 누락되면 스냅샷 판단 기준이 없으므로 저장 실패가 맞다. |
| `drawer1` | `object` | Y | 1차 드로워의 상품 compact 기준값이다. |
| `drawer2` | `object` | Y | 2차 드로워의 오더 판단 기준값이다. |

## `context`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `periodStart` | `string` | Y | 판매/분석 기준 시작일 |
| `periodEnd` | `string` | Y | 판매/분석 기준 종료일 |
| `forecastMonths` | `number` | Y | 예측 개월 수 |
| `dailyTrendStartMonth` | `string` | Y | 일간 판매 추이 조회 시작 월 |
| `dailyTrendLeadTimeDays` | `number` | Y | 일간 추이와 발주 계산에 사용한 리드타임 일수 |

## `drawer1.summary`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `skuGroupKey` | `string` | Y | 상품 단위 key |
| `productName` | `string` | Y | 상품명 |
| `brand` | `string` | Y | 브랜드 |
| `category` | `string` | Y | 카테고리 |
| `code` | `string` | Y | 품번 또는 상품 코드 |
| `colorCode` | `string` | Y | 색상 코드 |
| `price` | `number` | Y | 저장 당시 자사 판매가 |
| `qty` | `number` | Y | 저장 당시 표시 기준 수량 |
| `availableStock` | `number` | Y | 판매 가능한 현재 재고 |

## `drawer2`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `competitorBasis` | `object` | Y | 선택 경쟁사 기준 판매가, 판매량, 사이즈 비중 |
| `competitorChannelId` | `string` | Y | 선택 경쟁사 채널 ID |
| `competitorChannelLabel` | `string` | Y | 선택 경쟁사 채널명 |
| `stockOrderRequest` | `object` | Y | 재고/발주 계산 입력 |
| `stockOrderResult` | `object` | N | 재고/발주 계산 결과. 계산 전이면 생략한다. |
| `unitEconomics` | `object` | N | 저장 당시 단가, 원가, 예상 수수료율 |
| `selfWeightPct` | `number` | Y | 자사 사이즈 비중 가중치. 0~100 percent |
| `bufferStock` | `number` | Y | 사용자가 추가 확보하려는 버퍼 재고 |
| `aiComment` | `object` | Y | AI 코멘트 입력과 결과 |
| `confirmedTotals` | `object` | Y | 현재 `confirmQty` 기준 총합. 저장 후에는 확정 오더 총합으로 사용 |
| `sizeOrders` | `array` | Y | 사이즈별 추천/확정 오더 |

## `drawer2.competitorBasis`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `skuGroupKey` | `string` | Y | 2차 상세 기준 상품 key |
| `competitorPrice` | `number` | Y | 선택 경쟁사 기준 판매가 |
| `competitorQty` | `number` | Y | 선택 기간/채널 기준 경쟁사 판매량 |
| `competitorRatioBySize` | `Record<string, number>` | Y | 사이즈별 경쟁사 원천 판매 비율. key는 사이즈, value는 0~1 ratio이며 percent가 아니다. |

## `drawer2.stockOrderRequest`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `currentOrderInboundDueDate` | `string` | Y | 금번 주문할 물건이 들어올 예정일 |
| `nextOrderInboundDueDate` | `string` | Y | 다음번에 주문할 물건이 들어올 것으로 예상되는 예정일 |
| `leadTimeDays` | `number` | Y | 발주 리드타임 일수 |
| `dailyMeanOverride` | `number` | N | 사용자가 보정한 일평균 판매량 |

## `drawer2.stockOrderResult`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `trendDailyMean` | `number` | Y | 일간 추이 기준 기본 일평균 |
| `dailyMean` | `number` | Y | 최종 계산에 사용한 일평균 |
| `sigma` | `number` | Y | 변동성 또는 안전재고 계산 기준값 |
| `display` | `object` | Y | 화면 표시용 재고/잔량 |
| `safetyStockCalc` | `object` | Y | 안전재고 기준 계산 결과 |
| `forecastQtyCalc` | `object` | Y | 예측 수량 기준 계산 결과 |

## `drawer2.stockOrderResult.display`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `currentStockQtyTotal` | `number` | Y | 현재 재고 총합 |
| `totalOrderBalanceTotal` | `number` | Y | 미입고 주문 잔량 총합 |
| `expectedInboundOrderBalanceTotal` | `number` | Y | 입고 예정 잔량 총합 |
| `currentStockQtyBySize` | `number[]` | Y | 사이즈별 현재 재고 |
| `totalOrderBalanceBySize` | `number[]` | Y | 사이즈별 미입고 주문 잔량 |
| `expectedInboundOrderBalanceBySize` | `number[]` | Y | 사이즈별 입고 예정 잔량 |

배열 필드는 `drawer2.sizeOrders`와 같은 사이즈 순서로 내려야 한다.

## 계산 결과 공통 필드

`safetyStockCalc`와 `forecastQtyCalc`는 모두 아래 필드를 가진다.

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `safetyStock` | `number` 또는 `null` | Y | 안전재고 기준에서는 수량, 예측 수량 기준에서는 `null` |
| `recommendedOrderQty` | `number` | Y | 추천 발주 수량 |
| `expectedOrderAmount` | `number` | Y | 예상 발주 금액 |
| `expectedSalesAmount` | `number` | Y | 예상 매출 |
| `expectedOpProfit` | `number` | Y | 예상 영업이익 |

## `drawer2.unitEconomics`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `unitPrice` | `number` | Y | 저장 당시 단위 판매가 |
| `unitCost` | `number` | Y | 저장 당시 단위 원가 |
| `expectedFeeRatePct` | `number` | Y | 저장 당시 예상 수수료율. 0~100 percent |

객체가 있으면 세 필드를 모두 숫자로 저장한다. 값이 없으면 객체 자체를 생략한다.

## `drawer2.aiComment`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `prompt` | `string` | Y | AI 코멘트 생성에 사용한 prompt 또는 요약 컨텍스트 |
| `answer` | `string` | Y | 화면에 표시하고 저장할 AI 코멘트 본문 |

## `drawer2.confirmedTotals`

현재 스냅샷의 `sizeOrders[].confirmQty` 기준 총합이다. AI 코멘트 요청용 스냅샷에서는 현재 화면 입력값의 합계이고, 상세확정 저장 후에는 저장된 확정 오더 총합으로 사용한다. current v2 snapshot에서는 필수이며 생략하면 저장/복원 검증 실패로 처리한다.

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `orderQty` | `number` | Y | 확정 오더 수량 합계 |
| `expectedSalesAmount` | `number` | Y | 확정 수량 기준 예상 매출 |
| `expectedOpProfit` | `number` | Y | 확정 수량 기준 예상 영업이익 |
| `expectedOpProfitRatePct` | `number` 또는 `null` | Y | 확정 수량 기준 예상 영업이익률. 손실이면 음수 가능, 계산 불가면 `null` |

current v2 snapshot에서는 객체를 반드시 포함하고 네 필드를 모두 포함한다. 이익률 계산이 불가능한 경우에만 `null`을 허용한다.

## `drawer2.sizeOrders[]`

| 필드 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| `size` | `string` | Y | 사이즈 |
| `selfSharePct` | `number` | Y | 자사 기준 사이즈 비중. 0~100 percent |
| `competitorSharePct` | `number` | Y | 경쟁사 기준 사이즈 비중. 0~100 percent |
| `blendedSharePct` | `number` | Y | 자사/경쟁사 가중치를 반영한 최종 비중. 0~100 percent |
| `forecastQty` | `number` | Y | 해당 사이즈 예측 수량 |
| `recommendedQty` | `number` | Y | 해당 사이즈 추천 오더 수량 |
| `confirmQty` | `number` | Y | 사용자가 확정한 오더 수량 |

## 저장과 응답 정책

| 상황 | 백엔드 처리 |
|------|------|
| 개별 상세확정 저장 | `details: OrderSnapshotDocumentV2`, `isLatestLlmComment: false`로 저장하고 최신 item detail을 반환한다. |
| 상세확정 해제 | `details: null`, `isDetailConfirmed: false`로 저장한다. |
| 상세 일괄확정 | item별 `updatedItem.details`에 `OrderSnapshotDocumentV2`를 저장하고 SSE로 최신 item을 반환한다. |
| AI 코멘트 생성 | `snapshotForAiComment`가 있으면 해당 스냅샷을 AI 입력 기준으로 사용한다. |
| 목록 조회 | `hasSnapshot`은 `details != null` 기준으로 산출한다. |
| legacy `companyUuid` 누락 스냅샷 | owning candidate item/stash의 company scope로 backfill한 뒤 hydrate한다. scope를 확정할 수 없으면 단일 회사 흐름에서 정상 current snapshot처럼 취급하지 않는다. |

## 사용자 확인 필요 항목

- `skuGroupKey`의 최종 DB 조합 규칙이 바뀌는 경우.
- 수량, 재고, 잔량에 음수 허용이 필요한 경우. 프론트 파서는 저장 상태 표면화를 위해 유한 숫자 음수를 보존하지만, 백엔드 신규 저장/확정 validation은 업무상 허용 여부를 별도로 결정해야 한다.
- `sigma` 계산 기준을 백엔드에서 새로 정의해야 하는 경우.
- 퍼센트 소수점 반올림 정책을 DB 저장 단위로 고정해야 하는 경우.
- AI prompt 저장에 개인정보 또는 민감정보 마스킹 정책이 필요한 경우.

## 2026-05-27 singular append storage requirements

Singular candidate item append persists a concrete item snapshot, not a bulk placeholder.

Required singular append storage inputs:

| Field | Type | Required | Backend handling |
|------|------|:---:|------|
| `details` | `OrderSnapshotDocumentV2` | Y | Store in `CANDIDATE_ITEM.details` after validating the current v2 snapshot contract. Do not accept `snapshot` as an alias. |
| `isLatestLlmComment` | `boolean` | Y | Store the latest-comment basis flag with the item so later detail reads can distinguish stale AI comment text from the current drawer basis. |

Bulk append is a separate batch operation. Bulk payloads may identify multiple products and may not carry per-item `details`; that does not change the singular append requirement above.
