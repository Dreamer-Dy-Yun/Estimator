# dashboard-app Source Boundary Map

Last updated: 2026-06-16

## 0-9) 2026-06-15 secondary inbound split UI/style boundary

- Split inbound UI ownership is layered by responsibility. `SizeOrderCard.tsx` composes the card, `useInboundSplitScheduleController.ts` owns parent state transfer and applied split rows, `InboundSplitScheduleDialog.tsx` owns modal shell behavior, `useInboundSplitScheduleDraft.ts` owns local draft edits/totals, `InboundSplitScheduleTable.tsx` owns row/table rendering and derives summary totals from its rows, `inboundSplitScheduleDatePolicy.ts` owns date interval/order validity, `inboundSplitDraftQuantityModel.ts` owns draft quantity input normalization and row-total redistribution policy, `inboundSplitScheduleTableClasses.ts` owns table class/diff-label helpers, and `inboundSplitScheduleTypes.ts` owns shared UI aliases.
- Split inbound date interval labels are derived in the UI only, but date-order validity is shared through `inboundSplitScheduleDatePolicy.ts`. The parent passes the current work date as `inboundSplitWorkDate`; the table compares round 1 against that value and each later round against the previous round date. The split table must not create its own `today` value. The native date input display is shared through `src/components/DateInputWithWeekday.tsx`; split-specific interval text and invalid-order coloring stay in `InboundSplitScheduleTable.tsx` and `inboundSplitRows.module.css`.
- Split inbound visual ownership stays inside `secondary/secondaryDrawer.module.css`; components must not import the `style-parts` files directly.
- `inboundSplitDialogShell.module.css` is the root for split-inbound modal structure and shared CSS variables. Palette, row heights, fixed quantity width, sticky shadow, and dialog surface tokens are inherited by the table and row style parts from the dialog root.
- `inboundSplitTable.module.css` owns only table geometry: base table sizing, header style, horizontal sticky columns, sticky left offsets, fill-spare-width behavior, and overflow scroll preservation.
- `inboundSplitRows.module.css` owns only row state styling: summary and round row colors, no-divider styling between suggested and confirmed rows in the same round, section/round dividers, changed-confirmation text color, sticky body-cell widths, and input dimensions.
- Source data, shortage recommendation logic, row rebuilding, and Apply/Close state transfer remain in the existing TS/TSX/model owners; CSS cleanup must not move API/mock source behavior into UI styles or components.

## 0-8) 2026-06-15 secondary inbound split recommendation baseline

- Split inbound suggestions use the immutable size recommendation baseline (`recommendedQty`), not the mutable user confirmation value (`confirmQty` / `confirmedQty`).
- `InboundSplitSizeColumn.confirmedQty` remains display and confirmation-total state; `InboundSplitSizeColumn.recommendedQty` is the cap used by `inboundSplitSuggestionModel.ts`.
- Applying split inbound rows updates `drawer2.confirmed.rounds` and the current confirmation inputs only. It must not convert a confirmed-snapshot drawer to the live calculation baseline by itself.
- Opening or applying split inbound rows requires both a valid split source and completed stock-order calculation. If readiness drops while the dialog is open, the controller closes and remounts the dialog to discard stale draft state.
- Changing live calculation inputs such as inbound dates, weight, buffer stock, unit economics, forecast inputs, or stock-order result basis clears `drawer2.confirmed.rounds` together with direct confirmed quantities.
- Regression coverage lives in `useSecondaryDrawerSnapshotController.test.tsx`, `useSecondaryForecastModel.test.tsx`, `useInboundSplitScheduleController.test.tsx`, and `inboundSplitSuggestionModel.test.ts`.

## 0-7) 2026-06-15 secondary inbound split fixture boundary

