# mock.ts 모듈 분리 계획

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-23 |
| 변경일 | 2026-04-23 |
| 지시 | Yun Daeyoung |

---

## 목적

- `src/api/mock.ts` 단일 대형 파일을 도메인별 TS 모듈로 분리.
- `client.ts`의 `import { mockDashboardApi } from './mock'` 유지.

## 모듈 경계

| 파일 | 책임 |
|------|------|
| `mock/salesTables.ts` | 경쟁 채널·자사/경쟁 판매 행, `allKnownProductIds`, brands, categories |
| `mock/productCatalog.ts` | 월·시즌·사이즈 믹스·1차/2차 상품 맵·`stockTrendById`·`estimatePeriodWeight`·`makeSalesTrend` |
| `mock/salesKpiColumn.ts` | `buildMockSalesKpiColumn` |
| `mock/orderSnapshotForCandidate.ts` | `buildMockOrderSnapshotForCandidate` |
| `mock/candidateSeeds.ts` | 시드 후보군/아이템, `ensureCandidateSeed` |
| `mock/secondaryDailyTrend.ts` | 일간 트렌드 생성 + `zFromServiceLevelPct` 등 재고연산 보조 |
| `mock/dashboardApi.ts` | `mockDashboardApi` 객체 |
| `mock.ts` | `export { mockDashboardApi } from './mock/dashboardApi'` |

## 검증

- `npm run test:run`, `npm run build`
