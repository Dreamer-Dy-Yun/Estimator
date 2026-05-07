# 로그인·인증 라우트 도입

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-06 |
| 상태 | 반영 완료 |

## Goal

대시보드 앞단에 로그인 페이지를 추가하고, 목 인증 단계에서도 로그인 ID/비밀번호 계약과 세션 흐름을 분리한다.

## Scope

- `/login` 라우트 추가
- `/dashboard/*` 보호 라우트 적용
- mock 인증 API와 인증 타입 계약 추가
- 대시보드 상단 로그아웃 버튼 추가
- 대시보드 상단 사용자 정보 표시와 로그인 ID/비밀번호 변경 모달 추가
- 문서와 백엔드 API 스펙 동시 갱신

## Principles

- 화면과 훅은 mock 구현을 직접 import하지 않는다.
- 인증 UI와 세션 상태는 `src/auth`가 소유한다.
- 인증 요청/응답 타입과 mock 동작은 `src/api` 경계 안에 둔다.
- 실제 백엔드 전환 시 화면 변경 없이 `AuthApi` 구현 교체로 갈 수 있게 둔다.

## Plan

1. `src/api/types/auth.ts`에 `AuthApi`, `LoginRequest`, `AuthSession` 계약을 둔다.
2. `src/api/mock/authApi.ts`에서 동작 확인용으로 로그인 입력값을 검증 없이 통과시키고 세션은 런타임 메모리에만 둔다.
3. `AuthProvider`, `RequireAuth`, `LoginPage`를 추가한다.
4. `App.tsx`에서 `/login`과 보호 라우트를 분리한다.
5. `DashboardLayout`에 로그아웃 동선을 추가한다.
6. 테스트와 빌드로 확인한다.

## Result

`/dashboard/*`와 `/admin` 접근 시 세션이 없으면 `/login?redirect=...`으로 이동하고, 로그인 성공 시 원래 경로로 복귀한다. mock 로그인은 아무 ID/PW를 통과시키며, `mock-user`만 일반 사용자 권한 확인용으로 남기고 그 외 입력은 관리자 권한으로 처리한다. 헤더 우상단에서는 로그인 ID와 역할을 보여주며, 사용자 정보 모달에서 로그인 ID와 비밀번호 변경 API를 호출할 수 있다. 사용자 엔티티 식별자는 UUID이고, 로그인 ID는 인증용 계정 값이다. 로그아웃은 현재 런타임 mock 세션을 제거하고 `/login`으로 보낸다.

## Non-goals

- 실제 백엔드 인증 구현
- 권한별 메뉴/화면 제한
- UUID 변경
- 토큰 갱신, MFA, 비밀번호 재설정