- `dashboard-app/public/mock/secondaryInboundSplitSourceFixtures/*.json` are the scope-sharded mock backend substitute sources for split inbound tests and Pages preview.
- `src/api/mock/secondaryInboundSplitSourceFixture.ts` owns runtime fetching/caching of that static fixture, scope/SKU lookup, and slicing it to the requested date range; UI and hooks still call only `getSecondaryInboundSplitSource`.
- `dashboard-app/scripts/generateSecondaryInboundSplitSourceFixtures.ts` regenerates the fixture for the `2026-01-01 <= dateStart < dateEnd <= 2027-06-15` coverage window, covering saved 2026-04 snapshot requests and the 2026-06-15 live default inbound range.
- Static deployment relies on host-level HTTP gzip/brotli compression for the large fixture payload. Do not move this data into UI components or duplicate it as fallback state.
- `inboundSplitSuggestionModel.ts` is shortage-only: projected stock plus known inbound must cover demand before any suggested order quantity appears. It must not allocate leftover confirmed quantity just to match the confirmed total, and it must not use the mutable confirmed quantity as the recommendation baseline.

## 0-6) 2026-06-11 candidate order metric comparison boundary

- Candidate stash detail header fetches size comparison targets with `getProductComparisonTargets({ base })`; it does not create a global/default comparison variable outside the modal.
- The selected comparison target is passed as `CandidateOrderMetricStreamParams.comparison` for each `subscribeCandidateOrderMetrics` request.
- Snapshot-confirmed candidate items project `OrderSnapshotDocument.drawer2` values into the inner order list and do not recalculate when the comparison target changes.
- Non-snapshot candidate items use the same secondary size/order projection helper as the product drawer, while daily trend rendering data stays out of the list metric request.
- If comparison targets are still loading, candidate order metric subscription waits. If loading completes with no selected comparison target, the modal must not synthesize a fake default; non-snapshot metric cells are marked failed/unavailable and snapshot rows keep stored values.
- `candidateStashDetailModalModel.ts` owns the public args/model type for `useCandidateStashDetailModal.ts` so the hook file can remain orchestration-focused.
- `useCandidateOrderMetricCoordinator.ts` owns comparison target availability, comparison-change reload, and appended-item metric subscription coordination.

## 0-5) 2026-06-10 list thumbnail boundary

- 분석 리스트와 이너 후보군 리스트는 체크박스 뒤에 표시 순서/순위 열을 두고, 그 다음 열에 상품 썸네일을 표시한다.
- 분석 리스트의 `순위`는 판매 row 정렬 기준 rank이고, 이너 후보군의 숫자 열은 현재 필터/정렬 결과의 화면 순서다.
- 표시 입력은 row summary DTO의 `thumbnailUrl: string | null`이다. UI는 URL을 계산하거나 외부 placeholder URL을 만들지 않는다.
- `ProductThumbnailCell`은 표시 전용 공통 컴포넌트다. 이미지가 없으면 `null` 계약을 빈 썸네일 surface로 드러내고, 비즈니스 데이터를 대체 생성하지 않는다.
- `ProductThumbnailCell`은 분석 리스트, 이너 후보군, 추천 보기에서 공통으로 사용한다. pointer hover 시 body portal에 184px 미리보기를 띄우며, 모달/드로워 위에 보이도록 자체 z-index를 소유한다.
- 분석 리스트 row 계약은 `SelfSalesRow`/`CompetitorSalesRow`, 이너 후보군 계약은 `CandidateItemSummary`/`CandidateReferenceItemSummary`가 소유한다.
- 후보군 저장 상태용 `CandidateStashItemSummary`는 썸네일을 갖지 않는다. 추천 적용 직후 로컬 row 생성 시에는 추천 row의 `thumbnailUrl`을 그대로 복사한다.
- mock 썸네일은 `src/api/mock/mockProductThumbnail.ts`가 SKU identity 기준으로 만든다. 화면 fallback이 아니라 mock API 계약 대체 데이터다.
- mock 문장과 스냅샷 설명의 EA/원 표시 포맷은 `src/api/mock/mockNumberFormat.ts`가 소유한다. UI 숫자 축약/표시 정책과 섞지 않는다.
- 분석 리스트 숫자 셀은 기본적으로 `formatGroupedNumber` 원값을 표시한다. 셀 영역에 원값이 실제로 다 들어가지 않을 때만 `OverflowCompactLabel`이 compact Korean number를 보여주며 원값은 title/aria label로 보존한다.
- 텍스트 overflow 측정은 셀 전용 컴포넌트가 소유한다. `PaginatedTable`/`AnalysisList` 공통 계층은 정렬, 스크롤, 행 렌더링만 담당하고 셀 표시값 측정을 하지 않는다.

