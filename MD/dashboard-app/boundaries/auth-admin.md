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

## Admin data boundary

- `/admin`은 `src/admin`에서 관리 데이터(사용자, GPT 키, Google Sheet) 요청/표시를 담당한다.
- 백엔드/어댑터 계약이 바뀌면 `Admin*` 화면, API 타입, boundary 문서를 함께 갱신한다.
- 관리자 영역은 후보군/분석/드로워의 비즈니스 의사결정 책임을 직접 확장하지 않는다.
