# 프로젝트 정리 2026-05-07

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-07 |
| 상태 | 반영 완료 |

## Goal

작업트리에 남아 있던 후보군 계약 변경을 끝까지 연결해 프로젝트를 다시 빌드 가능한 상태로 정리한다.

## Scope

- `CandidateStashSummary`와 `CandidateStashRecord`의 기간/포캐스트 계약 완성
- 후보군 생성 payload에 `periodStart`, `periodEnd`, `forecastMonths` 연결
- mock seed와 기존 localStorage 후보군 record 보강
- mock API 응답 중복을 요약 변환 함수로 정리
- API 계약 문서와 source boundary 문서 갱신

## Principles

- 후보군 묶음은 생성 당시의 분석 조건을 자체 메타로 가진다.
- 후보 아이템의 실제 저장 스냅샷은 계속 `details` JSON이 단일 원천이다.
- 예전 mock 저장값은 삭제하지 않고 기본 기간/포캐스트 값으로 보강한다.
- UI 컴포넌트는 mock 파일을 직접 import하지 않고 `dashboardApi` 계약만 호출한다.

## Plan

1. mock record와 seed 데이터에 후보군 기간/포캐스트 필드를 채운다.
2. localStorage read 경계에서 예전 record를 보강한다.
3. 후보군 생성 호출부에서 현재 드로어의 기간/포캐스트 값을 payload에 포함한다.
4. mock API 응답과 테스트를 새 계약에 맞춘다.
5. 문서, 테스트, 빌드를 함께 확인한다.

## Result

후보군 생성과 조회 계약이 `periodStart`, `periodEnd`, `forecastMonths`를 일관되게 포함한다. 기존 목업 저장값은 `2025-01-01`부터 `2025-12-31`, `forecastMonths: 8` 기본값으로 보강된다. `npm run test:run`과 `npm run build` 기준 프로젝트가 다시 통과 가능한 상태로 정리됐다.

## Follow-Up Candidates

- 후보군 목록 UI에서 기간/포캐스트 메타 노출 여부 결정
- 엑셀 업로드 API의 기간/포캐스트 입력 경로 확정
