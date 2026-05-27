# Candidate Stash Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-22 |
| 상태 | 유지 문서 |
| 적용 범위 | 오더 후보군, 이너 후보군, 추천, 상세확정, 오더 지표, 엑셀 |

## 책임 요약

오더 후보군은 단일 회사 기준으로 스냅샷 전 후보 상품을 모으고, 이너 후보군 상세에서 기간 기준 조회·추천·오더 지표·상세확정을 다룬다. 단일 회사 선택 시 후보군 목록, 상세 조회, 추천, 오더 지표 SSE, 상세확정, LLM 코멘트, item/stash mutation 요청에는 `companyUuid`가 포함된다. mock도 이 값을 stash/item 소유 scope와 오더 지표 계산에 반영한다. 헤더 회사 선택이 `전체`이면 후보군 업무 흐름은 지원하지 않는다. read API의 `전체` scope 생략은 조회 전용 계약이며, candidate mutation payload/params와 job/SSE start/subscribe에는 적용하지 않는다. 후보군 mutation, 상세 일괄확정 job/SSE, 후보군 LLM 코멘트 job/SSE, 오더 지표 SSE는 `companyUuid` 누락 상태에서 기본 회사로 fallback하지 않고 실패해야 한다.

후보 아이템의 상세확정 여부는 `CANDIDATE_ITEM.details` 스냅샷 존재 여부다. 상세확정 저장/해제/일괄확정/일괄해제 직후에는 후보 아이템 전체 목록을 즉시 재조회하지 않고, 성공 응답 또는 SSE 이벤트로 현재 화면 상태를 로컬 반영한다.

## 후보군 목록

| 파일 | 역할 |
|------|------|
| `SnapshotConfirmPage.tsx` | 후보군 목록 페이지 조립 |
| `CandidateStashCardList.tsx` | 후보군 카드 목록 |
| `CandidateStashEditModal.tsx` | 이름/비고 편집 |
| `CandidateUploadCard.tsx` | 엑셀 업로드, 템플릿 다운로드 |

후보군 생성/삭제/복제/편집 이벤트는 API 호출 후 후보군 목록을 재조회한다. mock은 브라우저 저장소에 후보군을 만들거나 지우지 않는다.

후보군 엑셀 업로드는 단순 read가 아니라 후보군 목록을 바꾸는 mutation 진입점이다. HTTP와 mock 모두 단일 회사 scope가 필요하며, `전체` 또는 누락 scope에서 기본 회사로 보정하거나 성공처럼 처리하지 않는다. mock upload는 실제 저장소가 아니더라도 API 계약을 표현하는 대체 구현체이므로, 단일 회사 기준으로만 후보군 생성/갱신 결과를 돌려준다.

`전체` 회사 선택 상태에서 오더 후보군 탭으로 진입하거나 페이지 안에서 `전체`로 변경되면 라우트에서 강제로 튕기지 않고, 페이지 내부 제한 안내를 표시한다. 이 상태에서는 후보군 API를 호출하지 않는다. 이는 후보군 데이터가 단일 회사 기준으로 생성·확정되어야 하기 때문이다.

목록 로드 실패는 정상 빈 목록으로 감추지 않는다. 실패 시 기존 목록이 있으면 마지막으로 불러온 목록을 유지하면서 목록 로드 실패 카드와 재시도 버튼을 표시하고, 기존 목록이 없으면 목록을 표시할 수 없다는 빈 실패 상태를 표시한다. 이 기준은 후보군이 없는 정상 빈 상태와 API 실패 상태를 구분하기 위한 UX 경계다.

## 이너 후보군 조회

| 파일 | 역할 |
|------|------|
| `CandidateStashDetailModal.tsx` | 상세 모달 shell과 하위 hook 조립 |
| `useCandidateStashDetailModal.ts` | 상세 모달 모델 조립 hook |
| `useCandidateDataReferencePeriod.ts` | 조회 데이터 기간 draft/apply, 첫 조회 실행 |
| `useCandidateItemsLoader.ts` | 후보군 상세 기본 행 조회, stale guard, 상세확정 override 적용, 오더 지표 SSE 시작 |
| `useCandidateRecommendations.ts` | 추천 조회, 배지 병합, 추천 UI용 중복 제외 |
| `useCandidateOrderMetricStream.ts` | 총 오더 수량/금액 SSE 구독과 row 반영 |

