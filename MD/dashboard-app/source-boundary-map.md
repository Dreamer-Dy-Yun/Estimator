# dashboard-app 소스 경계 지도

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-06 |
| 최종 수정일 | 2026-05-15 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app`, 프론트엔드 소스, 관련 배포/문서 경계 |

## 유지 규칙

이 문서는 기능 변경, API 계약 변경, 폴더 이동, 공용 컴포넌트 추가, 주요 스타일/빌드 경계 변경이 있을 때 반드시 같이 업데이트한다.

역할을 한 문장으로 설명하기 어려운 파일이나 폴더가 생기면 먼저 경계를 분리한다. 분리 없이 "여러 일을 한다"라고만 기록하지 않는다.

하드닝 완료 파일은 [module-hardening.md](./module-hardening.md)에 별도 등록한다. 등록된 파일은 명시적 사용자 허가 없이 수정하지 않고, 호출부는 문서화된 공개 계약만 보고 사용한다.

## 이번 경계 정리

2026-05-06~07에 후보군 상세 UI와 mock/API 저장 경계를 정리했다.

- 불필요한 검증 기준은 API/파일/사용자 입력처럼 신뢰 경계가 바뀌는 지점에서 한 번 검증하고, 이후 내부 컴포넌트와 훅이 이미 보장된 타입을 다시 방어하거나 임의 기본값을 만들어 비즈니스 데이터를 조용히 대체하지 않는 것이다. 로딩/오류처럼 실제 UI 상태를 구분하는 분기는 유지한다.
- `dashboard/pages`에는 라우트 페이지 파일만 남겼다.
- 후보군 상세 모달, 추천 모달, 인사이트 배지, 후보군 상세 훅은 `dashboard/components/candidate-stash`로 이동했다.
- 후보군 상세 모달 CSS는 `SnapshotConfirmPage.module.css`에서 분리해 `CandidateStashDetailModal.module.css`가 소유한다.
- 확인 모달 shell 스타일은 `ConfirmModal.module.css`가 소유하고, 각 화면 CSS는 자기 화면의 form/input 같은 전용 스타일만 담당한다.
- 2차 드로워에서 화면에 노출되지 않는 AI 프롬프트 생성 API와 배포 전 제거 대상이던 JSON 미리보기 모달을 제거했다.
- 오더 스냅샷 독립 localStorage 저장/조회/삭제 API를 제거하고, 후보 아이템 `details`를 스냅샷 저장의 단일 경로로 둔다.
- 후보군 생성/삭제/복제/편집 이벤트는 API 호출 후 목록을 재조회한다. mock은 응답 흐름만 모사하고 브라우저 저장소에 후보군/이너 후보를 만들거나 지우지 않는다.
- 후보군/관리자/드로워 저장처럼 백엔드 mutation 요청이 성공한 경우 `AppToastProvider`의 상단 자동 닫힘 toast로 완료 상태를 알린다. toast는 클릭 없이 2~3초 뒤 사라지고, 중요한 작업 영역을 가리지 않도록 화면 상단 중앙에 고정한다.
- 후보군 목록/상세/수정 계열 API는 현재 인증 세션의 `USER_ACCOUNT.uuid` 기준으로 소유자 데이터를 필터링한다. 화면은 사용자 UUID를 직접 파라미터로 보내지 않고 `src/api/requests/dashboardRequests.ts`가 request boundary에서만 세션 UUID를 읽어 mock/향후 HTTP 요청에 붙인다.
- 자사/경쟁사 분석 탭은 후보군에 상품을 담는 입구다. 분석 리스트의 체크박스와 `선택한 물품을 후보군으로` 모달은 스냅샷 없이 `stashUuid + skuGroupKeys`만 API에 전달한다. `row.id`는 화면 행 식별자이고, `skuGroupKey`는 `SKU.code + SKU.color_code` 상품 단위에 대응한다. AI 코멘트/사이즈별 확정 오더량은 이너후보군 2차 드로워에서 저장하기 전까지 미확정이다.
- 자사/경쟁사 분석 탭에서는 `ProductDrawer.secondaryEnabled={false}`로 2차 드로워를 열지 않는다. 2차 드로워 코드는 유지하되, 반원 버튼과 키보드 2차 진입은 이너후보군에서만 허용한다.
- 이너후보군 리스트 조회는 `dataReferencePeriodStart`/`dataReferencePeriodEnd`를 API에 전달한다. 백엔드는 해당 기간의 전체 상품 분포를 먼저 계산해 배지를 부여한 뒤 후보군에 담긴 상품만 반환해야 하며, 배지는 DB `CANDIDATE_ITEM.badge`와 같은 `{ name, color, tooltip }[]` 형태로 `insight.badges`에 싣는다. 요청 adapter 주석과 API 스펙에는 이 부하 지점을 기록한다.
- 이너후보군의 상세확정 여부는 후보 아이템 `details` 스냅샷 존재 여부다. 리스트 기본값은 데이터 참조기간 기준 live 계산값이고, 2차 드로워는 live/스냅샷 기준 보기 모두 통합 오더 설정, AI 코멘트, 일별 추이, 사이즈별 오더 카드를 표시한다. 스냅샷 기준 보기에서는 저장 당시의 통합 오더 설정값, AI 코멘트, 사이즈별 오더 수치와 기간을 복원하되 그래프는 그 기간으로 다시 조회한다.
- 드로워 키보드 조작은 `좌=열기`, `우=닫기`, `상/하=이전/다음`이다. 자사/경쟁사 리스트 row에서는 좌 키가 1차 드로워만 열고, 이너후보군에서는 좌 키로 1차를 열고 열린 1차 안에서 좌 키로 2차를 연다. ESC는 2차가 열려 있으면 2차부터 닫고, 한 번 더 누르면 1차를 닫는다. 상/하 이동으로 현재 상품이 바뀌면 원본 리스트의 현재 row도 포커스·스크롤·강조 상태를 함께 갱신한다. 자사/경쟁사 분석의 상/하 이동 순서는 `PaginatedTable`이 실제 렌더링에 사용한 정렬 row id 순서(`onOrderedRowIdsChange`)를 기준으로 한다.
- 후보군 상세 필터 카드에는 발주 엑셀 다운로드 액션을 둔다. 화면은 다운로드 클릭 시 백엔드를 다시 호출하지 않고, 이미 받은 `CandidateItemSummary.orderExport` DTO로 브라우저에서 XLSX를 생성한다. 주 데이터 시트는 브랜드·품번(`code`)·상품명(`productName`)·색상(`colorCode`)·배지·판매 지표·총 오더 지표 컬럼 뒤에 후보군 전체 사이즈를 동적 컬럼으로 붙이고, 제품에 없는 사이즈는 `N/A`로 표시한다. 복수 배지는 한 셀 안에서 줄바꿈한다. 메타 시트에는 오더 입고 예정일과 사용자 이름을 둔다.
- SKU 식별 메타는 DB `SKU` 테이블 설계에 맞춰 `code`, `colorCode`, `productName`을 사용한다. 실제 SKU 유일성은 `code + colorCode + size` 조합으로 보고, 분석 리스트·1차 드로어 배지·2차 메타·후보군/엑셀 계약이 같은 필드명을 쓴다.
- 라우트 페이지는 `src/App.tsx`에서 `React.lazy`로 분리한다. 기본 라우팅은 일반 배포용 `BrowserRouter`이고, GitHub Pages workflow만 `VITE_ROUTER_MODE=hash`로 `HashRouter`를 켠다.
- vendor chunk는 `vite.config.ts`의 Rolldown `codeSplitting.groups`가 소유한다. Recharts 같은 내부 순서 의존 라이브러리는 `maxSize`로 강제 세분화하지 않는다.
- 후보 아이템 목업 스냅샷은 `drawer2.llmAnswer`에 임시 AI 코멘트를 포함해 2차 드로어에서 바로 확인되게 한다.
- 이너 후보 1차 드로어 닫힘은 `drawerClosing` 상태로 DOM과 모달 폭 보정 상태를 잠시 유지해, 열림의 역방향으로 모달 폭이 복원되게 한다.
- 후보군 AI 분석 SSE가 `completed`를 받으면 후보 아이템 목록과 후보군 메타를 다시 조회해, 백엔드가 갱신한 AI 코멘트/최신 상태를 화면에 반영한다.
- 이너 후보 리스트 배지는 데스크톱에서 행 보조 라인으로 유지하고, 모바일 뷰포트에서는 행 상단으로 올려 좁은 화면에서도 먼저 보이게 한다.
- 이너 후보 리스트의 표시 순서 인덱스와 헤더 정렬 상태는 후보군 상세 모달 UI 상태다. 인덱스는 레코드 값이 아니라 현재 정렬된 화면 순서에서 1부터 다시 계산한다.
- 로그인 화면, 라우트 보호, 사용자 정보/비밀번호 변경 모달은 `src/auth`가 소유한다. 인증 API 계약과 목 세션 저장은 `src/api` 아래에 두어 실제 백엔드로 교체할 때 화면이 mock 구현을 직접 알지 않게 한다. 보호 라우트는 직접 URL 진입과 새로고침 복귀를 위해 `/login?redirect=...`를 남긴다. 목 로그인 화면은 `mock-admin` / `admin` 기본값을 미리 채워 수정 없이 로그인할 수 있게 한다.
- 관리자 화면은 `/admin` 별도 라우트와 `src/admin`이 소유한다. 화면은 같은 `DashboardLayout` 안에서 렌더하며, 관리자 권한 사용자에게만 `오더 후보군` 뒤 관리자 전용 탭을 보여준다. 인증 권한은 `admin`과 `user` 두 단계만 둔다. 사용자 관리는 관리자 화면 안의 탭/패널로 분리한다. 관리자 비밀번호 관리는 조회가 아니라 임시 비밀번호 재설정 API만 호출하고, 임시 비밀번호는 응답 직후 한 번만 표시한다.
- 관리자 GPT 키 관리는 `src/api/types/admin-gpt-key.ts` 계약과 `src/api/mock/adminGptKeyApi.ts` mock을 통해서만 접근한다. 화면은 GPT 키 원문을 생성/변경 요청에만 담고, 목록 응답은 `maskedKey`만 표시한다. 목록은 식별용 요약 정보만 노출하고, 메타/키 변경, 연결 테스트, 삭제는 행 클릭 후 열리는 모달이 소유한다. 상세 모달의 입력값은 저장 전 draft이며, 목록은 변경 API 성공 후 재조회된 값만 반영한다. 현재 mock은 DB 대체 저장소가 아니라 런타임 메모리에서 마스킹 값과 메타데이터만 보관한다.
- API 요청 교체 지점은 `src/api/requests/*`로 분리한다. 화면/훅/페이지는 mock을 알 수 없고, `src/api/client.ts`는 public export facade만 맡는다. 실제 백엔드가 생기면 `requests` 파일 안의 mock 위임을 HTTP 요청으로 바꾸는 것을 기본 원칙으로 한다.
- 2026-05-13 정리에서 전체 `npm run lint` 실패를 0건으로 만들고 `tsconfig.app.json`/`tsconfig.node.json`에 `strict: true`를 켰다. 이후 기능 변경은 린트와 strict 타입 검사를 기본 품질선으로 본다.
- 자사/경쟁사 분석의 격자 셀 선택, 현재 화면 기준 선택 유효성, 후보군 일괄 담기 체크박스 상태는 `dashboard/hooks/useAnalysisVisibleSelection.ts`가 소유한다. 페이지는 KPI/차트/목록 렌더와 API 호출 결과 연결만 맡고, 요청 생명주기와 stale 응답 차단은 `dashboard/hooks/useDashboardRequest.ts`를 사용한다. 필터·격자 변경 후 선택 상태를 effect로 억지 정리하지 않는다.
- 산점도 격자화 mock 계산은 `api/mock/scatterGrid.ts`로 분리했다. 운영에서는 백엔드가 같은 책임을 가지며, 프론트는 응답 `cells`와 `meta`로 색상·표시 반지름만 계산한다.
- 2026-05-14 정리에서 분석 페이지의 목록 컬럼 정의는 `SelfAnalysisList.tsx`/`CompetitorAnalysisList.tsx`, 산점도 tooltip 렌더는 `AnalysisScatterTooltips.tsx`로 분리했다. 페이지는 API 결과 연결, 필터/선택 상태 조립, KPI/차트/드로워 배치만 담당한다.
- 자사/경쟁사 분석 목록의 `순위` 컬럼은 화면 행 번호나 seed rank가 아니라 현재 렌더링 대상 rows의 판매량 기준 표시 순위다. 자사는 `qty`, 경쟁사는 `competitorQty` 기준이며, 판매량이 가장 많은 항목이 1위다. 산점도 셀 선택처럼 백엔드 재호출 없이 rows가 줄어드는 경우도 `displayRank.ts`가 현재 rows 안에서 다시 계산한다.
- 후보군 mock의 기간 기준 후보 요약, 배지 평가, 엑셀 다운로드 DTO 조립은 `candidateItemSummaryBuilder.ts`로 분리했다. `candidateMockApi.ts`는 후보군 소유자 필터링, mutation stub, API 응답 orchestration만 맡는다.
- 2차 드로워 재고·발주 계산 mock은 `secondaryStockOrderCalcApi.ts`로 분리했다. `dashboardApi.ts`는 DashboardApi public mock 조립과 판매/드로워 조회 흐름을 맡고, 계산 세부식은 전용 파일이 소유한다.
- 상품 drawer feature는 `dashboard/components/product-drawer`로 모았다. 루트 `ProductDrawer`는 overlay와 공유 상태만 조율하고, `ProductDrawerSecondaryPane`은 2차 패널의 로딩/오류/상세 렌더 분기를 소유한다. `primary`가 1차 드로워, `secondary`가 2차 드로워 내부 content를 소유한다.
- 경쟁 채널 상태는 1차 판매 정보와 2차 일별 추이가 공유하므로 `product-drawer/useCompetitorChannels.ts`가 소유한다. 2차 상세 조회는 `product-drawer/secondary/useSecondaryDrawerDetail.ts`가 소유한다.
- 인증 context와 `useAuth`는 `AuthContext.ts`가 소유하고, `AuthProvider.tsx`는 세션 로딩과 API 호출 orchestration만 담당한다.
- 앱 전역 mutation 완료 toast는 `src/components/AppToast.tsx`가 소유한다. 복사 완료 toast는 기존 화면별 흐름을 유지하되, 백엔드 요청 완료 알림과 UI 위치 원칙을 맞춘다.
- 요청 대기 표시는 `src/components/LoadingSpinner.tsx`가 소유한다. 페이지/모달/드로워는 자기 API 요청 상태만 판별하고, 큰 패널형 스피너 또는 버튼 내부 inline 스피너를 이 공용 컴포넌트로 렌더한다.

## 최상위 저장소

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `.editorconfig` | 저장소 텍스트 파일의 기본 문자셋을 UTF-8로 고정한다. 한국어 문자열이 편집기별 기본 인코딩 차이로 손상되는 것을 막는 최상위 경계다. | 문자셋/줄바꿈 같은 저장소 공통 편집 규칙 변경 시 수정 |
| `.github/workflows/deploy-dashboard.yml` | `dashboard-app`을 lint/test 후 `/Estimator/` base와 `VITE_ROUTER_MODE=hash`로 빌드, SPA fallback용 `404.html`을 포함해 GitHub Pages에 배포한다. | 배포 방식, Node 버전, Pages 경로, fallback/라우터 모드, CI 품질 gate가 바뀔 때 수정 |
| `AGENTS.md` | 작업자 지침. Git, 문서, 검증, 프론트엔드 경계 규칙을 둔다. | 프로젝트 운영 규칙이 바뀔 때 수정 |
| `MD/` | 요구사항, API 계약, 구조 문서 보관소. 문서 작성·보존 기준은 `MD/README.md`가 소유하고, 날짜별 작업 이력은 유지 문서에 흡수되면 삭제한다. | 기능/API/구조/문서 운영 기준 변경 시 관련 문서 갱신 |
| `dashboard-app/` | React/Vite 대시보드 앱. | 프론트엔드 작업의 주 대상 |
| `.venv/` | 로컬 Python 실행 산출물. | 소스 경계 문서 대상 아님 |

## dashboard-app 루트

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `package.json` | 앱 스크립트와 의존성 선언. 한국어 깨짐 점검은 `npm run check:encoding`이 담당한다. | 런타임/빌드/테스트/검사 스크립트 변경 시 수정 |
| `package-lock.json` | npm 의존성 잠금. | `package.json` 변경 또는 설치 결과 변경 시 수정 |
| `vite.config.ts` | Vite/Vitest 설정. 프로덕션 빌드의 vendor chunk 분리는 Rolldown `codeSplitting.groups`에서 관리하고, Vitest는 Playwright 전용 `e2e/`를 제외한다. | 빌드 옵션, 플러그인, chunk 분리 기준, 단위 테스트 포함/제외 범위 변경 시 수정 |
| `playwright.config.ts` | e2e 테스트 실행 설정. 로컬 Vite dev server를 4175 포트로 띄우고 Chromium 프로젝트에서 주요 시나리오를 실행한다. | e2e 브라우저, 서버 포트, retry/report/trace 정책 변경 시 수정 |
| `tsconfig*.json` | TypeScript 컴파일 경계. 현재 앱/노드 설정 모두 `strict: true`를 사용한다. | TS 대상, strictness, include 경계 변경 시 수정 |
| `eslint.config.js` | 린트 규칙. 현재 전체 `npm run lint`는 통과해야 하는 기준선이다. | 규칙이나 대상 변경 시 수정 |
| `index.html` | Vite HTML 진입점. | 루트 마크업/메타/앱 mount 변경 시 수정 |
| `scripts/check-korean-encoding.mjs` | `src`, `e2e`, `MD`의 UTF-8 한국어 문자열이 실제 mojibake나 replacement 문자로 손상됐는지 확인한다. 콘솔 표시 깨짐과 파일 손상을 구분하기 위한 검사 도구다. | 한국어 문자열 점검 범위, 검사 휴리스틱, 문서 위치 변경 시 수정 |
| `public/` | 빌드에 그대로 포함되는 정적 자산. | URL로 직접 참조되는 자산 추가/수정 |
| `e2e/` | Playwright 실제 브라우저 시나리오 테스트. | 로그인/라우트/모달/드로워 같은 주요 사용자 흐름 변경 시 수정 |
| `src/` | 앱 소스. 아래 경계 표를 따른다. | 기능 변경 시 관련 하위 경계 갱신 |
| `dist/` | 빌드 산출물. 소스가 아니다. | 커밋하지 않는다 |
| `node_modules/` | 설치 산출물. 소스가 아니다. | 커밋하지 않는다 |

## src 진입점

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `src/main.tsx` | React root 생성, 전역 CSS와 KaTeX CSS 로드. | 전역 provider, 전역 스타일, 앱 mount 변경 시 수정 |
| `src/App.tsx` | 배포 환경별 router 선택, 최상위 shell, 전역 toast/auth provider 연결, 대시보드/관리자 라우트 lazy import. 기본은 `BrowserRouter`, `VITE_ROUTER_MODE=hash`일 때만 `HashRouter`를 쓴다. | URL 라우팅, 주요 layout 진입점, 라우트 단위 chunk 경계, 배포 라우팅 방식 변경 시 수정 |
| `src/app.module.css` | 최상위 앱 shell 크기와 main 영역 스타일. | 앱 전체 shell 레이아웃 변경 시 수정 |
| `src/types.ts` | 아직 API 계약으로 승격되지 않은 공용 도메인 타입. | 여러 영역에서 공유되는 타입만 둔다 |

## e2e

실제 브라우저에서 주요 사용자 흐름을 확인하는 Playwright 시나리오다. 단위 테스트가 계산/모델을 검증하고, e2e는 로그인, 라우트 이동, 모달/드로워 같은 화면 조립이 함께 깨지지 않는지 본다.

| 파일/폴더 | 역할 |
|------|------|
| `main-flows.spec.ts` | 기본 mock 로그인, 자사/경쟁사/오더 후보군/관리자 탭 이동, 1차 드로워, 후보군 담기 모달, 후보군 상세, GPT 키 상세 팝업 smoke 시나리오 |
| `helpers/app.ts` | 기본 mock 로그인 helper와 브라우저 runtime error 수집/검증 helper |

## src/api

`src/api`는 데이터 접근의 유일한 진입면이다. 페이지, 컴포넌트, 훅은 mock 파일을 직접 import하지 않는다.

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `api/client.ts` | 화면에서 호출하는 API 함수와 `dashboardApi` 객체를 노출하는 public facade. mock이나 HTTP 세부 구현은 알지 않는다. | API public surface 추가/삭제 시 수정 |
| `api/requests/*` | 실제 API 요청 교체 지점. 현재는 mock API를 호출하지만, 백엔드 엔드포인트가 생기면 이 폴더 안에서 HTTP 요청으로 바꾼다. 각 파일에는 기능 범위와 백엔드 구현 주의점을 짧은 주석으로 둔다. | mock 위임을 실제 API 요청으로 교체하거나 요청 정책이 바뀔 때 수정 |
| `api/index.ts` | API public export. | 외부에서 import할 API surface 변경 시 수정 |
| `api/mock.ts` | request adapter가 사용하는 mock API 진입 파일. 화면과 훅은 import하지 않는다. | mock 구현 위치를 바꿀 때만 수정 |
| `api/dailyTrendAsOf.ts` | 일간 트렌드 as-of 계산 보조 로직. | 일간 트렌드 기준일 규칙 변경 시 수정 |
| `api/types/*` | 프론트-백엔드 계약 타입. 관리자 GPT 키 계약은 `admin-gpt-key.ts`, 인증 계약은 `auth.ts`, 후보군 계약은 `candidate.ts`, 저장 스냅샷 계약은 `snapshot.ts`, 2차 드로워 계약은 `secondary.ts`가 소유한다. | 요청/응답 구조가 바뀌면 먼저 수정 |
| `api/mock/*` | 읽기 전용 seed, mock 계산, mock 응답 구현. mutation mock은 브라우저 저장소를 DB처럼 변경하지 않는다. | 데모 데이터나 mock 동작 변경 시 수정 |
| `dashboard-app/public/templates/*` | 현재 프론트가 정적으로 제공하는 후보군 업로드 템플릿 배포 파일. 원본 초안은 루트 `TEMPLATE/`에 둔다. | 템플릿 파일을 프론트 배포물로 교체할 때 수정. 백엔드 endpoint로 이전하면 제거 |

### api/types 하위 파일

| 파일 | 역할 |
|------|------|
| `admin-gpt-key.ts` | 관리자 GPT 키 목록/추가/메타·키 변경/연결 테스트/삭제 계약. GPT만 사용하므로 공급자/Base URL/Project ID는 계약에서 제외하고, 생성/변경 요청 payload에만 `plainKey`를 허용하며 목록 응답에는 `maskedKey`만 포함한다 |
| `auth.ts` | 로그인 요청, 인증 사용자, 사용자 정보/비밀번호 변경, 관리자 유저 추가/제거/수정/비밀번호 재설정, 세션, 인증 API 계약 |
| `candidate.ts` | 후보군/이너 후보/후보군 분석 SSE 요청·응답 계약. 기간 기반 후보군 리스트 조회, DB형 배지 배열, 상세확정 여부, 스냅샷 없는 일괄 담기 payload, nullable 상세 스냅샷을 소유한다 |
| `dashboard-api.ts` | 화면에서 쓰는 `DashboardApi` 인터페이스 |
| `drawer.ts` | 1차 drawer bundle, 월간 판매 추이, 판매 인사이트 계약 |
| `index.ts` | API public type export |
| `sales.ts` | 자사/경쟁 판매 목록과 필터 계약 |
| `secondary.ts` | 2차 상세, 일별 트렌드, 재고·발주 계산 계약 |
| `snapshot.ts` | 후보 아이템 `details`에 저장되는 오더 스냅샷 payload 계약 |

### api/mock 하위 파일

| 파일 | 역할 |
|------|------|
| `adminGptKeyApi.ts` | mock 관리자 GPT 키 관리 구현. 관리자 세션만 허용하고, 키 원문은 응답/목록 상태에 남기지 않는다 |
| `authApi.ts` | mock 인증 API 구현. 로그인 입력값은 검증 없이 통과시키고, 사용자 목록은 정적 seed, 세션은 런타임 메모리에만 둔다. 관리자 비밀번호 재설정은 임시 비밀번호 1회 응답 흐름만 모사한다 |
| `candidateSeeds.ts` | 후보군/후보 아이템 읽기 전용 seed 데이터와 소유자 UUID, 목업 AI 코멘트 포함 스냅샷. 기본 후보군 A에는 신발/의류/테스트 상품을 섞어 엑셀 동적 사이즈 컬럼을 검증한다 |
| `candidateMockApi.ts` | 후보군/이너후보군 mock API 구현. 후보군 소유자 필터링, 후보군 mutation 계약 stub, 엑셀 업로드 mock 응답을 소유한다. 기간 기준 후보 요약/배지/엑셀 DTO 조립은 `candidateItemSummaryBuilder.ts`에 위임한다 |
| `candidateItemSummaryBuilder.ts` | 이너후보군 리스트의 데이터 참조기간 기준 live 수치, 배지 평가, 발주 엑셀 다운로드용 `orderExport` DTO 조립을 소유한다 |
| `candidateAnalysisMock.ts` | 후보군 AI 분석 SSE mock. 작업 등록, 진행 이벤트, close/error 핸들러 호출만 소유하고 후보군 데이터 조회는 `candidateMockApi.ts`에서 주입받는다 |
| `dashboardApi.ts` | 판매 분석, 산점도, 상품 드로어 조회 mock `DashboardApi` 구현체. 후보군 API는 `candidateMockApi.ts`, 2차 재고·발주 계산은 `secondaryStockOrderCalcApi.ts`를 연결해 public 계약만 합친다 |
| `orderSnapshotForCandidate.ts` | 후보 아이템용 오더 스냅샷 생성/복원 보조와 임시 목업 AI 코멘트 생성 |
| `productCatalog.ts` | 상품 catalog seed와 조회. 의류는 S/M/L/XL/XXL, 신발은 235~280 사이즈 체계를 생성한다 |
| `records.ts` | mock 원천 record 묶음 |
| `salesTables.ts` | 자사/경쟁 판매 테이블 mock |
| `scatterGrid.ts` | 자사/경쟁 산점도 mock 격자화 계산. 운영에서는 백엔드가 같은 책임을 가져야 하므로, mock `dashboardApi.ts` 본문에서 분리해 테스트 가능한 계산 경계로 둔다 |
| `secondaryDailyTrend.ts` | 2차 드로워 일간 트렌드 mock. 선택 경쟁 채널의 수량 보정이 경쟁사 일별 판매량에 반영된다 |
| `secondaryStockOrderCalcApi.ts` | 2차 드로워 재고·발주 계산 mock. 기간 산술평균, 예측 수량연산, 안전재고/추천수량 산식과 표시용 재고 mock 값을 소유한다 |
| `utils.ts` | mock 전용 유틸 |

### api/requests 하위 파일

| 파일 | 역할 |
|------|------|
| `authRequests.ts` | 로그인, 세션, 사용자 정보, 관리자 사용자 관리 요청 adapter. 실제 백엔드 전환 시 HttpOnly 세션, 비밀번호/임시 비밀번호 일회성 응답, 관리자 보호 정책을 이 파일에서 HTTP 요청으로 연결한다 |
| `adminGptKeyRequests.ts` | 관리자 GPT 키 관리 요청 adapter. GPT 전용 계약이며 원문 키는 생성/변경 요청에만 싣고 목록/변경/테스트/삭제 응답은 원문 키를 받지 않는 흐름을 유지한다 |
| `dashboardRequests.ts` | 자사/경쟁 판매, 상품 드로워, 후보군, 분석 SSE, 엑셀 업로드 템플릿 요청 adapter. 후보군 계열은 현재 세션의 `USER_ACCOUNT.uuid`를 request boundary에서만 붙이고, 화면 내부로 사용자 UUID를 흘리지 않는다. 경쟁 분석은 `competitorChannelId`가 없으면 전체 경쟁 채널 합계로 조회하고, 1차 드로워 판매 인사이트는 선택 경쟁 채널을 반드시 보낸다. 기간 기반 후보군 리스트는 전체 상품 분포 배지 계산 후 stash item만 반환해야 한다는 백엔드 주의점을 이 경계에 기록한다. 후보군 엑셀 업로드/템플릿은 백엔드 이관 대상이지만, 이너후보군 발주 엑셀 다운로드는 이미 받은 `orderExport` 기반 프론트 생성 기능이다 |
| `index.ts` | request adapter export 진입 파일 |

## src/auth

로그인 화면, 세션 상태, 보호 라우트는 대시보드 도메인과 분리한다. 이 폴더는 `src/api`의 인증 계약만 호출하고 mock 파일을 직접 import하지 않는다.

| 파일 | 역할 |
|------|------|
| `AuthContext.ts` | 인증 context 타입, `AuthContext`, `useAuth` hook |
| `AuthProvider.tsx` | 앱 전역 인증 세션 로딩, 로그인, 로그아웃 API 호출을 `AuthContext`로 제공 |
| `RequireAuth.tsx` | `/dashboard/*` 보호 라우트. 세션이 없으면 `/login`으로 보낸 뒤 원래 경로를 보존 |
| `LoginPage.tsx` | 로그인 라우트 화면. 로그인 ID와 비밀번호를 인증 계약으로 전달 |
| `LoginPage.module.css` | 로그인 화면 전용 스타일 |
| `UserProfileDialog.tsx` | 헤더 사용자 정보 확인, 로그인 ID 변경, 비밀번호 변경 모달 |
| `UserProfileDialog.module.css` | 사용자 정보 모달 전용 스타일 |
| `authGate.module.css` | 보호 라우트의 세션 확인 상태 스타일 |

## src/admin

관리자 권한으로 접근하는 별도 업무 화면이다. URL은 `/admin`으로 분리하되 화면은 대시보드 공통 레이아웃 안에서 열린다. 이 폴더는 `src/api`의 관리자 계약만 호출하고 mock 파일을 직접 import하지 않는다.

| 파일 | 역할 |
|------|------|
| `AdminPage.tsx` | 관리자 라우트 shell. 공통 헤더 안에 사용자 관리/GPT 키 관리 탭과 현재 탭 설명을 배치한다. |
| `AdminUsersPanel.tsx` | 관리자 사용자 목록 조회, 추가, 임시 비밀번호 표시/복사 dialog, 사용자 row 목록 조립을 소유한다. 개별 row 편집/삭제/비밀번호 재설정 동작은 `AdminUserRow.tsx`에 위임한다. |
| `AdminUserRow.tsx` | 사용자 1명 단위의 로그인 ID/이름/비고/권한/활성 상태 수정, UUID 표시, 삭제, 임시 비밀번호 재설정 요청을 소유한다. |
| `AdminGptKeysPanel.tsx` | GPT 키 목록 조회, 추가 form, 선택된 GPT 키 dialog 열림 상태를 소유한다. 행 요약 렌더는 `AdminGptKeyRow.tsx`, 상세 수정/교체/테스트/삭제는 `AdminGptKeyDialog.tsx`에 위임한다. |
| `AdminGptKeyRow.tsx` | GPT 키 목록의 식별 정보 행 렌더링만 소유한다. 원문 키는 표시하지 않고 `maskedKey`만 사용한다. |
| `AdminGptKeyDialog.tsx` | GPT 키 메타·키 변경, 연결 테스트, 삭제 확인 흐름을 소유한다. 원문 키는 변경 요청 field 안에서만 존재하고 별도 키 교체 버튼을 두지 않는다. |
| `AdminActiveSwitch.tsx` | 관리자 화면에서 쓰는 활성/비활성 스위치 UI. 저장 책임 없이 boolean draft 값만 부모로 돌려준다. |
| `AdminPage.module.css` | 관리자 화면 CSS 진입점. 실제 스타일은 `admin/style-parts/*`가 shell/forms/lists/dialogs/responsive로 나눠 소유한다. |
| `adminHelpers.ts` | 관리자 화면의 역할/GPT 키 용도 option, 테스트 상태 label, 공통 날짜/오류 표시 helper. |
## src/components

앱 전체에서 재사용 가능한 컴포넌트만 둔다. 대시보드 도메인에 묶인 컴포넌트는 `dashboard/components`로 간다.

| 파일 | 역할 |
|------|------|
| `ApiUnitErrorBadge.tsx` | API 단위 오류를 표시하는 공용 badge |
| `AppToast.tsx`, `AppToastContext.ts`, `AppToast.module.css` | 앱 전역 성공/정보/오류 toast provider와 상단 자동 닫힘 표시. hook/context export는 fast-refresh 경계를 위해 `AppToastContext.ts`가 소유한다 |
| `ComponentErrorBoundary.tsx` | 컴포넌트 단위 오류 격리 boundary |
| `LoadingSpinner.tsx`, `LoadingSpinner.module.css` | 요청 대기 상태의 공용 spinner. 권한 확인/목록/차트/드로워/모달은 큰 panel/page 표시를 쓰고, 저장·삭제·업로드 같은 버튼 요청은 inline 표시를 쓴다 |

## src/dashboard

대시보드 기능 전체의 feature boundary다. 라우트, 도메인 컴포넌트, 도메인 훅, drawer 보조 로직을 포함한다.

| 경로 | 역할 |
|------|------|
| `DashboardLayout.tsx` | `/dashboard` 하위 탭/레이아웃 |
| `layout.module.css` | `DashboardLayout` 전용 스타일 |
| `pages/` | 라우트에 직접 연결되고 `src/App.tsx`에서 lazy import되는 화면만 둔다 |
| `components/` | 대시보드 내부에서 재사용되는 UI와 feature 컴포넌트 |
| `hooks/` | 여러 대시보드 영역에서 쓰는 공용 훅 |
| `drawer/` | 상품 요약 drawer의 DOM/병합/본문 보조 로직 |
| `styles/` | dashboard feature 전용 CSS 변수 |

## dashboard/pages

라우트 페이지 전용 폴더다. 모달, badge, hook처럼 라우트가 아닌 단위는 가급적 자기 feature 폴더로 분리한다.

| 파일 | 역할 |
|------|------|
| `SelfPage.tsx` | 자사 판매 분석 라우트. 공통 분석 필터/기간 상태는 `useAnalysisSalesFilters`, 격자 셀 선택·화면 기준 선택 유효성·후보군 일괄 담기 선택 상태는 `useAnalysisVisibleSelection`이 소유한다. 페이지는 API 결과 연결, 자사 KPI, 공통 산점도 카드 연결, 후보군 일괄 담기 진입을 조립한다. 목록 컬럼/row 이벤트는 `SelfAnalysisList.tsx`, tooltip 렌더는 `AnalysisScatterTooltips.tsx`에 위임한다. 기본 목록 정렬은 자사 판매량 내림차순이며 2차 드로워는 열지 않는다. 1차 드로워 상/하 이동은 `SelfAnalysisList`가 보고한 현재 테이블 정렬 순서를 사용한다. |
| `CompetitorPage.tsx` | 경쟁 판매 분석 라우트. 경쟁 채널 필터, 자사판매량 존재 행 토글, 경쟁 KPI, 공통 산점도 카드, 후보군 일괄 담기 진입을 조립한다. 목록 렌더는 `CompetitorAnalysisList.tsx`, KPI는 `CompetitorKpiGrid.tsx`, 필터 우측 토글/버튼은 `CompetitorFilterEndControls.tsx`, tooltip 렌더는 `AnalysisScatterTooltips.tsx`에 위임한다. 기본 목록 정렬은 경쟁 판매량 내림차순이며, 경쟁 채널이 `전체`이면 API 응답은 전체 경쟁 채널 합계여야 한다. 1차 드로워 상/하 이동은 `CompetitorAnalysisList`가 보고한 현재 테이블 정렬 순서를 사용한다. |
| `SnapshotConfirmPage.tsx` | 후보군 목록/업로드/수정/삭제/복제 라우트의 상태와 API 액션 조립을 소유한다. 업로드 카드, 후보군 카드 리스트, 이름·비고 편집 dialog는 `pages/snapshot-confirm/*` 하위 컴포넌트가 소유한다. |
| `snapshot-confirm/CandidateStashUploadCard.tsx` | 후보군 엑셀 업로드 card, 템플릿 다운로드 링크, drag/drop 입력 UI를 소유한다. 실제 업로드 API 호출은 페이지에서 주입받는다. |
| `snapshot-confirm/CandidateStashList.tsx` | 후보군 카드 목록과 빈 상태 렌더링을 소유한다. 상세 열기/복제/편집/삭제 API 동작은 페이지에서 주입받는다. |
| `snapshot-confirm/CandidateStashEditDialog.tsx` | 후보군 이름·비고 편집 dialog 렌더링을 소유한다. 저장 API 동작은 페이지에서 주입받는다. |
| `SnapshotConfirmPage.module.css` | 오더 후보군 화면 CSS 진입점. 실제 스타일은 `pages/snapshot-confirm-style-parts/*`가 layout, upload card, stash cards, edit modal, responsive로 나눠 소유한다. |
## dashboard/components

대시보드 feature 안에서 공유되는 UI 컴포넌트다. 특정 하위 feature가 커지면 하위 폴더로 분리한다.

| 파일/폴더 | 역할 |
|------|------|
| `AnalysisScatterChartCard.tsx` | 자사/경쟁사 분석에서 공통으로 쓰는 산점도 카드. 격자 cell 색, 선택 초기화 버튼, X/Y축 라벨, point 클릭 연결을 렌더링한다. 데이터 조회와 필터 상태는 페이지가 소유한다. |
| `AnalysisScatterTooltips.tsx` | 자사/경쟁사 산점도 tooltip 렌더링. tooltip 텍스트/포맷/건수 강조 표현을 페이지 컨테이너에서 분리한다. |
| `CompetitorAnalysisList.tsx` | 경쟁사 분석 목록의 컬럼 정의와 row 클릭/키보드 열기/체크박스 렌더링을 소유한다. `순위`는 현재 rows의 `competitorQty` 기준 표시 순위로 계산하고, 판매량이 많은 항목이 1위다. 현재 드로워 상품 row는 `selectedSkuGroupKey`로 받아 공통 목록 포커스 경계에 전달하고, 현재 테이블 정렬 순서를 페이지에 보고한다. |
| `CompetitorFilterEndControls.tsx` | 경쟁사 분석 필터 우측의 `자사판매량이 존재하는 경우만 보기` 토글과 `선택한 물품을 후보군으로` 버튼을 소유한다. |
| `CompetitorKpiGrid.tsx` | 경쟁사 분석 KPI 4개 카드 렌더링을 소유한다. KPI 값 계산은 페이지가 필터링된 row 기준으로 수행한다. |
| `AnalysisList.tsx` | 판매 분석 목록 wrapper. `PaginatedTable`의 정렬/스크롤 구현을 감싸고, 현재 드로워 상품 row 식별자와 실제 정렬 row id 보고 콜백을 전달한다. |
| `AnalysisPeriodTools.tsx` | 자사/경쟁 분석 공통 기간 preset 버튼, 기간 bar 토글, dual range UI |
| `ChartCard.tsx` | 차트 카드 wrapper. `titleAction`으로 그래프 내부 보조 액션(예: 격자 선택 해제)을 받을 수 있다 |
| `ConfirmModal.tsx` | 확인 모달 shell. 기본 shell 스타일을 갖고, 특수 화면은 필요한 classNames만 선택적으로 주입한다 |
| `ConfirmModal.module.css` | 확인 모달 공통 backdrop/panel/title/text/action/button 스타일 |
| `CopyToastBanner.*` | 복사 완료 toast 표시 컴포넌트 |
| `useCopyToastMessage.ts` | 클립보드 복사, 복사 완료 toast 메시지, 자동 닫힘 타이머 hook |
| `DeleteButton.*` | 삭제 버튼 공용 구현 |
| `FilterBar.tsx` | 페이지 상단 필터 조합. 필터 field view-model은 `dashboard/model/filterField.ts`를 따르며, `filterEndContent`로 필터 grid 끝의 버튼/액션 칸을 받을 수 있다. `displayValue`/`disabled`는 선택 상태 표시 같은 UI 표현 전용이다 |
| `FilterListCombo.*` | 목록 기반 검색/선택 필터. 값이 `전체`인 필드는 전체 옵션 목록을 열어 보여준다 |
| `KpiGrid.tsx` | KPI 카드 grid. 자사/경쟁사 분석 좌측 KPI stack의 compact card density와 숫자/단위 분리 렌더링은 공통 CSS가 소유한다 |
| `PaginatedTable.tsx` | 정렬/페이지네이션 테이블. `activeRowId/getRowId` 계약을 통해 외부 선택 row를 포커스·스크롤·강조한다. `onOrderedRowIdsChange`로 현재 정렬이 적용된 전체 row id 순서를 보고해 드로워 상/하 이동과 화면 정렬 순서를 맞춘다. |
| `SelfAnalysisList.tsx` | 자사 분석 목록의 컬럼 정의와 row 클릭/키보드 열기/체크박스 렌더링을 소유한다. `순위`는 현재 rows의 `qty` 기준 표시 순위로 계산하고, 판매량이 많은 항목이 1위다. 현재 드로워 상품 row는 `selectedSkuGroupKey`로 받아 공통 목록 포커스 경계에 전달하고, 현재 테이블 정렬 순서를 페이지에 보고한다. |
| `PortalHelpPopover.tsx`, `usePortalHelpPopover.ts`, `portalHelpPopoverPosition.ts` | help popover와 위치 계산 |
| `common.module.css` | 대시보드 공용 CSS 진입점. 실제 스타일은 `components/common-style-parts/*`가 분석 layout, 추이 컨트롤, help/action, filter/period, bulk modal, period slider, table, drawer로 나눠 소유한다 |
| `trend/` | 판매 트렌드 차트와 차트 range 보조 |
| `product-drawer/` | 상품 drawer feature. 1차/2차 드로워 구조, 공유 경쟁 채널 상태, 각 드로워 하위 컴포넌트와 요청 hook |
| `candidate-stash/` | 후보군 상세 모달 feature |

## dashboard/components/candidate-stash

후보군 상세 모달 안에서 쓰는 UI와 상태 일을 소유한다. 후보군 목록 좌우의 자체 책임은 `SnapshotConfirmPage`가 소유한다.

| 파일 | 역할 |
|------|------|
| `CandidateStashDetailModal.tsx` | 후보군 상세 모달의 최상위 조립 컴포넌트. 모델 hook, 선택 hook, 추천 모달 열림 상태, 주요 하위 컴포넌트 배치만 소유한다. 헤더/필터/본문/드로워/삭제 확인/분석 팝업 렌더 책임은 하위 파일로 위임한다. |
| `CandidateStashDetailHeader.tsx` | 후보군 이름, 데이터 참조기간 입력, 생성/변경일, 추천 보기, 일괄삭제, 닫기 버튼 렌더링만 소유한다. |
| `CandidateStashDetailFilters.tsx` | 브랜드/품번/상품명 필터와 엑셀 다운로드 액션 렌더링만 소유한다. 다운로드 데이터 생성은 API/엑셀 유틸 경계를 따른다. |
| `CandidateStashDetailBody.tsx` | 후보군 상세 요약 KPI와 이너 후보 리스트 상태 분기 렌더링을 소유한다. 리스트 자체 row/table 렌더링은 `InnerCandidateOrderList.tsx`에 위임한다. |
| `CandidateStashProductDrawer.tsx` | 이너 후보군에서 열리는 상품 drawer 연결부. drawer context, 저장 후 새로고침, 개별 삭제 요청 연결만 소유한다. |
| `CandidateStashDeleteDialogs.tsx` | 이너 후보 개별 삭제와 일괄 삭제 확인 모달만 소유한다. |
| `CandidateStashAnalysisStatusPopup.tsx` | AI 스냅샷 분석 진행 팝업 렌더링을 소유한다. 자동 닫힘과 상태 라벨 계산은 `useAnalysisStatusPopup.ts`가 소유한다. |
| `CandidateStashMissingState.tsx` | 후보군을 찾지 못했을 때의 빈 상태 렌더링만 소유한다. |
| `CandidateStashDetailModal.module.css` | 후보군 상세 모달 CSS 진입점. 실제 스타일은 `candidate-stash/style-parts/*`가 header, analysis status, filter/summary, inner order list, modal shell, responsive로 나눠 소유한다. |
| `useCandidateStashDetailModal.ts` | 후보군 상세 모달의 모델 조립 hook. 후보군/아이템 조회, 데이터 참조기간 초기화, 추천 조회 트리거, 분석 완료 새로고침을 묶고, 필터·정렬은 `useInnerCandidateTable.ts`, drawer hydration/전환은 `useCandidateStashItemDrawer.ts`, 삭제·엑셀 액션은 `useCandidateStashItemActions.ts`에 위임한다. |
| `useVisibleUuidSelection.ts` | 화면에 보이는 UUID 목록 기준 선택 상태, 전체 선택, indeterminate checkbox ref를 소유하는 공통 hook이다. |
| `useAnalysisStatusPopup.ts` | AI 분석 진행 팝업의 상태 라벨, 진행률, 자동 닫힘 타이머를 소유한다. |
| `useInnerCandidateTable.ts` | 이너 후보 아이템의 필터 옵션, 검색어, 정렬 상태, row 생성, 합계 계산을 소유한다. |
| `useCandidateStashItemDrawer.ts` | 이너 후보 아이템 2차 드로워 열기/닫기 전환, 스냅샷 hydration, 인접 아이템 이동을 소유한다. `openedItemUuid`는 이너 후보 리스트의 현재 row 포커스 기준으로도 사용된다. |
| `useCandidateStashItemActions.ts` | 이너 후보 아이템 삭제, 일괄 삭제, 엑셀 다운로드 생성 액션 상태를 소유한다. |
| `candidateStashDetailTypes.ts` | 이너 후보 row와 정렬 key 타입을 소유한다. |
| `useCandidateStashAnalysisProgress.ts` | 후보군 AI 분석 SSE 구독 hook. 작업 시작, 진행/실패/완료 상태, 완료 후 새로고침 콜백 호출을 소유한다. |
| `InnerCandidateOrderList.tsx` | 이너 후보 리스트 화면 UI. 표시 순서 인덱스, 정렬 헤더, 상세확정 컬럼, 선택 체크박스, badge 렌더링을 소유한다. |
| `AnalysisCandidateBulkAddModal.tsx` | 자사/경쟁사 분석 리스트에서 선택한 상품을 기존 후보군에 넣거나 새 후보군을 만든 뒤 넣는 모달. 스냅샷을 만들지 않고 `appendCandidateItems`만 호출한다. |
| `CandidateRecommendationModal.tsx` | 후보군 상세에서 추천 후보를 선택/적용하는 보조 모달. |
| `CandidateRecommendationModal.module.css` | 추천 모달 전용 스타일. |
| `CandidateInsightBadges.tsx` | 후보 아이템 인사이트 badge 렌더링. |
| `CandidateInsightBadges.module.css` | 후보 인사이트 badge 스타일. |
## dashboard/components/product-drawer

상품 drawer feature다. UX 구조를 기준으로 루트 shell 안에 1차 드로워와 2차 드로워를 둔다. 데이터 성격인 summary/detail 이름으로 폴더를 나누지 않는다.

| 파일/폴더 | 역할 |
|------|------|
| `ProductDrawer.tsx` | 상품 drawer overlay shell. 닫기, body layout shift, 2차 드로워 허용 여부(`secondaryEnabled`), 2차 드로워 열림 상태, 방향키 이동, ESC 단계 닫기, 공유 경쟁 채널 상태를 조율한다. `좌=열기`, `우=닫기`, `상/하=이전/다음` 키를 처리하고, 2차 드로워가 열린 상태에서 이전/다음 상품으로 이동해도 2차 드로워 상태를 유지한다. 원본 리스트 포커스 이동은 각 리스트가 현재 선택 id를 받아 처리한다 |
| `ProductDrawerSecondaryPane.tsx` | `ProductDrawer`의 확장 패널 UI. 경쟁 채널 로딩/오류, 2차 상세 로딩/오류, `ProductSecondaryDrawer` 연결을 소유한다. 키보드·body layout·공유 채널 상태 생성은 루트 drawer에 남긴다 |
| `apiErrorInfo.ts` | 상품 drawer 하위 API 오류 정보를 같은 형식으로 만드는 helper |
| `ko.ts` | 상품 drawer feature에서 공유하는 한국어 텍스트 상수 |
| `useCompetitorChannels.ts` | 1차 판매 정보/월간 추이와 2차 일별 추이가 공유하는 경쟁 채널 목록 조회와 선택 상태. 빈 채널 목록은 API 오류로 처리하고 임의 채널 객체를 만들지 않는다 |
| `primary/` | 1차 드로워. 상품 요약 카드, 판매 정보 컨테이너, 월간 추이 컨테이너와 1차 전용 카드 |
| `secondary/` | 2차 드로워. 2차 상세 조회, 상품 메타, 후보군 저장/수정 액션, 재고·발주 계산, 일별 추이, 사이즈별 수량, AI 코멘트 |

### product-drawer/primary

| 파일/폴더 | 역할 |
|------|------|
| `ProductPrimaryDrawer.tsx` | 1차 드로워 column. 헤더, 상품 요약 카드, 1차 기능 컨테이너 배치와 2차 드로워 열기 버튼 표시 여부를 소유한다 |
| `ProductSalesMetricsContainer.tsx` | 선택 상품·기간·경쟁 채널 기준 1차 판매 정보 조회와 `SalesMetricsCard` 연결 |
| `ProductMonthlyTrendContainer.tsx` | 1차 드로워 월간 판매 추이 카드 렌더링을 소유한다. 요청/윈도우/토글/차트 데이터 계산은 `useProductMonthlyTrendModel.ts`에 위임한다. 판매추이 표시 토글의 활성 배경색은 차트 선 색상과 맞춘다. |
| `useProductMonthlyTrendModel.ts` | 선택 상품·기간·포캐스트 개월·경쟁 채널 기준 월간 판매 추이 조회, chart window 계산, 시리즈 표시 토글, 에러 상태를 소유한다. |
| `cards/SalesMetricsCard.tsx` | 1차 판매 정보 표 UI. 자사/경쟁사 헤더 음영은 판매추이 선 색상 계열을 따른다 |

### product-drawer/secondary

| 파일/폴더 | 역할 |
|------|------|
| `ProductSecondaryDrawer.tsx` | 2차 드로워 container. 기간/단가/AI 코멘트/스냅샷 토글 같은 화면 상태만 들고, 요청은 `hooks/useSecondaryDrawerRequests.ts`, 계산은 `hooks/useSecondaryOrderCalculations.ts`, 조립은 `hooks/useSecondaryForecastModel.ts`, 렌더는 `ProductSecondaryDrawerContent.tsx`에 위임한다 |
| `ProductSecondaryDrawerContent.tsx` | 2차 드로워 render-only content. 메타/후보군 액션/판매예측/AI 코멘트/일별 추이/사이즈 오더 카드 배치와 help popover 렌더링만 소유한다 |
| `useSecondaryDrawerDetail.ts` | 2차 드로워가 열릴 때의 상세 조회와 검증된 스냅샷 hydration |
| `secondaryDrawerTypes.ts` | 2차 드로워 내부 view-model 타입 |
| `candidateActionCards.tsx` | 2차 드로워에서 후보군 저장/연결 액션 UI |
| `SecondaryDrawerActionArea.tsx` | 2차 드로워 상단 액션 영역 조립. 이너후보군에서는 스냅샷 기준 보기 토글을 별도 카드로 분리하고, 저장/삭제 액션 카드와 나란히 배치한다 |
| `CandidateStashPickerModal.tsx` | 2차 드로워 후보군 선택/생성 portal 모달. 후보군 옵션 표시와 선택 이벤트만 소유한다 |
| `secondarySnapshot.ts` | 2차 드로워의 오더 스냅샷 문서 생성. 저장 범위와 `OrderSnapshotDocumentV1` 필드 매핑을 UI 본문에서 분리한다 |
| `secondarySnapshotView.ts` | 스냅샷 기준 보기에서 표시할 통합 오더 설정, 재고 표시값, AI 코멘트, 사이즈별 오더 row를 저장 문서에서 추출한다. live 계산과 저장 스냅샷 표시 경계를 분리한다 |
| `cards/*` | 2차 드로워 카드 단위 UI. `SizeOrderCard`는 사이즈별 오더 표와 가중치 입력만 소유하고, 비중 차트 행은 `SizeOrderShareChartRow.tsx`가 소유한다. 가중치 상태는 스냅샷 계약에 맞춰 `selfWeightPct`로 저장한다 |
| `hooks/*` | 2차 드로워 hook 경계. `useSecondaryDrawerRequests.ts`는 API 요청, `useSecondaryOrderCalculations.ts`는 계산 view-model, `useSecondaryForecastModel.ts`는 상태/요청/계산 결과를 얇게 조립, `useSecondaryCandidateActions.ts`는 후보군 저장/수정 액션을 소유한다 |
| `model/*` | 2차 드로워 계산 로직. `SecondaryOrderDraft`는 live/snapshot 모드별 사이즈 확정 수량 baseline과 사용자 override 책임을 묶은 작은 클래스다. `secondarySizeOrderRows.ts`는 사이즈 비중, 추천 수량, 확정 수량 view-model 생성을 소유한다 |
| `style-parts/*` | `secondaryDrawer.module.css`가 CSS `@import`로 묶는 2차 드로워 카드/컨트롤/표/입력 스타일 조각 |
| `secondaryDrawer.module.css` | 2차 드로워 content 스타일 |

## dashboard/hooks

여러 dashboard 영역에서 공유되는 훅만 둔다. 특정 feature 전용 훅은 해당 feature 폴더로 이동한다.

| 파일 | 역할 |
|------|------|
| `useElementSize.ts` | element resize 측정 |
| `useAnalysisSalesFilters.ts` | 자사/경쟁 분석 공통 기간·브랜드·카테고리·품번·색상·상품명 필터 상태와 filter meta API 요청. 산점도 cell 선택 시 기간 외 필터를 비운 것처럼 보이게 하는 분석 화면 표시 정책도 여기서 만든다 |
| `useAnalysisVisibleSelection.ts` | 자사/경쟁 분석 공통 격자 셀 선택, 현재 보이는 행 계산, 선택 상품 drawer id, 후보군 일괄 담기 체크박스 상태. 필터나 격자 결과가 바뀔 때 상태를 effect로 삭제하지 않고 현재 화면에서 유효한 값만 파생한다 |
| `useDashboardRequest.ts` | dashboard page에서 쓰는 단발 조회 요청 생명주기. loading 상태, 실패 fallback, stale 응답 차단만 소유하고, 어떤 API를 부르는지와 fallback 데이터 의미는 호출 페이지가 결정한다 |
| `usePeriodRangeFilter.ts` | 판매 분석 기간 필터 상태 |
| `useProductDrawerBundle.ts` | 상품 drawer bundle 로딩, loading 상태, stale cache, snapshot fallback 보호. 기존 bundle-only 호출은 `useProductDrawerBundle`, 로딩 UI가 필요한 호출은 `useProductDrawerBundleState`를 사용한다 |

## dashboard/model

Dashboard 라우트/훅/컴포넌트가 공유하는 화면 view-model 타입만 둔다. 특정 컴포넌트 구현을 훅이 직접 import하지 않도록 경계 역할을 한다.

| 파일 | 역할 |
|------|------|
| `filterField.ts` | `FilterBar`와 분석 필터 훅이 공유하는 필터 field view-model 타입 |

## dashboard/drawer

상품 요약 drawer의 비시각 보조 로직이다.

| 파일 | 역할 |
|------|------|
| `drawerDom.ts` | drawer/modal DOM data attribute helper |
| `mergePrimarySummaryFromSnapshot.ts` | API bundle과 snapshot summary 병합 |
| `primaryDrawerBody.ts` | primary drawer body 관련 보조 값 |

## src/snapshot

오더 스냅샷 저장 문서의 타입과 파서다. 후보군 item의 `details` 저장/복원이 이 계약을 따른다.

| 파일 | 역할 |
|------|------|
| `orderSnapshotTypes.ts` | 저장 문서 schema 타입 |
| `parseOrderSnapshot.ts` | API 타입에 의존하지 않고 `unknown` 저장 문서의 schemaVersion, skuGroupKey, drawer/context 주요 블록, sizeRows 배열 구조만 검증한다. 내부 숫자/문자 비즈니스 값은 백엔드 계약을 신뢰하고 화면/export에서 드러나게 둔다 |

## src/styles

앱 전체 전역 스타일만 둔다.

| 파일 | 역할 |
|------|------|
| `tokens.css` | 색상/spacing 등 전역 CSS 변수 |
| `base.css` | reset, body, 기본 typography |

## src/utils

React나 API 구현에 의존하지 않는 순수 보조 함수만 둔다.

| 파일 | 역할 |
|------|------|
| `adjacentListNavigation.ts` | 이전/다음 row 탐색. 하드닝 완료 모듈이며 상세 계약은 `module-hardening.md`를 따른다 |
| `analysisKpiWeighted.ts` | 분석 KPI 매출액 가중 계산. 하드닝 완료 모듈이며 상세 계약은 `module-hardening.md`를 따른다 |
| `copyToClipboard.ts` | clipboard 복사 helper |
| `date.ts` | 날짜 formatting/parsing |
| `displayRank.ts` | 현재 화면 rows 안에서 특정 값 기준 표시 순위 map을 만든다. 자사/경쟁사 분석 목록의 판매량 순위 컬럼이 사용한다 |
| `forecastMonthsStorage.ts` | forecast month localStorage 저장 |
| `format.ts` | 숫자/비율/EA 표시 format. 하드닝 완료 모듈이며 상세 계약은 `module-hardening.md`를 따른다 |
| `hashRank.ts` | hash 기반 rank 보조. 하드닝 완료 모듈이며 상세 계약은 `module-hardening.md`를 따른다 |
| `candidateOrderExcelExport.ts` | 이미 조회한 후보군 아이템의 `orderExport` DTO를 발주용 XLSX로 변환하고 다운로드 파일명을 만든다. `CandidateOrderWorkbookBuilder`가 ExcelJS 모듈, clock, 스타일 정책을 주입받아 통합 문서 생성 책임을 가진다. `exceljs`는 후보군 상세 목록 로딩 후 미리 로드하고 다운로드 시 같은 promise를 재사용한다. 주 데이터/메타 시트 헤더와 `N/A` 셀 스타일을 적용한다 |
| `salesKpiColumn.ts` | 판매 KPI column view-model helper |
| `scatterGridDisplay.ts` | Scatter-grid cell count -> blue lightness color, and response meta + chart size -> dynamic point radius. Binning itself remains backend-owned. |
| `sort.ts` | 정렬 방향/상태/값 타입과 한국어 문자열·숫자·빈 값 비교 helper. 하드닝 완료 모듈이며 상세 계약은 `module-hardening.md`를 따른다 |
| `uniqueSortedStrings.ts` | 문자열 option 정렬/중복 제거. 하드닝 완료 모듈이며 상세 계약은 `module-hardening.md`를 따른다 |

## 테스트 파일 규칙

`*.test.ts`는 테스트 대상 파일 옆에 둔다. 테스트가 특정 feature의 계약을 설명하면 이 문서의 해당 역할 설명도 같이 확인한다.

## 새 파일 배치 규칙

1. API 요청/응답 타입이면 `src/api/types`.
2. API 호출 진입점이면 `src/api/client.ts`, `src/api/requests/*`, `src/api/index.ts`.
3. mock 데이터/동작이면 `src/api/mock`.
4. 인증 화면, 세션 provider, 보호 라우트면 `src/auth`.
5. 관리자 화면이면 `src/admin`.
6. 대시보드 라우트 페이지면 `src/dashboard/pages`.
7. 특정 feature 전용 UI/훅/CSS면 `src/dashboard/components/<feature-name>`.
8. 여러 dashboard 화면에서 쓰는 UI면 `src/dashboard/components`.
9. 여러 feature에서 쓰는 순수 계산이면 `src/utils` 또는 더 도메인성이 강하면 해당 feature의 `model`.
10. 저장 문서 schema나 파싱이면 `src/snapshot`.

## 경계 점검 질문

- 이 파일을 설명하는 문장이 "A도 하고 B도 한다"로 끝나는가?
- page가 modal 내부 상태를 직접 들고 있지는 않은가?
- UI 컴포넌트가 mock 구현을 직접 import하고 있지는 않은가?
- CSS module 이름과 실제 소유 feature가 일치하는가?
- 새 텍스트가 이미 `ko.ts` 패턴을 쓰는 영역에 하드코딩되어 있지는 않은가?
- snapshot 값이 임의 재계산으로 대체되고 있지는 않은가?

## Scatter-grid 도입 반영

- `dashboard/pages/SelfPage.tsx`
  - `getSelfSalesScatterGrid`를 호출해 격자화된 scatter point 데이터를 사용하도록 변경.
  - 차트 클릭 시 셀 기준 필터(`activeGridCellKey`)가 적용되어 목록이 해당 셀 SKU로 제한.
  - hover tooltip에 셀 범위(X/Y)와 count/hasMoreSkuIds 메타를 표시.
- `dashboard/pages/CompetitorPage.tsx`
  - `getCompetitorSalesScatterGrid`를 호출해 격자화된 경쟁사/자사 수량 scatter 데이터 사용.
  - 기존 `showRowsWithSelfSalesOnly`, 채널 필터 동작과 함께 셀 클릭 목록 필터를 결합.
