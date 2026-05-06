# Vite chunk split 정리

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-06 |
| 범위 | `dashboard-app` 라우팅, Vite/Rolldown 빌드 설정 |

## Goal

Vite 프로덕션 빌드에서 단일 JS chunk가 500KB 기준을 넘는 경고를 제거한다. 실패를 숨기기 위해 경고 기준을 올리지 않고, 실제 초기 로드 번들을 route/vendor 단위로 분리한다.

## Scope

- `src/App.tsx` 라우트 페이지 import 방식
- `vite.config.ts` Rolldown `codeSplitting.groups`
- 프론트엔드 개요와 소스 경계 문서

## Principles

- 라우트 화면은 lazy import로 분리한다.
- vendor는 React, router, charts, math, 기타 vendor group으로 나눈다.
- Vite의 `chunkSizeWarningLimit`를 올리는 방식은 이번 변경의 목표가 아니다.
- build 설정 변경은 `source-boundary-map.md`에 같이 기록한다.

## Plan

1. `SelfPage`, `CompetitorPage`, `SnapshotConfirmPage`를 `React.lazy`로 동적 import한다.
2. Rolldown `codeSplitting.groups`로 `vendor-react`, `vendor-router`, `vendor-charts`, `vendor-math`, `vendor` chunk를 분리한다.
3. `npm run test:run`과 `npm run build`로 회귀와 번들 경고를 확인한다.
4. GitHub Pages 배포 워크플로까지 확인한다.

## Result

- `npm run test:run`: 15 files, 83 tests passed.
- `npm run build`: 성공.
- Vite 500KB chunk 경고: 사라짐.
- 가장 큰 JS chunk는 `vendor-math` 약 259KB, `vendor-react` 약 190KB 수준으로 낮아졌다.

## Non-goals

- 라이브러리 교체, Recharts/KaTeX 제거, 앱 구조 재설계는 하지 않았다.
- GitHub Pages 배포 방식은 바꾸지 않았다.
