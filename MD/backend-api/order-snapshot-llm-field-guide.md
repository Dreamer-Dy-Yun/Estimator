# Order Snapshot LLM Field Guide

| 항목 | 내용 |
|------|------|
| 문서 목적 | `OrderSnapshotDocumentV2`를 LLM 입력으로 보낼 때 사용할 필드 설명 |
| 적용 범위 | AI 코멘트 생성, 스냅샷 기반 요약, 오더 판단 근거 설명 |
| 기본 원칙 | 스냅샷에 있는 값만 근거로 사용하고, 없는 값은 추정하지 않는다. |

## LLM 입력 기본 지침

```text
아래 JSON은 후보 상품의 오더 판단 시점 스냅샷이다.
스냅샷에 없는 값은 추정하지 말고, 제공된 필드만 근거로 판단한다.
금액은 원 단위, 수량은 EA 기준으로 해석한다.
비중, 가중치, 수수료율 계열 `*Pct` 필드는 0~100 percent 기준 값이다. `competitorRatioBySize`는 원천 ratio이므로 0~1 기준으로 해석한다. `expectedOpProfitRatePct`는 영업이익률 percent point라 손실이면 음수일 수 있다.
companyUuid는 내부 scope 식별자이며 사용자용 코멘트 본문에 직접 노출하지 않는다.
```

## Top-level

| 필드 | LLM 해석 |
|------|------|
| `schemaVersion` | 스냅샷 구조 버전이다. 현재 값은 `2`이며 분석 내용 자체에는 사용하지 않는다. |
| `skuGroupKey` | 상품 단위 식별자다. 품번과 색상 단위 상품으로 보면 된다. |
| `companyUuid` | 회사 scope 식별자다. 필터 기준으로만 쓰고 사용자용 문장에는 직접 쓰지 않는다. |
| `savedAt` | 이 스냅샷이 저장된 시각이다. 판단 기준 시점으로만 사용한다. |
| `context` | 분석 기간, 예측 개월, 일간 추이 기준을 담는다. |
| `drawer1` | 상품 기본 식별 정보와 저장 당시 자사 판매/재고 기준값을 담는다. |
| `drawer2` | 경쟁사 기준, 발주 계산 입력/결과, AI 코멘트, 확정 수량을 담는 오더 판단 영역이다. |

## `context`

| 필드 | LLM 해석 |
|------|------|
| `periodStart` | 판매와 분석을 집계한 시작일이다. |
| `periodEnd` | 판매와 분석을 집계한 종료일이다. |
| `forecastMonths` | 판매 추이를 예측할 개월 수다. |
| `dailyTrendStartMonth` | 일간 판매 추이를 참고한 시작 월이다. |
| `dailyTrendLeadTimeDays` | 리드타임 기준 일수다. 입고 공백과 재고 위험 판단에 사용한다. |

## `drawer1.summary`

| 필드 | LLM 해석 |
|------|------|
| `skuGroupKey` | 상품 단위 식별자다. |
| `productName` | 상품명이다. 코멘트의 주어로 사용할 수 있다. |
| `brand` | 브랜드명이다. |
| `category` | 상품 카테고리다. |
| `code` | 품번 또는 상품 코드다. |
| `colorCode` | 색상 코드다. |
| `price` | 저장 당시 자사 판매가다. |
| `qty` | 저장 당시 표시 기준 수량이다. 재고 또는 판매량인지 단정하지 말고 다른 필드와 함께 해석한다. |
| `availableStock` | 판매 가능한 현재 재고다. 재고 부족 또는 과잉 판단에 사용한다. |

## `drawer2.competitorBasis`

| 필드 | LLM 해석 |
|------|------|
| `skuGroupKey` | 경쟁사 비교 기준 상품 key다. |
| `competitorPrice` | 선택 경쟁사 기준 판매가다. 자사 판매가와 가격 차이를 볼 때 사용한다. |
| `competitorQty` | 선택 기간과 채널 기준 경쟁사 판매량이다. 수요 강도 판단에 사용한다. |
| `competitorRatioBySize` | 경쟁사 판매의 사이즈별 원천 비율이다. key는 사이즈이고 value는 0~1 ratio다. percent로 해석하지 않는다. |

