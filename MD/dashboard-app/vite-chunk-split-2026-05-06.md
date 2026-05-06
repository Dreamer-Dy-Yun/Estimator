# Vite chunk split 정리

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-06 |
| 범위 | `dashboard-app` 라우팅, Vite/Rolldown 빌드 설정 |

## Goal

Vite 프로덕션 빌드에서 단일 JS chunk가 500KB 기준을 넘는 경고를 제거한다. 실패를 숨기기 위해 경고 기준을 올리지 않고, 실제 초기 로드 번들을 route/vendor 단위로 분리한다.

## Scope

- `src/App.tsx` 라우트 페이지 import 방식
- `src/App.tsx` 배포 환경별 router 선택
- `vite.config.ts` Rolldown `codeSplitting.groups`
- `.github/workflows/deploy-dashboard.yml` SPA fallback
- 프론트엔드 개요와 소스 경계 문서

## Principles

- 라우트 화면은 lazy import로 분리한다.
- vendor는 React, router, charts, math, 기타 vendor group으로 나눈다.
- Recharts 같은 내부 모듈 순서 의존 라이브러리는 `maxSize`로 강제 세분화하지 않는다.
- 일반 배포는 `BrowserRouter`를 기본값으로 둔다.
- GitHub Pages의 `/Estimator/` base path는 Vite build base로 맞추고, workflow에서만 `VITE_ROUTER_MODE=hash`로 `HashRouter`를 켠다.
- Vite의 `chunkSizeWarningLimit`를 올리는 방식은 이번 변경의 목표가 아니다.
- build 설정 변경은 `source-boundary-map.md`에 같이 기록한다.

## Plan

1. `SelfPage`, `CompetitorPage`, `SnapshotConfirmPage`를 `React.lazy`로 동적 import한다.
2. `App.tsx`가 기본 `BrowserRouter`, `VITE_ROUTER_MODE=hash`일 때 `HashRouter`를 선택하도록 만든다.
3. Rolldown `codeSplitting.groups`로 `vendor-react`, `vendor-router`, `vendor-charts`, `vendor-math`, `vendor` chunk를 분리한다.
4. workflow가 `dist/index.html`을 `dist/404.html`로 복사해 SPA deep link fallback을 제공한다.
5. `npm run test:run`과 `npm run build -- --base=/Estimator/`로 회귀와 번들 경고를 확인한다.
6. GitHub Pages 배포 워크플로까지 확인한다.

## Result

- `npm run test:run`: 15 files, 83 tests passed.
- `npm run build -- --base=/Estimator/`: 성공.
- Vite 500KB chunk 경고: 사라짐.
- 가장 큰 JS chunk는 `vendor-charts` 약 363KB, `vendor-math` 약 262KB, `vendor-react` 약 190KB 수준으로 낮아졌다.
- 초안의 `vendor-charts maxSize` 분리는 Recharts 런타임 오류(`allowDataOverflow`)를 유발해 제거했다.
- 초안의 전역 `HashRouter` 방식은 GitHub Pages에는 맞지만 일반 배포 URL을 해치므로, workflow 환경 변수로 Pages 배포에서만 켜도록 바꿨다.

## Non-goals

- 라이브러리 교체, Recharts/KaTeX 제거, 앱 구조 재설계는 하지 않았다.
- GitHub Pages 배포 방식은 바꾸지 않았다.
