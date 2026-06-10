# dashboard-app

`dashboard-app`는 판매/경영 분석 화면, 상품 상세/보조 분석 드로어, 후보군(candidate stash) 관리, 관리자 설정 흐름을 제공하는 React 기반 SPA입니다. 화면은 현재 mock 기반 실행과 HTTP API 연결 경로를 모두 지원하되, 데이터 접근은 `src/api` 계층 뒤에 둡니다.

## 목적

- 분석 대시보드와 상품 상세 흐름을 하나의 프론트엔드 앱에서 제공한다.
- API 계약, mock 대체 구현, 화면 상태 처리를 분리해 백엔드 연동 전후의 책임 경계를 유지한다.
- 후보군, 스냅샷, 드로어 흐름에서 저장된 사용자 결정과 API 응답을 임의 재계산으로 덮어쓰지 않는다.
- 로컬 개발, 검증, 문서 진입점을 이 README에서 빠르게 확인할 수 있게 한다.

## 스택

| 영역 | 사용 기술 |
|------|----------|
| 앱 | React 19, TypeScript 6, Vite 8 |
| 라우팅 | React Router 7 |
| 시각화/표현 | Recharts, KaTeX, react-katex |
| 테스트 | Vitest, Playwright |
| 정적 검사 | ESLint, Korean encoding check script |

## API / mock 경계

- 화면, 훅, 컴포넌트는 API 또는 mock을 직접 호출하지 않고 `src/api/client.ts`를 통해 데이터에 접근한다.
- API 타입은 `src/api/types/*`에 두고, 실제 요청 어댑터는 `src/api/requests/*`에서 관리한다.
- mock 동작과 mock 데이터는 `src/api/mock/*` 아래에 둔다.
- mock은 단순 임시 데이터가 아니라 백엔드가 아직 없거나 로컬에서 재현해야 하는 API 계약의 대체 구현체로 취급한다.
- HTTP 연결은 API 계층에서 처리하며, 화면 계층은 mock/HTTP 전환 방식을 알 필요가 없어야 한다.
- 필수 비즈니스 데이터가 없으면 프론트에서 조용히 숫자나 성공 상태를 만들어내지 말고, API 계약 또는 오류/빈 상태로 드러낸다.

## 주요 명령

```bash
npm install
npm run dev
npm run build
npm run preview
```

| 명령 | 용도 |
|------|------|
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | TypeScript 빌드와 Vite 프로덕션 빌드 실행 |
| `npm run preview` | 빌드 결과 미리 보기 |
| `npm run lint` | ESLint 실행 |
| `npm run check:encoding` | `src`, `e2e`, `MD`, `AGENTS.md`의 한글 인코딩 이상 탐지 |
| `npm run test` | Vitest watch 모드 |
| `npm run test:run` | Vitest 배치 실행 |
| `npm run test:e2e` | Playwright E2E smoke 실행 |
| `npm run test:e2e:ui` | Playwright UI 모드 실행 |

`test:e2e`와 `test:e2e:ui`는 실행 전 Playwright transform cache 정리 스크립트를 자동으로 호출한다.

## 로컬 검증 기준

- 일반 프론트엔드 변경의 최소 완료 확인은 `npm run test:run`과 `npm run build`를 기준으로 한다.
- 인코딩, 라우팅, 주요 사용자 흐름, 배포 전 확인까지 맞추려면 `npm run lint`, `npm run check:encoding`, `npm run test:e2e`도 함께 확인한다.
- 현재 프로젝트 지침상 전체 lint 실패가 곧 신규 회귀를 뜻하지 않을 수 있으므로, lint 결과는 touched file에 새 문제가 생겼는지 구분해서 판단한다.
- UI 흐름, 모달, 드로어, 로그인/관리자 이동이 바뀌면 Playwright smoke 갱신 또는 실행 필요성을 함께 검토한다.

## CI / 배포 검증 기준

배포 gate는 `npm run verify:deploy`를 기준으로 하며 다음 순서로 실행된다.

1. `npm run lint`
2. `npm run check:encoding`
3. `npm run test:run`
4. `npm run build`

Playwright E2E는 배포 gate가 아니라 별도 `Dashboard E2E` workflow와 로컬 `npm run test:e2e`에서 다룬다. UI 흐름이 바뀌면 배포와 별도로 필요한 smoke/full/admin/candidate 범위를 정한다.

CI 또는 배포 workflow 자체를 바꾸는 작업은 해당 workflow, `MD/dashboard-app/test-strategy.md`, `MD/dashboard-app/deployment-hardening.md`를 함께 갱신해야 한다.

## 주요 문서

| 문서 | 용도 |
|------|------|
| [dashboard-app 문서 인덱스](../MD/dashboard-app/README.md) | 프론트엔드 문서 진입점 |
| [테스트 전략](../MD/dashboard-app/test-strategy.md) | Vitest, Playwright, encoding check 기준 |
| [소스 경계 지도](../MD/dashboard-app/source-boundary-map.md) | 기능별 source boundary와 책임 위치 |
| [프론트엔드 개요](../MD/dashboard-app/frontend-overview.md) | 화면, 기능, 데이터 흐름 개요 |
| [기능별 경계 문서](../MD/dashboard-app/boundaries/README.md) | API, 분석 화면, 후보군, 관리자, 공통 모듈 경계 |
| [모듈 하드닝](../MD/dashboard-app/module-hardening.md) | 하드닝 완료 모듈과 수정 제한 기준 |

기능, API 계약, 폴더/파일 책임, 모듈 경계가 바뀌면 관련 `MD/dashboard-app` 문서도 함께 갱신한다.
