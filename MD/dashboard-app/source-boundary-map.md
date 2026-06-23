# Dashboard App Source Boundary Map

Last updated: 2026-06-23

이 문서는 `dashboard-app`의 현재 책임 경계와 데이터 출처를 정리한다. 화면, API 계약, 계산 책임, 저장된 사용자 결정이 섞이지 않도록 하는 기준 문서이다.

## 1. 최상위 책임

| 영역 | 경로 | 책임 |
|---|---|---|
| 앱 진입/라우팅 | `src/App.tsx`, `src/routes` | 인증 상태, 라우팅, 페이지 진입 조건을 연결한다. |
| API 경계 | `src/api` | HTTP/mock 어댑터 선택, 요청 직렬화, API 타입 계약을 제공한다. |
| 인증/회사 컨텍스트 | `src/auth`, `src/company` | 로그인 세션, 회사 선택, 전체 회사 스코프 표현을 관리한다. |
| 대시보드 화면 | `src/dashboard` | 판매 목록, 산점도, 상품 드로어, 후보 풀 UI를 담당한다. |
| 후보 풀 | `src/dashboard/pages/snapshot-confirm`, `src/dashboard/pages/SnapshotConfirmPage.tsx`, `src/dashboard/components/candidate-stash` | 후보 풀 목록/상세/추천/확정 작업 흐름을 담당한다. |
| 스냅샷 | `src/snapshot` | `OrderSnapshotDocument` v8의 저장/파싱/검증 계약을 담당한다. |
| 공통 UI | `src/components`, `src/styles` | 재사용 UI와 스타일 토큰을 제공한다. |

## 2. API 접근 경계

모든 화면, 훅, 컴포넌트는 `src/api`를 통해서만 API에 접근한다. mock 파일을 화면에서 직접 import하지 않는다.

| 파일 | 책임 |
|---|---|
| `src/api/requests/dashboardRequests.ts` | 현재 런타임에서 HTTP/mock 어댑터를 선택하는 단일 진입점이다. |
| `src/api/requests/httpDashboardRequests.ts` | 백엔드 HTTP 요청의 path/query/body 직렬화 기준이다. |
| `src/api/requests/mockDashboardRequests.ts` | 백엔드 미구현 구간을 대체하는 계약형 mock 구현이다. |
| `src/api/types/*` | 프론트와 백엔드가 공유해야 하는 요청/응답 타입 계약이다. |

API 문서는 다음 문서를 함께 갱신한다.

| 문서 | 용도 |
|---|---|
| `MD/backend-api/backend-api-spec.md` | 백엔드 구현자가 보는 행위/정책 중심 사양이다. |
| `MD/backend-api/dashboard-api-contract-catalog.md` | endpoint별 path/query/body/response 빠른 참조표이다. |
| `MD/backend-api/order-snapshot-backend-contract.md` | 후보 상세 저장 스냅샷 v8 계약이다. |

## 3. 상품 드로어 경계

상품 드로어는 기본 상세, 비교 대상, 월간 추세, 판매 인사이트, secondary 상세, 일별 추세, 입고 분할 소스를 분리해서 읽는다.

| 데이터 | API | 프론트 책임 |
|---|---|---|
| 기본 드로어 번들 | `getProductDrawerBundle` | 기본 상품 요약, 재고, 기본 표시값을 수신한다. |
| 비교 대상 | `getProductComparisonTargets` | 사용 가능한 비교 대상 목록을 표시한다. 빈 배열은 사용 불가 상태이다. |
| 월간 추세 | `getProductMonthlyTrend` | 월간 추세/예측 표시용 데이터를 수신한다. |
| 판매 인사이트 | `getProductSalesInsight` | 기간/채널 민감 인사이트를 별도 계약으로 수신한다. |
| Secondary 상세 | `getProductSecondaryDetail` | 오더 계산, 확정값, 사이즈 제안, AI 코멘트 입력 컨텍스트를 수신한다. |
| 일별 추세 | `getSecondaryDailyTrend` | 일별 예측 그래프 소스를 수신한다. `size` query가 있으면 해당 사이즈 기준, 없으면 전체 기준이다. 분할입고 계획 소스는 `getSecondaryStockOrderCalc().inboundSplitSource`를 사용한다. |
| Split inbound planning source | `getSecondaryStockOrderCalc().inboundSplitSource` | Single planning source for detailed recommendation rows and split-inbound planning. It contains `total`, `sizeInfo`, `expectation`, and `confirmed`. |

