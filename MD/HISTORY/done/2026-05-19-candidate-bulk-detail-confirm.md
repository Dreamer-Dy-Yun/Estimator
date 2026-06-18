# Candidate Bulk Detail Confirmation

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 상태 | 완료 |

## Goal

이너 후보군의 `상세 일괄확정` 버튼을 실제 동작으로 연결한다.

## Scope

- 선택된 상세미확정 후보 아이템만 대상으로 한다.
- 백엔드는 각 후보 아이템의 2차 드로워 계산과 스냅샷 저장을 job으로 수행한다.
- 프론트는 SSE 진행 이벤트를 받아 진행 팝업을 표시하고, 완료된 item은 전체 목록 재조회 없이 로컬 상태를 상세확정으로 패치한다.

## Principles

- 추천/조회/오더 지표 SSE와 별도 책임이다.
- 전체 후보 아이템 목록을 재조회하지 않는다.
- PATCH 단건 확정과 같은 `CandidateItemDetail` 응답 shape를 SSE item 이벤트에 포함한다.
- backend cache가 있어도 SSE item 이벤트는 commit 이후 최신 상태여야 한다.

## Plan

1. `src/api/types/candidate.ts`에 bulk detail confirmation job 타입을 추가한다.
2. `DashboardApi`, `client.ts`, `index.ts`, HTTP/mock request adapter를 갱신한다.
3. mock SSE job은 선택 item별로 mock 2차 스냅샷을 생성해 `confirmedOrderSnapshot`에 저장하고 `CandidateItemDetail`을 event에 담는다.
4. 후보군 상세 모달은 선택된 상세미확정 item만 job에 보내고 진행 팝업을 표시한다.
5. SSE item 이벤트마다 `hasConfirmedOrderSnapshot`, `dbUpdatedAt`, drawer snapshot cache를 로컬 반영한다.
6. API 문서와 source boundary map을 갱신한다.

## Non-goals

- 추천 후보 계산 재구성.
- 총 오더 수량/금액 SSE 계약 변경.
- 후보 아이템 전체 재조회.

## Result

- `CandidateDetailBulkConfirmStartPayload`와 SSE progress event 계약을 추가했다.
- HTTP adapter는 `POST /candidate-stashes/:stashUuid/items/detail-confirmation-jobs`와 `SSE /candidate-item-detail-confirmation-jobs/:jobId/events`로 연결한다.
- mock adapter는 item별 mock 스냅샷을 저장하고 최신 `CandidateItemDetail`을 SSE event로 내려준다.
- 후보군 상세 UI는 선택된 상세미확정 row만 일괄확정 대상으로 삼고, 진행 팝업을 표시한다.
- item 완료 event마다 전체 목록 재조회 없이 로컬 리스트와 drawer snapshot cache를 상세확정으로 갱신한다.
- 백엔드 API 문서에 `updatedItem.confirmedOrderSnapshot`가 `OrderSnapshotDocument` / `OrderSnapshotDocumentV2` 스키마를 따라야 한다는 점을 명시했다.
