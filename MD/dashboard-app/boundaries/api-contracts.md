# Dashboard API Boundary

Last updated: 2026-06-18

이 문서는 `dashboard-app`에서 API 계약을 어떻게 소유하고 사용하는지 정리한다. 백엔드 endpoint의 상세 구현 기준은 `MD/backend-api/backend-api-spec.md`와 `MD/backend-api/dashboard-api-contract-catalog.md`를 따른다.

## 1. API 계층 원칙

- 화면, 훅, 컴포넌트는 `src/api` 밖의 mock 구현을 직접 호출하지 않는다.
- API 타입은 `src/api/types/*`에 interface 중심으로 정의한다.
- HTTP와 mock은 같은 `DashboardApi` 인터페이스를 구현한다.
- 백엔드가 제공하지 않는 값을 프론트에서 임의 생성하지 않는다.
- 누락/실패/빈 상태는 UI에서 드러내고, 성공처럼 감추지 않는다.

## 2. 주요 파일

| 파일 | 책임 |
|---|---|
| `src/api/types/index.ts` | API 타입 export 진입점 |
| `src/api/types/dashboard-api.ts` | `DashboardApi` 인터페이스 |
| `src/api/requests/dashboardRequests.ts` | HTTP/mock 어댑터 선택점 |
| `src/api/requests/httpDashboardRequests.ts` | 실제 HTTP path/query/body 직렬화 기준 |
| `src/api/requests/mockDashboardRequests.ts` | 계약형 mock 구현 |
| `src/api/requests/dashboardMasterDataCache.ts` | master data 캐시 래퍼 |
| `src/snapshot/orderSnapshotTypes.ts` | 후보 상세 저장 스냅샷 v5 타입 |
| `src/snapshot/parseOrderSnapshot.ts` | 스냅샷 파싱/검증 |

## 3. 요청 직렬화 기준

백엔드 구현자는 타입 이름만 보지 말고 `httpDashboardRequests.ts`의 실제 직렬화 기준을 확인해야 한다.

| 구분 | 기준 |
|---|---|
| path param | `skuGroupKey`, `stashUuid`, `itemUuid`, `jobId` 등은 URL path에 들어간다. |
| query | GET filter, subject query, DELETE 단건 scope 일부가 들어간다. |
| body | POST/PATCH payload와 bulk DELETE payload가 들어간다. |
| SSE query | SSE 구독은 query string으로 requestId/companyUuid/subject를 전달한다. |
| multipart | 엑셀 업로드는 `FormData`로 `file`과 `companyUuid`를 전달한다. |

예를 들어 `SecondaryAiCommentParams` 타입에는 `skuGroupKey`가 포함되지만, HTTP body에는 `skuGroupKey`가 들어가지 않는다. `skuGroupKey`는 `/products/{skuGroupKey}/secondary/ai-comment` path param으로 직렬화된다.

## 4. 회사 스코프

| 작업 | `companyUuid` 처리 |
|---|---|
| 읽기/list | 선택값이다. 전체 회사 스코프가 허용되는 API는 생략될 수 있다. |
| mutation/import/job | 필수값이다. 프론트 helper가 구체 회사 UUID를 요구한다. |
| 전체 회사 | `ALL_COMPANY_UUID`는 백엔드로 그대로 보내지 않고 생략하거나 구체 scope를 요구한다. |

`normalizeCompanyScopeParams`, `normalizeCompanyMutationScopeParams`, `getRequiredCompanyUuidForMutationScope`가 이 경계를 담당한다.

## 5. 상품 비교 subject

상품 API는 다음 query field를 사용한다.

| subject | fields |
|---|---|
| base | `baseRole`, `baseKind`, `baseSourceId?` |
| comparison | `comparisonRole`, `comparisonKind`, `comparisonSourceId?` |

`comparisonKind=competitor-channel`이면 `comparisonSourceId`가 필수이다. 프론트는 비교 대상을 API 결과 밖에서 임의 생성하지 않는다.

## 6. Product/Secondary 계약

| API | 역할 |
|---|---|
| `getProductDrawerBundle` | 기본 상품 드로어 번들 |
| `getProductComparisonTargets` | 비교 대상 목록 |
| `getProductMonthlyTrend` | 월간 추세 |
| `getProductSalesInsight` | 기간/비교 주체 민감 인사이트 |
| `getProductSecondaryDetail` | secondary 오더 상세 |
| `getSecondaryDailyTrend` | 일별 예측 소스 |
| `getSecondaryInboundSplitSource` | 입고 분할 원천 소스 |
| `getSecondaryStockOrderCalc` | 백엔드 단일 주문 계산점 |

`getSecondaryInboundSplitSource`는 적용된 분할 rows를 반환하지 않는다. 적용된 분할 결과는 `OrderSnapshotDocument.drawer2.confirmed.rounds`에 저장된다.

## 7. Candidate 계약

| 흐름 | API |
|---|---|
| 후보 풀 목록 | `getCandidateStashes` |
| 후보 항목 목록 | `getCandidateItemsByStash` |
| 추천 후보 조회 | `getCandidateRecommendations` |
| 후보 상세 확정 배치 | `startCandidateDetailBulkConfirm`, `subscribeCandidateDetailBulkConfirm` |
| 후보 LLM 코멘트 배치 | `startCandidateStashLlmCommentJob`, `subscribeCandidateStashLlmCommentJob` |
| 주문 지표 SSE | `subscribeCandidateOrderMetrics` |
| 후보 항목 저장 | `updateCandidateItem` |

`updateCandidateItem` 응답은 저장 후 최신 `CandidateItemDetail` 기준이다. 프론트는 이 응답을 저장 성공 상태로 반영하고 오래된 후속 GET이 이를 덮지 못하게 해야 한다.

## 8. DELETE 요청 차이

DELETE 요청은 모두 같은 형태가 아니다.

| API | path | query | body |
|---|---|---|---|
| `deleteCandidateStash` | `stashUuid` | `companyUuid` | none |
| `deleteCandidateItem` | `itemUuid` | `companyUuid` | none |
| `deleteCandidateItems` | `stashUuid` | none | `itemUuids`, `companyUuid` |

백엔드 문서와 구현은 이 차이를 명확히 반영해야 한다.

## 9. 인증 세션

`GET /auth/session`은 인증되지 않은 경우 `401`을 세션 없음으로 해석해 `null`을 반환할 수 있다. 따라서 프론트 타입/문서는 `AuthSession | null`을 기준으로 맞춘다.

## 10. 문서 갱신 규칙

API 계약이 바뀌면 다음을 같은 변경 단위에서 맞춘다.

- `src/api/types/*`
- `src/api/requests/httpDashboardRequests.ts`
- `src/api/requests/mockDashboardRequests.ts`
- `MD/backend-api/backend-api-spec.md`
- `MD/backend-api/dashboard-api-contract-catalog.md`
- 관련 boundary 문서