`inboundSplitSource` is returned inside `getSecondaryStockOrderCalc`; split count, split dates, confirmed quantities, and `ignoreExistingOrderInbound` remain UI/snapshot state.

Detail recommended quantities and split-inbound suggested quantities must both be derived from `stockOrderCalc.inboundSplitSource` through the same planning function. They must use `total.sales`, `sizeInfo`, `expectation`, opening stock, existing inbound before the current order, and UI target ending stock instead of a separate `total.suggestion` shortcut. Round demand uses `[round n inbound date, round n+1 inbound date)`, while existing-order inbound for round n uses `[round n-1 inbound date, round n inbound date)`.

Split inbound dialog draft editing has two UI-owned phases. Before inbound dates are locked, users may change split count and dates; confirmed quantities mirror the recalculated suggestions. The summary inbound-date cell owns the date-lock toggle. After dates are locked, split count/date inputs are disabled and confirmed total/size quantity inputs plus reset-to-suggested are enabled. This phase state is dialog-local UI state and does not change API or snapshot contracts.

## 4. Secondary 오더/입고 분할 경계

Secondary 드로어의 주요 값은 다음 기준을 따른다.

| 값 | 의미 | 소유자 |
|---|---|---|
| 추천 수량 | 오더 상세의 제안 수량이다. 현재 화면과 스냅샷은 `drawer2.sizeOrders[].recommendedQty` 합계를 기준으로 표시한다. | API/계산 결과 |
| 확정 수량 | 사용자가 적용한 최종 오더 수량이다. 오더 상세과 입고 분할 UI에서 같은 확정 기준을 공유한다. | 사용자 결정 |
| `confirmed.rounds` | 차수별 입고일과 사이즈별 확정 수량이다. 스냅샷 저장 대상이다. | 사용자 결정 |
| `sizeOrders` | 사이즈별 제안/추천/비중 표시값이다. | API/계산 결과 |
| 입고 분할 차수 날짜 범위 | 각 차수 입고일은 `currentOrderInboundDueDate <= date < nextOrderInboundDueDate` 범위 안에서 검증한다. 첫 차수는 금번 입고일과 같은 날짜를 허용한다. | UI 상태/API 계약 |

입고 분할 제안은 각 차수 구간의 `total.sales` 수요, `sizeInfo[size].salesRate`, `sizeInfo[size].baseStock`, `expectation[size][]`, 현오더 입고 전 기존 입고예정량, UI 여유재고 목표를 같은 planning 함수로 반영해 계산한다. 수요 구간은 `[n차 입고일, n+1차 입고일)`이고, n차에 반영되는 기오더 입고 예정량은 `[n-1차 입고일, n차 입고일)`이다. 1차는 이전 차수 구간이 없으므로 `ignoreExistingOrderInbound` 여부와 무관하게 현오더 입고 전 기존 입고예정량만 반영된다. `total.suggestion`은 백엔드가 제공한 source 집계값이며, UI 여유재고가 적용된 최종 추천 총량을 대체하지 않는다.

## 5. 스냅샷 경계

`OrderSnapshotDocument`의 현재 스키마 버전은 8이다.

`stockOrderResult.existingOrderInboundSupplyBySize`는 A(기 주문 오더 입고 예정량)의 날짜별 원천이다. `stockOrderResult.inboundSplitSource.expectation`도 같은 의미의 분할입고 계산용 A 일정이며, 현재 재고는 `inboundSplitSource.sizeInfo[size].baseStock`에 둔다. `display.totalOrderBalance*`는 A 전체 집계이고, `display.expectedInboundOrderBalance*`는 `date < currentOrderInboundDueDate`인 A 집계이다.

