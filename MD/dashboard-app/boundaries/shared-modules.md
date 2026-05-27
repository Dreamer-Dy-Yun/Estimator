# Shared Modules Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 최초 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-27 |
| 상태 | 최신 문서 |
| 적용 범위 | 공통 UI, hooks/model/interaction/drawer, snapshot, styles, utils |

## 공통 UI

| 경로/파일 | 역할 |
|------|------|
| `src/components/AppToast.tsx` | 전역 완료/실패/warning toast 표면. 성공과 refresh warning을 같은 성공 상태로 섞지 않는다. |
| `src/components/AppToastContext.ts` | toast API 계약. `warning` variant는 mutation 성공 후 refresh 실패 같은 stale 위험을 전달한다. |
| `src/components/LoadingSpinner.tsx` | 페이지, 모달, drawer, 버튼의 요청 대기 표시. |
| `dashboard/components/InventoryArrivalCollectButton.tsx` | 입고예정 수집 전역 유틸리티 버튼. 버튼 상태와 toast 연결만 소유한다. |
| `dashboard/components/PaginatedTable.tsx` | 정렬 가능한 table shell과 row id 전달. |
| `dashboard/components/FilterBar.tsx` | 공통 필터 layout. |
| `dashboard/components/FilterListCombo.tsx` | 리스트형 필터 combo. |
| `dashboard/components/DashboardRequestStatus.tsx` | 갱신 중, 실패, 이전 데이터 표시용 compact 상태. |
| `dashboard/components/ConfirmModal.tsx` | 확인 모달 shell. focus trap은 `useModalFocusTrap.ts`를 사용한다. |
| `dashboard/components/useModalFocusTrap.ts` | 모달 초기 focus, Tab 순환, Escape close, focus restore 공통 계약. |

성공 toast는 클릭 없이 사라지는 보조 알림이다. 실패, 부분 성공, stale 위험처럼 사용자가 판단해야 하는 상태는 inline 상태나 `warning`/`alert` 의미를 함께 제공한다.

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
| `dashboard/drawer/drawerDom.ts` | drawer 배경 click과 keep-open DOM 판정. portal modal도 이 helper를 사용한다. |

버튼, 입력, 선택, 링크, label, filter combo, `data-drawer-keep-open` 영역은 전역 닫기보다 사용자 조작을 우선한다.

## admin mutation refresh helper

| 파일 | 역할 |
|------|------|
| `src/admin/adminMutationRefresh.ts` | 관리자 create/update/delete 성공 후 목록 refresh 실패를 write 실패와 분리한다. |

`adminMutationRefresh`는 write mutation이 성공한 뒤 refresh가 실패해도 성공을 취소하지 않는다. 호출자는 성공 메시지와 refresh warning을 분리해 보여줘야 한다. API 계약 자체를 바꾸는 파일이 아니며, 관리자 dialog의 중복 refresh 처리와 toast 조합을 줄이는 shared helper다.

## snapshot

| 파일 | 역할 |
|------|------|
| `snapshot/orderSnapshotTypes.ts` | 저장된 오더 snapshot 문서 계약. 현재 타입은 `OrderSnapshotDocumentV2`다. |
| `snapshot/parseOrderSnapshot.ts` | API/저장소에서 온 snapshot을 current 계약으로 검증한다. |
| `snapshot/parseOrderSnapshot.validation.test.ts` | 저장/API JSON을 current snapshot 계약으로 받아들일지 검증하는 parser validation 테스트. UI 흐름 테스트와 분리한다. |
| `snapshot/buildSecondaryOrderSnapshot.test.ts` | 2차 drawer 상태를 `OrderSnapshotDocumentV2`로 조립하는 builder 계약 테스트. parser validation과 분리한다. |
| `snapshot/orderSnapshotTestFixtures.ts` | snapshot 테스트 fixture와 factory. parser/builder 테스트가 공유하되 UI interaction 책임을 넣지 않는다. |

snapshot 저장 표시 계약은 [product-drawer.md](./product-drawer.md)와 [candidate-stash.md](./candidate-stash.md)를 우선 확인한다.

현재 snapshot 타입은 `OrderSnapshotDocumentV2`다. current 필드 목록과 의미는 product drawer 경계 문서의 snapshot 섹션을 기준으로 한다. `competitorRatioBySize`는 0~1 ratio이고, `*Pct` 필드는 0~100 percent다. `confirmedTotals`는 현재 snapshot의 `sizeOrders[].confirmQty` 합계이며 누락 값을 0으로 보정하지 않는다.

### snapshot test split

- `parseOrderSnapshot.validation.test.ts`는 저장소/API에서 온 JSON의 필수 필드, legacy 또는 malformed 값, current v2 수용/거부 기준을 소유한다.
- `buildSecondaryOrderSnapshot.test.ts`는 product secondary drawer 입력, 계산 결과, AI 코멘트, 확정 수량을 snapshot 문서로 조립하는 계약을 소유한다.
- `orderSnapshotTestFixtures.ts`는 parser와 builder 테스트가 공유하는 fixture만 제공하며, feature UI의 event 흐름이나 hook 상태를 대신 검증하지 않는다.
- product drawer 테스트는 snapshot을 생성/소비하는 UI와 hook 흐름만 검증한다.
- backend API spec은 저장 필드의 의미, 필수/선택 여부, backend 검증 책임을 설명한다.
- snapshot parser가 보장해야 할 계약을 feature UI 테스트에 중복으로 넣지 않는다.

## styles

| 경로 | 역할 |
|------|------|
| `src/styles/global.css` | 전역 reset/base 스타일. |
| `dashboard/components/common-style-parts/*` | 필터, table, 공통 카드/버튼 스타일 조각. |
| `dashboard/components/common-style-parts/drawer*.module.css` | 공통 drawer shell, 상품 이미지, Recharts focus 제거 스타일. |
| feature별 `.module.css` | 해당 feature 전용 layout과 상태 스타일. |

기존 카드, 그리드, 패널, 버튼, 여백, 색상 톤을 유지한다. UI 카드를 중첩 카드처럼 보이게 만드는 변경은 제한한다.

## utils

React와 API 구현에 의존하지 않는 순수 보조 함수만 둔다. business field가 필요한 계산은 utils에 숨기지 말고 feature `model` 또는 API 계약 근처에 둔다.

## 변경 시 확인할 것

- 공통 helper가 feature 비즈니스 값을 임의로 만들지 않는가?
- 성공과 refresh 실패를 같은 성공/실패 상태로 합치지 않았는가?
- snapshot parser 계약과 UI interaction 테스트가 섞이지 않았는가?
- drawer outside click helper가 portal modal의 조작을 닫기 이벤트로 오인하지 않는가?