## 0-4) 2026-06-09 product drawer comparison target boundary

- Product drawer API facade calls must pass explicit subject params. All-company is represented by an explicit self-company subject whose `sourceId` is omitted only at the HTTP adapter boundary.
- 1차 드로워 판매 정보의 기준/비교 주체는 `ProductComparisonSubjectRef` 계약이 소유한다.
- `base`와 `comparison`은 모두 `role`, `kind`, `sourceId`를 가진다. `role`은 컬럼 위치, `kind`는 backend/mock 조회 도메인, `sourceId`는 해당 도메인의 실제 id다.
- `ProductComparisonTarget.id`는 comparison option의 UI 선택용 opaque id다. 프론트는 `kind:sourceId` 같은 id 포맷을 합성하지 않는다.
- `getProductComparisonTargets`는 `companyUuid`가 아니라 `base` subject 기준으로 비교 후보 목록을 요청한다.
- 1차 판매 정보 카드는 `판매 정보` 제목 행의 `자사간 비교` 토글로 비교 대상 목록을 전환한다. 토글 OFF는 경쟁사 채널, ON은 현재 자사를 제외한 자사/자사전체 target만 표시한다.
- `getProductSalesInsight`는 `base`, `comparison` subject 계약으로 요청한다. HTTP GET query는 `baseRole/baseKind/baseSourceId/comparisonRole/comparisonKind/comparisonSourceId`로 펼친다.
- `ProductMonthlyTrend`, `SecondaryDailyTrend`, snapshot은 `base`/`comparison` subject 기준으로 정렬한다. snapshot은 `drawer2.baseSubject`, `drawer2.comparisonSubject`, `drawer2.comparisonBasis`, `drawer2.confirmed.rounds`를 저장한다.
- 삭제되었거나 현재 scope에 없는 비교 대상은 첫 번째 항목으로 대체하지 않는다. 선택 불가 상태를 표시하고 사용자가 유효한 대상을 다시 선택하게 한다.
- 비교 대상 목록은 세션 장기 캐시 대상이 아니다. 관리자/회사 scope 변경 가능성을 숨기지 않기 위해 요청 계층에서 그대로 조회한다.
- 2차 드로워의 참고지표 조회는 `ProductComparisonTarget`을 따르지만, 발주 계산 readiness는 참고지표 조회 성공 여부가 아니라 stock-order 계산 결과로만 판단한다.
- 2차 오더의 사이즈 비중 계산은 `ProductSecondaryDetail.comparisonRatioBySize` 기반이다. 비교 대상이 경쟁사 채널이든 자사 target이든 backend/mock이 해당 comparison subject 기준 비중을 제공해야 하며, UI가 라벨만 바꾸어 데이터를 위장하지 않는다.
- 2차 드로워 분할 입고 설정은 `SizeOrderCard`, `useInboundSplitScheduleController`, `InboundSplitScheduleDialog`, `useInboundSplitScheduleDraft`, `InboundSplitScheduleTable`, `SizeOrderConfirmQuantityRows`, `inboundSplitScheduleModel`, `inboundSplitScheduleDatePolicy`, `inboundSplitDraftQuantityModel`, `inboundSplitScheduleTotals`, `inboundSplitSuggestionModel`이 책임별로 나눠 소유한다. `useSecondaryInboundSplitSource`는 API source의 date range, size stock, date/size별 sale/inbound 완전성을 요청 성공 직후 검증한다. 모델은 차수/입고일/제안 수량/확정 수량/정수 배분 계약을 담당하고, date policy는 차수 간 날짜 순서와 간격 판단을 담당한다. draft quantity model은 사용자 수량 입력 정규화와 row-total 재분배 정책을 담당하며, 다이얼로그는 shell과 draft 편집 진입만 담당한다. `SizeOrderConfirmQuantityRows`는 확정 수량 행과 적용된 분할 입고 행 렌더링만 담당한다. 적용된 확정 수량은 `OrderSnapshotDocument.drawer2.confirmed.rounds`로 저장하며, 추천/비율 행인 `sizeOrders`에는 확정 수량을 중복 저장하지 않는다.
- mock API에서 판매 리스트 facade는 `src/api/mock/dashboardApi.ts`, 상품 비교/추이 mock은 `src/api/mock/mockProductComparisonApi.ts`, 2차 상세 mock builder는 `src/api/mock/mockProductSecondaryDetailApi.ts`가 각각 소유한다.


