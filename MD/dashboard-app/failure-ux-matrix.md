# 실패 UX matrix

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-21 |
| 최종 수정일 | 2026-05-21 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app` 실패 kind, 화면별 실패 surface, 허용/금지 fallback |

## 목적

이 문서는 `ApiClientError.kind`와 화면별 실패 상태가 어떤 UX surface에 표시되어야 하는지 정리한다. 코드 수정 방향은 이 문서를 기준으로 하되, 실패를 보여주기 위해 새 카드를 추가해 기존 화면을 아래로 밀지 않는다.

## 핵심 정책

- 실패 UX는 기존 화면 구조 안에서 드러낸다. 실패 전용 신규 카드를 추가해 카드, 그리드, 패널의 위치를 밀지 않는다.
- row/cell 단위 실패는 실패 배지와 툴팁을 기본 surface로 쓴다.
- 목록 조회 실패는 기존 리스트/패널/빈 상태 영역의 error surface를 쓴다.
- 권한 실패는 기존 인증/권한 surface를 쓴다. `401`과 `403`을 같은 일반 오류로 뭉개지 않는다.
- mutation 실패는 기존 toast, dialog row error, modal error surface를 쓴다. 실패했는데 성공한 것처럼 로컬 상태만 바꾸지 않는다.
- SSE 실패는 기존 progress, row/cell 상태, toast surface를 쓴다. 동일 URL 자동 재접속으로 중복 요청이 생기면 안 된다.
- stale 데이터가 남아 있으면 화면을 비우지 않고 기존 데이터를 유지한 채 실패 surface를 함께 표시한다.

## ApiClientError.kind별 기본 UX

| kind | 기본 surface | 화면 정책 |
|------|--------------|-----------|
| `auth` | 로그인 흐름, 세션 만료 안내, 로그인 화면 inline error | 보호 화면에서는 인증 흐름을 우선하고, 일반 실패 카드로 대체하지 않는다. |
| `permission` | 권한 부족 메시지, action 비활성 이유, 기존 panel error | 관리자 기능을 보이게 둔 뒤 조용히 실패시키지 않는다. |
| `network` | 기존 목록/패널 error, toast, SSE row/cell 실패 | 기존 데이터가 있으면 유지하고 연결 실패를 표시한다. |
| `timeout` | 기존 목록/패널 error, toast, SSE row/cell 실패 | 재시도 가능 실패로 표시하되 빈 결과로 바꾸지 않는다. |
| `parse` | 기존 목록/패널 error 또는 toast | 서버 응답 계약 문제로 취급하고 성공 fallback을 만들지 않는다. |
| `stream-protocol` | SSE progress error 또는 row/cell 실패 | 스트림을 닫고 현재 item 상태를 실패로 드러낸다. |
| `not-found` | 대상 없음 empty/error state | 실제 빈 결과와 구분하고, 삭제됨/없음 메시지를 표시한다. |
| `validation` | 입력 주변 error, dialog row error, toast | 사용자가 수정해야 하는 조건을 기존 입력/모달 surface에 표시한다. |
| `conflict` | toast 또는 panel error | 최신 상태 재확인 필요를 알리고 낙관 상태를 성공으로 고정하지 않는다. |
| `server` | 기존 목록/패널 error 또는 toast | 기존 데이터 유지와 재시도 안내를 우선한다. |
| `client` | 기존 목록/패널 error 또는 toast | 요청 구성 문제를 숨기지 않는다. |
| `unknown` | 기존 목록/패널 error 또는 toast | 원인 불명이어도 실패를 성공/빈 값으로 대체하지 않는다. |

## 화면별 matrix

| 화면/흐름 | 실패 종류 | 기본 surface | 금지 |
|-----------|-----------|--------------|------|
| 후보군 목록 | 목록 조회 실패 | 후보군 선택/목록 영역의 기존 empty/error surface | `setStashes([])`처럼 실패를 빈 목록으로 보이게 하기 |
| 이너 후보군 기본 리스트 | 목록 조회 실패 | 기존 이너 리스트 error surface. stale rows가 있으면 유지하고 최신화 실패 메시지 표시 | 리스트를 비우거나 새 실패 카드를 삽입해 레이아웃 밀기 |
| 추천/배지 조회 | row/cell 실패 | 배지 셀의 실패 배지와 툴팁 | 무한 로딩, 빈 배지, 조용한 무시 |
| 추천 보기 모달 | 목록/조회 실패 | 모달 내부 기존 error surface | 모달 바깥에 새 카드 추가 |
| 오더 지표 SSE | row/cell 또는 stream 실패 | 오더 지표 셀의 실패 배지와 툴팁. transport/protocol 실패는 대상 row만 실패로 표시 | EventSource 자동 재접속으로 동일 요청 반복 |
| 상세 일괄확정 SSE | item 실패, stream 실패 | 기존 progress 팝업 error, toast, item별 실패 상태 | 성공 toast 후 실제 실패 상태 유지 |
| 후보군 mutation | 삭제, 추천 추가, 상세확정 저장/해제 실패 | 기존 toast와 현재 상태 유지 | 실패 후 로컬 row 제거, 상세확정 상태 임의 변경 |
| 상세 드로워 조회 | drawer load 실패 | 기존 drawer error surface | 빈 정상 카드처럼 렌더링 |
| 엑셀 다운로드 | 생성 조건/생성 실패 | 기존 필터 영역 inline error 또는 toast | 실패 파일 생성, 조용한 `undefined` 반환 |
| 관리자 목록 | 목록 조회 실패 | `AdminListPanel`의 기존 error surface | 별도 카드 추가, 빈 목록처럼 표시 |
| 관리자 mutation | 생성/수정/삭제/연결 테스트 실패 | dialog row error 또는 toast | 성공 상태처럼 목록만 갱신 |
| 인증/로그인 | 로그인 실패, 세션 만료 | 로그인 화면 inline error 또는 보호 라우트 인증 흐름 | 일반 목록 실패로 취급 |
| 사용자 프로필 | 저장/입력 실패 | dialog inline error | 저장된 것처럼 닫기 |

## 허용 fallback

| fallback | 허용 조건 |
|----------|-----------|
| stale 데이터 유지 | 최신 요청 실패를 함께 표시하고, 사용자가 이전 데이터임을 알 수 있을 때 |
| row/cell 실패 배지 | 실패 범위가 특정 행 또는 셀로 제한될 때 |
| 툴팁의 상세 실패 메시지 | 화면 밀림 없이 원인이나 재시도 기준을 보조 설명할 때 |
| 기존 panel/list error | 목록 전체를 사용할 수 없거나 최초 조회에 실패했을 때 |
| toast | mutation, 권한, 저장, 삭제, 복제처럼 사용자 액션 결과를 알릴 때 |
| dialog/modal inline error | 사용자가 같은 modal/dialog 안에서 입력을 고치거나 재시도해야 할 때 |
| action 비활성 | 권한, 필수값 누락, 선행 계산 미완료처럼 클릭 전 실패 조건을 설명할 때 |

## 금지 fallback

| fallback | 금지 사유 |
|----------|-----------|
| 실패 전용 신규 카드 삽입 | 기존 화면을 밀어 카드/그리드/패널 리듬을 깨뜨린다. |
| 실패를 빈 배열로 대체 | 실제 빈 결과와 실패를 구분할 수 없다. |
| `catch(() => undefined)`로 삼키기 | 사용자가 실패를 알 수 없고 후속 계산이 성공처럼 진행된다. |
| 임의 숫자 `0`, `1`, 최소값 대체 | 백엔드 계약 누락이나 계산 실패를 숨긴다. |
| 권한 실패를 일반 오류로 표시 | `401`/`403`의 사용자 행동과 보안 의미가 다르다. |
| SSE 동일 URL 자동 재접속 | 중복 job 또는 중복 mutation처럼 보이는 부작용을 만든다. |
| 실패 후 낙관 상태 고정 | 실제 저장/삭제/확정 실패를 성공으로 오해하게 만든다. |

## 문서 갱신 규칙

- 실패 surface가 바뀌면 이 문서와 [qa-state-contracts.md](./qa-state-contracts.md)를 같이 갱신한다.
- 화면별 실패 흐름이 바뀌면 [qa-current-behavior.md](./qa-current-behavior.md)를 같이 갱신한다.
- 실패 정책이 하드닝 완료 모듈의 공개 계약을 바꾸면 [module-hardening.md](./module-hardening.md)에 보호/수정 경계를 먼저 기록한다.
