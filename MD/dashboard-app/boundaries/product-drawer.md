# Product Drawer Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 최초 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-27 |
| 상태 | 최신 문서 |
| 적용 범위 | 상품 1차/2차 드로어, 저장 snapshot, AI 코멘트, 재고/발주 계산 |

## 책임 요약

상품 드로어는 분석 페이지와 후보군 상세에서 공통으로 여는 상품 상세 UI다. 페이지 상태를 직접 소유하지 않고, 상품 요약, 2차 상세, 경쟁사/채널, 재고/발주 계산, AI 코멘트 요청을 API와 snapshot 경계 뒤에서 가져온다.

단일 회사가 선택된 경우 1차/2차 드로어 조회 요청에는 `companyUuid`를 전달한다. `전체` 선택은 조회 API에서만 scope 생략으로 처리하며, 후보군 저장/확정 같은 side effect는 후보군 경계에서 차단한다.

## 주요 소유 파일

| 파일 | 책임 |
|------|------|
| `ProductDrawer.tsx` | 1차 드로어 shell, 2차 패널 열림 상태, 회사 scope 전달 |
| `ProductDrawerSecondaryPane.tsx` | 2차 패널 로딩/오류/상세 데이터 분기 |
| `mergePrimarySummaryFromSnapshot.ts` | live bundle summary와 저장 snapshot summary 병합 규칙 |
| `useSecondaryDrawerDetail.ts` | 2차 상세 조회와 snapshot hydrate 기준 선택 |
| `secondary/ProductSecondaryDrawer.tsx` | 2차 드로어 상태 조립 |
| `secondary/hooks/useSecondaryForecastModel.ts` | 계산 모델, size row, snapshot builder 연결 |
| `secondary/hooks/useSecondaryStockOrderCalc.ts` | 재고/발주 계산 요청, debounce, stale 응답 차단 |
| `secondary/hooks/useSecondaryDrawerSnapshotController.ts` | 2차 드로어 snapshot 생성 진입점과 저장 가능 상태 판정 |
| `secondary/secondarySnapshot.ts` | 현재 2차 드로어 상태를 `OrderSnapshotDocumentV2`로 변환 |
| `src/snapshot/orderSnapshotTypes.ts` | 저장 snapshot current 계약 타입 |
| `src/snapshot/parseOrderSnapshot.ts` | 저장 snapshot parsing과 current 계약 검증 |

## 1차 드로어 API 경계

| 영역 | API |
|------|-----|
| 상품 이미지/요약 | `getProductDrawerBundle` + optional `companyUuid` |
| 판매 정보 | `getProductSalesInsight` + optional `companyUuid` |
| 월간 판매 추이 | `getProductMonthlyTrend` + optional `companyUuid` |

1차 드로어의 판매 추이 그래프는 선형 축으로 고정한다. 자사/선택 경쟁사/채널 표시는 각 카드에서 독립적으로 관리한다. 분석 페이지의 자사/경쟁사 리스트 상태를 드로어 내부에 저장하지 않는다.

## 2차 드로어 API 경계

| 영역 | API/모듈 |
|------|----------|
| 2차 상세 | `getProductSecondaryDetail` + optional `companyUuid` |
| AI 코멘트 | `getSecondaryAiComment`, `useSecondaryAiComment.ts` + optional `companyUuid` |
| 재고/발주 계산 | `getSecondaryStockOrderCalc`, `useSecondaryStockOrderCalc.ts` + optional `companyUuid` |
| 일간 추이 | `getSecondaryDailyTrend` + optional `companyUuid` |
| 후보군 저장/확정 | `useSecondaryCandidateActions.ts` |
| 사이즈별 오더 | `cards/SizeOrderCard.tsx`, `model/secondarySizeOrderRows.ts` |

재고/발주 계산 API는 입력값이 바뀔 때마다 즉시 호출하지 않고 debounce 후 요청한다. stale 응답은 현재 화면 상태를 덮지 않는다.

계산 실패 또는 미계산 상태는 정상 0 값과 다르다. 계산 결과가 없으면 AI 코멘트, 후보군 저장, 상세확정으로 이어지는 snapshot 생성 경로를 막고, 사용자에게 미계산/실패 상태를 카드 단위로 보여준다.

