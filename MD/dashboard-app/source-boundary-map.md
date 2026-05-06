# dashboard-app 소스 경계 지도

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-06 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app`, 프론트엔드 소스, 관련 배포/문서 경계 |

## 유지 규칙

이 문서는 기능 변경, API 계약 변경, 폴더 이동, 공용 컴포넌트 추가, 주요 스타일/빌드 경계 변경이 있을 때 반드시 같이 업데이트한다.

역할을 한 문장으로 설명하기 어려운 파일이나 폴더가 생기면 먼저 경계를 분리한다. 분리 없이 "여러 일을 한다"라고만 기록하지 않는다.

## 이번 경계 정리

2026-05-06에 후보군 상세 UI 경계를 먼저 정리했다.

- `dashboard/pages`에는 라우트 페이지 파일만 남겼다.
- 후보군 상세 모달, 추천 모달, 인사이트 배지, 후보군 상세 훅은 `dashboard/components/candidate-stash`로 이동했다.
- 후보군 상세 모달 CSS는 `SnapshotConfirmPage.module.css`에서 분리해 `CandidateStashDetailModal.module.css`가 소유한다.
- `SnapshotConfirmPage.module.css`는 후보군 목록/업로드/스냅샷 확인 페이지와 그 페이지의 확인 모달 스타일만 담당한다.
- 2차 패널에서 화면에 노출되지 않는 LLM 프롬프트 생성 API와 배포 전 제거 대상이던 JSON 미리보기 모달을 제거했다.
- 오더 스냅샷 독립 localStorage 저장/조회/삭제 API를 제거하고, 후보 아이템 `details`를 스냅샷 저장의 단일 경로로 둔다.
- 후보군 생성 후 별도 확인 팝업을 띄우지 않고 생성된 후보군을 즉시 선택한 뒤 선택 모달을 닫는다.
- 후보군 목록의 삭제·복제·편집 이벤트는 mock localStorage 변경 후 목록을 재조회하며, 상세/드로어 비동기 로딩은 stale 응답 가드를 둔다.
- 라우트 페이지는 `src/App.tsx`에서 `React.lazy`로 분리하고, vendor chunk는 `vite.config.ts`의 Rolldown `codeSplitting.groups`가 소유한다.

## 최상위 저장소

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `.github/workflows/deploy-dashboard.yml` | `dashboard-app`을 테스트, 빌드, GitHub Pages에 배포한다. | 배포 방식, Node 버전, Pages 경로가 바뀔 때 수정 |
| `AGENTS.md` | 작업자 지침. Git, 문서, 검증, 프론트엔드 경계 규칙을 둔다. | 프로젝트 운영 규칙이 바뀔 때 수정 |
| `MD/` | 계획, 결과, API 계약, 구조 문서 보관소. | 기능/API/구조 변경 시 관련 문서 갱신 |
| `dashboard-app/` | React/Vite 대시보드 앱. | 프론트엔드 작업의 주 대상 |
| `dashboard-app.zip` | 과거 앱 압축 산출물. 현재 소스 경계에는 관여하지 않는다. | 재생성 필요가 명확할 때만 교체 |
| `data.py`, `estimator.py`, `plot_*.py` | 대시보드 이전 또는 보조 분석용 Python 스크립트. | 프론트 앱 기능과 분리해서 다룬다 |
| `raw_monthly_quantity.png` | Python 분석 산출 이미지. | 분석 산출물 갱신 때만 교체 |
| `.venv/`, `__pycache__/` | 로컬 Python 실행 산출물. | 소스 경계 문서 대상 아님 |

## dashboard-app 루트

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `package.json` | 앱 스크립트와 의존성 선언. | 런타임/빌드/테스트 의존성 변경 시 수정 |
| `package-lock.json` | npm 의존성 잠금. | `package.json` 변경 또는 설치 결과 변경 시 수정 |
| `vite.config.ts` | Vite 설정. 프로덕션 빌드의 vendor chunk 분리는 Rolldown `codeSplitting.groups`에서 관리한다. | 빌드 옵션, base path, 플러그인, chunk 분리 기준 변경 시 수정 |
| `tsconfig*.json` | TypeScript 컴파일 경계. | TS 대상, strictness, include 경계 변경 시 수정 |
| `eslint.config.js` | 린트 규칙. 현재 전체 lint에는 기존 실패가 있을 수 있다. | 규칙이나 대상 변경 시 수정 |
| `index.html` | Vite HTML 진입점. | 루트 마크업/메타/앱 mount 변경 시 수정 |
| `public/` | 빌드에 그대로 포함되는 정적 자산. | URL로 직접 참조되는 자산 추가/수정 |
| `src/` | 앱 소스. 아래 경계 표를 따른다. | 기능 변경 시 관련 하위 경계 갱신 |
| `dist/` | 빌드 산출물. 소스가 아니다. | 커밋하지 않는다 |
| `node_modules/` | 설치 산출물. 소스가 아니다. | 커밋하지 않는다 |

## src 진입점

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `src/main.tsx` | React root 생성, 전역 CSS와 KaTeX CSS 로드. | 전역 provider, 전역 스타일, 앱 mount 변경 시 수정 |
| `src/App.tsx` | 라우터 구성, 최상위 shell, 라우트 페이지 lazy import. | URL 라우팅, 주요 layout 진입점, 라우트 단위 chunk 경계 변경 시 수정 |
| `src/app.module.css` | 최상위 앱 shell 크기와 main 영역 스타일. | 앱 전체 shell 레이아웃 변경 시 수정 |
| `src/types.ts` | 아직 API 계약으로 승격되지 않은 공용 도메인 타입. | 여러 영역에서 공유되는 타입만 둔다 |

## src/api

`src/api`는 데이터 접근의 유일한 진입면이다. 페이지, 컴포넌트, 훅은 mock 파일을 직접 import하지 않는다.

| 경로 | 역할 | 변경 기준 |
|------|------|-----------|
| `api/client.ts` | 화면에서 호출하는 API 함수와 `dashboardApi` 객체를 노출한다. 현재 구현은 mock으로 위임한다. | API 함수 추가/삭제, mock에서 실제 HTTP로 전환 시 수정 |
| `api/index.ts` | API public export. | 외부에서 import할 API surface 변경 시 수정 |
| `api/mock.ts` | mock API 진입 파일. | mock 구현 위치를 바꿀 때만 수정 |
| `api/dailyTrendAsOf.ts` | 일간 트렌드 as-of 계산 보조 로직. | 일간 트렌드 기준일 규칙 변경 시 수정 |
| `api/types/*` | 프론트-백엔드 계약 타입. | 요청/응답 구조가 바뀌면 먼저 수정 |
| `api/mock/*` | 후보군 localStorage, seed, mock 계산, mock 응답 구현. | 데모 데이터나 mock 동작 변경 시 수정 |

### api/mock 하위 파일

| 파일 | 역할 |
|------|------|
| `candidateSeeds.ts` | 후보군/후보 아이템 seed 데이터 |
| `constants.ts` | mock 공용 상수 |
| `dashboardApi.ts` | mock `DashboardApi` 구현체. 후보군 CRUD는 localStorage에 실제 반영한다 |
| `orderSnapshotForCandidate.ts` | 후보 아이템용 오더 스냅샷 생성/복원 보조 |
| `productCatalog.ts` | 상품 catalog seed와 조회 |
| `records.ts` | mock 원천 record 묶음 |
| `salesTables.ts` | 자사/경쟁 판매 테이블 mock |
| `secondaryDailyTrend.ts` | 2차 패널 일간 트렌드 mock |
| `utils.ts` | mock 전용 유틸 |

## src/components

앱 전체에서 재사용 가능한 컴포넌트만 둔다. 대시보드 도메인에 묶인 컴포넌트는 `dashboard/components`로 간다.

| 파일 | 역할 |
|------|------|
| `ApiUnitErrorBadge.tsx` | API 단위 오류를 표시하는 공용 badge |
| `ComponentErrorBoundary.tsx` | 컴포넌트 단위 오류 격리 boundary |

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

라우트 페이지 전용 폴더다. 모달, badge, hook처럼 라우트가 아닌 단위는 여기 두지 않는다.

| 파일 | 역할 |
|------|------|
| `SelfPage.tsx` | 자사 판매 분석 라우트 |
| `CompetitorPage.tsx` | 경쟁 판매 분석 라우트 |
| `SnapshotConfirmPage.tsx` | 후보군 목록, 후보군 업로드, 후보군 생성/수정/삭제/복제 라우트 |
| `SnapshotConfirmPage.module.css` | `SnapshotConfirmPage`와 해당 페이지 확인 모달 전용 스타일 |

## dashboard/components

대시보드 feature 안에서 공유되는 UI 컴포넌트다. 특정 하위 feature가 커지면 하위 폴더로 분리한다.

| 파일/폴더 | 역할 |
|------|------|
| `AnalysisList.tsx` | 판매 분석 목록 wrapper |
| `ChartCard.tsx` | 차트 카드 wrapper |
| `ConfirmModal.tsx` | 확인 모달 shell. 스타일은 호출자가 classNames로 주입한다 |
| `CopyToastBanner.*` | 복사 완료 toast |
| `DeleteButton.*` | 삭제 버튼 공용 구현 |
| `FilterBar.tsx` | 페이지 상단 필터 조합 |
| `FilterListCombo.*` | 목록 기반 검색/선택 필터 |
| `KpiGrid.tsx` | KPI 카드 grid |
| `PageHeader.tsx` | 페이지 제목/header |
| `PaginatedTable.tsx` | 정렬/페이지네이션 테이블 |
| `PortalHelpPopover.tsx`, `usePortalHelpPopover.ts`, `portalHelpPopoverPosition.ts` | help popover와 위치 계산 |
| `ProductSummaryDrawer.tsx` | 상품 1차 요약 drawer와 2차 패널 진입 shell |
| `common.module.css` | 대시보드 공용 layout/card/button/icon 스타일 |
| `trend/` | 판매 트렌드 차트와 차트 range 보조 |
| `product-secondary/` | 상품 2차 상세 패널 feature |
| `candidate-stash/` | 후보군 상세 모달 feature |

## dashboard/components/candidate-stash

후보군 상세 모달 안에서 쓰는 UI와 상태 훅을 소유한다. 후보군 목록 라우트 자체는 `SnapshotConfirmPage`가 소유한다.

| 파일 | 역할 |
|------|------|
| `CandidateStashDetailModal.tsx` | 특정 후보군의 이너 후보 목록, 요약, 필터, drawer 연결, 일괄/개별 삭제 확인 흐름 |
| `CandidateStashDetailModal.module.css` | 후보군 상세 모달 전용 스타일 |
| `useCandidateStashDetailModal.ts` | 후보군 상세 모달의 API 호출, 필터, drawer hydration, SSE 분석 진행 상태 |
| `CandidateRecommendationModal.tsx` | 후보군 상세에서 추천 후보를 선택/적용하는 보조 모달 |
| `CandidateRecommendationModal.module.css` | 추천 모달 전용 스타일 |
| `CandidateInsightBadges.tsx` | 후보 아이템 인사이트 badge 렌더링 |
| `CandidateInsightBadges.module.css` | 후보 인사이트 badge 스타일 |

## dashboard/components/product-secondary

상품 요약 drawer의 2차 상세 패널 feature다. 발주 계산, 사이즈별 수량, 저장된 LLM 답변 표시, 후보군 저장 액션을 포함한다.

| 파일/폴더 | 역할 |
|------|------|
| `ProductSecondaryPanel.tsx` | 2차 패널 orchestration. 크므로 새 책임은 가능하면 하위 카드/모델로 분리한다 |
| `secondaryPanelTypes.ts` | 2차 패널 내부 view-model 타입 |
| `candidateActionCards.tsx` | 2차 패널에서 후보군 저장/연결 액션 UI |
| `ko.ts` | product-secondary 영역의 한국어 텍스트 상수 |
| `cards/*` | 2차 패널 카드 단위 UI |
| `model/*` | 2차 패널 계산 로직. UI에서 직접 계산이 커지면 여기로 이동한다 |
| `panel-styles/*` | 2차 패널 카드/컨트롤/표/입력 스타일 모듈. 현재는 shell에서 실제 쓰는 조각만 import한다 |
| `productSecondaryPanel.module.css` | 2차 패널 shell 스타일 |

## dashboard/hooks

여러 dashboard 영역에서 공유되는 훅만 둔다. 특정 feature 전용 훅은 해당 feature 폴더로 이동한다.

| 파일 | 역할 |
|------|------|
| `useElementSize.ts` | element resize 측정 |
| `usePeriodRangeFilter.ts` | 판매 분석 기간 필터 상태 |
| `useProductDrawerBundle.ts` | 상품 drawer bundle 로딩, stale cache, snapshot fallback 보호 |

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
| `parseOrderSnapshot.ts` | 저장 문서 파싱/검증 |

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
| `adjacentListNavigation.ts` | 이전/다음 row 탐색 |
| `analysisKpiWeighted.ts` | 분석 KPI 가중 계산 |
| `copyToClipboard.ts` | clipboard 복사 helper |
| `date.ts` | 날짜 formatting/parsing |
| `forecastMonthsStorage.ts` | forecast month localStorage 저장 |
| `format.ts` | 숫자/비율/EA 표시 format |
| `hashRank.ts` | hash 기반 rank 보조 |
| `salesKpiColumn.ts` | 판매 KPI column view-model helper |
| `uniqueSortedStrings.ts` | 문자열 option 정렬/중복 제거 |

## 테스트 파일 규칙

`*.test.ts`는 테스트 대상 파일 옆에 둔다. 테스트가 특정 feature의 계약을 설명하면 이 문서의 해당 역할 설명도 같이 확인한다.

## 새 파일 배치 규칙

1. API 요청/응답 타입이면 `src/api/types`.
2. API 호출 진입점이면 `src/api/client.ts`와 `src/api/index.ts`.
3. mock 데이터/동작이면 `src/api/mock`.
4. 라우트 페이지면 `src/dashboard/pages`.
5. 특정 feature 전용 UI/훅/CSS면 `src/dashboard/components/<feature-name>`.
6. 여러 dashboard 화면에서 쓰는 UI면 `src/dashboard/components`.
7. 여러 feature에서 쓰는 순수 계산이면 `src/utils` 또는 더 도메인성이 강하면 해당 feature의 `model`.
8. 저장 문서 schema나 파싱이면 `src/snapshot`.

## 경계 점검 질문

- 이 파일을 설명하는 문장이 "A도 하고 B도 한다"로 끝나는가?
- page가 modal 내부 상태를 직접 들고 있지는 않은가?
- UI 컴포넌트가 mock 구현을 직접 import하고 있지는 않은가?
- CSS module 이름과 실제 소유 feature가 일치하는가?
- 새 텍스트가 이미 `ko.ts` 패턴을 쓰는 영역에 하드코딩되어 있지는 않은가?
- snapshot 값이 임의 재계산으로 대체되고 있지는 않은가?
