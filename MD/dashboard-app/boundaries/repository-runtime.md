# Repository / Runtime Boundary

Last updated: 2026-06-02

## Scope

- 런타임/배포/e2e에 걸친 실행 경계를 정리한다.
- `dashboard-app/src` 구조를 기준으로 라우팅, 빌드, 테스트, 배포 근거 문서화가 목적이다.

## Core files

| 파일 | 역할 |
|---|---|
| `.github/workflows/deploy-dashboard.yml` | GitHub Pages 배포 워크플로우, 배포 게이트(`verify:deploy`) |
| `dashboard-app/package.json` | scripts, test/build/lint 명령, 배포 검증 훅 |
| `dashboard-app/vite.config.ts` | Vite 설정, 빌드/플러그인 설정 |
| `dashboard-app/playwright.config.ts` | e2e 실행 환경 정의 |
| `dashboard-app/tsconfig*.json` | TypeScript compile 설정 |
| `dashboard-app/eslint.config.js` | 린트 규칙 |
| `dashboard-app/scripts/verify-dashboard-deploy.mjs` | 배포 검증 스크립트 |
| `dashboard-app/scripts/check-korean-encoding.mjs` | 한글 인코딩 검사 |
| `dashboard-app/public/*` | 정적 에셋 |

## 라우팅/엔트리

현재 라우트 진입점은 `dashboard-app/src/App.tsx`.

- `/login`
- `/dashboard/self`
- `/dashboard/competitor`
- `/dashboard/snapshot-confirm`
- `/admin`
- 미정의 경로 fallback

`VITE_ROUTER_MODE=hash` 환경에서 GitHub Pages 경로 이슈를 피하기 위해 hash 라우팅 모드가 배포 환경에서 사용된다.

## e2e boundary

| Spec | 목적 |
|---|---|
| `dashboard-app/e2e/admin-google-sheets.spec.ts` | 관리자 Google Sheet 화면 흐름 |
| `dashboard-app/e2e/admin-gpt-key.spec.ts` | 관리자 GPT 키 화면 흐름 |
| `dashboard-app/e2e/analysis-bulk-add.spec.ts` | 분석 페이지 bulk add 동작 |
| `dashboard-app/e2e/candidate-stash-keyboard.spec.ts` | 후보군 키보드 접근성/상호작용 |
| `dashboard-app/e2e/candidate-stash.spec.ts` | 후보군 생성/조회/확인 주요 시나리오 |
| `dashboard-app/e2e/inventory-arrival-collect.spec.ts` | 재고 도착/수집 동작 검증 |
| `dashboard-app/e2e/navigation.spec.ts` | 인증/탐색 경로 및 리다이렉트 |
| `dashboard-app/e2e/self-drawer.spec.ts` | Self 페이지 드로워 동작 |
| `dashboard-app/e2e/helpers/app.ts` | e2e 앱 부트스트랩 공통 |

## Validation notes

- 기본 검증 명령: `npm run test:run`, `npm run build`, `npm run lint`, `npm run check:encoding`
- 배포 검증: `npm run verify:deploy` + workflow `deploy-dashboard.yml`
- 정적 리포트 폴더(`playwright-report`, `test-results`)는 실행시 생성되는 산출물로 관리
