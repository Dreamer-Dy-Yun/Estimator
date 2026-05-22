# 실패 UX matrix

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-21 |
| 최종 수정일 | 2026-05-22 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app` 실패 kind, 화면별 실패 surface, stale/partial/pending/live-region 정책 |

## 목적

이 문서는 API 실패, SSE 실패, stale 데이터, 부분 성공, 접근성 live region을 화면에서 어떻게 표현할지 정리한다.
실패는 성공처럼 숨기지 않고, 기존 화면 구조 안에서 사용자에게 명확히 드러낸다.

## 핵심 원칙

- 실패 전용 카드를 끼워 넣어 기존 카드/그리드/패널 리듬을 무너뜨리지 않는다.
- 실패가 row/cell 단위이면 row/cell 상태로 표시한다.
- 실패가 목록 단위이면 기존 목록 영역의 error/empty surface로 표시한다.
- stale 데이터가 남아 있으면 데이터를 유지하되 최신화 실패 배너를 함께 표시한다.
- partial success는 전체 성공 또는 전체 실패로 뭉개지 않는다.
- SSE가 완료되었는데 pending item이 남으면 failed 또는 not-calculated 상태로 닫는다.
- mutation 실패 후 로컬 상태를 성공처럼 바꾸지 않는다.
- 접근성상 동적 결과는 `role="status"` 또는 `role="alert"`로 전달한다.

## 상태 구분

| 상태 | 기준 | UI 처리 | 금지 |
|------|------|---------|------|
| 최신 데이터 정상 | 최신 요청 성공 | 일반 표시 | 없음 |
| stale UX | 최신 요청 실패, 이전 데이터 존재 | 상단 실패 배너 + 기존 row 유지 | 실패를 빈 목록처럼 보이기 |
| 초기 로드 실패 | 이전 데이터 없음 | error empty state + 재시도 가능성 표시 | 로딩 유지 또는 빈 목록 처리 |
| 부분 성공 | 여러 mutation 중 일부 성공/일부 실패 | 성공분만 반영 + `N개 성공, M개 실패` 안내 | 전체 성공 toast |
| SSE pending 종료 | completed 후 일부 item event 미수신 | 남은 pending item을 failed/not-calculated로 종료 | 무한 spinner |
| stale async 응답 | 이전 요청 응답이 최신 요청보다 늦게 도착 | 조용히 무시 | 이전 응답으로 최신 상태 덮기 |

## ApiClientError.kind별 기본 UX

| kind | 기본 surface | 처리 원칙 |
|------|--------------|-----------|
| `auth` | 로그인 만료 안내, 로그인 화면 inline error | 401과 일반 실패를 섞지 않는다. |
| `permission` | 권한 없음 메시지, action disabled reason | 403을 빈 목록으로 바꾸지 않는다. |
| `network` | 기존 목록 error, toast, row/cell 실패 | 기존 데이터가 있으면 stale UX로 표시한다. |
| `timeout` | 재시도 가능한 error/toast | 로딩을 무한 유지하지 않는다. |
| `parse` | 계약 오류 성격의 error/toast | 성공 fallback을 만들지 않는다. |
| `stream-protocol` | SSE progress 또는 row/cell 실패 | stream을 닫고 pending row를 실패로 종료한다. |
| `not-found` | 대상 없음 error/empty state | 실제 빈 결과와 구분한다. |
| `validation` | 입력 주변 error, dialog inline error, toast | 사용자가 고칠 조건을 표시한다. |
| `conflict` | 최신 상태 재확인 안내 | 로컬 성공 상태로 고정하지 않는다. |
| `server` | 기존 panel/list error 또는 toast | 기존 데이터가 있으면 stale UX로 유지한다. |
| `client` | 요청 구성 오류 toast/error | 실패를 숨기지 않는다. |
| `unknown` | 일반 error/toast | 성공 또는 빈 값으로 대체하지 않는다. |

## 후보군 상세 UX matrix

| 흐름 | 실패/상태 | surface | 금지 |
|------|-----------|---------|------|
| 후보군 상세 item 목록 | 최신 조회 실패 + cached row 존재 | 목록 상단 alert 배너: “최신 후보 목록 갱신 실패, 아래는 이전 데이터” | row 삭제, 빈 목록 처리 |
| 후보군 상세 item 목록 | 초기 조회 실패 | 목록 영역 error empty state | 로딩 spinner 유지 |
| 추천 후보 조회 | 조회 실패 | 추천 modal 내부 alert/status row | modal 밖 새 카드 삽입 |
| 추천 후보 추가 | mutation 실패 | error toast + 기존 선택 유지 | 성공 toast, 선택 해제 |
| bulk unconfirm | 일부 성공/일부 실패 | 성공분 반영 + 실패 수 error toast + modal 성공 닫힘 방지 | `Promise.all` 전체 실패 처리만 사용 |
| order metric SSE | item event 실패 | 해당 row metric failed badge | 전체 목록 실패 처리 |
| order metric SSE | completed 후 pending 남음 | pending row를 failed/not-calculated로 종료 | 무한 spinner |
| 상세확정 SSE | item별 실패 | progress/toast + item 상태 유지 | 성공처럼 확정 상태 변경 |

## 업로드/추천 live region

| 영역 | 상태 | 접근성 처리 |
|------|------|-------------|
| 후보군 Excel 업로드 | 파일 선택/업로드 중/성공 | `role="status"`, `aria-live="polite"` |
| 후보군 Excel 업로드 | 실패 | `role="alert"`, `aria-live="assertive"` |
| 추천 후보 modal | 로딩/빈 상태/선택 수 변경 | `role="status"` |
| 추천 후보 modal | 조회 실패 | `role="alert"` |
| picker modal | 열림/선택 상태 | `aria-labelledby`, `aria-describedby`, `aria-pressed` |

## 허용 fallback

| fallback | 허용 조건 |
|----------|-----------|
| stale 데이터 유지 | 최신 요청 실패를 명확히 표시하고 이전 데이터임을 안내할 때 |
| row/cell 실패 badge | 실패 범위가 특정 row 또는 cell로 제한될 때 |
| toast | mutation, 저장, 삭제, 복제처럼 사용자 action 결과를 알릴 때 |
| dialog inline error | 같은 dialog 안에서 사용자가 재시도할 수 있을 때 |
| action disabled | 권한, 필수값 누락, 선행 계산 미완료처럼 클릭 전 실패 조건이 명확할 때 |

## 금지 fallback

| fallback | 금지 사유 |
|----------|-----------|
| 실패를 빈 배열로 대체 | 실제 빈 결과와 실패를 구분할 수 없다. |
| `catch(() => undefined)` | 실패가 계산/상태 흐름에서 사라진다. |
| 임의 숫자 `0`, `1`, 최소값 대체 | 백엔드 계약 누락 또는 계산 실패를 숨긴다. |
| 부분 성공을 전체 성공처럼 표시 | 실패 item을 놓치고 사용자 판단을 왜곡한다. |
| SSE pending 무한 유지 | 사용자가 작업 종료 여부를 알 수 없다. |
| 권한 실패를 일반 오류로 표시 | 401/403의 사용자 행동과 보안 의미가 다르다. |

## 문서 갱신 규칙

- 실패 surface가 바뀌면 이 문서를 갱신한다.
- QA 상태 계약이 바뀌면 [qa-state-contracts.md](./qa-state-contracts.md)를 함께 확인한다.
- 화면별 현재 동작이 바뀌면 [qa-current-behavior.md](./qa-current-behavior.md)를 함께 확인한다.
- 하드닝 완료 모듈의 공개 계약이 바뀌면 [module-hardening.md](./module-hardening.md)에 수정 허용 범위를 기록한다.

## TODO-076 failure UX policy additions

### ApiFailureKind naming

- The normalized authentication failure kind is `auth`.
- UX copy may say login/session/authentication in Korean, but code/document contract literals must not use `authentication`.
- 401 maps to `auth`; 403 maps to `permission`.

### Mutation success followed by refresh failure

| Situation | UX policy | Forbidden handling |
|---|---|---|
| Mutation response succeeds, follow-up refresh fails | Keep committed mutation result or previous stable snapshot visible; show refresh failure/stale warning separately | Showing the mutation as failed, rolling back without evidence, or replacing data with an empty list |
| Mutation response fails | Keep local state unchanged unless an explicit optimistic rollback is already tracked; show mutation failure | Marking local state as successfully changed |

### Partial success and pending terminal states

| Situation | UX policy | Forbidden handling |
|---|---|---|
| Bulk action partially succeeds | Apply successful rows, identify failed rows/count, and surface `N success, M failed` style feedback | Full-success toast or full-failure collapse |
| SSE completes with pending items | Mark remaining pending rows as failed/not-calculated and close loading state | Infinite spinner or treating unresolved rows as successful |
| SSE item failure event | Mark only the affected row/cell failed when possible | Failing the whole list without item-level evidence |

### Company scope required UX implication

- Candidate side-effect flows and order metric SSE require a single selected company.
- If the user is in all-company scope, actions that need candidate/job/SSE/order metric mutation scope should be disabled or blocked before the request when possible.
- If a request still reaches the backend without `companyUuid`, show validation feedback instead of generic server failure.