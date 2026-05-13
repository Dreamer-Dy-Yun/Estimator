# 현재 프로젝트 부족한 부분 / 문제점 1차 진단

| 항목 | 내용 |
|------|------|
| 작성 지시자 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-13 |
| 최종 수정일 | 2026-05-13 |
| 상태 | TODO |
| 적용 범위 | `dashboard-app`, `MD/backend-api`, CI, 테스트, 문서 |

## Goal

현재 프로젝트의 문서와 코드를 기준으로, 운영 전환 전에 부족하거나 위험한 부분을 먼저 짚는다.

## Scope

- `dashboard-app` 프론트엔드 구조
- `src/api` 계약/요청 경계
- mock 기반 인증/데이터 흐름
- 테스트와 CI 상태
- 프로젝트 문서와 온보딩 문서

## Principles

- 이미 동작하는 mock UI를 부정하지 않고, 운영 전환 관점에서 부족한 부분을 분리한다.
- 화면 개선보다 데이터 계약, 인증, 테스트, 배포 안정성을 우선해서 본다.
- 확실히 확인한 내용과 추정/질문이 필요한 내용을 나눈다.

## Findings

### P0. 실제 백엔드 연결이 아직 없다

- 근거: `dashboard-app/src/api/requests/dashboardRequests.ts`와 `authRequests.ts`가 여전히 `mockDashboardApi`, `mockAuthApi`를 호출한다.
- 근거: `MD/backend-api/backend-api-spec.md`도 현재 백엔드 엔드포인트가 아직 작성되지 않았고 `requests/*`를 HTTP로 교체하는 구조라고 설명한다.
- 영향: 화면은 완성도가 높아 보여도 실제 인증, 후보군 저장, 엑셀 업로드, SSE 분석, 운영 데이터 조회는 아직 mock/메모리/정적 파일 흐름이다.
- 제안: `authRequests`, `dashboardRequests`, `adminGptKeyRequests` 순서로 HTTP adapter 전환 계획을 별도 TODO로 만든다.

### P0. mock 인증이 운영 준비 상태가 아니다

- 근거: `authRequests.ts` 주석과 `backend-api-spec.md`에 mock 로그인은 입력값/비밀번호를 검증하지 않는다고 명시되어 있다.
- 영향: GitHub Pages 데모나 내부 시연에는 편하지만, 운영 URL과 혼동되면 보안 기대치가 크게 어긋난다.
- 제안: mock 모드 표시, 운영 빌드 차단 조건, 실제 백엔드 세션 전환 기준을 정한다.

### P1. API 계약은 상세하지만 단일 Source of Truth가 약하다

- 근거: TypeScript 타입, `backend-api-spec.md`, 여러 작업 MD가 함께 계약을 설명한다.
- 영향: 백엔드 구현이 시작되면 TS 타입, 문서, 실제 HTTP 스펙이 서로 어긋날 가능성이 높다.
- 제안: OpenAPI 또는 JSON Schema를 계약 기준으로 두고, 프론트 타입/codegen 또는 contract test를 붙인다.

### P1. 테스트는 생겼지만 UI 플로우 테스트가 부족하다

- 근거: `src/**/*.test.ts`는 존재하며 mock API, utils, snapshot parser, 일부 hook/model 테스트가 있다.
- 근거: `@testing-library/react`, `jsdom`, `jest-dom` 계열 의존성은 아직 없다.
- 영향: 계산/계약 일부는 보호되지만 로그인, 라우트 보호, 후보군 일괄 담기, 2차 드로워 비활성화, 후보군 상세 저장 같은 사용자 플로우 회귀는 잡기 어렵다.
- 제안: 우선순위 높은 플로우 3개만 DOM 테스트로 추가한다.

### P1. lint가 CI 품질 게이트가 아니다

