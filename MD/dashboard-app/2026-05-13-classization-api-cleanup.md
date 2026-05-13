# Classization and API contract cleanup

- 작성 방법 지시: 사용자
- 작성자: Codex
- 작성일: 2026-05-13

## Goal

후보군 흐름 변경 이후, 상태와 책임이 실제로 묶이는 부분만 클래스화하고 API 계약 문서와 타입 주석이 현재 설계와 충돌하지 않는지 확인한다.

## Scope

- 후보군 발주 엑셀 다운로드 유틸의 통합 문서 생성 책임 정리.
- 후보군 리스트/스냅샷/API 계약의 live 계산값과 저장 스냅샷 의미 확인.
- 소스 경계 문서와 백엔드 API 스펙의 현재 구현 반영.

## Principles

- 클래스화는 전역 의존성이나 산만한 매개변수를 줄일 때만 적용한다.
- 화면/훅이 mock을 직접 보지 않고 `src/api` 계약만 보도록 유지한다.
- 이미 나뉜 경계를 줄 세우기 목적으로 합치지 않는다.
- 스냅샷 값은 저장 당시 판단 근거이고, 이너후보군 리스트 기본값은 데이터 참조 기간 기준 live 계산값이다.

## Plan

1. 클래스화 후보를 훑고 상태와 책임이 함께 묶이는지 확인한다.
2. 저위험 후보만 적용하고 테스트로 고정한다.
3. API 타입 주석과 백엔드 계약 문서를 대조한다.
4. 경계 문서를 갱신하고 전체 테스트/빌드를 실행한다.

## Result

- `candidateOrderExcelExport.ts`의 통합 문서 생성 책임을 `CandidateOrderWorkbookBuilder`로 묶었다.
- 빌더는 `exceljs` 모듈, clock, 스타일 정책을 주입받도록 해 파일명 날짜와 시트 스타일 의존성을 테스트 가능한 인스턴스 책임으로 옮겼다.
- `CandidateItemSummary` 타입 주석에서 리스트 live 계산값, 저장 스냅샷, 다운로드 DTO 의미를 분리했다.
- 백엔드 API 스펙에서 `skuGroupKey`가 현재 프론트 계약상 `SKU.code + SKU.color_code` 상품 단위에 대응함을 명시했다.

## Deferred Candidates

- `ProductSecondaryDrawer`의 발주 draft/session 책임은 상태가 많지만 UI 상호작용과 계산 흐름이 넓어 별도 작업으로 분리하는 편이 낫다.
- `useCandidateStashDetailModal`의 리스트 조회/추천/엑셀/삭제 session 분리는 가능하지만 API 흐름이 안정된 뒤 진행하는 것이 안전하다.
- mock API 저장소 클래스화는 실제 백엔드 연결 방식이 정해지면 repository adapter 형태로 정리하는 편이 낫다.

## Validation

- `npm run test:run` 통과: 19 files, 105 tests.
- `npm run build` 통과.
