# Candidate Stash Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-19 |
| 상태 | 유지 문서 |
| 적용 범위 | 오더 후보군, 이너 후보군, 추천, 상세확정, 오더 지표, 엑셀 |

## 책임 요약

오더 후보군은 스냅샷 전 후보 상품을 모으고, 이너 후보군 상세에서 기간 기준 조회·추천·오더 지표·상세확정을 다룬다.

후보 아이템의 상세확정 여부는 `CANDIDATE_ITEM.details` 스냅샷 존재 여부다. 상세확정 저장/해제/일괄확정/일괄해제 직후에는 후보 아이템 전체 목록을 즉시 재조회하지 않고, 성공 응답 또는 SSE 이벤트로 현재 화면 상태를 로컬 반영한다.

## 후보군 목록

| 파일 | 역할 |
|------|------|
| `SnapshotConfirmPage.tsx` | 후보군 목록 페이지 조립 |
| `CandidateStashCardList.tsx` | 후보군 카드 목록 |
| `CandidateStashEditModal.tsx` | 이름/비고 편집 |
| `CandidateUploadCard.tsx` | 엑셀 업로드, 템플릿 다운로드 |

후보군 생성/삭제/복제/편집 이벤트는 API 호출 후 후보군 목록을 재조회한다. mock은 브라우저 저장소에 후보군을 만들거나 지우지 않는다.

## 이너 후보군 조회

| 파일 | 역할 |
|------|------|
| `CandidateStashDetailModal.tsx` | 상세 모달 shell과 하위 hook 조립 |
| `useCandidateStashDetailModal.ts` | 상세 모달 모델 조립 hook |
| `useCandidateDataReferencePeriod.ts` | 조회 데이터 기간 draft/apply, 첫 조회 실행 |
| `useCandidateRecommendations.ts` | 추천 조회, 배지 병합, 추천 UI용 중복 제외 |
| `useCandidateOrderMetricStream.ts` | 총 오더 수량/금액 SSE 구독과 row 반영 |

조회 데이터 기간은 `dataReferencePeriodStart`/`dataReferencePeriodEnd`로 API에 전달한다. 사용자가 `조회` 버튼을 누르면 적용 기간을 바꿔 `getCandidateItemsByStash`를 호출한다. 후보군 상세 모달 최초 진입도 같은 조회 파이프라인을 한 번 실행한다. 마지막 조회 이후 입력 기간이 바뀌지 않았으면 `조회` 버튼은 비활성화한다.

## 추천과 배지

- `getCandidateItemsByStash`는 후보군에 실제로 담긴 기본 행만 빠르게 반환한다.
- 전체 SKU 분포 기반 배지와 추천 후보는 `getCandidateRecommendations`가 배지 있는 `recommendations` 목록 하나로 반환한다.
- 프론트는 기본 후보 행이 들어온 직후 추천 API를 `nextCursor` 끝까지 자동 page 조회한다.
- 추천 row의 `skuUuid`가 현재 후보군 row와 일치하면 기존 행 배지로 병합한다.
- 추천 UI에서는 이미 후보군에 있는 row를 숨긴다.
- `추천 보기` 버튼은 배지 계산 시작 버튼이 아니라 이미 받은 추천 목록을 여는 버튼이다.

## 오더 지표 SSE

총 오더 수량, 총 오더 금액, 엑셀용 `orderExport`는 `subscribeCandidateOrderMetrics` SSE 이벤트로 행별 갱신한다. 목록 조회 hook은 stream lifecycle을 직접 알지 않는다.

## 상세확정

| 파일 | 역할 |
|------|------|
| `useCandidateDetailConfirmationMutations.ts` | 상세확정 저장/해제 성공 후 리스트와 열린 drawer 상태 로컬 반영 |
| `useCandidateBulkDetailConfirm.ts` | 상세 일괄확정 job 시작, SSE 구독, 진행 팝업 상태 |
| `useCandidateStashItemActions.ts` | 삭제, 일괄삭제, 상세확정 일괄해제, 엑셀 다운로드 액션 |
| `CandidateBulkDetailConfirmProgress.tsx` | 상세 일괄확정 진행 팝업 UI |
| `candidateDetailConfirmationOverrideModel.ts` | stale 재조회가 로컬 확정 상태를 덮지 않게 보호 |
| `candidateItemLocalMutationModel.ts` | 삭제 성공 후 현재 리스트에서 row 제거 |

상세확정 저장/해제 API 성공 응답과 상세 일괄확정 SSE `updatedItem`은 현재 화면의 기준 상태다. 서버 응답의 `dbUpdatedAt`이 바뀌고 원하는 확정 상태가 내려오면 override는 해제된다.

삭제와 일괄삭제는 삭제 API 성공 후 현재 `items`에서 삭제된 후보 아이템 uuid만 제거한다. 삭제는 남은 row의 판매/오더 계산값을 바꾸지 않으므로 전체 재조회 없이 합계 파생값이 자동 재계산된다.

## 리스트 UI

| 파일 | 역할 |
|------|------|
| `InnerCandidateOrderList.tsx` | 이너 후보 리스트 UI, 표시 순서 인덱스, 정렬 헤더, 상태 컬럼, 오더 지표 셀, 선택 체크박스, badge 렌더링 |
| `CandidateInsightBadges.tsx` | badge, 로딩, 실패 상태 렌더링 |
| `useInnerCandidateTable.ts` | 필터 옵션, 검색어, 정렬 상태, row 생성, 합계 계산 |
| `useVisibleUuidSelection.ts` | 보이는 UUID 목록 기준 선택 상태 |
| `useInnerCandidateOrderKeyboardFocus.ts` | 이너 후보 리스트 키보드 포커스 |

리스트 첫 칸의 인덱스는 현재 정렬된 화면 순서에서 1부터 다시 계산한다. 레코드 값이 아니다.

## 이너 후보군 드로워

이너 후보군에서는 좌 키로 1차 드로워를 열고, 열린 1차 안에서 좌 키로 2차를 연다. ESC는 2차부터 닫고 한 번 더 누르면 1차를 닫는다.

2차 드로워는 저장 스냅샷을 편집 가능한 초기값으로 사용하고, 이후 계산은 현재 입력값 기준으로 수행한다. 미확정 변경사항은 후보군 상세 모달이 열려 있는 동안 itemUuid별 클라이언트 메모리 draft로 유지한다.

## 엑셀

| 파일 | 역할 |
|------|------|
| `utils/candidateOrderExcelData.ts` | 이미 받은 `orderExport` DTO를 엑셀 row/view-model로 변환 |
| `utils/candidateOrderExcelWorkbook.ts` | ExcelJS workbook 생성과 스타일 정책 |
| `utils/candidateOrderExcelExport.ts` | exceljs preload와 브라우저 다운로드 연결 |

엑셀 다운로드는 백엔드를 다시 호출하지 않고 이미 받은 `CandidateItemSummary.orderExport` DTO로 생성한다. 제품에 없는 사이즈는 `N/A`, 복수 배지는 한 셀 안에서 줄바꿈한다.
