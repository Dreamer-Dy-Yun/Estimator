# Shared Modules Boundary

| 항목 | 내용 |
|------|------|
| 작성자 | Yun Daeyoung |
| 작성 도구 | Codex |
| 최초 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-27 |
| 상태 | 유지 문서 |
| 적용 범위 | 공통 UI, hooks/model/interaction/drawer, snapshot, styles, utils |

## 공통 UI

| 경로/파일 | 역할 |
|------|------|
| `src/components/AppToast.tsx` | 전역 mutation 완료/실패 toast. 화면 상단 알림을 소유한다. |
| `src/components/LoadingSpinner.tsx` | 페이지, 모달, drawer, 버튼의 요청 대기 표시. |
| `dashboard/components/InventoryArrivalCollectButton.tsx` | 입고예정일 수집 전역 유틸리티 버튼. 버튼 상태와 toast 연결만 소유한다. |
| `dashboard/components/PaginatedTable.tsx` | 정렬 가능한 table shell과 현재 정렬 row id 전달. |
| `dashboard/components/FilterBar.tsx` | 공통 필터 layout. |
| `dashboard/components/FilterListCombo.tsx` | 리스트형 필터 combo. |
| `dashboard/components/DashboardRequestStatus.tsx` | 갱신 중, 실패, 이전 데이터 표시용 compact 상태. |
| `dashboard/components/ConfirmModal.tsx` | 확인 모달 shell. focus trap은 `useModalFocusTrap.ts`를 사용한다. |
| `dashboard/components/useModalFocusTrap.ts` | 모달 초기 focus, Tab 순환, Escape close, focus restore 공통 계약. feature 모달이 자체 복붙하지 않는다. |

요청 성공 toast는 클릭 없이 사라지는 보조 알림이고, 실패/부분 성공처럼 사용자가 판단해야 하는 상태는 inline 상태나 alert와 함께 표시한다.

## dashboard hooks

| 파일 | 역할 |
|------|------|
| `useDashboardRequest.ts` | 요청 생명주기, stale 응답 차단, error/isRefreshing/lastUpdatedAt. |
| `useElementSize.ts` | element resize 측정. |
| `useProductDrawerBundle.ts` | 상품 1차 drawer bundle 로딩과 stale-while-revalidate. |
| `useAnalysisSalesFilters.ts` | 분석 기간/필터 상태. 상세는 [analysis-pages.md](./analysis-pages.md). |

## model / interaction / drawer

| 경로/파일 | 역할 |
|------|------|
| `dashboard/model/*` | UI와 API 사이의 순수 view-model 또는 계산 모델. |
| `dashboard/interaction/interactionTarget.ts` | 입력, 버튼, 필터 같은 조작 영역을 keyboard shortcut 대상에서 제외하는 판정. |
| `dashboard/drawer/drawerDom.ts` | drawer 바깥 클릭과 keep-open DOM 판정. |

버튼, 입력, 선택, 링크, label, filter combo, `data-drawer-keep-open` 영역은 전역 닫힘보다 사용자 조작이 우선한다.

## snapshot

| 파일 | 역할 |
|------|------|
| `snapshot/orderSnapshotTypes.ts` | 저장되는 오더 snapshot 문서 계약. 화면에 필요한 현재 필드만 저장한다. |
| `snapshot/parseOrderSnapshot.ts` | API/저장소에서 온 snapshot을 legacy 의존 없이 현재 계약으로 검증한다. |

오더 snapshot 저장/표시 계약은 [product-drawer.md](./product-drawer.md)와 [candidate-stash.md](./candidate-stash.md)를 우선 확인한다.

## styles

| 경로 | 역할 |
|------|------|
| `src/styles/global.css` | 전역 reset/base 스타일. |
| `dashboard/components/common-style-parts/*` | 필터, table, 공통 카드/버튼 스타일 조각. |
| `dashboard/components/common-style-parts/drawer*.module.css` | 공통 drawer shell, 상품 이미지, Recharts focus 제거 스타일. |
| feature별 `.module.css` | 해당 feature 전용 layout과 상태 스타일. |

기존 카드, 그리드, 패널, 버튼, 여백, 색상 톤을 유지한다. UI 카드를 중첩 카드처럼 보이게 만드는 변경은 피한다.

## utils

React와 API 구현에 의존하지 않는 순수 보조 함수만 둔다.

| 파일 | 역할 |
|------|------|
| `adjacentListNavigation.ts` | 이전/다음 row 탐색. 하드닝 완료. |
| `analysisKpiWeighted.ts` | 분석 KPI 매출액 가중 계산. 하드닝 완료. |
| `displayRank.ts` | 현재 화면 rows 기준 표시 순위 map. 하드닝 완료. |
| `format.ts` | 숫자, 비율, EA 표시 format. 하드닝 완료. |
| `hashRank.ts` | hash 기반 rank 보조. 하드닝 완료. |
| `scatterGridDisplay.ts` | scatter-grid cell 표시 색상과 반올림 변환. 하드닝 완료. |
| `sort.ts` | 정렬 방향, 상태, 값 비교 helper. 하드닝 완료. |
| `uniqueSortedStrings.ts` | 문자열 option 정렬과 중복 제거. 하드닝 완료. |
| `copyToClipboard.ts` | clipboard 복사 helper. |
| `date.ts` | 날짜 formatting/parsing. |
| `forecastMonthsStorage.ts` | forecast month localStorage 저장. |
| `candidateOrderExcel*.ts` | 후보군 주문 데이터 workbook 다운로드. |
| `salesKpiColumn.ts` | 자사/경쟁 채널 판매 KPI view-model helper. |

하드닝 완료 모듈의 세부 계약과 수정 허가 규칙은 [../module-hardening.md](../module-hardening.md)를 따른다.
