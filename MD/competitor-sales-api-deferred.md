# 경쟁사 분석 API·화면 — 보류 메모

## 상태 (2026-04)

- **경쟁사 분석 페이지**는 목업·기본 레이아웃 수준이고, **자사 분석(`SelfPage`)처럼 기간·필터 바를 두고 조건을 바꾸는 UI는 아직 없음.**
- 그래서 **`getCompetitorSales()`는 인자 없이 전체 행을 한 번에 주는 형태**로 두었고, **`getSelfSales(params)`**만 `startDate` / `endDate` / `brand` / `category`를 받는 **비대칭**이 남아 있음. 이는 “미완 화면 때문에 의도적으로 단순화한 것”에 가깝다.

## 코드 위치

| 항목 | 위치 |
|------|------|
| API 시그니처 | `dashboard-app/src/api/types.ts` — `DashboardApi` |
| 클라이언트 | `dashboard-app/src/api/client.ts` |
| 목업 | `dashboard-app/src/api/mock.ts` — `getSelfSales`, `getCompetitorSales` |
| 자사 목록 행 | `dashboard-app/src/types.ts` — `SelfSalesRow` |
| 경쟁 비교 행 (자사 필드 포함) | `dashboard-app/src/types.ts` — `CompetitorSalesRow` |
| 자사 페이지 | `dashboard-app/src/dashboard/pages/SelfPage.tsx` |
| 경쟁 페이지 | `dashboard-app/src/dashboard/pages/CompetitorPage.tsx` |

## 나중에 다시 볼 일 (스펙 정렬)

다른 목록 페이지 정리 후, 아래를 한 번에 결정하면 됨.

1. **경쟁사 분석에도** 자사와 동일하게 **기간·브랜드·카테고리**를 둘지.
2. 둔다면 `getCompetitorSales`에 **`SelfSalesParams`와 동형의 쿼리**(또는 공통 `AnalysisListParams`)를 두고, 목업도 `competitorSalesRows`에 필터·기간 가중을 적용할지.
3. **제품 정책**으로 “경쟁 비교는 항상 전체 스냅샷만”이면, 인자 없음 유지 + 문서에만 명시.

## 관련 이전 메모

- 요청 경계·`dashboardApi` 단일화: `MD/api-request-migration-plan.md`
- 1차/2차 드로어 분리: `MD/product-summary-primary-secondary-split.md`