## product secondary snapshot 책임

저장 snapshot은 후보군 아이템의 `details` JSON 경로다. 별도 snapshot 목록 API는 없다.

current v2 타입 이름은 `OrderSnapshotDocumentV2`다. 화면/API 응답 객체를 그대로 복사하지 않고, 복원과 AI 판단에 필요한 값만 명시적으로 저장한다.

### 최상위 필드

| 필드 | 필수 | 의미 |
|------|:---:|------|
| `schemaVersion` | Y | current 구조 버전. 현재 값은 `2`다. |
| `skuGroupKey` | Y | 상품 묶음 key. 후보군 아이템과 드로어 조회 기준을 연결한다. |
| `companyUuid` | N | 저장 당시 회사 scope. 없으면 unscoped snapshot이다. |
| `savedAt` | Y | snapshot 생성 시각. |
| `context` | Y | 조회/예측/일간 추이 기준. |
| `drawer1` | Y | 1차 드로어 compact summary. |
| `drawer2` | Y | 2차 드로어 분석, 오더, AI 코멘트 상태. |

### `context`

| 필드 | 필수 | 의미 |
|------|:---:|------|
| `periodStart` | Y | 판매/분석 기준 시작일 |
| `periodEnd` | Y | 판매/분석 기준 종료일 |
| `forecastMonths` | Y | 예측 판매 추이에 사용한 개월 수 |
| `dailyTrendStartMonth` | Y | 일간 추이 API 조회 시작 월 |
| `dailyTrendLeadTimeDays` | Y | 일간 추이와 발주 계산에 사용한 리드타임 일수 |

`context`는 화면 제목이 아니라 복원과 판단 근거다. 백엔드는 누락 값을 현재 날짜 기본값으로 채우면 안 된다.

### `drawer1.summary`

`drawer1.summary`는 1차 드로어 전체가 아니라 저장 당시 상품 식별, 가격, 재고 기준값만 담는다. live bundle이 있으면 live bundle이 우선이며, compact snapshot만으로 full `ProductPrimarySummary`를 만들지 않는다.

필수 필드: `skuGroupKey`, `productName`, `brand`, `category`, `code`, `colorCode`, `price`, `qty`, `availableStock`.

### `drawer2.competitorBasis`

2차 드로어의 사이즈 비중과 경쟁사 기준값 복원에 필요한 최소 판매 기준이다.

필수 필드: `skuGroupKey`, `competitorPrice`, `competitorQty`, `competitorRatioBySize`.

`competitorRatioBySize`는 0~1 ratio다. UI의 `sizeOrders[].competitorSharePct`는 이를 0~100 percent로 정규화한 값이다.

### `drawer2` 분석 조건

필수 필드: `competitorChannelId`, `competitorChannelLabel`, `selfWeightPct`, `bufferStock`.

`selfWeightPct`와 `bufferStock`은 사용자 조정값이다. 백엔드가 확정 저장 시 재계산하거나 임의 기본값으로 대체하면 안 된다.

### `drawer2.stockOrderRequest`

화면 입력값 기준이다. 필수 필드: `currentOrderInboundDueDate`, `nextOrderInboundDueDate`, `leadTimeDays`. 선택 필드: `dailyMeanOverride`.

화면에 없는 `safetyStockMode`, 수동 안전재고, 서비스 레벨 값은 저장하지 않는다.

### `drawer2.stockOrderResult`

계산 API 응답이 없거나 아직 계산 중이면 `stockOrderResult` 자체를 생략한다. 빈 객체나 0 값으로 채우지 않는다.

필수 필드: `trendDailyMean`, `dailyMean`, `sigma`, `display`, `safetyStockCalc`, `forecastQtyCalc`.

`display` 배열 필드는 `drawer2.sizeOrders`와 같은 사이즈 순서를 가져야 한다.

### `drawer2.aiComment`

AI 코멘트 요청 시점에 snapshot으로 생성한 값이다. 필수 필드: `prompt`, `answer`.