조회 데이터 기간은 `dataReferencePeriodStart`/`dataReferencePeriodEnd`로 API에 전달한다. 단일 회사 선택 상태에서는 같은 요청에 `companyUuid`를 포함한다. 후보군 상세 모달 최초 진입 시 초기 조회 기간은 후보군 생성 당시 기간이 아니라 `오늘 - 1년`부터 `오늘`까지다. 사용자가 `조회` 버튼을 누르면 적용 기간을 바꿔 `getCandidateItemsByStash`를 호출한다. 후보군 상세 모달 최초 진입도 같은 조회 파이프라인을 한 번 실행한다. 마지막 조회 이후 입력 기간이 바뀌지 않았으면 `조회` 버튼은 비활성화한다.

## 추천과 배지

- `getCandidateItemsByStash`는 후보군에 실제로 담긴 기본 행과 자사/경쟁사 기간 총판매량을 빠르게 반환한다.
- 전체 SKU 분포 기반 배지와 추천 후보는 `getCandidateRecommendations`가 배지 있는 `recommendations` 목록 하나로 반환한다. 각 recommendation row에는 배지뿐 아니라 같은 기간의 자사/경쟁사 기간 총판매량도 포함된다.
- 프론트는 기본 후보 행이 들어온 직후 추천 API를 `nextCursor` 끝까지 자동 page 조회한다.
- 추천 row의 `skuUuid`가 현재 후보군 row와 일치하면 기존 행 배지로 병합한다.
- 추천 UI에서는 이미 후보군에 있는 row를 숨긴다.
- `추천 보기` 버튼은 배지 계산 시작 버튼이 아니라 이미 받은 추천 목록을 여는 버튼이다.
- 추천 적용은 전체 후보 목록을 다시 조회하지 않는다. `appendCandidateItems` 응답의 신규 `CandidateStashItemSummary`와 이미 받은 recommendation row를 매칭해 현재 리스트 앞에 로컬 삽입한다. 추천 UI의 visible row는 전체 추천 원본과 현재 후보 item membership에서 다시 파생하며, 이미 후보군에 들어간 SKU는 숨긴다.
- 추천 적용 결과는 `applied`, `stale`, `empty`로 구분한다. `applied`는 append 응답 item이 현재 stash/company/period/item membership guard를 통과해 로컬 리스트와 추천 목록에 반영된 상태다. `stale`은 요청 이후 stash, company, 조회 period 또는 대상 item membership이 바뀌어 응답을 버린 상태다. `empty`는 append 요청은 성공했지만 현재 화면에 새로 반영할 item이 없는 상태다.
- 추천 append 중에는 중복 append busy guard를 유지한다. 같은 추천 row를 연속 클릭하거나 이전 append 요청이 끝나기 전에 새 append가 들어와 최신 추천 목록과 item 목록을 덮으면 안 된다.
- `stale`과 `empty`는 후보군 추가 성공으로 표시하지 않는다. 특히 `stale`은 현재 화면 상태를 보호하기 위한 async guard 결과이므로 사용자-visible 반영 없이 폐기한다. `empty`는 중복 또는 추가 불가 row를 성공 삽입처럼 보이지 않게 선택과 visible row를 정리할 수 있지만, 로컬 item 삽입으로 이어지면 안 된다.

### 추천 append 응답 매칭 계약

`appendCandidateItems` bulk 응답은 요청 당시 선택한 recommendation과 현재 화면의 stash/company/period/item membership 기준에 다시 매칭된 경우에만 로컬 item 삽입으로 이어진다. 프론트는 bulk 응답의 신규 `CandidateStashItemSummary`를 이미 받은 recommendation 원본과 `candidateItem.skuUuid -> recommendation.uuid` 기준으로 대조하고, 대조 실패 또는 현재 item membership 불일치를 성공 삽입으로 보정하지 않는다. 단건 `appendCandidateItem`은 `details`를 저장하는 `Promise<void>` mutation이며 이 추천 append 응답 매칭 계약의 입력이 아니다.

