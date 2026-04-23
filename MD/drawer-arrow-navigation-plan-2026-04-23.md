# 드로어 2차 열림 상태 ←/→ 목록 순환 네비게이션 계획

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-23 |
| 변경일 | 2026-04-23 (구현 반영) |
| 지시 | Yun Daeyoung |

## 구현 반영 요약

- `src/utils/adjacentListNavigation.ts` 추가, `ProductSummaryDrawer`에 `onRequestNavigateAdjacent` / `disableAdjacentNavigation` 연결.
- `key={summary.id}` 제거 + `summary.id` 변경 시 사이즈·차트 hover 등만 리셋 → 품번 전환 시에도 2차 패널 유지.
- `SelfPage` / `CompetitorPage` / `CandidateStashDetailModal`에서 각각 필터된 목록 순서로 콜백 구현.

## 목표

- **2차 패널까지 열린 상태**에서 `ArrowLeft` / `ArrowRight`로 **현재 화면의 필터링된 목록**에서 이전/다음 항목으로 전환.
- **자사 분석**: `SelfPage`의 `rows`(API 필터 결과) 순서.
- **경쟁사 분석**: `CompetitorPage`의 `rows` 순서.
- **이너 후보**: `CandidateStashDetailModal`의 `tableRows`(= `filteredItems`) 순서.
- **wrap**: 마지막에서 오른쪽 → 첫 항목, 첫에서 왼쪽 → 마지막.

## 코드 조사 요약

- 목록 선택: `SelfPage` / `CompetitorPage`는 `selectedId` + `row.id`. 이너는 `openedItemUuid` + `openItemDrawer(row)`.
- `ProductSummaryDrawer`가 `ProductSummaryDrawerContent`에 **`key={summary.id}`**를 주어 품번 변경 시 **전체 리마운트** → 2차 `expandPaneOpen`이 초기화되어 방향키 UX와 충돌. **`key` 제거**하고 `summary.id` 변경 시 필요한 UI 상태만 `useEffect`로 리셋.
- 키 입력: `input`/`textarea`/`select`/콤보 포털(`[data-filter-combo-panel]`)` 포커스 시에는 무시. 삭제 등 모달 열림 시 이너 페이지에서 비활성 플래그 전달.

## 공통화

- `dashboard-app/src/utils/adjacentListNavigation.ts`: 순환 인덱스·`order`에서 이웃 `id` 계산 순수 함수.
- `ProductSummaryDrawer`에 선택적 콜백 `onRequestNavigateAdjacent?: (direction) => void`, `disableAdjacentNavigation?: boolean` 추가 후, **2차 준비 완료** 조건에서만 `window` `keydown` 등록.

## 페이지별 연결

| 페이지 | `order` | 선택 변경 |
|--------|---------|------------|
| SelfPage | `rows.map(r => r.id)` | `setSelectedId` |
| CompetitorPage | 동일 | 동일 |
| CandidateStashDetailModal | `tableRows.map(r => r.uuid)` | `openItemDrawer(tableRows[i])` (async, 중복 호출 방지 ref) |

## 검증

- `npm run build`
- 2차 닫힘: 방향키 무반응.
- 입력 포커스: 방향키 무반응.
- 이너 삭제 확인 모달 열림: `disableAdjacentNavigation` true.
