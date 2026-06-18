# Backend API 문서

Last updated: 2026-06-18

## 목적

이 폴더는 백엔드가 `dashboard-app`의 현재 API 계약을 구현하기 위한 기준 문서다. 프론트엔드 타입과 request adapter가 실제로 소비하는 endpoint, request, response, error, SSE 규칙을 설명한다.

## 읽는 순서

| 순서 | 문서 | 역할 |
|------|------|------|
| 1 | [dashboard-api-contract-catalog.md](./dashboard-api-contract-catalog.md) | 백엔드 구현용 endpoint catalog. method, path, request, response를 함수명 기준으로 매핑한다. |
| 2 | [backend-api-spec.md](./backend-api-spec.md) | 인증, company scope, comparison subject, validation, error mapping, SSE transport 규칙. |
| 3 | [order-snapshot-backend-contract.md](./order-snapshot-backend-contract.md) | 후보 item `confirmedOrderSnapshot`에 저장되는 `OrderSnapshotDocument` v7 계약. |
| 4 | [order-snapshot-llm-field-guide.md](./order-snapshot-llm-field-guide.md) | LLM 코멘트/프롬프트용 snapshot field 해석 가이드. |
| 5 | [CHANGELOG.md](./CHANGELOG.md) | 현재 계약으로 오기까지의 주요 변경 이력. |

## 코드 기준 source of truth

| 코드 경로 | 역할 |
|----------|------|
| `dashboard-app/src/api/types/*` | TypeScript DTO/interface 계약 |
| `dashboard-app/src/api/types/dashboard-api.ts` | dashboard 업무 API 전체 interface |
| `dashboard-app/src/api/requests/httpDashboardRequests.ts` | HTTP endpoint mapping |
| `dashboard-app/src/api/requests/*Requests.ts` | 인증, 관리자, 회사, 입고일 수집 endpoint mapping |
| `dashboard-app/src/api/mock/*` | mock backend 대체 구현 |
| `dashboard-app/src/snapshot/orderSnapshotTypes.ts` | `OrderSnapshotDocument` v7 type source |

## 현재 핵심 계약

- Base path는 `/api/v1`이다.
- 인증은 cookie 기반이며 request body/query에 token을 싣지 않는다.
- response JSON field는 TypeScript DTO field와 1:1로 맞춘다.
- read/list API에서 `companyUuid`는 optional일 수 있다. mutation, import, job, SSE는 concrete company scope가 필요하다.
- product drawer 계열은 `companyUuid` 대신 `base`/`comparison` subject query를 사용한다.
- `comparison.kind`는 `competitor-channel` 또는 `self-company`일 수 있다. 백엔드는 legacy competitor-only 가정으로 처리하면 안 된다.
- `getDashboardRuntimeConfig`의 `candidateOrderMetricComparison`은 후보군 order metric SSE의 comparison source다.
- `getSecondaryDailyTrend`는 chart-ready row가 아니라 `SecondaryDailyTrendSource`를 반환한다.
- `getSecondaryInboundSplitSource`는 split count/date/result row를 모르는 source-only API다. query는 `calculationBaseDate`, `coverageStartDate`, exclusive `coverageEndDate`를 사용한다.
- 후보 item `confirmedOrderSnapshot`는 `OrderSnapshotDocument | null`이고 현재 schema version은 `7`다.

## OLD 문서

2026-06-10 이전 backend API 문서는 아래에 보관한다. OLD 문서는 현재 계약이 아니다.

| 경로 | 설명 |
|------|------|
| [OLD/2026-06-10-before-current-api-rewrite/backend-api-spec.md](./OLD/2026-06-10-before-current-api-rewrite/backend-api-spec.md) | 이전 backend spec |
| [OLD/2026-06-10-before-current-api-rewrite/dashboard-api-contract-catalog.md](./OLD/2026-06-10-before-current-api-rewrite/dashboard-api-contract-catalog.md) | 이전 contract catalog |

## 갱신 원칙

- endpoint, request, response, DTO, SSE event가 바뀌면 catalog와 관련 TypeScript type을 같이 갱신한다.
- 인증, scope, validation, failure mapping, SSE transport 규칙이 바뀌면 spec을 같이 갱신한다.
- snapshot schema가 바뀌면 snapshot backend contract와 `dashboard-app/src/snapshot/*`를 같이 갱신한다.
- 이전 계약은 current catalog에 섞지 않는다. 필요한 경우 `CHANGELOG.md` 또는 `OLD/`에 남긴다.