## 0-3) 2026-06-09 primary drawer content width boundary

- 1차 드로워의 기준 폭은 `--primary-drawer-column-width`가 소유한다.
- 1차 드로워 기준 폭은 `clamp(360px, 30vw, 640px)` 정책을 따른다.
- 드로워 shell은 폭 변수를 하위에 제공하고, 하위 카드/테이블/차트는 `min-width: 0`, 내부 스크롤, 줄임표, 계산된 축 폭으로 그 폭 안에서 수축되어야 한다.
- 1차 드로워 본문에서 가로 잘림을 숨기는 방식으로 해결하지 않는다. 각 카드가 자기 책임 영역 안에서 overflow를 처리한다.
- 판매 정보 테이블은 카드 폭 `100%` 안에서 고정 레이아웃으로 맞추며, 표 내부 폰트 크기는 `--primary-drawer-sales-table-font-size` 토큰으로 균일하게 조정한다.
- 판매 정보 테이블의 긴 금액/수량은 CSS 말줄임 대신 `src/utils/format.ts`의 compact Korean number display 정책으로 축약 표시하고, 원문 값은 title/aria label로 보존한다.
- 월간 추이 헤더는 제목 30%, 컨트롤 70% grid 기준을 사용한다. 시리즈 선택 토글 버튼은 각 라벨의 내용 폭을 우선하며, 약 10자까지는 표시하고 그보다 긴 라벨만 말줄임 처리한다.
- 월간 추이 Y축 폭은 표시 숫자 자리수 기준으로 계산한다.
- `SalesTrendChart`는 line/bar series의 축 소속을 chart series 계약으로 판단하며, secondary axis 존재 여부가 primary bar의 축을 바꾸지 않는다.

## 0-2) 2026-06-09 secondary drawer AI comment scroll boundary

- 2차 드로워 AI 코멘트의 긴 본문은 `AiCommentCard` 내부의 답변 영역에서만 세로 스크롤을 만든다.
- 본문 overflow 측정과 `한번에 보기`/`접기` 토글 상태는 `AiCommentCard`가 소유한다.
- 접힌 AI 코멘트 높이 정책은 CSS가 소유하고, TS는 DOM overflow 측정만 수행한다.
- 상위 `ProductSecondaryDrawerContent`와 드로워 shell은 AI 코멘트 본문 높이 측정이나 스크롤 정책을 소유하지 않는다.
- `한번에 보기` 버튼은 접힌 기준 높이를 넘는 실제 답변 내용이 있을 때만 AI 코멘트 레이블과 같은 행 우상단에 표시한다.
- 긴 URL, 토큰, 공백 없는 문장은 AI 코멘트 본문 안에서 줄바꿈하여 카드 폭을 밀지 않게 한다.

## 0) 2026-06-05 analysis scatter/list source boundary

- 분석 리스트는 기간/회사/채널/검색 조건 기준 rows를 1회 요청한다.
- 산점도 grid는 `src/utils/scatterGridBuild.ts`에서 리스트 facet filter가 적용된 rows를 입력으로 계산한다.
- `AnalysisScatterChartCard`는 산점도 view-model만 렌더링하며 API, mock, raw list row를 직접 호출하거나 계산하지 않는다.
- 산점도 cell 선택은 리스트 필터를 수정하는 상태가 아니라 현재 필터 결과 위의 탐색 조건이다. cell 선택 중에는 리스트 필터와 리스트 전용 토글을 잠그고, 잠긴 필터 필드 자체에 현재 조건 값을 그대로 표시한다.
- 기간/조회 조건은 리스트 필터와 다른 상위 request 조건이므로 잠그지 않는다. request key가 바뀌면 기존 산점도 cell 선택을 초기화한다.
- backend scatter endpoint 계약은 남아 있지만 현재 분석 화면의 데이터 source 경로에서는 사용하지 않는다.
- 추후 대용량 전환 시 산점도는 전체 조건 기준 backend aggregate, 리스트만 pagination으로 분리한다.

## 0-1) 2026-06-09 primary drawer monthly trend boundary

