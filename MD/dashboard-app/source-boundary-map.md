# dashboard-app Source Boundary Map

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 최초 작성일 | 2026-05-06 |
| 최종 수정일 | 2026-05-27 |
| 상태 | 최신 문서 |
| 적용 범위 | `dashboard-app`, 프론트엔드 소스, 관련 배포/문서 경계 |

## 목적

이 문서는 구현 세부를 모두 설명하지 않는다. 작업자가 기능, API 계약, 화면 동작, 폴더/파일 책임을 찾을 때 가장 먼저 확인하는 인덱스다.

기능 책임이 바뀌면 이 문서와 해당 `boundaries/*` 문서를 함께 갱신한다. 문서가 코드 책임과 어긋나면 기존 문구를 보존하지 않고 현재 책임 기준으로 다시 쓴다.

## 빠른 탐색

| 확인할 것 | 먼저 볼 문서 | 대표 소스 |
|------|------|------|
| 저장소 런타임, 빌드, 라우팅, e2e | [repository-runtime.md](./boundaries/repository-runtime.md) | `.github/`, `dashboard-app/vite.config.ts`, `dashboard-app/e2e` |
| API facade, mock/HTTP mode, 실패 kind, company scope | [api-contracts.md](./boundaries/api-contracts.md) | `dashboard-app/src/api` |
| 로그인, 세션, 관리자 GPT/구글 시트 관리, admin mutation refresh | [auth-admin.md](./boundaries/auth-admin.md), [shared-modules.md](./boundaries/shared-modules.md) | `dashboard-app/src/auth`, `dashboard-app/src/admin` |
| 자사/경쟁사 분석 페이지와 필터 | [analysis-pages.md](./boundaries/analysis-pages.md) | `dashboard-app/src/dashboard/pages`, `dashboard-app/src/dashboard/components/*AnalysisList.tsx` |
| 후보군 상세, 추천, 배치, 상세확정, 저장 | [candidate-stash.md](./boundaries/candidate-stash.md) | `dashboard-app/src/dashboard/components/candidate-stash` |
| 상품 1차/2차 드로어, 계산, AI 코멘트, product secondary snapshot | [product-drawer.md](./boundaries/product-drawer.md) | `dashboard-app/src/dashboard/components/product-drawer`, `dashboard-app/src/snapshot` |
| 공통 UI, hooks/model/interaction/drawer, snapshot parser/test split, utils | [shared-modules.md](./boundaries/shared-modules.md) | `dashboard-app/src/components`, `dashboard-app/src/dashboard/hooks`, `dashboard-app/src/dashboard/drawer`, `dashboard-app/src/snapshot`, `dashboard-app/src/utils` |
| 현재 QA 기준과 검증 명령 | [qa-current-behavior.md](./qa-current-behavior.md), [qa-state-contracts.md](./qa-state-contracts.md), [test-strategy.md](./test-strategy.md) | `dashboard-app/src/**/*.test.*`, `dashboard-app/e2e` |
| 실패 kind별 UX surface와 금지 fallback | [failure-ux-matrix.md](./failure-ux-matrix.md), [qa-state-contracts.md](./qa-state-contracts.md) | `dashboard-app/src/api/types/api-error.ts`, `dashboard-app/src/api/requests/httpClient.ts` |
| 버튼, 카드, 패널, 리스트, 모달 UI 패턴 | [ui-patterns.md](./ui-patterns.md) | `dashboard-app/src/components`, `dashboard-app/src/dashboard/components`, CSS Modules |
| CSS public facade와 style-parts 직접 import 예외 | [hardening-status.md](./hardening-status.md) | `common.module.css`, `secondaryDrawer.module.css`, `tokens.css` |
| 하드닝 완료 모듈과 수정 허가 규칙 | [module-hardening.md](./module-hardening.md) | `dashboard-app/src/utils` 등 |
| 백엔드 API 상세 | [../backend-api/README.md](../backend-api/README.md) | `dashboard-app/src/api/types` |

## 기능별 갱신 기준

