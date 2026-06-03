# Dashboard App Cleanup - 2026-06-03

## Goal

현재 코드 기준으로 scatter chart 마우스 클릭성 개선과 async stale 안전성 보강 내용을 정리한다.

## Scope

- `dashboard-app/src/utils/scatterGridDisplay.ts`
- `dashboard-app/src/api/mock/scatterGrid.ts`
- `dashboard-app/src/utils/scatterGridDisplay.test.ts`
- `dashboard-app/src/admin/AdminGoogleSheetsPanel.tsx`
- `dashboard-app/src/components/ApiUnitErrorBadge.tsx`

## Principles

- Scatter point 반경은 고정값이 아니라 backend/mock이 반환한 `meta.xAxis/yAxis.bucketSize`와 실제 chart 크기에 연동한다.
- Mock scatter grid의 기본 bucket은 API 계약 대체 구현으로 다루며, 실제 backend 기본 binning과 분리해서 문서화한다.
- Async reload, clipboard timeout 같은 UI side effect는 unmount 이후 state update와 오래된 응답 덮어쓰기를 막는다.

## Plan

1. Scatter point 반경을 기존 대비 약 1.5배로 키운다.
2. Mock scatter grid 기본 bucket size ratio를 높여 셀 분할을 낮춘다.
3. Google Sheet admin reload에 request sequence와 mounted guard를 적용한다.
4. API unit error copy badge timeout을 ref로 관리하고 unmount 시 정리한다.

## Result

- `scatterGridDisplay.ts`의 point radius ratio/min/max를 기존 대비 약 1.5배로 조정했다.
- `scatterGrid.ts`의 mock 기본 bucket size ratio를 `0.7`에서 `1`로 조정해 기본 셀 분할을 낮췄다.
- `AdminGoogleSheetsPanel.tsx`는 초기 load와 후속 `reloadConfigs` 모두 최신 요청만 state를 갱신하도록 sequence guard를 둔다.
- `ApiUnitErrorBadge.tsx`는 반복 클릭 시 기존 timeout을 해제하고, unmount 이후 `setCopied`가 실행되지 않게 한다.
- `scatterGridDisplay.test.ts`는 변경된 반경 산식 기대값을 반영했다.

## Non-goals

- 실제 backend scatter grid 기본 bucket 정책은 변경하지 않았다.
- Scatter chart keyboard roving tabindex 모델은 이번 범위에서 제외했다.
- Browser/mobile visual QA와 screen reader QA는 실행하지 않았다.
- `npm run check:encoding`, `npm run test:run`, `npm run build`는 이번 정리 단계에서 실행하지 않았다.

## Follow-up candidates

- Backend scatter grid 기본 binning이 mock과 다르면 backend spec/catalog에 기본값 차이를 명시한다.
- Admin row focus indicator와 scatter accessible label 품질을 별도 UI/accessibility hardening 항목으로 처리한다.