이 매칭 계약은 API/프론트 공동 계약이다. 백엔드는 bulk append 응답에서 새로 생성된 후보 item을 식별할 수 있는 `CandidateStashItemSummary`를 반환해야 한다. 프론트는 해당 응답을 현재 추천 원본과 매칭할 수 없으면 append 실패로 처리하고 로컬 item을 삽입하지 않는다. 이는 요청 이후 화면 scope가 바뀐 `stale`이나 성공했지만 새로 반영할 item이 없는 `empty`와 구분한다. 추천 append 후 전체 후보군 재조회로 불일치를 숨기는 것은 기본 흐름이 아니다.

TODO-111에서 `useCandidateRecommendations` 직접 테스트가 추가된 범위는 append 결과 판정, `applied/stale/empty` 분기, 중복 append busy guard다. append 응답 매칭 계약 자체는 `candidateItemLocalMutationModel.test.ts`에서 검증한다. 이 테스트들은 hook과 로컬 삽입 모델의 추천 append 상태 계약을 확인하는 직접 테스트이며, 후보군 상세 모달 전체, SSE 오더 지표, 상세확정 job, 백엔드 API 구현을 하드닝 완료로 선언하는 근거는 아니다.

## 오더 지표 SSE

총 오더 수량, 총 오더 금액, 엑셀용 `orderExport`는 `subscribeCandidateOrderMetrics` SSE 이벤트로 행별 갱신한다. 목록 조회 hook은 stream lifecycle을 직접 알지 않는다. stream 요청의 `companyUuid`는 hook 생성 시 부모가 DI로 넘긴 값을 사용하며, SSE subscribe는 단일 회사 scope가 필수다.

조회 버튼으로 기간을 새로 적용하면 기존 오더 지표 SSE 구독을 모두 닫고 전체 후보 item UUID를 새 요청으로 계산한다. 추천 적용처럼 일부 row만 추가되는 경우에는 기존 계산값을 유지한 채 신규 `candidateItemUuids`만 별도 SSE 요청으로 보낸다.

`useCandidateOrderMetricStream.ts`는 동일한 조회 조건과 같은 후보 item UUID 묶음이 이미 구독 중이면 다시 열지 않는다. 또한 요청한 모든 item이 `item` 또는 `itemFailed` 이벤트로 처리되면 `completed` 이벤트 전이라도 EventSource를 닫는다. 이는 백엔드가 완료 이벤트 없이 SSE 응답을 닫았을 때 브라우저가 동일 URL로 자동 재접속하는 것을 막기 위한 경계 책임이다.

회사 scope는 `useCandidateItemsLoader.ts`와 추천/추가 호출부가 request 인자로 넘긴다. `useCandidateOrderMetricStream.ts`는 부모 hook에서 DI로 받은 `companyUuid`를 SSE 구독 파라미터에 포함하고, 개별 `subscribeOrderMetrics` 호출은 기간과 대상 item UUID만 전달한다. stream hook은 `AuthContext`나 전역 company selector를 직접 읽지 않는다.

## 상세확정

| 파일 | 역할 |
|------|------|
| `useCandidateDetailConfirmationMutations.ts` | 상세확정 저장/해제 성공 후 리스트와 열린 drawer 상태 로컬 반영 |
| `useCandidateBulkDetailConfirm.ts` | 상세 일괄확정 job 시작, SSE 구독, 진행 팝업 상태 |
| `useCandidateStashItemActions.ts` | 삭제, 일괄삭제, 상세확정 일괄해제, 엑셀 다운로드 액션 |
| `CandidateBulkDetailConfirmProgress.tsx` | 상세 일괄확정 진행 팝업 UI |
| `candidateDetailConfirmationOverrideModel.ts` | stale 재조회가 로컬 확정 상태를 덮지 않게 보호 |
| `candidateItemLocalMutationModel.ts` | 삭제 성공 후 현재 리스트에서 row 제거, 추천 append 응답과 선택 recommendation 원본 매칭 후 로컬 row 삽입 |

상세확정 저장/해제 API 성공 응답과 상세 일괄확정 SSE `updatedItem`은 현재 화면의 기준 상태다. 상세 일괄확정은 job start와 SSE subscribe 모두 같은 단일 `companyUuid` scope를 필수로 사용해야 한다. `전체` 또는 누락 scope는 read API의 전체 조회 생략과 다르게 검증 실패다. 서버 응답의 `dbUpdatedAt`이 바뀌고 원하는 확정 상태가 내려오면 override는 해제된다.