- 1차 드로워 월간 판매 추이는 최근 완료월 기준 과거 24개월과 예측 최대 12개월을 기본 표시 범위로 사용한다.
- 예측 개월 수의 페이지 초기값은 항상 12개월이다.
- 사용자가 페이지 흐름 안에서 예측 개월 수를 바꾸면 그 페이지 state 값을 유지한다.
- localStorage, 후보군 detail, hydrate snapshot은 1차 드로워의 예측 개월 초기값을 덮지 않는다.
- 월간 판매 추이 Y축 숫자는 천 단위 쉼표로 표시한다.

## 1) 폴더 소유/책임

| 폴더 | Owner | 책임 |
|---|---|---|
| `src/api` | API 경계 | API public entry, mock/http adapter 선택, 계약 타입, 공통 에러/요청 유틸 |
| `src/auth` | 인증/세션 경계 | 로그인/세션 상태, 인증 가드, 권한 가드, 사용자 프로필 동작 |
| `src/admin` | 관리자 경계 | 관리자 페이지 UI와 상태, 사용자/GPT/Google Sheets 운영 화면 |
| `src/components` | 공통 UI 경계 | 대시보드 외부에서 공유되는 공통 컴포넌트(에러 배지, 모달, 패널 등) |
| `src/dashboard` | 대시보드 기능 루트 | 페이지/컴포넌트/모듈 조합의 상위 오케스트레이션 |
| `src/dashboard/pages` | 페이지 경계 | `SelfPage`, `CompetitorPage`, `SnapshotConfirmPage` |
| `src/dashboard/components` | 대시보드 컴포넌트 경계 | 분석/후보군/드로워 UI 조립과 상호작용 렌더링 |
| `src/dashboard/components/candidate-stash` | 후보군 경계 | 후보군 목록, bulk add, SSE 갱신, 상세 confirm/unconfirm |
| `src/dashboard/components/product-drawer` | 상품드로워 경계 | 기본 드로워 프레임, 2차 드로워 오케스트레이션, 요청 흐름 |
| `src/dashboard/components/product-drawer/secondary` | 2차 드로워 경계 | 상품 상세 2차 화면, AI 코멘트, 재고·발주 계산 |
| `src/dashboard/components/common-style-parts` | 공통 스타일 내부 경계 | `common.module.css` 전용 style-parts |
| `src/dashboard/components/product-drawer/secondary/style-parts` | 2차 스타일 내부 경계 | `secondaryDrawer.module.css` 전용 style-parts |
| `src/dashboard/pages/snapshot-confirm` | Snapshot 경계 | 후보군 스냅샷 업로드/복원 페이지 책임 |
| `src/dashboard/pages/snapshot-confirm-style-parts` | snapshot-confirm 스타일 내부 경계 | `SnapshotConfirmPage.module.css` 전용 style-parts |
| `src/dashboard/drawer` | 드로워 내부 경계 | 드로워 공통 동작/포맷 보조 모듈 |
| `src/dashboard/hooks` | 상태 경계 | 데이터 요청, 필터, 선택 상태 훅 |
| `src/dashboard/model` | 모델 경계 | 계산/정렬/필터 모델 |
| `src/dashboard/interaction` | 인터랙션 경계 | 사용자 입력/이벤트 계열 상태 처리 |
| `src/snapshot` | Snapshot 경계 | 스냅샷 타입, 빌더, 파서, 검증 책임 |
| `src/styles` | 스타일 기초 경계 | 전역 스타일 토큰/루트 스타일 |
| `src/utils` | 유틸 경계 | 순수 유틸 함수 |

## 2) 경계 문서 맵

