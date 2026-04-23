# dashboard-app 테스트 도입 전략 (안)

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-23 |
| 변경일 | 2026-04-23 |
| 지시 | Yun Daeyoung |

---

## 1. 목적

- 회귀 방지(순수 로직·파서·유틸).
- API 계약·스냅샷 스키마 변경 시 **빠른 검증**.
- E2E는 비용이 크므로 **후순위**; 단위·소수 통합에 집중.

---

## 2. 도구 선택

| 영역 | 도구 | 이유 |
|------|------|------|
| 단위·통합 | **Vitest** | Vite와 동일 생태계, `vite.config` 확장 용이, Jest API 유사. |
| DOM/컴포넌트 | **@testing-library/react** | 사용자 관점 쿼리, 구현 디테일에 덜 종속. |
| E2E (선택) | **Playwright** | Chromium 기준 먼저, CI 연동 쉬움. 1차 도입에서는 생략 가능. |

`package.json`에 `test` / `test:watch` 스크립트 추가, CI에서는 `npm run test -- --run` 배치 모드.

---

## 3. 디렉터리·파일 규칙

- 소스 옆에 두지 않고, 가능하면 **같은 디렉터리에 `*.test.ts`** 또는 `src/**/__tests__/*.test.ts` 중 하나로 통일(프로젝트 결정 후 고정).
- 권장: **`src/utils/*.test.ts`**, **`src/snapshot/*.test.ts`** 처럼 **테스트하기 쉬운 모듈부터** 옆에 두기 — 탐색 비용 낮음.

---

## 4. 1차 우선순위 (무엇부터 테스트할지)

1. **`src/utils/adjacentListNavigation.ts`**  
   - 순환 인덱스, `currentId`가 목록에 없을 때 동작, 길이 1·0 경계.

2. **`src/snapshot/parseOrderSnapshot.ts`** (및 스키마 검증이 있다면)  
   - 유효/무효 JSON, 버전 필드, 필수 필드 누락 시 기대 에러.

3. **`src/dashboard/hooks/useProductDrawerBundle.ts`** (선택)  
   - 훅은 `renderHook`으로 상태 전이가 많음 → 2단계로 미루거나, **훅 내부 분기 최소화 + 순수 함수 추출** 후 그 함수만 테스트.

4. **`src/dashboard/components/product-secondary/model/clientStockOrderCompute.ts`** / **`secondaryPanelCalc.ts`**  
   - 입력 고정 시 출력 숫자 스냅샷 또는 허용 오차.

5. **React 컴포넌트**  
   - `FilterListCombo`, `FilterBar`는 상호작용·포털이 있어 비용 큼 → **유틸·모델 안정화 뒤** 소수만 도입.

---

## 5. Mock·경계

- **`mock.ts` 전체**는 통합 테스트보다 **실제 HTTP 대체 시 계약 테스트**(스키마 검증) 쪽이 유리.
- `localStorage`를 쓰는 코드는 Vitest에서 **`vi.stubGlobal` / 메모리 스토어**로 대체하거나, 해당 로직을 **주입 가능한 저장소 추상화**로 빼서 단위 테스트.

---

## 6. 설정 작업 목록 (구현 시)

1. `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react` (이미 react 플러그인 있음)  
2. `vite.config.ts`에 `test: { environment: 'jsdom', globals: true }` 등 추가.  
3. `src/test/setup.ts`에서 `@testing-library/jest-dom` import.  
4. `tsconfig`에 Vitest 타입 참조(필요 시).  
5. `npm run test` 스크립트 추가.

---

## 7. 명시적으로 나중에 두는 것

- 스크린샷·시각적 회귀.
- 전 페이지 E2E (로그인·백엔드 없을 때 가치 제한적).
- `ProductSecondaryPanel` 전체 렌더 (의존성·카드 수 많음).

---

## 8. 성공 기준 (1차 마일스톤)

- CI 또는 로컬에서 `npm run test`가 **항상 녹색**.
- 위 **§4의 1·2번** 파일에 의미 있는 케이스 **각 5개 내외** 커버.
- 이후 PR마다 “로직 변경 시 테스트 동반” 룰을 팀에 맞게 채택.

---

이 문서는 **구현 전 합의용**입니다. 실제 `vitest` 설치·설정은 별도 작업으로 진행하면 됩니다.
