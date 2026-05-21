# dashboard-app 소스 경계 지도

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-06 |
| 최종 수정일 | 2026-05-21 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app`, 프론트엔드 소스, 관련 배포/문서 경계 |

## 목적

이 문서는 긴 상세 설명을 모두 담는 문서가 아니라, **어떤 내용을 보려면 어느 문서를 열어야 하는지 알려주는 마스터 인덱스**다.

구현 세부, API 계약, 화면 동작, 파일별 책임은 아래 boundary 문서로 나눈다. 다음 작업자는 이 파일을 먼저 열고, 필요한 상세 문서만 추가로 읽는다.

## 유지 규칙

- 기능 변경, API 계약 변경, 폴더 이동, 공용 컴포넌트 추가, 주요 스타일/빌드 경계 변경 시 이 문서와 관련 boundary 문서를 같이 갱신한다.
- 역할을 한 문장으로 설명하기 어려운 파일이나 폴더가 생기면 먼저 경계를 분리한다.
- 하드닝 완료 파일은 [module-hardening.md](./module-hardening.md)에 별도 등록한다. 등록된 파일은 명시적 사용자 허가 없이 수정하지 않는다.
- 날짜별 작업 이력은 현재 계약으로 흡수되면 [../HISTORY](../HISTORY)로 이동한다.

## 빠른 탐색

| 알고 싶은 것 | 먼저 볼 문서 | 대표 소스 |
|------|------|------|
| 저장소 루트, 빌드, 라우팅, e2e 경계 | [repository-runtime.md](./boundaries/repository-runtime.md) | `.github/`, `dashboard-app/vite.config.ts`, `dashboard-app/e2e` |
| API facade, mock/HTTP runtime mode, 실패 kind, 타입 계약 위치, 회사 목록과 company scope | [api-contracts.md](./boundaries/api-contracts.md) | `dashboard-app/src/api` |
| 로그인, 세션, 관리자 사용자/GPT/구글 시트 관리 | [auth-admin.md](./boundaries/auth-admin.md) | `dashboard-app/src/auth`, `dashboard-app/src/admin` |
| 자사/경쟁사 분석, 필터, 산점도, 분석 리스트, 후보군 추가 제한 | [analysis-pages.md](./boundaries/analysis-pages.md) | `dashboard-app/src/dashboard/pages`, `dashboard-app/src/dashboard/components/*AnalysisList.tsx` |
| 오더 후보군, 이너 후보군, 추천, 상세확정, 엑셀 | [candidate-stash.md](./boundaries/candidate-stash.md) | `dashboard-app/src/dashboard/components/candidate-stash` |
| 상품 1차/2차 드로워, 스냅샷, AI 코멘트, 재고·발주 계산 | [product-drawer.md](./boundaries/product-drawer.md) | `dashboard-app/src/dashboard/components/product-drawer` |
| 공통 컴포넌트, hooks/model/interaction/drawer, snapshot, utils | [shared-modules.md](./boundaries/shared-modules.md) | `dashboard-app/src/components`, `dashboard-app/src/dashboard/hooks`, `dashboard-app/src/utils` |
| 현재 QA 기준과 검증 명령 | [qa-current-behavior.md](./qa-current-behavior.md), [qa-state-contracts.md](./qa-state-contracts.md), [test-strategy.md](./test-strategy.md) | `dashboard-app/src/**/*.test.*`, `dashboard-app/e2e` |
| 실패 kind별 UX surface와 금지 fallback | [failure-ux-matrix.md](./failure-ux-matrix.md), [qa-state-contracts.md](./qa-state-contracts.md) | `dashboard-app/src/api/types/api-error.ts`, `dashboard-app/src/api/requests/httpClient.ts` |
| 버튼, 카드, 패널, 리스트, 드로워, 모달의 UI 패턴 | [ui-patterns.md](./ui-patterns.md) | `dashboard-app/src/components`, `dashboard-app/src/dashboard/components`, CSS Modules |
| CSS public facade, 직접 import 예외, selector/token 하드닝 상태 | [hardening-status.md](./hardening-status.md) | `dashboard-app/src/dashboard/components/common.module.css`, `dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawer.module.css`, `dashboard-app/src/styles/tokens.css` |
| 하드닝 완료 모듈과 수정 허가 규칙 | [module-hardening.md](./module-hardening.md) | `dashboard-app/src/utils` 등 |
| 백엔드 구현용 API 상세 | [../backend-api/README.md](../backend-api/README.md) | `dashboard-app/src/api/types` |

## 기능별 갱신 기준

| 변경 내용 | 같이 갱신할 문서 |
|------|------|
| 새 API 메서드, 응답 DTO, SSE 이벤트, API 실패 kind, mock/HTTP adapter, company scope 변경 | [api-contracts.md](./boundaries/api-contracts.md), [../backend-api/backend-api-spec.md](../backend-api/backend-api-spec.md) |
| 자사/경쟁사 분석 필터, 기간 조회 방식, 산점도, 순위, 후보군 담기 변경 | [analysis-pages.md](./boundaries/analysis-pages.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| 후보군 상세 조회, 추천, 배지, 오더 지표 SSE, 상세확정/해제/삭제, 상세 목록 재조회 실패 표시, 엑셀 변경 | [candidate-stash.md](./boundaries/candidate-stash.md), [../backend-api/backend-api-spec.md](../backend-api/backend-api-spec.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| 상품 드로워, 스냅샷 저장 범위, AI 코멘트, 재고·발주 계산 변경 | [product-drawer.md](./boundaries/product-drawer.md), [../backend-api/backend-api-spec.md](../backend-api/backend-api-spec.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| 로그인/관리자 화면, GPT 키, 구글 시트 설정 변경 | [auth-admin.md](./boundaries/auth-admin.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| 공통 UI, table, toast, spinner, keyboard interaction, utils 변경 | [shared-modules.md](./boundaries/shared-modules.md), [ui-patterns.md](./ui-patterns.md), 필요 시 [module-hardening.md](./module-hardening.md) |
| CSS public facade, style-parts 직접 import 예외, selector 중복, token 후보 변경 | [hardening-status.md](./hardening-status.md), 필요 시 [ui-patterns.md](./ui-patterns.md) |
| 로딩, 빈 값, 오류, 권한 실패, stale, 비활성 UX 변경 | [failure-ux-matrix.md](./failure-ux-matrix.md), [qa-state-contracts.md](./qa-state-contracts.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| e2e/CI/build/router/배포 변경 | [repository-runtime.md](./boundaries/repository-runtime.md), [test-strategy.md](./test-strategy.md) |

## 새 파일 배치 규칙

- 화면 라우트 조립은 `dashboard/pages`.
- 데이터 접근은 `src/api` 뒤에만 둔다. 페이지/컴포넌트/훅은 mock을 직접 import하지 않는다.
- 자사/경쟁사 분석 전용 UI는 `dashboard/components` 또는 분석 전용 하위 컴포넌트에 둔다.
- 후보군 상세/추천/상세확정/엑셀 관련 UI와 hook은 `dashboard/components/candidate-stash`.
- 상품 드로워 관련 UI와 hook은 `dashboard/components/product-drawer`.
- React나 API 구현에 의존하지 않는 순수 보조 함수는 `src/utils` 또는 해당 feature의 `model`에 둔다.
- 테스트는 특별한 이유가 없으면 대상 파일 옆에 `*.test.ts(x)`로 둔다. 실제 브라우저 흐름은 `e2e/`에 둔다.

## candidate-stash hook 상태 경계

| hook | 소유 상태 | 외부 경계 | 관련 문서 |
|------|-----------|-----------|-----------|
| `dashboard-app/src/dashboard/components/candidate-stash/useCandidateItemsLoader.ts` | 기본 후보 item 조회 로딩/오류, 기본 item set 반영, 상세확정 override 보호, 오더 지표 SSE 구독 시작 | 추천 목록 pagination과 추천 추가 mutation은 `useCandidateRecommendations`가 소유한다. 오더 지표 event 처리와 subscription 생명주기 전체를 이 hook이 소유하는 것은 아니다. | [qa-current-behavior.md](./qa-current-behavior.md), [module-hardening.md](./module-hardening.md) |
| `dashboard-app/src/dashboard/components/candidate-stash/useCandidateRecommendations.ts` | 추천 목록, 추천 로딩/오류, 기간별 추천 cache, 추천 배지 병합, 추천 후보 추가 mutation 후 추천 목록 정리 | 기본 후보 item 조회 실패와 상세 일괄확정 progress는 소유하지 않는다. 최신 조회 실패 시 기존 추천 ref 유지와 배지 실패 표시는 stale UX이며, 이전 seq 응답 무시는 async stale guard다. | [failure-ux-matrix.md](./failure-ux-matrix.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| `dashboard-app/src/dashboard/components/candidate-stash/useCandidateBulkDetailConfirm.ts` | 상세 일괄확정 요청, SSE subscription, progress popup 상태, busy 상태, 완료/실패 toast, job sequence guard | 기본 리스트 재조회, 스냅샷 저장/해제 계산, 추천 state를 소유하지 않는다. `mountedRef`는 unmount 방어이고 `sequenceRef`는 이전 상세확정 job의 SSE 이벤트/에러/close timer가 최신 progress를 덮지 못하게 하는 async stale guard다. 기간 변경 seq 방어는 caller 계약과 함께 다루되, 일괄확정 job 단위 guard는 이 hook의 내부 책임이다. | [module-hardening.md](./module-hardening.md), [qa-current-behavior.md](./qa-current-behavior.md), [failure-ux-matrix.md](./failure-ux-matrix.md) |

## CSS public facade 기준

- `dashboard-app/src/dashboard/components/common.module.css`는 dashboard 공통 CSS public facade다. TS/TSX는 `common-style-parts/**`를 직접 import하지 않고 이 파일을 통해 사용한다.
- `dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawer.module.css`는 2차 드로워 CSS public facade다. TS/TSX는 원칙적으로 `secondary/style-parts/**`를 직접 import하지 않는다.
- 현재 직접 import 예외는 `AiCommentCard.tsx`의 `../style-parts/cardAi.module.css` 참조다. 유지하거나 facade 뒤로 되돌리는 결정은 [hardening-status.md](./hardening-status.md)의 승인 필요 후보로 추적한다.
- 현재 경계 예외는 primary `SalesMetricsCard.tsx`가 secondary `secondaryDrawer.module.css`를 참조하는 구조다. 공통 metrics style로 분리할지 여부는 후속 하드닝에서 결정한다.

## 경계 점검 질문

- 이 파일이 화면, API, 계산, 저장 상태를 동시에 소유하고 있지 않은가?
- 이 컴포넌트가 mock 또는 브라우저 저장소를 직접 알고 있지 않은가?
- 백엔드가 제공해야 할 비즈니스 값을 프론트가 임의로 만들고 있지 않은가?
- 기능 이름과 파일/함수/컴포넌트 이름이 실제 책임을 정확히 말하는가?
- 하드닝 완료 파일을 수정해야 한다면 사용자에게 명시적 허가를 받았는가?

## Company selector source boundary

- Company selector 관련 문서 기준은 API 계약, header/auth boundary, 분석 페이지 boundary, 후보군 boundary, QA 기준, backend API spec으로 나뉜다.
- API 계약 문서는 company list 응답을 `uuid`, `name` 중심의 dropdown 계약으로 다루고, `전체` 선택 시 `companyUuid` 생략 규칙을 함께 다룬다.
- header boundary는 selector 위치를 업무 탭과 유틸리티 액션 사이로 고정하고, selector 책임을 전역 선택 상태까지로 제한한다.
- 자사/경쟁사 분석 boundary는 단일 회사 선택 시 분석 API 요청에 `companyUuid`가 포함된다는 정책을 소유한다.
- 후보군 boundary는 `전체` 선택 상태에서 오더 후보군 탭과 후보군 추가 액션을 비활성화하고, 오더 후보군 페이지 내부 제한 안내를 표시한다는 정책을 소유한다.
- 사용자별 회사 접근 권한 부여는 현재 source boundary 범위가 아니다. 권한 정책이 추가되면 `auth-admin.md`, `api-contracts.md`, backend API spec을 함께 갱신한다.