## `drawer2` 조건 필드

| 필드 | LLM 해석 |
|------|------|
| `competitorChannelId` | 경쟁사 채널 내부 ID다. 사용자용 문장에는 보통 쓰지 않는다. |
| `competitorChannelLabel` | 선택 경쟁사 채널명이다. 코멘트에서 비교 기준으로 언급할 수 있다. |
| `selfWeightPct` | 자사 사이즈 비중을 얼마나 반영했는지 나타내는 0~100 percent 가중치다. |
| `bufferStock` | 사용자가 추가 확보하려는 버퍼 재고다. 추천 수량이 커지는 근거가 될 수 있다. |

## `drawer2.stockOrderRequest`

| 필드 | LLM 해석 |
|------|------|
| `currentOrderInboundDueDate` | 이번 주문분이 입고될 예정일이다. 현재 발주가 커버해야 하는 기간 판단에 중요하다. |
| `nextOrderInboundDueDate` | 다음 주문분이 입고될 것으로 예상되는 예정일이다. 이번 발주가 커버해야 할 종료 시점 판단에 중요하다. |
| `leadTimeDays` | 발주 후 입고까지 걸리는 리드타임 일수다. 판매 속도 대비 재고 위험 판단에 사용한다. |
| `dailyMeanOverride` | 사용자가 일평균 판매량을 보정한 값이다. 있으면 계산값보다 사용자 보정 판단을 우선 근거로 본다. |

## `drawer2.stockOrderResult`

| 필드 | LLM 해석 |
|------|------|
| `trendDailyMean` | 일간 추이에서 계산한 기본 일평균 판매량이다. |
| `dailyMean` | 최종 발주 계산에 사용한 일평균 판매량이다. 보정값이 반영되었을 수 있다. |
| `sigma` | 판매 변동성 또는 안전재고 계산 기준값이다. 값이 클수록 변동성이 크다고 해석할 수 있다. |
| `display` | 현재 재고와 입고 예정 잔량의 표시용 집계다. |
| `safetyStockCalc` | 안전재고 기준으로 계산한 추천 발주 결과다. |
| `forecastQtyCalc` | 예측 수량 기준으로 계산한 추천 발주 결과다. |

## `drawer2.stockOrderResult.display`

| 필드 | LLM 해석 |
|------|------|
| `currentStockQtyTotal` | 현재 재고 총합이다. |
| `totalOrderBalanceTotal` | 아직 입고되지 않은 주문 잔량 총합이다. |
| `expectedInboundOrderBalanceTotal` | 입고 예정으로 보는 잔량 총합이다. |
| `currentStockQtyBySize` | 사이즈별 현재 재고다. |
| `totalOrderBalanceBySize` | 사이즈별 미입고 주문 잔량이다. |
| `expectedInboundOrderBalanceBySize` | 사이즈별 입고 예정 잔량이다. |

## 계산 결과 공통 필드

`safetyStockCalc`와 `forecastQtyCalc`는 같은 금액/수량 필드 구조를 사용한다.

| 필드 | LLM 해석 |
|------|------|
| `safetyStock` | 안전재고 기준에서는 안전재고 수량이다. 예측 수량 기준에서는 `null`이다. |
| `recommendedOrderQty` | 추천 발주 수량이다. |
| `expectedOrderAmount` | 예상 발주 금액이다. |
| `expectedSalesAmount` | 예상 매출이다. |
| `expectedOpProfit` | 예상 영업이익이다. |

## `drawer2.unitEconomics`

| 필드 | LLM 해석 |
|------|------|
| `unitPrice` | 저장 당시 단위 판매가다. |
| `unitCost` | 저장 당시 단위 원가다. |
| `expectedFeeRatePct` | 저장 당시 예상 수수료율이다. 0~100 percent로 해석한다. |

이 값은 예상 매출과 영업이익 해석에 필요한 경제성 기준이다. 없으면 단가나 원가를 추정하지 않는다.

## `drawer2.aiComment`

