# 프로젝트 문서 관리 기준

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-07 |
| 최종 수정일 | 2026-06-18 |
| 상태 | 유지 문서 |

## 목적

이 폴더는 `D:\DEV\HAN.A` 프로젝트의 현재 구조, API 계약, 프론트엔드 책임 경계, 검증 기준, 작업 이력을 정리한다. 현재 구현과 직접 맞물리는 문서는 이 폴더의 상위 유지 문서에 둔다. 특정 날짜의 작업 결과, 이전 계약, 과거 요구사항은 `HISTORY` 또는 `OLD`에 보관한다.

문서는 코드와 같은 변경 단위로 갱신한다. 기능, API 계약, 폴더/파일 책임, 모듈 경계가 바뀌면 관련 문서를 같은 작업에서 맞춘다.

## 현재 기준 문서

| 문서 | 역할 |
|------|------|
| [dashboard-app/README.md](./dashboard-app/README.md) | 프론트엔드 문서 진입점 |
| [dashboard-app/frontend-overview.md](./dashboard-app/frontend-overview.md) | 화면, 주요 흐름, 데이터 책임 개요 |
| [dashboard-app/source-boundary-map.md](./dashboard-app/source-boundary-map.md) | 소스 폴더와 주요 파일의 책임 지도 |
| [dashboard-app/boundaries/README.md](./dashboard-app/boundaries/README.md) | 세부 boundary 문서 색인 |
| [dashboard-app/module-hardening.md](./dashboard-app/module-hardening.md) | 하드닝 완료 모듈과 수정 제한 기준 |
| [dashboard-app/test-strategy.md](./dashboard-app/test-strategy.md) | Vitest, Playwright, encoding check 기준 |
| [dashboard-app/deployment-hardening.md](./dashboard-app/deployment-hardening.md) | 배포와 runtime 검증 기준 |
| [backend-api/README.md](./backend-api/README.md) | 백엔드 API 문서 진입점 |
| [backend-api/dashboard-api-contract-catalog.md](./backend-api/dashboard-api-contract-catalog.md) | 백엔드가 구현할 endpoint, request, response catalog |
| [backend-api/backend-api-spec.md](./backend-api/backend-api-spec.md) | 인증, scope, error, SSE, 구현 주의사항 |
| [backend-api/order-snapshot-backend-contract.md](./backend-api/order-snapshot-backend-contract.md) | `OrderSnapshotDocument` v4 저장 계약 |
| [troubleshooting/README.md](./troubleshooting/README.md) | 반복 환경 문제와 판별법 |
| [HISTORY/README.md](./HISTORY/README.md) | 과거 계획, 완료 기록, 이전 요구사항 보관 기준 |

## 읽는 순서

1. 프로젝트 구조와 현재 작업 경계를 볼 때는 [dashboard-app/source-boundary-map.md](./dashboard-app/source-boundary-map.md)를 먼저 본다.
2. 화면 흐름을 이해할 때는 [dashboard-app/frontend-overview.md](./dashboard-app/frontend-overview.md)를 본다.
3. 특정 기능 책임을 수정할 때는 [dashboard-app/boundaries/README.md](./dashboard-app/boundaries/README.md)에서 해당 boundary 문서로 들어간다.
4. API endpoint, DTO, request/response를 바꿀 때는 [backend-api/dashboard-api-contract-catalog.md](./backend-api/dashboard-api-contract-catalog.md)를 기준으로 삼고, 구현 주의사항은 [backend-api/backend-api-spec.md](./backend-api/backend-api-spec.md)에 맞춘다.
5. 후보군 저장 snapshot을 바꿀 때는 [backend-api/order-snapshot-backend-contract.md](./backend-api/order-snapshot-backend-contract.md)와 `dashboard-app/src/snapshot/orderSnapshotTypes.ts`를 함께 갱신한다.
6. 날짜가 붙은 cleanup/result 문서는 현재 기준이 아니다. 필요한 내용은 유지 문서에 흡수하고, 이력은 `HISTORY`로 보낸다.

## 작성 기준

- 현재 동작과 계약을 설명한다. 과거 구현이나 이전 명칭은 필요할 때만 “이전 계약”으로 분리해 쓴다.
- API 문서는 백엔드가 endpoint를 구현할 수 있을 정도로 method, path, request, response, scope, failure rule을 명시한다.
- boundary 문서는 “누가 무엇을 소유하는가”를 중심으로 쓴다. 화면 설명, API 계약, mock 구현, 저장 snapshot, 사용자 결정 상태를 섞지 않는다.
- 문서가 길어질 경우 중복 설명을 늘리지 말고 색인, 책임 표, 하위 문서 링크로 나눈다.
- 한 파일의 현행 설명이 오래된 기록과 섞여 있으면, 필요한 경우 전면 재작성한다.

## 갱신 기준

| 변경 유형 | 함께 갱신할 문서 |
|----------|------------------|
| API endpoint, DTO, error, SSE 변경 | `backend-api/dashboard-api-contract-catalog.md`, `backend-api/backend-api-spec.md`, `dashboard-app/boundaries/api-contracts.md` |
| 상품 드로어, 주문 계산, 분할 입고, snapshot 변경 | `dashboard-app/boundaries/product-drawer.md`, `dashboard-app/source-boundary-map.md`, snapshot 관련 backend 문서 |
| 후보군, 추천, SSE, Excel 흐름 변경 | `dashboard-app/boundaries/candidate-stash.md`, backend API 문서 |
| 인증, 관리자, 권한 흐름 변경 | `dashboard-app/boundaries/auth-admin.md`, backend API 문서 |
| runtime, build, deploy, e2e 변경 | `dashboard-app/boundaries/repository-runtime.md`, `dashboard-app/deployment-hardening.md`, `dashboard-app/test-strategy.md` |
| CSS facade, style-parts 경계 변경 | `dashboard-app/boundaries/style-facades.md`, `dashboard-app/source-boundary-map.md` |

## 보존 기준

`HISTORY` 또는 `OLD`로 보낼 대상:

- 특정 날짜의 작업 결과만 담은 문서
- 현재 유지 문서에 흡수된 계획 문서
- 이전 API 계약, 이전 snapshot 구조, 이전 요구사항
- 구현 전 의사결정 기록으로만 가치가 있는 문서

보존 문서는 현재 계약처럼 읽히지 않게 날짜, 상태, 대체 문서를 명확히 적는다.