저장 확정 이후에만 생성된다고 가정하지 않는다. AI 요청 당시 화면 입력과 계산 결과가 기준이다.

### `drawer2.confirmedTotals`

현재 snapshot의 `sizeOrders[].confirmQty` 합계다. 저장 전에는 화면 입력 합계이고, 상세확정 저장 후에는 저장된 확정 오더 총합으로 사용한다.

선택 필드: `orderQty`, `expectedSalesAmount`, `expectedOpProfit`, `expectedOpProfitRatePct`.

누락 값을 0으로 채우는 방식은 금지한다.

### `drawer2.sizeOrders`

필수 필드: `size`, `selfSharePct`, `competitorSharePct`, `blendedSharePct`, `forecastQty`, `recommendedQty`, `confirmQty`.

`confirmQty`는 상세확정에 전달되는 수량이다. 추천 수량과 확정 수량은 의미가 다르므로 같은 값으로 강제하지 않는다.

## hydrate scope boundary

- `getScopeSafeHydrateSnapshot`이 scope-safe hydrate의 런타임 경계다.
- single-company hydrate는 `snapshot.companyUuid === selectedCompanyUuid`일 때만 허용한다.
- all-company hydrate는 저장 snapshot도 unscoped일 때만 허용한다.
- 누락되거나 다른 scope는 live/default company data로 보정하지 않는다.
- drawer는 live scoped API 또는 명시적 unavailable 상태로 이어진다.

## snapshot test split

| 테스트 범위 | 소유 |
|------|------|
| compact key round-trip and base parser smoke | `src/snapshot/parseOrderSnapshot.test.ts` |
| required `stockOrderRequest`, optional `stockOrderResult`, scope-safe parse, invalid ratio/percent/confirmed totals rejection | `src/snapshot/parseOrderSnapshot.validation.test.ts` |
| current 2차 drawer state to `OrderSnapshotDocumentV2` build contract | `src/snapshot/buildSecondaryOrderSnapshot.test.ts` |
| shared snapshot fixture ownership | `src/snapshot/orderSnapshotTestFixtures.ts` |
| 2차 드로어 카드/훅의 계산 미완료 표시, picker guard, 사용자 interaction | product-drawer 하위 `*.test.ts(x)` |
| API 계약 필드 설명과 backend 저장 의미 | `MD/backend-api/*` |

snapshot parser/type 계약을 product drawer UI 테스트에 섞지 않는다. UI 테스트는 parser가 보장한 current snapshot을 어떻게 소비하는지만 확인한다.

## 키보드와 모달

- 좌우 방향키는 드로어 열기/닫기에 사용한다.
- 위아래 방향키는 현재 후보군 목록의 이전/다음 item 이동에 사용한다.
- ESC는 2차 패널이 열려 있으면 2차 패널을 먼저 닫고, 다시 누르면 1차 드로어를 닫는다.
- 입력/콤보박스 내부 방향키는 가로채지 않는다.
- portal modal은 공통 drawer keep-open helper를 사용해 backdrop click이 drawer outside click으로 전파되지 않게 한다.

## 스타일

- 2차 드로어 CSS public facade는 `secondaryDrawer.module.css`다.
- 카드 단위 UI는 `secondary/cards/*`, hook 경계는 `secondary/hooks/*`, 계산 모델은 `secondary/model/*`에 둔다.
- 기존 카드, 그리드, 패널, 버튼 리듬을 유지한다.

## 2026-05-27 candidate detail drawer scope addendum

Candidate detail drawer uses the product drawer modules, but it is not allowed to lose the selected company scope while composing the drawer transaction.

| Boundary | Required behavior |
|---|---|
| Item detail | Keep the selected candidate/company scope when loading the item detail basis. |
| Primary bundle | Pass the same explicit `companyUuid` to primary bundle reads. |
| Secondary detail | Pass the same explicit `companyUuid` to secondary detail reads. |
| Secondary mutation | Require a concrete single-company `companyUuid`; omitted, empty, or all-company scope is invalid. |

Normal analysis-page product drawer reads may still use optional all-company scope where documented. Candidate detail drawer flows that started from a single-company candidate item must not silently downgrade to all-company reads.