| 필드 | LLM 해석 |
|------|------|
| `prompt` | AI 코멘트 생성에 사용한 prompt 또는 요약 컨텍스트다. |
| `answer` | 저장된 AI 코멘트 본문이다. 새 코멘트를 만들 때 참고할 수 있지만 그대로 반복하지 않는다. |

## `drawer2.confirmedTotals`

`confirmedTotals`는 현재 스냅샷의 `sizeOrders[].confirmQty` 기준 총합이다. AI 코멘트 요청용 스냅샷에서는 현재 화면 입력값의 합계이고, 상세확정 저장 후에는 저장된 확정 오더 총합으로 해석한다. current v2 snapshot에서는 필수다.

| 필드 | LLM 해석 |
|------|------|
| `orderQty` | 현재 스냅샷의 `confirmQty` 합계다. 저장된 상세확정 스냅샷에서는 확정 오더 수량 합계로 본다. |
| `expectedSalesAmount` | 현재 `confirmQty` 기준 예상 매출이다. |
| `expectedOpProfit` | 현재 `confirmQty` 기준 예상 영업이익이다. |
| `expectedOpProfitRatePct` | 현재 `confirmQty` 기준 예상 영업이익률이다. 손실이면 음수일 수 있고, `null`이면 계산 불가로 본다. |

## `drawer2.sizeOrders[]`

| 필드 | LLM 해석 |
|------|------|
| `size` | 사이즈다. |
| `selfSharePct` | 자사 판매 기준 사이즈 비중이다. 0~100 percent로 해석한다. |
| `competitorSharePct` | 경쟁사 판매 기준 사이즈 비중이다. 0~100 percent로 해석한다. |
| `blendedSharePct` | 자사와 경쟁사 가중치를 반영한 최종 사이즈 비중이다. 0~100 percent로 해석한다. |
| `forecastQty` | 해당 사이즈 예측 수량이다. |
| `recommendedQty` | 해당 사이즈 추천 오더 수량이다. |
| `confirmQty` | 사용자가 최종 확정한 오더 수량이다. |

## 코멘트 작성 기준

- 상품명, 브랜드, 경쟁 채널명은 사용자에게 보이는 문장에 사용할 수 있다.
- `companyUuid`, 내부 ID, schema version은 사용자용 본문에 직접 노출하지 않는다.
- 수량 부족 또는 과잉 판단은 `availableStock`, `display`, `dailyMean`, `leadTimeDays`, `confirmedTotals`, `sizeOrders`를 함께 본다.
- 사이즈별 리스크는 `competitorRatioBySize`, `selfSharePct`, `competitorSharePct`, `blendedSharePct`, `confirmQty`를 비교해 설명한다.
- 매출과 이익 판단은 `unitEconomics`, `safetyStockCalc`, `forecastQtyCalc`, `confirmedTotals`를 근거로 한다.
- `stockOrderResult`가 없으면 발주 계산 결과가 없다고 보고, 계산값을 추정하지 않는다.
- `confirmedTotals`가 없으면 유효한 current v2 snapshot 입력이 아니라고 보고, 값을 추정하지 않는다.
- 스냅샷에 없는 필드는 원천 데이터를 상상해서 채우지 않는다.

## LLM 입력 템플릿 예시

```text
다음은 오더 판단 시점의 OrderSnapshotDocumentV2 JSON입니다.
필드 의미는 함께 제공한 field guide를 따르십시오.
스냅샷에 없는 값은 추정하지 마십시오.
사용자에게는 상품명, 경쟁 채널명, 수량, 금액, 비율 중심으로 설명하십시오.
내부 ID와 companyUuid는 본문에 직접 노출하지 마십시오.
```

## 2026-05-27 append item note

When an LLM-generated comment is persisted through singular candidate item append, the append contract must carry both fields below:

| Field | LLM-facing meaning |
|------|------|
| `details` | The exact `OrderSnapshotDocumentV2` basis used for the item. The backend stores this as the candidate item snapshot. |
| `isLatestLlmComment` | Whether the stored comment still matches the latest drawer/snapshot basis at append time. If false, treat the comment as stale context rather than current guidance. |

Do not confuse this with bulk append. Bulk append is a batch product-add contract and does not replace the singular append snapshot/comment-basis requirement.