| 변경 내용 | 같이 갱신할 문서 |
|------|------|
| API 요청/응답 DTO, SSE event, 실패 kind, mock/HTTP adapter, company scope | [api-contracts.md](./boundaries/api-contracts.md), [../backend-api/backend-api-spec.md](../backend-api/backend-api-spec.md) |
| 분석 페이지 필터, 기간 조회, 경쟁사 선택, 후보군 열기 방식 | [analysis-pages.md](./boundaries/analysis-pages.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| 후보군 상세 조회, 추천, 배치, SSE, 상세확정/해제/삭제, 목록 refresh 실패 | [candidate-stash.md](./boundaries/candidate-stash.md), [../backend-api/backend-api-spec.md](../backend-api/backend-api-spec.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| 추천 append guard, append 결과 판정, 중복 append busy guard | [candidate-stash.md](./boundaries/candidate-stash.md), [qa-current-behavior.md](./qa-current-behavior.md), [module-hardening.md](./module-hardening.md) |
| 상품 드로어 scope, AI 코멘트, 재고/발주 계산, product secondary snapshot 저장/복원 | [product-drawer.md](./boundaries/product-drawer.md), [../backend-api/backend-api-spec.md](../backend-api/backend-api-spec.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| 로그인/관리자 화면, GPT 키, 구글 시트 설정, admin mutation refresh helper | [auth-admin.md](./boundaries/auth-admin.md), [shared-modules.md](./boundaries/shared-modules.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| 공통 UI, table, toast, spinner, keyboard interaction, drawer DOM helper, utils | [shared-modules.md](./boundaries/shared-modules.md), [ui-patterns.md](./ui-patterns.md), [module-hardening.md](./module-hardening.md) |
| snapshot type/parser/test split | [shared-modules.md](./boundaries/shared-modules.md), [product-drawer.md](./boundaries/product-drawer.md), [test-strategy.md](./test-strategy.md) |
| CSS public facade, selector 중복, token 후보 | [hardening-status.md](./hardening-status.md), [ui-patterns.md](./ui-patterns.md) |
| loading, empty, error, permission, stale, disabled UX | [failure-ux-matrix.md](./failure-ux-matrix.md), [qa-state-contracts.md](./qa-state-contracts.md), [qa-current-behavior.md](./qa-current-behavior.md) |
| e2e/CI/build/router/deploy | [repository-runtime.md](./boundaries/repository-runtime.md), [test-strategy.md](./test-strategy.md) |

## 기본 파일 배치 규칙

- 화면 라우트 조립은 `dashboard/pages`에 둔다.
- 데이터 접근은 `src/api` 뒤에 둔다. 페이지/컴포넌트/훅은 mock을 직접 import하지 않는다.
- 자사/경쟁사 분석 전용 UI는 `dashboard/components` 또는 분석 전용 하위 컴포넌트에 둔다.
- 후보군 상세/추천/상세확정/저장 관련 UI와 hook은 `dashboard/components/candidate-stash`에 둔다.
- 상품 드로어 관련 UI와 hook은 `dashboard/components/product-drawer`에 둔다.
- React와 API 구현에 의존하지 않는 순수 보조 함수는 `src/utils` 또는 해당 feature의 `model`에 둔다.
- snapshot 문서 타입과 parser는 `src/snapshot`이 소유한다. product drawer는 snapshot을 생성/소비하는 feature 책임을 가진다.
- 테스트는 특별한 이유가 없으면 대상 파일 옆의 `*.test.ts(x)`에 둔다. 브라우저 e2e 흐름은 `e2e/`에 둔다.

## 최근 반영된 경계

| 영역 | 책임 |
|------|------|
| snapshot test split | `parseOrderSnapshot.validation.test.ts`는 저장/API JSON validation, `buildSecondaryOrderSnapshot.test.ts`는 snapshot builder, `orderSnapshotTestFixtures.ts`는 fixture 책임을 맡는다. product secondary UI/hook 테스트는 드로어 흐름과 사용자 interaction만 검증한다. |
| adminMutationRefresh | 관리자 write 성공과 후속 refresh 실패를 분리하는 helper다. write 성공을 실패로 되돌리지 않고 warning/stale 상태를 별도로 드러낸다. |
| product secondary snapshot | 2차 드로어는 계산 입력, 계산 결과, AI 코멘트, 확정 수량을 snapshot으로 생성한다. 계산 실패/미계산 상태를 0 값으로 저장하지 않는다. |
| review lifecycle residue | 완료된 과거 review가 `mulAg/md/review`에 남아 있으면 대량 이동 대신 현재 plan 또는 `mulAg/md/README.md`에 정리 원칙과 후속 조치를 먼저 남긴다. |

## 경계 자가 질문

- 이 파일이 화면, API, 계산, 저장 상태를 동시에 소유하고 있지 않은가?
- 컴포넌트가 mock 또는 브라우저 저장소를 직접 보고 있지 않은가?
- 백엔드가 제공해야 할 비즈니스 값을 프론트가 임의로 만들고 있지 않은가?
- 파일/함수/컴포넌트 이름이 실제 책임을 정확히 말하는가?
- 하드닝 완료 파일을 수정해야 한다면 사용자에게 명시적 허가를 받았는가?

## 2026-05-27 documentation/API alignment addendum

### Candidate append contract

- Singular candidate append is documented separately from bulk append.
- Singular append must carry required `details: OrderSnapshotDocumentV2` and `isLatestLlmComment` state.
- Singular append success follows the frontend `Promise<void>` contract and should be documented as empty/no-content response, not as an item summary response.
- Bulk append may keep its batch shape and `CandidateStashItemSummary[]` response, but it must not be used as the source of truth for singular append item fields or response shape.

### Candidate detail drawer scope

- Candidate detail drawer must preserve explicit selected company scope through item detail, primary bundle, secondary detail, and secondary mutation calls.
- Product drawer's normal read-like optional all-company scope remains valid for analysis-page reads, but a candidate detail drawer opened in a single-company context must not silently drop `companyUuid`.
- Secondary mutations from the detail drawer remain mutation-scope flows and require a concrete `companyUuid`.

### Toast accessibility policy

- Warning toast copy is consistent with the current component policy when it is announced as `role="status"` with polite live-region behavior.
- Only error toasts should use alert/assertive behavior.
- Documentation references to warning toast should not describe warning as `alert` or `assertive` unless the component policy changes.
