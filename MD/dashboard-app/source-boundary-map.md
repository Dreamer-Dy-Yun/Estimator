# dashboard-app Source Boundary Map

Last updated: 2026-06-05

## 0) 2026-06-05 analysis scatter/list source boundary

- 분석 리스트는 기간/회사/채널/검색 조건 기준 rows를 1회 요청한다.
- 산점도 grid는 `src/utils/scatterGridBuild.ts`에서 리스트 facet filter가 적용된 rows를 입력으로 계산한다.
- `AnalysisScatterChartCard`는 산점도 view-model만 렌더링하며 API, mock, raw list row를 직접 호출하거나 계산하지 않는다.
- 산점도 cell 선택은 리스트 필터를 수정하는 상태가 아니라 현재 필터 결과 위의 탐색 조건이다. cell 선택 중에는 리스트 필터와 리스트 전용 토글을 잠그고, 잠긴 필터 필드 자체에 현재 조건 값을 그대로 표시한다.
- 기간/조회 조건은 리스트 필터와 다른 상위 request 조건이므로 잠그지 않는다. request key가 바뀌면 기존 산점도 cell 선택을 초기화한다.
- backend scatter endpoint 계약은 남아 있지만 현재 분석 화면의 데이터 source 경로에서는 사용하지 않는다.
- 추후 대용량 전환 시 산점도는 전체 조건 기준 backend aggregate, 리스트만 pagination으로 분리한다.

## 1) 폴더 소유/책임

| 폴더 | Owner | 책임 |
|---|---|---|
| `src/api` | API 경계 | API public entry, mock/http adapter 선택, 계약 타입, 공통 에러/요청 유틸 |
| `src/auth` | 인증/세션 경계 | 로그인/세션 상태, 인증 가드, 권한 가드, 사용자 프로필 동작 |
| `src/admin` | 관리자 경계 | 관리자 페이지 UI와 상태, 사용자/GPT/Google Sheets 운영 화면 |
| `src/components` | 공통 UI 경계 | 대시보드 외부에서 공유되는 공통 컴포넌트(에러 배지, 모달, 패널 등) |
| `src/dashboard` | 대시보드 기능 루트 | 페이지/컴포넌트/모듈 조합의 상위 오케스트레이션 |
| `src/dashboard/pages` | 페이지 경계 | `SelfPage`, `CompetitorPage`, `SnapshotConfirmPage` |
| `src/dashboard/components` | 대시보드 컴포넌트 경계 | 분석/후보군/드로워 UI 조립과 상호작용 렌더링 |
| `src/dashboard/components/candidate-stash` | 후보군 경계 | 후보군 목록, bulk add, SSE 갱신, 상세 confirm/unconfirm |
| `src/dashboard/components/product-drawer` | 상품드로워 경계 | 기본 드로워 프레임, 2차 드로워 오케스트레이션, 요청 흐름 |
| `src/dashboard/components/product-drawer/secondary` | 2차 드로워 경계 | 상품 상세 2차 화면, AI 코멘트, 재고·발주 계산 |
| `src/dashboard/components/common-style-parts` | 공통 스타일 내부 경계 | `common.module.css` 전용 style-parts |
| `src/dashboard/components/product-drawer/secondary/style-parts` | 2차 스타일 내부 경계 | `secondaryDrawer.module.css` 전용 style-parts |
| `src/dashboard/pages/snapshot-confirm` | Snapshot 경계 | 후보군 스냅샷 업로드/복원 페이지 책임 |
| `src/dashboard/pages/snapshot-confirm-style-parts` | snapshot-confirm 스타일 내부 경계 | `SnapshotConfirmPage.module.css` 전용 style-parts |
| `src/dashboard/drawer` | 드로워 내부 경계 | 드로워 공통 동작/포맷 보조 모듈 |
| `src/dashboard/hooks` | 상태 경계 | 데이터 요청, 필터, 선택 상태 훅 |
| `src/dashboard/model` | 모델 경계 | 계산/정렬/필터 모델 |
| `src/dashboard/interaction` | 인터랙션 경계 | 사용자 입력/이벤트 계열 상태 처리 |
| `src/snapshot` | Snapshot 경계 | 스냅샷 타입, 빌더, 파서, 검증 책임 |
| `src/styles` | 스타일 기초 경계 | 전역 스타일 토큰/루트 스타일 |
| `src/utils` | 유틸 경계 | 순수 유틸 함수 |

## 2) 경계 문서 맵

| 영역 | 문서 | 근거 소스 |
|---|---|---|
| 인증/권한/관리자 | `boundaries/auth-admin.md` | `src/auth`, `src/admin`, `src/dashboard/DashboardLayout.tsx`, `src/App.tsx` |
| API 계약 | `boundaries/api-contracts.md` | `src/api`, `src/api/types/*`, `src/api/requests/*`, `src/api/mock/*` |
| 분석 페이지 | `boundaries/analysis-pages.md` | `src/dashboard/pages/*`, `src/dashboard/components/*` |
| 후보군 | `boundaries/candidate-stash.md` | `src/dashboard/components/candidate-stash/*` |
| 상품드로워/스냅샷 | `boundaries/product-drawer.md` | `src/dashboard/components/product-drawer/*`, `src/snapshot/*` |
| 공통 모듈 | `boundaries/shared-modules.md` | `src/components`, `src/dashboard/hooks`, `src/dashboard/model`, `src/utils` |
| 스타일 파사드 | `boundaries/style-facades.md` | `*.module.css`, `*style-parts/**` |
| 런타임/빌드/deploy/e2e | `boundaries/repository-runtime.md` | `.github`, `dashboard-app/e2e`, `dashboard-app/package.json`, `dashboard-app/vite.config.ts` |
| 백엔드 카탈로그 연동 | `../backend-api/dashboard-api-contract-catalog.md` | `src/api/types/*` |

## 3) 갱신 원칙

- API 타입/계약 변경 → `source-boundary-map.md`, `boundaries/api-contracts.md`, 백엔드 카탈로그 동시 갱신
- 라우트/권한/관리자 플로우 변경 → `boundaries/auth-admin.md`, `frontend-overview.md`, `source-boundary-map.md`
- 분석 페이지/후보군/드로워 책임 변경 → 각 boundary 문서 + `frontend-overview.md`
- 스타일 파사드 규칙 변경 → `boundaries/style-facades.md` 선행 갱신
- 런타임/CI/e2e 규칙 변경 → `boundaries/repository-runtime.md`, 배포/테스트 노트 갱신
- 큰 변경은 `project-cleanup-YYYY-MM-DD.md` 형태로 결과 기록