| 영역 | 문서 | 근거 소스 |
|---|---|---|
| 인증/권한/관리자 | `boundaries/auth-admin.md` | `src/auth`, `src/admin`, `src/dashboard/DashboardLayout.tsx`, `src/App.tsx` |
| API 계약 | `boundaries/api-contracts.md` | `src/api`, `src/api/types/*`, `src/api/requests/*`, `src/api/mock/*` |
| 분석 페이지 | `boundaries/analysis-pages.md` | `src/dashboard/pages/*`, `src/dashboard/components/*` |
| 후보군 | `boundaries/candidate-stash.md` | `src/dashboard/components/candidate-stash/*` |
| 상품드로워/스냅샷 | `boundaries/product-drawer.md` | `src/dashboard/components/product-drawer/*`, `src/snapshot/*` |
| 공통 모듈 | `boundaries/shared-modules.md` | `src/components`, `src/dashboard/hooks`, `src/dashboard/model`, `src/utils` |
| 스타일 파사드 | `boundaries/style-facades.md` | `*.module.css`, `*style-parts/**` |
| 런타임/빌드/deploy/e2e | `boundaries/repository-runtime.md` | `.github`, `dashboard-app/e2e`, `dashboard-app/package.json`, `dashboard-app/vite.config.ts` |
| 백엔드 카탈로그 연동 | `../backend-api/dashboard-api-contract-catalog.md` | `src/api/types/*` |

## 3) 갱신 원칙

- API 타입/계약/adapter mode 변경 → `source-boundary-map.md`, `boundaries/api-contracts.md`, `../backend-api/dashboard-api-contract-catalog.md`, 배포 관련 변경 시 `deployment-hardening.md` 동시 갱신
- 라우트/권한/관리자 플로우 변경 → `boundaries/auth-admin.md`, `frontend-overview.md`, `source-boundary-map.md`
- 분석 페이지/후보군/드로워 책임 변경 → 각 boundary 문서 + `frontend-overview.md`
- 스타일 파사드 규칙 변경 → `boundaries/style-facades.md` 선행 갱신
- 런타임/CI/e2e 규칙 변경 → `boundaries/repository-runtime.md`, 배포/테스트 노트 갱신
- 큰 변경은 `project-cleanup-YYYY-MM-DD.md` 형태로 결과 기록

## 4) 2026-06-14 secondary daily and inbound split source boundary

- Secondary daily trend source owns opening stock plus aggregate per-date flow. `baseStockAtStart` is the stock just before `dateStart`, and `flowByDate[date].base.inbound` is required numeric per-date base inbound rather than a chart-ready accumulated bar.
- Backend-facing daily trend compatibility depends on this source shape. Returning old chart-ready `stockBar`/`inboundAccumBar` fields does not restore stock bars; the frontend recomputes stock from `baseStockAtStart`, daily `base.inbound`, and daily `base.sale`.
- Daily trend `flowByDate` must cover every date from `dateStart` through inclusive `dateEnd`. Known zero sale/inbound values are numeric `0`; `null` is reserved for `comparison.inbound`, `baseStockAtStart`, and reserved stock fields.
- `useSecondaryDailyTrend` validates response `productId`, `dateStart`, inclusive `dateEnd`, and `forecastStartDate` against the request before building chart points.
- Split inbound source uses a separate exclusive date window: `dateStart <= date < dateEnd`, and invalid `dateEnd <= dateStart` should be treated as validation failure instead of a successful empty source.

- 2차 드로워 일간 판매추이는 API source와 chart point를 분리한다.
- `getSecondaryDailyTrend`는 합계 일자 flow와 `forecastStartDate`를 제공하고, `useSecondaryDailyTrend`/`secondaryDailyTrendSourceModel.ts`가 chart point를 파생한다.
- 일간 판매추이는 합계 단위 source만 소유하며, 사이즈별 flow를 받지 않는다.
- 2차 드로워 분할 입고 제안은 API source와 화면 draft를 분리한다.
- `getSecondaryInboundSplitSource`는 `dateStart`, `dateEnd`, `stockBySize`, `expectationByDate[date][size].sale/inbound`만 제공한다.
- 차수 수, 차수별 입고일, 현재 확정 수량, 차수별 확정 수량은 `SizeOrderCard`/`InboundSplitScheduleDialog`가 소유하는 화면 draft다.
- API source를 차수별 제안 수량으로 변환하는 책임은 `secondary/cards/inboundSplitSuggestionModel.ts`가 소유한다.
- 분할 행 생성, 확정 수량 합계, 정수 배분, 기존 draft 보존은 `secondary/cards/inboundSplitScheduleModel.ts`가 소유한다.
- 컴포넌트는 source와 draft를 전달하고 렌더링만 하며, mock 데이터나 backend shape를 직접 계산하지 않는다.
