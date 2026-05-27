# dashboard-app 테스트 전략

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-04-23 |
| 최종 수정일 | 2026-05-21 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app` 테스트 |

---

## 1. 목적

- 순수 로직, 파서, 유틸, 모델 계산의 회귀를 빠르게 잡는다.
- API 계약, 스냅샷 스키마, 데이터 흐름 변경 시 타입/단위 테스트로 먼저 검증한다.
- 로그인, 라우트 이동, 주요 모달/드로워 조립은 Playwright E2E smoke로 확인한다.
- 전체 시각 회귀보다 핵심 업무 흐름이 깨지지 않는지 확인하는 데 집중한다.

---

## 2. 도구 선택

| 영역 | 도구 | 이유 |
|------|------|------|
| 단위·통합 | **Vitest** | Vite와 동일 생태계, `vite.config` 확장 용이, Jest API 유사. |
| DOM/컴포넌트 | **@testing-library/react** | 사용자 관점 쿼리, 구현 디테일에 덜 종속. |
| E2E smoke | **Playwright** | Chromium 기준으로 실제 브라우저에서 로그인, 라우트, 모달, 드로워 조립을 확인한다. |

주요 스크립트는 다음과 같다.

| 스크립트 | 역할 |
|----------|------|
| `npm run test:run` | Vitest 배치 실행. `e2e/**`는 제외한다. |
| `npm run test:e2e` | Playwright Chromium E2E smoke 실행. |
| `npm run test:e2e:ui` | Playwright UI 모드로 시나리오 디버깅. |
| `npm run check:encoding` | `src`, `e2e`, `MD`, `AGENTS.md`의 한국어 인코딩 손상 점검. |

---

## 3. 디렉터리·파일 규칙

- 단위/통합 테스트는 검증 대상 소스와 가까운 `*.test.ts` / `*.test.tsx`로 둔다.
- Playwright E2E는 `dashboard-app/e2e` 아래에 둔다.
- E2E 공용 로그인, 런타임 오류 수집 같은 반복 로직은 `e2e/helpers`에 둔다.
- `vite.config.ts`에서 Vitest 대상에서 `e2e/**`를 제외한다. Playwright spec을 Vitest가 수집하면 실패한다.

---

## 4. 1차 우선순위 (무엇부터 테스트할지)

1. **`src/utils/adjacentListNavigation.ts`**
   - 순환 인덱스, `currentId`가 목록에 없을 때 동작, 길이 1·0 경계.

2. **`src/snapshot/parseOrderSnapshot.ts`** (및 스키마 검증이 있다면)
   - 유효/무효 JSON, 버전 필드, 필수 필드 누락 시 기대 에러.

3. **`src/dashboard/hooks/useProductDrawerBundle.ts`** (선택)
   - 훅은 `renderHook`으로 상태 전이가 많음 → 2단계로 미루거나, **훅 내부 분기 최소화 + 순수 함수 추출** 후 그 함수만 테스트.

   - 입력 고정 시 출력 숫자 스냅샷 또는 허용 오차.

5. **React 컴포넌트**
   - `FilterListCombo`, `FilterBar`는 상호작용·포털이 있어 비용 큼 → **유틸·모델 안정화 뒤** 소수만 도입.
   - `PaginatedTable`은 정렬 순서 보고, `aria-sort`, Enter/Space 정렬을 단위 테스트로 유지한다.
   - `useDashboardRequest`는 성공, 갱신 실패 시 기존 데이터 유지, stale 상태 표시를 DOM hook 테스트로 유지한다.

6. **Playwright E2E smoke**
   - `navigation.spec.ts`: mock 로그인 후 주요 라우트와 관리자 탭 이동을 확인한다.
   - `self-drawer.spec.ts`: 자사 분석 드로워 열기/닫기 흐름을 확인한다.
   - `analysis-bulk-add.spec.ts`: 분석 리스트에서 선택 상품 후보군 담기 모달 진입을 확인한다.
   - `candidate-stash.spec.ts`: 오더 후보군 상세의 조회 카드, 작업 카드, 추천 진입을 확인한다.
   - `candidate-stash-keyboard.spec.ts`: 후보군 내부 목록 키보드 포커스와 드로워 진입을 확인한다.
   - `inventory-arrival-collect.spec.ts`: 헤더의 입고 예정 수집 요약 토스트를 확인한다.
   - `admin-gpt-key.spec.ts`: 관리자 GPT 키 행 상세 팝업을 확인한다.
   - `admin-google-sheets.spec.ts`: 관리자 Google Sheets 상세 다이얼로그 열기/닫기를 확인한다.

---

## 5. Mock·경계

- **`mock.ts` 전체**는 통합 테스트보다 **실제 HTTP 대체 시 계약 테스트**(스키마 검증) 쪽이 유리.
- `localStorage`를 쓰는 코드는 Vitest에서 **`vi.stubGlobal` / 메모리 스토어**로 대체하거나, 해당 로직을 **주입 가능한 저장소 추상화**로 빼서 단위 테스트.

---

## 6. 설정 작업 목록 (구현 시)

현재 설정은 다음 파일에 있다.

| 파일 | 역할 |
|------|------|
| `vite.config.ts` | Vitest 설정과 `e2e/**` 제외. |
| `playwright.config.ts` | Playwright 테스트 디렉터리, dev server, Chromium 프로젝트, trace/report 정책. |
| `e2e/helpers/app.ts` | mock 로그인, runtime error 수집/검증 helper. |

현재 Playwright E2E smoke spec은 다음 8개다.

| 파일 | 역할 |
|------|------|
| `e2e/admin-google-sheets.spec.ts` | 관리자 Google Sheets 상세 다이얼로그 열기/닫기. |
| `e2e/admin-gpt-key.spec.ts` | 관리자 GPT 키 행 상세 팝업 확인. |
| `e2e/analysis-bulk-add.spec.ts` | 분석 리스트에서 선택 상품 후보군 담기 모달 진입 확인. |
| `e2e/candidate-stash-keyboard.spec.ts` | 후보군 내부 목록의 키보드 포커스와 드로워 진입 확인. |
| `e2e/candidate-stash.spec.ts` | 오더 후보군 상세의 조회 카드, 작업 카드, 추천 진입 확인. |
| `e2e/inventory-arrival-collect.spec.ts` | 헤더 입고 예정 수집 요약 토스트 확인. |
| `e2e/navigation.spec.ts` | 로그인 후 주요 라우트와 관리자 탭 이동 확인. |
| `e2e/self-drawer.spec.ts` | 자사 분석 드로워 열기/닫기 확인. |

---

## 7. 명시적으로 나중에 두는 것

- 스크린샷·시각적 회귀.
- `ProductSecondaryDrawer` 전체 렌더 (의존성·카드 수 많음).
- 백엔드 실제 연결 이후의 API 실패/권한/세션 만료 E2E.
- 모바일 전체 E2E 매트릭스. 현재는 Chromium 데스크톱 smoke가 기준이다.

---

## 8. 성공 기준 (1차 마일스톤)

- 로컬 일반 작업에서는 `npm run lint`, `npm run check:encoding`, `npm run test:run`, `npm run build`를 변경 범위에 맞게 실행한다.
- 로컬 Playwright E2E는 브라우저 구동 비용이 있으므로 사용자가 명시적으로 요청한 경우에 `npm run test:e2e`로 실행한다.
- GitHub Actions 배포 job에서는 `lint -> check:encoding -> test:run -> Playwright Chromium 설치 -> test:e2e -> build` 순서로 항상 통과해야 Pages 배포가 진행된다.
- `check:encoding`이 `MD`와 `AGENTS.md`까지 검사하므로 workflow trigger path에는 `dashboard-app/**`, `MD/**`, `AGENTS.md`, workflow 파일을 포함한다.
- 로직/API 계약 변경은 관련 Vitest를 동반한다.
- 라우트/모달/드로워/로그인 흐름 변경은 Playwright smoke 시나리오 갱신을 검토한다.

---

이 문서는 현재 테스트 경계 기준이다. 테스트 도구, 시나리오, 제외 범위가 바뀌면 코드와 함께 갱신한다.
---

## 2026-05-27 E2E 재구성 기준

자세한 실행 기준은 [e2e-strategy.md](./e2e-strategy.md)를 우선한다.

| 구분 | 명령 | 기준 |
|------|------|------|
| smoke | `npm run test:e2e` 또는 `npm run test:e2e:smoke` | `@smoke` 태그만 실행한다. 로그인, 핵심 이동, 기본 드로워, 후보군 상세, 입고예정일 toast를 빠르게 확인한다. |
| full | `npm run test:e2e:full` | `dashboard-app/e2e` 전체 spec을 실행한다. |
| admin | `npm run test:e2e:admin` | `@admin` 태그 spec만 실행한다. |
| candidate | `npm run test:e2e:candidate` | `@candidate` 태그 spec만 실행한다. |

GitHub Pages 배포 workflow는 브라우저 설치 비용 때문에 E2E를 직접 실행하지 않는다. E2E는 별도 `Dashboard E2E` workflow에서 수동으로 `smoke/full/admin/candidate` 중 하나를 선택해 실행한다.
