# dashboard-app boundaries

Last updated: 2026-06-02

## 문서 목적

`dashboard-app`의 기능/책임 경계를 팀과 LLM이 빠르게 이해할 수 있도록 정리한 실행 규약 문서입니다.
각 문서는 실제 코드 소유권을 기준으로 작성됩니다.

## 경계 문서 색인

| 문서 | 담당 영역 | 소스 근거 | 갱신 조건 |
|---|---|---|---|
| `api-contracts.md` | API/Mock 계약 | `src/api`, `src/api/types/*`, `src/api/requests/*`, `src/api/mock/*` | API 타입 변경, mock/http 어댑터 정책 변경, 에러 분류 변경 |
| `auth-admin.md` | 인증·세션·관리자 | `src/auth`, `src/admin`, `src/App.tsx`, `src/dashboard/DashboardLayout.tsx` | 인증/권한 정책 변경, 라우트 가드 변경 |
| `analysis-pages.md` | 분석 페이지 | `src/dashboard/pages/*`, `src/dashboard/components/*`, `src/dashboard/model/*`, `src/dashboard/hooks/*` | 분석 쿼리/필터/카드/이벤트 책임 변경 |
| `candidate-stash.md` | 후보군 후보 관리 | `src/dashboard/components/candidate-stash/*` | 후보군 mutation, SSE, bulk add, 엑셀 export 경계 변경 |
| `product-drawer.md` | 상품드로워/2차 화면 | `src/dashboard/components/product-drawer/*`, `src/snapshot/*` | 드로워 책임, 스냅샷 타입/파서 변경 |
| `shared-modules.md` | 공통 모듈 | `src/components`, `src/dashboard/hooks`, `src/dashboard/model`, `src/utils` | 공용 컴포넌트/훅/모델/유틸 책임 변경 |
| `style-facades.md` | CSS 파사드 | `*.module.css`, `*style-parts/**` | 스타일 import 경로/파사드 규칙 변경 |
| `repository-runtime.md` | 런타임·빌드·배포·e2e | `.github`, `dashboard-app/package.json`, `dashboard-app/e2e` | 런타임 스크립트, workflow, e2e entry 변경 |

## 운영 규칙

- 문서는 코드 변경 전제 하에 작성되며, 실제 동작 경계가 바뀌면 즉시 갱신한다.
- 코드가 바뀌지 않았는데 문서만 갱신하지 않는 상태를 원칙으로 방치하지 않는다.
- 모호한 책임은 “불명확 경계”로 먼저 표시하고, 범위를 최소한으로 정리한 뒤 기록한다.
- 하드닝된 모듈(작은 공개 인터페이스, 명시적 부작용)을 임의로 수정하지 않는다.