삭제와 일괄삭제는 삭제 API 성공 후 현재 `items`에서 삭제된 후보 아이템 uuid만 제거한다. 삭제는 남은 row의 판매/오더 계산값을 바꾸지 않으므로 전체 재조회 없이 합계 파생값이 자동 재계산된다.

## 리스트 UI

| 파일 | 역할 |
|------|------|
| `InnerCandidateOrderList.tsx` | 이너 후보 리스트 UI, 표시 순서 인덱스, 정렬 헤더, 상태 컬럼, 오더 지표 셀, 선택 체크박스, badge 렌더링 |
| `CandidateInsightBadges.tsx` | badge, 로딩, 실패 상태 렌더링 |
| `useInnerCandidateTable.ts` | 필터 옵션, 검색어, 정렬 상태, row 생성, 합계 계산 |
| `useVisibleUuidSelection.ts` | 보이는 UUID 목록 기준 선택 상태 |
| `useInnerCandidateOrderKeyboardFocus.ts` | 이너 후보 리스트 키보드 포커스 |
| `style-parts/innerOrderList.module.css` | 이너 후보 리스트 기본 grid, row, cell, 상태/배지 스타일 |
| `style-parts/innerOrderListSortHeader.module.css` | 정렬 헤더 정렬, 라벨, 정렬 아이콘 스타일 |
| `style-parts/innerOrderListDrawerCompact.module.css` | 1차 드로워 열림/닫힘 중 리스트 compact 스타일 |

리스트 첫 칸은 선택 체크박스, 둘째 칸은 현재 정렬된 화면 순서에서 1부터 다시 계산하는 표시 인덱스다. 표시 인덱스는 레코드 값이 아니다. 이너 후보 리스트 헤더는 데이터 성격을 따른다. 브랜드, 품번, 상품명, 색상 같은 문자열 식별 컬럼은 왼쪽, 상태는 중앙, 판매량과 총 오더 수량/금액 같은 숫자 컬럼은 오른쪽 정렬한다. 정렬 아이콘은 라벨 정렬을 밀지 않는 보조 표시로 둔다.

정렬 가능한 헤더는 시각적 아이콘만으로 상태를 전달하지 않는다. 현재 정렬 key/direction은 보조 라벨 또는 접근성 속성으로 함께 전달되어야 하며, 정렬 버튼의 accessible name은 컬럼명과 정렬 동작을 구분할 수 있어야 한다. 표시 인덱스 컬럼은 정렬 결과에서 다시 계산되는 화면 번호임을 유지하고, 레코드 고유 순번처럼 설명하지 않는다.

## 이너 후보군 드로워

이너 후보군에서는 좌 키로 1차 드로워를 열고, 열린 1차 안에서 좌 키로 2차를 연다. ESC는 2차부터 닫고 한 번 더 누르면 1차를 닫는다.

2차 드로워는 저장 스냅샷을 편집 가능한 초기값으로 사용하고, 이후 계산은 현재 입력값 기준으로 수행한다. 미확정 변경사항은 후보군 상세 모달이 열려 있는 동안 itemUuid별 클라이언트 메모리 draft로 유지한다.

상세 모달 접근성 보강이 들어가는 경우 parent dialog가 focus trap과 close 후 focus restore를 소유한다. 1차/2차 드로워, 추천 보기, 진행 팝업 같은 하위 overlay가 열려 있으면 parent dialog는 Escape 닫힘을 양보하고 상위 전파를 막아야 하며, Escape는 가장 안쪽 overlay부터 닫히고 마지막에 parent dialog 닫힘으로 이어져야 한다.

missing-state dialog 또는 제한 안내 dialog는 사용자에게 필요한 다음 행동을 label에서 드러내야 한다. 예를 들어 회사 선택이 필요한 상태, 선택 가능한 후보 row가 없는 상태, append 결과가 `empty`인 상태는 모두 일반 성공 dialog가 아니라 누락/제한 상태임을 title 또는 accessible label에서 구분한다. 단, 문구 보강은 현재 UI 리듬을 유지하는 범위에서만 수행하고, 하위 overlay 닫힘 순서나 parent dialog focus 책임을 바꾸지 않는다.

