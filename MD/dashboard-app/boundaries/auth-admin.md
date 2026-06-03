# Auth / Admin Boundary

Last updated: 2026-06-02

## Scope

인증, 세션 부트스트랩, 권한 기반 라우트 가드, 관리자 화면의 책임 범위를 정리한다.

## Source ownership

| 파일 | 역할 |
|---|---|
| `src/auth/AuthContext.ts` | 인증 context 타입/기본 인터페이스 |
| `src/auth/AuthProvider.tsx` | 세션 초기화, 로그인/로그아웃 상태 갱신, 인증 이벤트 브로드캐스트 |
| `src/auth/RequireAuth.tsx` | 인증 필요 라우트 가드 |
| `src/auth/RequireAdmin.tsx` | 관리자 권한 라우트 가드 |
| `src/auth/LoginPage.tsx` | 로그인 화면 진입 및 세션 생성 흐름 |
| `src/auth/UserProfileDialog.tsx` | 사용자 프로필 표시/수정 UI |
| `src/dashboard/DashboardLayout.tsx` | 헤더 공통 UI(회사 선택/프로필), 인증 경로 진입점 구성 |
| `src/admin/AdminPage.tsx` | 관리자 페이지 오케스트레이션 |
| `src/admin/Admin*.tsx` | 사용자/키/시트 관리 하위 UI |

## 라우트 경계

`src/App.tsx`의 라우트 구성:

- `/login`: 로그인 페이지
- `/` 및 `/v2/*`: 인증 필요 시 `/dashboard/self`로 이동
- `/dashboard/*`: 인증 필요 영역
  - `/dashboard/self`
  - `/dashboard/competitor`
  - `/dashboard/snapshot-confirm`
  - `/dashboard/snapshot-confirm/:stashUuid`는 `/dashboard/snapshot-confirm`로 redirect
- `/admin`: `RequireAdmin` 가드 적용
- `*`: `/dashboard/self` fallback

## Boundary rules

- 로그인은 `AuthProvider`를 통과한 상태에서 세션이 구성되며, UI 계층은 mock/http 구현을 직접 임포트하지 않는다.
- API adapter mode는 `API_ADAPTER_MODE` / 환경변수 기반으로 분기되며, auth boundary는 adapter 결과만 소비한다.
- `RequireAdmin` 실패는 로그인 상태는 유지하면서 관리자 전용 화면 진입을 막고 적절한 경로로 유도한다.

## Mock / real login behavior

- mock과 real 로그인 차이는 adapter 내부 동작 차이로만 유지한다. `LoginPage`, `AuthProvider`, route guard는 모두 `AuthApi`/`authRequests` 결과만 소비하며 `src/api/mock/authApi.ts` 또는 HTTP 구현을 직접 임포트하지 않는다.
- `mock/authApi.ts` 로그인은 UI 검증용으로 permissive하다. 입력 `loginId`를 정규화해 mock 사용자와 매칭하고, 없으면 기본 mock 관리자 세션을 만들며, 비밀번호 검증/계정 잠금/비활성 계정 거부를 실제 backend처럼 수행하지 않는다.
- real backend 로그인은 fallback 세션을 만들지 않는다. backend는 `password_hash`, `is_active`, `failed_login_count`/lock policy, `must_change_password`를 서버에서 검증하고, 실패를 성공 세션처럼 감추지 않아야 한다.
- 따라서 mock/real 전환 시 UI import boundary는 바꾸지 않고 `authRequests.ts` adapter 구현과 `src/api/types/auth.ts`, 백엔드 계약 문서만 함께 정렬한다.

## Admin data boundary

- `/admin`은 `src/admin`에서 관리 데이터(사용자, GPT 키, Google Sheet) 요청/표시를 담당한다.
- 백엔드/어댑터 계약이 바뀌면 `Admin*` 화면, API 타입, boundary 문서를 함께 갱신한다.
- 관리자 영역은 후보군/분석/드로워의 비즈니스 의사결정 책임을 직접 확장하지 않는다.
