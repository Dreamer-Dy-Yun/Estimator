# API / Mock Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-19 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app/src/api`, mock/HTTP adapter, API 타입 계약 |

## 핵심 원칙

- 화면, 훅, 컴포넌트는 mock 파일을 직접 import하지 않는다.
- API 타입은 `src/api/types/*`에 `interface` 우선으로 둔다.
- mock은 임시 데이터가 아니라 백엔드 계약 대체 구현체다.
- 백엔드가 제공해야 하는 비즈니스 값은 프론트에서 임의로 생성하지 않는다.

## public 진입점

| 경로 | 역할 |
|------|------|
| `api/client.ts` | 화면에서 호출하는 API 함수와 `dashboardApi` 객체를 노출하는 facade |
| `api/index.ts` | API public export |
| `api/requests/*` | mock/HTTP adapter 선택과 실제 요청 경계 |
| `api/requests/httpClient.ts` | `VITE_API_BASE_URL`, JSON/FormData 요청, 공통 에러, EventSource SSE 구독 |
| `api/mock.ts` | request adapter가 사용하는 mock API 진입 파일. 화면은 import하지 않는다 |

## 타입 계약

| 파일 | 소유 계약 |
|------|-----------|
| `types/dashboard-api.ts` | `DashboardApi` 전체 인터페이스 |
| `types/auth.ts` | 로그인, 세션, 사용자 정보, 비밀번호 변경 |
| `types/admin-gpt-key.ts` | GPT 키 관리 |
| `types/admin-google-sheet.ts` | Google Sheets API 설정 관리 |
| `types/candidate.ts` | 후보군, 후보 아이템, 추천, 상세확정 |
| `types/candidate-order-metrics.ts` | 총 오더 수량/금액 SSE |
| `types/drawer.ts` | 상품 1차 드로워 번들 |
| `types/sales.ts` | 자사/경쟁사 분석 요청/응답 |
| `types/secondary.ts` | 2차 드로워 상세, 재고·발주, AI 코멘트 |
| `types/snapshot.ts` | 저장 스냅샷 API 계약 |

## mock 경계

| 파일/영역 | 역할 |
|------|------|
| `mock/authApi.ts` | 런타임 메모리 기반 인증 mock |
| `mock/admin*Api.ts` | 관리자 사용자/GPT/구글 시트 mock |
| `mock/dashboardApi.ts` | 판매/드로워 mock public 조립 |
| `mock/candidateMockApi.ts` | 후보군 mock public method orchestration과 mutation entry |
| `mock/candidateMockStore.ts` | 후보군 seed/store 읽기와 list result 조립 |
| `mock/candidateItemSummaryBuilder.ts` | 기간 기준 후보 요약, 배지 평가, 오더 지표 DTO 조립 |
| `mock/candidateOrderMetricStream.ts` | 총 오더 지표 SSE mock |
| `mock/candidateDetailBulkConfirmStream.ts` | 상세 일괄확정 SSE mock |
| `mock/candidateStashLlmCommentJobStream.ts` | 후보군 LLM 코멘트 SSE mock |
| `mock/scatterGrid.ts` | 산점도 격자화 mock 계산. 운영에서는 백엔드 책임 |
| `mock/secondaryStockOrderCalcApi.ts` | 2차 재고·발주 계산 mock |

## request adapter 주의점

- `dashboardRequests.ts`는 `VITE_USE_MOCK_API`에 따라 mock/HTTP dashboard adapter를 선택하고 master data cache decorator를 적용하는 얇은 진입점이다.
- `mockDashboardRequests.ts`는 현재 세션의 `USER_ACCOUNT.uuid`를 request boundary에서만 붙인다. 화면 내부로 사용자 UUID를 흘리지 않는다.
- `httpDashboardRequests.ts`는 실제 백엔드 endpoint 경로를 `DashboardApi` 계약에 맞춰 연결한다.
- `dashboardMasterDataCache.ts`는 page와 공통 drawer가 공유하는 master data 요청을 coalesce한다. mutation 후 무효화 대상이 아닌 master data만 캐시한다.

## 백엔드 문서 연결

API 계약이 바뀌면 [../../backend-api/backend-api-spec.md](../../backend-api/backend-api-spec.md)를 같이 갱신한다.

백엔드는 프론트 타입 정의와 응답 JSON 필드명이 1:1로 맞아야 한다. 특히 후보군/스냅샷/SSE 계약은 프론트가 API 응답을 신뢰하고 과도하게 정규화하지 않는다는 전제로 동작한다.
