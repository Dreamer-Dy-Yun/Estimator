# Inbound Split UI Variants

Last updated: 2026-06-24

이 문서는 분할입고 설정 화면의 UI variant 경계를 정리한다. API DTO, 계산 모델, draft 상태, snapshot 저장 계약은 variant별로 나뉘지 않는다.

## 1. 공통 계약

V0/V1/V2는 다음 책임을 공유한다.

| 공통 책임 | 소유 파일 |
|---|---|
| Dialog facade | `src/dashboard/components/product-drawer/secondary/cards/InboundSplitScheduleDialog.tsx` |
| Table facade | `src/dashboard/components/product-drawer/secondary/cards/InboundSplitScheduleTable.tsx` |
| Variant prop/type | `src/dashboard/components/product-drawer/secondary/cards/inboundSplitScheduleVariantTypes.ts` |
| Draft 상태 | `src/dashboard/components/product-drawer/secondary/cards/useInboundSplitScheduleDraft.ts` |
| Parent 상태 연결 | `src/dashboard/components/product-drawer/secondary/cards/useInboundSplitScheduleController.ts` |
| Planning/model | `inboundSplitScheduleModel.ts`, `inboundSplitSuggestionModel.ts`, `inboundSplitScheduleDatePolicy.ts`, `inboundSplitScheduleTotals.ts` |
| API source | `getSecondaryStockOrderCalc().inboundSplitSource` |
| Calculation base date | `useSecondaryDrawerRequests().calculationBaseDate`; UI-only prop passed to every inbound split dialog variant |
| Snapshot state | `drawer2.confirmed.rounds` |

Variant는 화면 배치와 presentation만 바꿀 수 있다. 다음 항목은 variant에서 임의로 바꾸지 않는다.

- `SecondaryInboundSplitSource` DTO shape
- 차수별 추천 계산식
- 날짜 정책
- Apply/Close 동작
- `excludePeriodExistingOrderInbound` 의미
- snapshot 저장 필드

## 2. Facade 규칙

`InboundSplitScheduleDialog.tsx`는 `props.variant`에 따라 variant component를 선택한다.

- `variant === 'v0'`: `InboundSplitScheduleDialogV0`
- `variant === 'v2'`: `InboundSplitScheduleDialogV2`
- `variant === 'v1'`: `InboundSplitScheduleDialogV1`
- 그 외 기본값: `InboundSplitScheduleDialogV1`

`InboundSplitScheduleTable.tsx`는 기존 import 호환을 위한 table facade이다. 새 화면 variant를 추가할 때는 facade와 variant type을 먼저 맞춘 뒤, caller에서 variant를 명시적으로 선택한다.

### Runtime selection

- 실제 HTTP API 모드에서는 `SizeOrderCard.tsx`가 dialog variant를 V1로 고정한다.
- mock API 모드에서는 `분할 입고 설정` 버튼 아래에 V0/V1/V2 선택 UI를 노출한다.
- 이 선택 UI는 화면 검증용 presentation switch이며 API DTO, mock fixture, 계산 모델, snapshot 계약을 변경하지 않는다.

## 3. V0

V0는 원형 분할입고 설정 화면이다.

| 파일 | 책임 |
|---|---|
| `InboundSplitScheduleDialogV0.tsx` | 기존 dialog shell, toolbar, editable table frame, footer |
| `InboundSplitScheduleTableV0.tsx` | 기존 전체/차수별 제안/확정 table 렌더링 |

V0는 상단 source summary table을 렌더링하지 않는다. V0 변경은 기존 화면 회귀 확인 목적일 때만 수행한다.

## 4. V1

V1은 source summary를 검토하기 위한 UI iteration이며 현재 기본 활성 화면이다. V0/V2는 mock API 모드의 variant selector로 전환해 검증한다.

| 파일 | 책임 |
|---|---|
| `InboundSplitScheduleDialogV1.tsx` | 95vh dialog, header-embedded controls, source summary viewport, editable table viewport, horizontal scroll sync |
| `InboundSplitScheduleTableV1.tsx` | V1 editable split table 렌더링 |
| `InboundSplitSourceSummaryTableV1.tsx` | `inboundSplitSource.sizeInfo`와 `existingOrderInboundSupplyBySize` 기반의 read-only source summary table |

V1 source summary table은 API 계약이 아니다. 이미 받은 `inboundSplitSource`와 `existingOrderInboundSupplyBySize`를 화면 검토용으로 표현할 뿐이며, 새로운 요청이나 snapshot 필드를 만들지 않는다.

## 5. V2

V2는 차수별 상세 펼침을 검토하기 위한 UI iteration이다. 현재 기본 활성 화면은 V1이다.

