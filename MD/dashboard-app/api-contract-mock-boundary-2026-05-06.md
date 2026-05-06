# API Contract / Mock Boundary Refactor

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-06 |
| 범위 | `dashboard-app/src/api/types`, `dashboard-app/src/api/mock` |

## Goal

후보군 목업 구현이 실제 API 계약과 섞여 보이지 않게 경계를 분리한다. 실제 백엔드로 교체할 때는 `DashboardApi` 계약과 `client.ts` 구현만 맞추고, localStorage/seed/보강 로직은 mock 내부에 남아야 한다.

## Scope

- 후보군 API 계약 타입을 `api/types/candidate.ts`로 분리한다.
- 저장 스냅샷 payload 타입을 `api/types/snapshot.ts`로 분리한다.
- `api/types/secondary.ts`는 2차 상세/일별 트렌드/재고 발주 계산 계약만 소유한다.
- 후보군 mock localStorage 접근을 `api/mock/candidateStorage.ts`로 분리한다.

## Principles

- UI와 훅은 `api/mock/*`를 직접 import하지 않는다.
- mock record 타입은 `api/mock/records.ts` 안쪽 구현 세부사항으로 둔다.
- public API 응답/요청 타입은 `api/types/*`에만 둔다.
- mock 구현은 public API 타입을 맞춰 반환하지만, localStorage 구조를 public 계약으로 취급하지 않는다.

## Result

- `CandidateStashSummary`, `CandidateItemSummary`, 후보군 분석/SSE 타입은 `candidate.ts`로 이동했다.
- `SecondaryOrderSnapshotPayload`는 `snapshot.ts`로 이동했다.
- `secondary.ts`에서 후보군 타입을 제거해 2차 패널 API 계약만 남겼다.
- `dashboardApi.ts`의 후보군 CRUD/업로드/분석 흐름은 `candidateStorage.ts`를 통해 localStorage에 접근한다.

## Non-goals

- 실제 HTTP 클라이언트 구현은 추가하지 않았다.
- 후보군 API 응답 필드 자체는 변경하지 않았다.
- 목업 데이터 내용과 화면 동작은 변경하지 않았다.
