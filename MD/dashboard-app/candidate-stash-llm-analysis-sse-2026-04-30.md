# 후보군 상세 LLM 분석 SSE 연동 노트

## Goal

이너 오더 후보군 상세 모달이 열리면 백엔드에 후보 아이템 스냅샷 LLM 분석을 요청하고, 백엔드가 보내는 진행 이벤트를 화면에 표시한다.

## Scope

- `DashboardApi`에 분석 시작 API와 SSE 구독 계약 추가
- mock API에서 SSE 유사 진행 이벤트 시뮬레이션
- 후보군 상세 모달 상단에 분석 진행 상태 표시
- 백엔드 API 스펙 문서 갱신

## Principles

- 화면은 mock을 직접 import하지 않고 `src/api` 계약만 호출한다.
- 분석 대상 스냅샷 조회와 LLM 호출은 백엔드 책임으로 둔다.
- SSE 연결은 후보군 상세 모달이 열려 있는 동안만 유지한다.
- 모달 닫힘/언마운트 또는 terminal 이벤트(`completed`, `failed`) 수신 시 SSE 구독을 닫는다.
- SSE 연결 종료는 백엔드 작업 취소를 의미하지 않는다.
- 진행 상태는 stale 응답 방지를 위해 모달 인스턴스별 요청 시퀀스로 보호한다.

## Plan

1. `startCandidateStashAnalysis(stashUuid)`로 백엔드 작업을 시작한다.
2. 시작 응답의 `jobId`로 `subscribeCandidateStashAnalysis(jobId, handlers)`를 호출한다.
3. `queued`, `running`, `completed`, `failed` 이벤트를 모달 진행 카드에 반영한다.
4. 모달 언마운트 또는 `completed`/`failed` 이벤트 수신 시 SSE 구독을 닫는다.

## Result

- 후보군 상세 모달 진입 시 LLM 분석 진행 카드가 표시된다.
- mock은 후보군 아이템 수만큼 진행 이벤트를 순차 발행한다.
- terminal 이벤트 수신 후 프론트 SSE 구독이 닫힌다.
- 실제 백엔드는 `MD/backend-api/backend-api-spec.md`의 SSE 계약을 구현하면 된다.

## Non-goals

- 실제 LLM 결과 저장/조회 필드 정의
- SSE 작업 취소 API
- 실 HTTP 클라이언트 구현