| 필드 | 의미 |
|---|---|
| `schemaVersion` | 반드시 `8`이다. |
| `context` | 분석 기간, 예측 개월, 일별 추세 기준을 보관한다. |
| `drawer1.summary` | 상품 기본 요약과 현재 가용 재고를 보관한다. |
| `drawer2.baseSubject` | 기준 주체이다. 현재는 자사 기준이다. |
| `drawer2.comparisonSubject` | 비교 주체이다. 경쟁 채널 또는 자사 비교가 가능하다. |
| `drawer2.comparisonBasis` | 비교 가격/수량/사이즈 비중 기준이다. |
| `drawer2.stockOrderRequest` | 입고일, 다음 입고일, 오더 커버리지 일수, 수요 override 입력이다. |
| `drawer2.confirmed.rounds` | 사용자가 확정한 차수별 사이즈 수량이다. |
| `drawer2.sizeOrders` | 사이즈별 제안/추천 수량이다. |
| `drawer2.stockOrderResult` | 주문 계산 결과이다. 저장 스냅샷 복원에 필요한 필수 필드이다. |
| `drawer2.unitEconomics` | 단가/원가/수수료 가정치이다. 저장 스냅샷 복원에 필요한 필수 필드이다. |

스냅샷 값은 저장된 사용자 결정의 근거이다. 화면 재진입 시 임의 재계산으로 덮지 않는다. API 최신값과 스냅샷 값이 다르면 화면은 차이를 드러내고 사용자의 재적용을 통해 갱신한다.

## 6. 후보 풀 경계

후보 풀은 저장된 후보 항목과 상품 드로어 스냅샷을 연결한다.

| 흐름 | 책임 |
|---|---|
| 후보 풀 목록 | `getCandidateStashes`가 목록을 제공한다. |
| 후보 항목 목록 | `getCandidateItemsByStash`가 기간/회사 스코프 기준 목록을 제공한다. |
| 추천 후보 | `getCandidateRecommendations`가 추가 후보를 제공한다. |
| 상세 확정 배치 | `startCandidateDetailBulkConfirm`과 SSE가 항목 상세 계산/저장을 진행한다. |
| LLM 코멘트 배치 | `startCandidateStashLlmCommentJob`과 SSE가 코멘트 생성 상태를 제공한다. |
| 단건 수정 | `updateCandidateItem` 응답이 저장 후 최신 `CandidateItemDetail` 기준이다. |

후보 상세의 저장값은 `CandidateItemDetail.confirmedOrderSnapshot`에 보관된 `OrderSnapshotDocument`이다. 저장된 스냅샷은 후보 항목의 현재 확정 상태로 취급한다.

## 7. 에러/빈 상태 경계

프론트는 존재하지 않는 비즈니스 값을 임의로 생성하지 않는다.

| 상황 | 처리 원칙 |
|---|---|
| API 실패 | 실패 상태를 표시한다. mock 기본값으로 숨기지 않는다. |
| 비교 대상 없음 | 빈 배열을 유효한 사용 불가 상태로 표시한다. |
| 필수 수치 누락 | 계산을 진행하지 않고 오류/빈 상태를 드러낸다. |
| stale async 응답 | request sequence 또는 alive guard로 오래된 응답 반영을 막는다. |
| 스냅샷 파싱 실패 | 저장 스냅샷 오류로 표시하고 임의 복구하지 않는다. |

## 8. 문서 갱신 규칙

다음 변경이 있으면 이 문서와 관련 boundary/API 문서를 함께 갱신한다.

- API path/query/body/response 변경
- 스냅샷 필드 또는 schemaVersion 변경
- 상품 드로어 계산 책임 변경
- 입고 분할 차수/수량 배분 규칙 변경
- 후보 풀 저장/확정 흐름 변경
- mock이 표현하는 계약 변경
