# 2026-05-13 lint/boundary cleanup

## Goal

리뷰에서 지적된 운영 전환 전 품질 이슈 중 백엔드 HTTP adapter 전환을 제외하고, 지금 프론트에서 바로 정리 가능한 린트, 타입 엄격도, 큰 파일 경계, 테스트 보강을 처리한다.

## Scope

- `npm run lint` 기존 실패 20건과 warning 1건 제거
- React Hooks lint 규칙에 맞게 effect 기반 상태 보정 제거
- 안전하게 분리 가능한 대형 파일 경계 추출
- `strict` 타입 체크 가능 여부 확인 후 적용
- DOM 기반 UI 테스트와 산점도 격자화 테스트 보강
- 관련 경계/API 문서 갱신

## Principles

- 규칙을 끄지 않고 상태 구조를 바꿔 해결한다.
- mock 파일은 화면/훅에서 직접 import하지 않는다.
- 필터·격자 변경으로 생기는 선택 유효성은 effect로 상태를 삭제하지 않고 현재 화면 기준 값으로 파생한다.
- 백엔드가 소유해야 할 계산 경계는 mock 구현 안에서도 독립 파일로 둔다.
- strict는 오류 규모를 먼저 확인하고, 통과 가능할 때만 설정에 반영한다.

## Plan

1. 린트 실패를 유형별로 나눈다.
2. fast-refresh 경계를 위해 toast hook/context를 component 파일 밖으로 분리한다.
3. `set-state-in-effect` 오류는 state reset 대신 파생 상태, keyed state, request-keyed async state로 바꾼다.
4. 자사/경쟁 분석의 선택/격자 상태를 공통 hook으로 분리한다.
5. 산점도 mock 격자화 계산을 `api/mock/scatterGrid.ts`로 분리한다.
6. `tsc --strict --noEmit`으로 오류 규모를 확인한 뒤 설정에 `strict: true`를 반영한다.
7. 공통 필터 콤보 DOM 테스트와 산점도 격자화 순수 함수 테스트를 추가한다.
8. `source-boundary-map.md`와 backend API spec을 갱신한다.
9. lint/test/build와 UI smoke를 돌린다.

## Result

- 전체 `npm run lint` 통과 상태로 정리했다.
- `AppToastContext.ts`를 추가해 hook/context export와 provider component fast-refresh 경계를 분리했다.
- `FilterListCombo`, 후보군 상세 모달, 상품 drawer, 1차 판매/월간 추이 컨테이너, 2차 일간 추이 카드, 자사/경쟁 분석 페이지의 Hooks lint 오류를 상태 파생 방식으로 수정했다.
- `useAnalysisVisibleSelection.ts`를 추가해 자사/경쟁 분석의 격자 셀 선택, 현재 화면 기준 drawer 선택, 후보군 일괄 담기 선택 상태를 공통화했다.
- `api/mock/scatterGrid.ts`를 추가해 산점도 mock 격자화 계산을 `dashboardApi.ts`에서 분리했다.
- `tsconfig.app.json`, `tsconfig.node.json`에 `strict: true`를 켰다. 적용 전 strict check는 앱/노드 모두 0건이었다.
- `FilterListCombo.test.tsx`를 추가해 기본/전체 상태에서 option panel이 열리는 DOM 흐름과 disabled 상태를 검증한다.
- `scatterGrid.test.ts`를 추가해 cell quantization, `maxSkuIdsPerCell`, 빈 응답 meta를 검증한다.

## Non-goals

- 실제 HTTP adapter 전환은 백엔드 엔드포인트가 아직 없으므로 이번 범위에서 제외한다.
- 대형 컴포넌트 전면 분해는 기능 회귀 위험이 커서, 이번에는 반복 상태/계산 경계처럼 책임이 명확한 부분부터 분리했다.
- CI lint gate 추가는 이번 변경의 검증 후 별도 운영 결정으로 둔다.
