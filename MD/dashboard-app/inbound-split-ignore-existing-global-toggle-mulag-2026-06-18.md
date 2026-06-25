# MulAg Run: Inbound split `excludePeriodExistingOrderInbound` global toggle

Current rule note: this historical run remains useful for the schedule-level UI ownership decision, but current v4 planning semantics refine the toggle scope. Demand uses `[round n inbound date, round n+1 inbound date)`, existing-order inbound from the same interval is applied on its actual inbound date, and `excludePeriodExistingOrderInbound` excludes that same-round inbound interval.

## Goal

Align inbound split behavior so `excludePeriodExistingOrderInbound` is treated as a schedule-level option, not a per-round control, and keep split row behavior consistent with that contract from UI interaction through persistence.

## Scope

- `InboundSplitScheduleDialog`, `InboundSplitScheduleTable`, `useInboundSplitScheduleDraft`
- Inbound split table tests and draft-hook tests
- Boundaries docs that describe split contract (`source-boundary-map`, `product-drawer`, `frontend-overview`)
- Related style modules for moved checkbox location

## Principles

- 기능 경계 우선: 계산 로직/요청/표시가 서로 다른 용어를 쓰지 않게 정렬
- 제어 경계 단일화: 분할 다이얼로그에서 하나의 토글만 노출하고, 내부 rows는 적용 시 동기화
- 회귀 방지: 기존 `onExcludePeriodExistingOrderInboundChange` path를 제거하고 테스트에서 인터페이스 정합성 확보
- 설명 가능성: boundary 문서에 계약 변경을 즉시 반영

## Plan

1. 현행 영향도 파악
   - row-level checkbox props 제거 필요 위치 식별
   - draft state에 global toggle 상태/핸들러 추가 지점 확인
   - 테이블/다이얼로그 호출부 인터페이스 정합성 검토
2. 수정 대상 식별
   - `InboundSplitScheduleTable.tsx`: 행 단위 토글 props/체크박스 제거
   - `useInboundSplitScheduleDraft.ts`: global toggle state와 all-row sync helper 검증
   - 다이얼로그 테스트/훅 테스트 업데이트
   - 행별 체크박스 전용 스타일 정리 및 다이얼로그 토글 스타일 추가
   - boundary docs 문구 수정(전역 토글 적용 기준)
3. 코드 수정 수행
   - 인터페이스 및 props 정리
   - 테스트 시그니처 반영
   - 스타일 마이그레이션
   - 문서 동기화
4. 마감 점검
   - 변경 파일 목록 점검
   - 타입/테스트 컴파일 관점에서 인터페이스 누락 여부 확인

## Result

- row-level `excludePeriodExistingOrderInbound` 핸들러가 테이블에서 제거되고, 다이얼로그 상단의 단일 토글만 남았습니다.
- 다이얼로그에서 토글 변경 시 `useInboundSplitScheduleDraft`가 모든 round row에 동일 값 반영 후 재계산 경로를 통과합니다.
- 다이얼로그/훅 테스트는 global 토글 반영을 검증하도록 갱신했습니다.
- 경계 문서 3건에서 `excludePeriodExistingOrderInbound`의 소유/적용 범위를 전역 토글로 정합시켰습니다.

## Non-goals / Follow-up

- 계산 엔진 자체의 수요/공급 정책 변경은 본 런에서는 하지 않았습니다.
- row-level 기존 persist 데이터가 비정상적으로 mixed state일 때의 migration 동작은 별도 런업에서 점검할 예정입니다.
