# Backend API 문서

Last updated: 2026-06-19

## 목적

이 폴더는 `dashboard-app`이 현재 사용하는 백엔드 API 계약을 정리한다.
백엔드 구현자는 TypeScript 타입명만 보고 요청 직렬화를 추측하지 말고, 이 문서의 path/query/body/response 구분과 `dashboard-app/src/api/requests/httpDashboardRequests.ts`를 함께 확인해야 한다.

## 읽는 순서

| 순서 | 문서 | 역할 |
|---:|---|---|
| 1 | [dashboard-api-contract-catalog.md](./dashboard-api-contract-catalog.md) | endpoint별 method, path, path params, query, body, response catalog |
| 2 | [backend-api-spec.md](./backend-api-spec.md) | 공통 인증, scope, subject, error, SSE, Product/Secondary 상세 계약 |
| 3 | [order-snapshot-backend-contract.md](./order-snapshot-backend-contract.md) | 후보 item에 저장되는 `OrderSnapshotDocument` v8 저장/복원 계약 |
| 4 | [order-snapshot-llm-field-guide.md](./order-snapshot-llm-field-guide.md) | snapshot을 LLM 프롬프트로 변환할 때의 field 해석 기준 |
| 5 | [CHANGELOG.md](./CHANGELOG.md) | 최근 API/DTO 변경 이력 |

## 코드 기준 source of truth

| 코드 경로 | 역할 |
|---|---|
| `dashboard-app/src/api/types/*` | TypeScript DTO/interface 계약 |
| `dashboard-app/src/api/types/dashboard-api.ts` | dashboard 업무 API interface |
| `dashboard-app/src/api/requests/httpDashboardRequests.ts` | HTTP endpoint path/query/body 직렬화 기준 |
| `dashboard-app/src/api/requests/mockDashboardRequests.ts` | mock adapter 진입점 |
| `dashboard-app/src/api/mock/*` | mock backend 대체 구현 |
| `dashboard-app/src/snapshot/orderSnapshotTypes.ts` | `OrderSnapshotDocument` v8 type source |
| `dashboard-app/src/snapshot/parseOrderSnapshot.ts` | snapshot parse/validation 기준 |

## 현재 핵심 계약

- Base path는 `/api/v1`이다.
- 인증은 cookie 기반 session이며 frontend HTTP client는 `credentials: include`로 요청한다.
- response JSON field명은 TypeScript DTO field명과 1:1로 맞춘다.
- read/list API는 `companyUuid`가 optional일 수 있다.
- mutation/import/job/SSE API는 concrete company scope가 필요하다.
- product drawer 계열 API는 top-level `companyUuid` 대신 `base`/`comparison` subject query를 사용한다.
- `getSecondaryDailyTrend` 응답은 `{ size, baseStock, data: { base, comparison } }` 형태의 `SecondaryDailyTrendSource`이다.
- `getSecondaryDailyTrend`의 size-specific 요청 추가값은 `size?`뿐이다. 입고일, `selfWeightPct` 같은 stock-order 전용 값은 보내지 않는다.
- `getSecondaryStockOrderCalc` 응답의 `inboundSplitSource`는 오더 상세 추천과 분할입고 제안이 공유하는 planning source이다.
- `inboundSplitSource` 형태는 `{ total, sizeInfo, expectation, confirmed }`이다.
- 분할 차수, 분할 입고일, 적용된 확정 수량, `ignoreExistingOrderInbound`는 `/secondary/stock-order-calc` 요청 필드가 아니라 UI/snapshot 상태이다.
- 후보 item `confirmedOrderSnapshot`은 `OrderSnapshotDocument | null`이고 현재 schema version은 `8`이다.

## 갱신 원칙

- endpoint, request, response, DTO, SSE event가 바뀌면 catalog와 TypeScript type을 함께 갱신한다.
- 인증, scope, validation, failure mapping, SSE transport 규칙이 바뀌면 spec을 갱신한다.
- snapshot schema가 바뀌면 snapshot backend contract와 `dashboard-app/src/snapshot/*`를 함께 갱신한다.
- 오래된 계약은 current 문서 앞에 두지 않는다. 필요하면 `CHANGELOG.md` 또는 `OLD/`로 분리한다.
