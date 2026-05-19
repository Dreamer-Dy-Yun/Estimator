# Repository / Runtime Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-19 |
| 상태 | 유지 문서 |
| 적용 범위 | 저장소 루트, 앱 루트, 라우팅, 빌드, e2e, 배포 |

## 핵심 원칙

- 저장소 공통 규칙은 루트 파일이 소유하고, 앱 내부 기능 경계는 `dashboard-app/src` 하위 문서가 소유한다.
- GitHub Pages 배포는 workflow가 hash router와 `/Estimator/` base를 주입한다.
- `dist/`, `node_modules/`, Playwright report/test-results는 소스 경계가 아니다.

## 최상위 저장소

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `.editorconfig` | 저장소 텍스트 파일의 기본 문자셋을 UTF-8로 고정한다. | 문자셋/줄바꿈 공통 규칙 변경 |
| `.github/workflows/deploy-dashboard.yml` | `dashboard-app`을 lint/encoding/unit/e2e 후 `/Estimator/` base와 `VITE_ROUTER_MODE=hash`로 빌드해 GitHub Pages에 배포한다. | CI gate, Node 버전, Pages 경로, router mode 변경 |
| `AGENTS.md` | 작업자 지침. Git, 문서, 검증, 프론트엔드 경계 규칙을 둔다. | 프로젝트 운영 규칙 변경 |
| `MD/` | 요구사항, API 계약, 구조 문서 보관소. | 기능/API/구조/문서 운영 기준 변경 |
| `dashboard-app/` | React/Vite 대시보드 앱. | 프론트엔드 작업 대상 |

## dashboard-app 루트

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `package.json` | 앱 스크립트와 의존성 선언. | 런타임/빌드/테스트/검사 스크립트 변경 |
| `vite.config.ts` | Vite/Vitest 설정, vendor chunk 분리, 단위 테스트 범위. | 빌드 옵션, chunk 경계, 테스트 include/exclude 변경 |
| `playwright.config.ts` | e2e 실행 설정. 로컬 Vite dev server와 Chromium 시나리오를 관리한다. | e2e 서버 포트, 브라우저, retry/report/trace 변경 |
| `tsconfig*.json` | TypeScript 컴파일 경계. 현재 `strict: true`를 기준선으로 둔다. | TS 대상, strictness, include 경계 변경 |
| `eslint.config.js` | 린트 규칙. 전체 `npm run lint` 통과가 기준선이다. | 린트 규칙이나 검사 대상 변경 |
| `scripts/check-korean-encoding.mjs` | 실제 mojibake/replacement 문자 손상 여부를 점검한다. | 한국어 문자열 점검 범위 변경 |
| `public/` | 빌드에 그대로 포함되는 정적 자산. | 직접 URL 참조 자산 변경 |

## 라우팅

| 경로 | 화면 | 소유 |
|------|------|------|
| `/login` | 로그인 | `src/auth`, `src/App.tsx` |
| `/admin` | 관리자 | `src/admin`, `RequireAdmin` |
| `/`, `/dashboard`, `/dashboard/self` | 자사 분석 | `SelfPage` |
| `/dashboard/competitor` | 경쟁사 분석 | `CompetitorPage` |
| `/dashboard/snapshot-confirm` | 오더 후보군 | `SnapshotConfirmPage` |

라우트 화면은 `src/App.tsx`에서 `React.lazy`로 분리한다. 기본은 `BrowserRouter`이고, GitHub Pages workflow에서만 `VITE_ROUTER_MODE=hash`를 사용한다.

공통 대시보드 shell은 `dashboard/DashboardLayout.tsx`가 소유한다. 상단 업무 탭, 사용자 정보/로그아웃, 관리자 탭, 입고예정일 수집 같은 전역 유틸리티 액션은 이 경계에서 배치한다.

## e2e

| 파일/폴더 | 역할 |
|------|------|
| `navigation.spec.ts` | mock 로그인 후 주요 라우트와 관리자 탭 존재 확인 |
| `self-drawer.spec.ts` | 자사 분석에서 1차 상품 드로워 열기/닫기 |
| `analysis-bulk-add.spec.ts` | 경쟁사 분석에서 상품 선택 후 후보군 담기 모달 열기 |
| `candidate-stash.spec.ts` | 후보군 상세의 조회 카드, 추천, 배지 자동 패치 smoke |
| `admin-gpt-key.spec.ts` | 관리자 GPT 키 상세 설정 모달 smoke |
| `admin-google-sheets.spec.ts` | 구글 시트 이동 액션과 상세 설정 모달 smoke |
| `helpers/app.ts` | mock 로그인 helper와 runtime error 수집 helper |

## 검증 기준

- 일반 프론트 변경: `npm run lint`, `npm run test:run`, `npm run check:encoding`, `npm run build -- --base=/Estimator/`.
- 배포 전에는 GitHub Actions의 lint, encoding, unit, e2e, build, deploy 상태를 확인한다.