## 엑셀

| 파일 | 역할 |
|------|------|
| `utils/candidateOrderExcelData.ts` | 이미 받은 `orderExport` DTO를 엑셀 row/view-model로 변환 |
| `utils/candidateOrderExcelWorkbook.ts` | ExcelJS workbook 생성과 스타일 정책 |
| `utils/candidateOrderExcelExport.ts` | exceljs preload와 브라우저 다운로드 연결 |

엑셀 다운로드는 백엔드를 다시 호출하지 않고 이미 받은 `CandidateItemSummary.orderExport` DTO로 생성한다. 제품에 없는 사이즈는 `N/A`, 복수 배지는 한 셀 안에서 줄바꿈한다.

## 2026-05-22 하드닝 후보와 보류

### 현재 동작으로 문서화한 경계

- 후보군 업무 흐름은 단일 회사 scope 전용이다. `전체` scope의 read API 생략 계약을 후보군 mutation, job, SSE에 적용하지 않는다.
- 후보군 mock upload도 required single company scope mutation 계약에 속한다. mock이라는 이유로 `전체` scope를 기본 회사로 보정하거나 성공처럼 처리하지 않는다.
- `SnapshotConfirmPage.tsx`는 `전체` 선택 상태에서 후보군 목록 API를 호출하지 않고 페이지 내부 제한 안내를 표시한다.
- `SnapshotConfirmPage.tsx`는 후보군 목록 load failure를 `stashesLoadError`로 유지하며, 실패를 빈 목록 성공으로 바꾸지 않는다. company switch 중 이전 회사 응답이 늦게 도착하면 현재 선택 회사의 목록 상태를 덮지 않는 stale guard 책임도 가진다.
- 2차 드로워 후보군 액션 hook은 `getCompanyUuidForOptionalScope` 결과가 없으면 후보군 picker 열기와 mutation을 차단하고 toast로 사유를 표시한다. product-secondary picker는 company/sku 변경 중 이전 picker 요청 결과가 최신 상태를 덮지 않도록 stale guard를 유지하고, picker load 또는 unconfirm 실패를 성공 흐름으로 바꾸지 않는다.
- 추천 append는 applied/stale/empty 결과와 중복 append busy guard를 구분해야 한다. stash/company/period/item-membership guard를 통과하지 못한 응답은 성공 반영 대상이 아니라 stale 응답으로 폐기한다.

### 하드닝 후보

- `SnapshotConfirmPage.tsx`의 목록 로드 실패 UI: stale list 유지, 빈 실패 상태, 재시도 버튼의 UX 경계가 명확하므로 테스트 보강 후 하드닝 후보로 분리할 수 있다.
- `useCandidateRecommendations.ts`의 추천 append guard: 결과 판정과 scope/company/period/item-membership guard가 명확해지면 순수 helper 또는 작은 model로 분리해 테스트할 수 있다.
- `useCandidateRecommendations.ts`의 직접 테스트와 `candidateItemLocalMutationModel.ts`의 append 응답 매칭 테스트는 추천 append 하드닝 후보를 좁히는 근거다. 다만 hook 전체가 추천 조회, pagination, badge 병합, modal 상태를 함께 소유하므로 TODO-111 기준으로 하드닝 완료 파일로 승격하지 않는다.
- `useSecondaryCandidateActions.ts`의 all-company guard: 전체 scope에서 picker와 mutation 진입을 모두 막고 있으나 2차 드로워 저장/후보군 생성/후보군 선택 UI와 결합되어 있으므로 hook 전체보다 scope guard와 failure toast 경계를 우선 후보로 둔다.

### 보류 항목

- 이 문서는 현재 코드 계약을 반영한 정합성 문서다. 문서 정합성 범위에서는 테스트/빌드를 실행하지 않았으므로 위 후보를 하드닝 완료로 잠그지 않는다.
- 후보군 탭 비활성화, 페이지 내부 제한 안내, 2차 드로워 toast 문구는 같은 정책을 표현해야 한다. 문구 또는 접근성 설명을 바꾸는 작업은 `qa-current-behavior.md`와 함께 갱신한다.
