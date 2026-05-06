# 이벤트 흐름 점검 결과

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-06 |
| 범위 | 후보군 목록, 후보군 상세 모달, 이너 후보 드로어, 2차 패널 후보군 저장 |

## Goal

사용자 이벤트를 따라가며 stale UI, 무의미한 클릭, mock/API 계약 불일치, 비동기 응답 경합을 정리한다.

## Scope

- `SnapshotConfirmPage` 후보군 목록 생성·수정·삭제·복제·업로드 후 목록 동기화
- `CandidateStashDetailModal` 이너 후보 선택·추천 적용·일괄/개별 삭제·드로어 오픈
- `ProductSummaryDrawer` 판매 인사이트 로딩
- `ProductSecondaryPanel` 후보군 선택, 오더 담기, 이너 후보 변경 저장
- `api/mock/dashboardApi` 후보군 localStorage 동작

## Principles

- 화면 이벤트가 성공하면 해당 화면의 목록 상태도 반드시 최신화한다.
- async 요청은 unmount 또는 뒤늦은 응답이 현재 상태를 덮지 않게 guard를 둔다.
- 눌러도 아무 일도 하지 않는 버튼은 비활성화한다.
- mock은 현재 프론트 계약을 검증할 수 있어야 하므로 성공한 척만 하는 스텁으로 두지 않는다.

## Plan

1. 후보군 목록 CRUD 이벤트 후 `getCandidateStashes()` 재조회.
2. mock 후보군 삭제·수정·복제를 localStorage 변경으로 구현.
3. 목록/상세/드로어/2차 패널 async 요청에 mounted 또는 request sequence guard 추가.
4. 후보군 미선택 상태의 `오더 담기` 비활성화.
5. 체크박스 키보드 조작이 행 드로어 토글로 번지지 않게 이벤트 경계 보강.
6. 관련 역할 문서와 API 스펙 문구 업데이트.

## Result

- 후보군 목록 삭제·수정·복제 후 화면 목록이 즉시 최신화된다.
- mock 후보군 CRUD가 localStorage에 실제 반영된다.
- 이너 후보 상세, 상품 드로어, 2차 패널의 늦은 async 응답이 닫힌 화면 상태를 덮지 않는다.
- 후보군 선택 전 `오더 담기`는 비활성화된다.
- 키보드로 이너 후보 체크박스를 조작해도 행 드로어가 같이 열리지 않는다.
- Vitest에 후보군 mock CRUD 회귀 테스트를 추가했다.

## Non-goals

- Vite 큰 번들 경고 해소는 이번 범위에서 제외했다. route/vendor chunk 분리로 별도 처리한다.