- 근거: `package.json`에는 `lint` 스크립트가 있지만 `.github/workflows/deploy-dashboard.yml`은 `test:run`과 `build`만 실행한다.
- 영향: 기존 lint 실패가 있다는 운영 규칙 때문에 전체 lint를 바로 게이트로 삼기는 어렵지만, 신규 변경에서 lint 품질이 느슨해질 수 있다.
- 제안: touched-file lint 또는 단계적 lint 정리 TODO를 만든다.

### P1. 후보군/추천/배지 계산은 백엔드 성능 설계가 필요하다

- 근거: 후보군 목록은 `dataReferencePeriodStart`/`dataReferencePeriodEnd`에 따라 기간 전체 상품 분포를 먼저 계산하고, 그중 stash item만 반환해야 한다.
- 영향: 데이터가 커지면 기간 변경마다 무거운 집계가 발생할 수 있다.
- 제안: 기간+채널 단위 캐시, batch 계산, 명시적 조회 버튼/debounce 중 하나를 백엔드/UX 정책으로 정한다.

### P1. 엑셀 업로드는 계약과 mock만 있고 실제 검증 구현이 없다

- 근거: 프론트 adapter는 파일을 백엔드로 넘기는 구조이고, mock은 실제 엑셀 row parsing/import를 담당하지 않는다.
- 영향: 실제 업무에서는 업로드 검증 실패, 부분 성공, 중복 SKU, 수량 오류, 경고 메시지 UX가 핵심인데 아직 운영 검증이 없다.
- 제안: 업로드 검증 규칙과 실패 응답 예시를 먼저 확정한다.

### P2. README에 Vite 템플릿 원문이 남아 있다

- 근거: `dashboard-app/README.md` 하단에 Vite 기본 README 원문이 그대로 남아 있다.
- 영향: 치명적 문제는 아니지만 신규 작업자가 실제 프로젝트 정보와 템플릿 안내를 혼동할 수 있다.
- 제안: 템플릿 원문을 제거하고 프로젝트 실행/구조/문서 링크 중심으로 줄인다.

### P2. mock 데이터에 플레이스홀더 품질 이슈가 있다

- 근거: `salesTables.ts`에 `code: 'X'`, `productName: 'XXXXX'` 같은 확인용 데이터가 남아 있다.
- 영향: 시연/검증 시 실제 데이터 품질 문제처럼 보일 수 있다.
- 제안: mock seed를 의도된 테스트 데이터와 시연 데이터로 분리한다.

## Open Questions

- 백엔드는 이 저장소 안에서 구현할 예정인지, 별도 저장소/서비스로 갈 예정인지 확인이 필요하다.
- GitHub Pages 배포는 앞으로도 mock 데모로 유지할지, 운영 배포와 분리할지 정해야 한다.
- API 계약의 최종 기준은 TypeScript 타입, `backend-api-spec.md`, DB 스키마, OpenAPI 중 무엇으로 둘지 결정이 필요하다.
- 후보군 추천이 비어 있을 때 빈 배열을 보여줄지, 전체 후보를 fallback으로 보여줄지 백엔드 정책 확정이 필요하다.
- SSE 분석 작업은 모달이 닫혀도 계속 진행되는 정책인지, 취소 API가 필요한지 확인이 필요하다.

## Suggested Next TODOs

- `2026-05-13-backend-adapter-switch-plan.md`: mock 요청을 HTTP adapter로 바꾸는 단계별 계획.
- `2026-05-13-auth-hardening-plan.md`: 실제 로그인/세션/권한 정책 정리.
- `2026-05-13-ui-flow-test-plan.md`: 후보군/드로워/로그인 핵심 플로우 테스트 추가 계획.
- `2026-05-13-readme-cleanup.md`: Vite 템플릿 README 제거와 온보딩 문서 정리.

## Result

1차 진단 기준으로 가장 큰 리스크는 프론트 UI 완성도보다 실제 백엔드/인증/계약 검증의 부재다. 다음 작업은 백엔드 전환 계획과 인증 하드닝 계획을 먼저 쪼개는 것이 적절하다.

