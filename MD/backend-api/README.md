# Backend API 문서

Last updated: 2026-06-10

Purpose: 백엔드가 현재 프론트엔드 API 계약을 구현하기 위한 기준 문서 묶음.

## 읽는 순서

| 순서 | 문서 | 역할 |
|---|---|---|
| 1 | [dashboard-api-contract-catalog.md](./dashboard-api-contract-catalog.md) | 현재 endpoint, request, response, DTO 계약 |
| 2 | [backend-api-spec.md](./backend-api-spec.md) | 구현 주의점, scope, 실패 처리, SSE 규칙 |
| 3 | [order-snapshot-backend-contract.md](./order-snapshot-backend-contract.md) | 후보군 item `details`에 저장되는 snapshot v3 계약 |
| 4 | [order-snapshot-llm-field-guide.md](./order-snapshot-llm-field-guide.md) | LLM 코멘트용 snapshot field 해석 |
| 5 | [CHANGELOG.md](./CHANGELOG.md) | 계약 변경 이력 |

## 코드 기준 source of truth

| 코드 경로 | 역할 |
|---|---|
| `dashboard-app/src/api/types/*` | TypeScript API DTO/interface 계약 |
| `dashboard-app/src/api/types/dashboard-api.ts` | dashboard 업무 API 전체 인터페이스 |
| `dashboard-app/src/api/requests/httpDashboardRequests.ts` | 실제 HTTP endpoint 매핑 |
| `dashboard-app/src/api/requests/*Requests.ts` | 인증, 관리자, 회사, 입고일 수집 endpoint 매핑 |
| `dashboard-app/src/api/mock/*` | mock backend 대체 구현 |

## OLD 문서

2026-06-10 이전 backend API 문서는 아래로 보관했다.

| 경로 | 설명 |
|---|---|
| [OLD/2026-06-10-before-current-api-rewrite/backend-api-spec.md](./OLD/2026-06-10-before-current-api-rewrite/backend-api-spec.md) | 이전 backend spec |
| [OLD/2026-06-10-before-current-api-rewrite/dashboard-api-contract-catalog.md](./OLD/2026-06-10-before-current-api-rewrite/dashboard-api-contract-catalog.md) | 이전 contract catalog |

## 갱신 원칙

- API 타입, endpoint, request/response field, 에러 형식, SSE event가 바뀌면 `dashboard-api-contract-catalog.md`와 관련 TypeScript type을 같이 갱신한다.
- 구현 주의점, scope 정책, failure mapping, SSE 규칙이 바뀌면 `backend-api-spec.md`를 갱신한다.
- snapshot schema가 바뀌면 `order-snapshot-backend-contract.md`와 `dashboard-app/src/snapshot/orderSnapshotTypes.ts`를 같이 갱신한다.
- 이전 계약은 현재 catalog 안에 섞지 말고 `CHANGELOG.md` 또는 `OLD/`에 둔다.