| 파일 | 책임 |
|---|---|
| `InboundSplitScheduleDialogV2.tsx` | 90vh dialog, 전체 펼치기/접기 상태, V2 table 연결 |
| `InboundSplitScheduleTableV2.tsx` | 전체/차수별 제안·확정 table과 섹션별 상세 펼침 row |
| `InboundSplitScheduleDetailRowsV2.tsx` | V2 상세 row 렌더링 |
| `inboundSplitScheduleDetailRows.ts` | 0구간 기존재고와 차수별 입고예정 표시 row 생성 |
| `inboundSplitScheduleTableDisplay.ts` | V2 table 표시 포맷과 제안 근거 tooltip helper |

V2는 API DTO, draft hook, planning model, date policy, apply/close contract를 V0/V1과 공유한다. UI만 다르며, 전체 행 상세는 `calculationBaseDate` 기준 기존 재고와 `[calculationBaseDate, 1차 입고일)`의 기 오더 입고예정을 보여준다. 각 차수 상세의 기 오더 입고예정은 연산 basis와 동일하게 `[현재 차수 입고일, 다음 차수 입고일)` 범위를 펼쳐 보여준다. 마지막 차수의 다음 기준일은 `nextOrderInboundDueDate`이다. 구간별 입고예정 합 row는 입고 예정일이 없어도 항상 표시한다.

V2의 전체/차수 펼침은 차수 셀의 `+/-` 버튼과 dialog toolbar의 전체 펼치기/접기 토글 버튼이 담당한다. 전체 행의 상세에는 기존 재고와 `1차 이전 구간 입고예정`을 표시한다. 차수 상세의 입고예정 합 row는 `n차 구간 입고예정` 라벨로 날짜+지표 칸을 병합해 표시한다.

## 6. V1 Source Summary 범위

상단 source summary table은 다음 값을 표시한다.

| 행 | source |
|---|---|
| 기존 재고 | `inboundSplitSource.sizeInfo[size].baseStock` |
| Opening stock date | `calculationBaseDate`; displayed with the opening-stock label so the stock baseline is explicit |
| 미입고 총 잔량 | `existingOrderInboundSupplyBySize[size][]` 전체 합 |
| 금번 오더 입고일 전 미입고 잔량 | `date < currentOrderInboundDueDate`인 `existingOrderInboundSupplyBySize[size][]` 합 |
| 기간 내 미입고 잔량 | `currentOrderInboundDueDate <= date < nextOrderInboundDueDate`인 `existingOrderInboundSupplyBySize[size][]` 합 |
| 차기 오더 입고일 후 미입고 잔량 | `date >= nextOrderInboundDueDate`인 `existingOrderInboundSupplyBySize[size][]` 합 |
| 구간별 입고예정일 행 | 위 3개 구간 row를 펼쳤을 때 구간 안의 날짜별 `existingOrderInboundSupplyBySize[size][]` 수량 |

V1 source summary는 editable split table 차수 범위로 source를 자르지 않는다. 미입고 잔량 구간은 오더 상세와 같은 `currentOrderInboundDueDate`/`nextOrderInboundDueDate` 기준을 사용한다. `기간내 입고 예정 합` row는 V1에서 표시하지 않는다.

## 7. CSS 책임

| style part | 책임 |
|---|---|
| `inboundSplitDialogShell.module.css` | dialog shell, toolbar, viewport frame, V1 source/editable viewport 높이 |
| `inboundSplitTable.module.css` | table geometry, sticky offsets, column width calculation, V1 source summary table row 상태 |
| `inboundSplitRows.module.css` | editable split table의 summary/suggested/confirmed row 상태 |
| `inboundSplitDetailRows.module.css` | V2 상세 펼침 row, 상세 toggle, 상세 label/total row 상태 |
| `inboundSplitResponsive.module.css` | responsive adjustments |

Source summary row 스타일은 editable row 스타일과 같은 CSS 파일에 다시 합치지 않는다. 두 표는 같은 색상 token을 쓸 수 있지만, editable row 상태는 `inboundSplitRows.module.css`, source summary table 상태는 `inboundSplitTable.module.css`, V2 상세 row 상태는 `inboundSplitDetailRows.module.css`에 둔다.

## 8. 변경 시 확인 항목

- V0/V1/V2가 같은 DTO와 draft hook을 공유하는가.
- V1 source summary가 API 요청/계산/snapshot 계약을 만들지 않는가.
- mock-only variant selector가 실제 HTTP API 모드에 노출되지 않는가.
- 상단 source summary table과 하단 editable table의 size column 시작 위치가 맞는가.
- 두 표의 horizontal scroll sync가 유지되는가.
- source summary/detail row CSS가 editable row CSS와 섞이지 않는가.
