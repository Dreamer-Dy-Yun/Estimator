# Shared Modules Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-20 |
| 상태 | 유지 문서 |
| 적용 범위 | 공통 UI, hooks/model/interaction/drawer, snapshot, styles, utils |

## 공통 UI

| 경로/파일 | 역할 |
|------|------|
| `src/components/AppToast.tsx` | 앱 전역 mutation 완료 toast. 상단 자동 닫힘 알림 |
| `src/components/LoadingSpinner.tsx` | 페이지/모달/드로워/버튼 요청 대기 표시 |
| `dashboard/components/InventoryArrivalCollectButton.tsx` | 입고예정일 수집 전역 유틸리티 버튼. 버튼 상태와 toast 연결만 소유 |
| `dashboard/components/PaginatedTable.tsx` | 정렬 가능한 table shell과 현재 정렬 row id 전달 |
| `dashboard/components/FilterBar.tsx` | 공통 필터 layout |
| `dashboard/components/FilterListCombo.tsx` | 리스트형 필터 combo |
| `dashboard/components/DashboardRequestStatus.tsx` | 갱신 중/실패/이전 데이터 표시 compact 상태 |
| `dashboard/components/ConfirmModal.tsx` | 확인 모달 shell |

요청 성공 toast는 클릭 없이 2~3초 뒤 사라지고, 중요한 작업 영역을 가리지 않도록 화면 상단 중앙에 고정한다.

## dashboard hooks

| 파일 | 역할 |
|------|------|
| `useDashboardRequest.ts` | 요청 생명주기, stale 응답 차단, error/isRefreshing/lastUpdatedAt |
| `useElementSize.ts` | element resize 측정 |
| `useProductDrawerBundle.ts` | 상품 1차 번들 로딩과 stale-while-revalidate |
| `useAnalysisSalesFilters.ts` | 분석 기간/필터 상태. 상세는 [analysis-pages.md](./analysis-pages.md) |
| `useAnalysisVisibleSelection.ts` | 분석 화면 선택 상태. 상세는 [analysis-pages.md](./analysis-pages.md) |

## model / interaction / drawer

| 경로/파일 | 역할 |
|------|------|
| `dashboard/model/*` | UI와 API 사이의 순수 view-model/계산 모델 |
| `dashboard/interaction/interactionTarget.ts` | 입력/버튼/필터 같은 전역 조작 제외 target 판정 |
| `dashboard/drawer/drawerDom.ts` | 드로워 바깥 클릭과 keep-open DOM 판정 |

버튼, 입력, 선택, 토글, 링크, label, 필터 콤보, `data-drawer-keep-open` 영역은 조작이 드로워 닫힘보다 우선한다. 커스텀 클릭 UI가 필요하면 먼저 실제 `button`/`input`/`select`로 표현 가능한지 검토한다.

## snapshot

| 파일 | 역할 |
|------|------|
| `snapshot/orderSnapshotTypes.ts` | 저장 스냅샷 문서 타입 |
| `snapshot/parseOrderSnapshot.ts` | API 타입 역의존 없이 스냅샷을 파싱 |

스냅샷 저장/표시 정책은 [product-drawer.md](./product-drawer.md)와 [candidate-stash.md](./candidate-stash.md)를 우선 확인한다.

## styles

| 경로 | 역할 |
|------|------|
| `src/styles/global.css` | 전역 reset/base 스타일 |
| `dashboard/components/common-style-parts/*` | 필터, table, 공통 카드/버튼 스타일 조각 |
| `dashboard/components/common-style-parts/drawer*.module.css` | 공통 드로워 shell, 상품 이미지, Recharts focus 제거 스타일 |
| feature별 `.module.css` | 해당 feature 전용 layout과 상태 스타일 |

기존 카드, 그리드, 패널, 버튼, 여백, 색상 톤을 유지한다. UI 카드를 중첩 카드처럼 보이게 만드는 변경은 피한다.

## utils

React나 API 구현에 의존하지 않는 순수 보조 함수만 둔다.

| 파일 | 역할 |
|------|------|
| `adjacentListNavigation.ts` | 이전/다음 row 탐색. 하드닝 완료 |
| `analysisKpiWeighted.ts` | 분석 KPI 매출액 가중 계산. 하드닝 완료 |
| `displayRank.ts` | 현재 화면 rows 기준 표시 순위 map. 하드닝 완료 |
| `format.ts` | 숫자/비율/EA 표시 format. 하드닝 완료 |
| `hashRank.ts` | hash 기반 rank 보조. 하드닝 완료 |
| `scatterGridDisplay.ts` | scatter-grid cell 표시 색상과 반지름 변환. 하드닝 완료 |
| `sort.ts` | 정렬 방향/상태/값 비교 helper. 하드닝 완료 |
| `uniqueSortedStrings.ts` | 문자열 option 정렬/중복 제거. 하드닝 완료 |
| `copyToClipboard.ts` | clipboard 복사 helper |
| `date.ts` | 날짜 formatting/parsing |
| `forecastMonthsStorage.ts` | forecast month localStorage 저장 |
| `candidateOrderExcel*.ts` | 후보군 엑셀 데이터/워크북/다운로드 |
| `salesKpiColumn.ts` | 판매 KPI column view-model helper |

하드닝 완료 모듈의 상세 계약과 수정 허가 규칙은 [../module-hardening.md](../module-hardening.md)를 따른다.
