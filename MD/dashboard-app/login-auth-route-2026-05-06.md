# 로그인·인증 라우트 도입

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-05-06 |
| 상태 | 반영 완료 |

## Goal

대시보드 앞단에 로그인 페이지를 추가하고, 현재 단계에서는 목 인증으로 모든 로그인 요청을 성공 처리한다.

## Scope

- `/login` 라우트 추가
- `/dashboard/*` 보호 라우트 적용
- mock 인증 API와 인증 타입 계약 추가
- 대시보드 상단 로그아웃 버튼 추가
- 대시보드 상단 사용자 정보 표시와 표시 이름 변경 모달 추가
- 문서와 백엔드 API 스펙 동시 갱신

## Principles

- 화면과 훅은 mock 구현을 직접 import하지 않는다.
- 인증 UI와 세션 상태는 `src/auth`가 소유한다.
- 인증 요청/응답 타입과 mock 동작은 `src/api` 경계 안에 둔다.
- 실제 백엔드 전환 시 화면 변경 없이 `AuthApi` 구현 교체로 갈 수 있게 둔다.

## Plan

1. `src/api/types/auth.ts`에 `AuthApi`, `LoginRequest`, `AuthSession` 계약을 둔다.
2. `src/api/mock/authApi.ts`에서 모든 로그인 요청을 성공 처리하고 sessionStorage에 세션을 저장한다.
3. `AuthProvider`, `RequireAuth`, `LoginPage`를 추가한다.
4. `App.tsx`에서 `/login`과 보호 라우트를 분리한다.
5. `DashboardLayout`에 로그아웃 동선을 추가한다.
6. 테스트와 빌드로 확인한다.

## Result

`/dashboard/*` 접근 시 세션이 없으면 `/login`으로 이동하고, 로그인 버튼을 누르면 입력값과 무관하게 mock 세션을 생성한 뒤 원래 경로로 복귀한다. 헤더 우상단에서는 사용자 이름과 역할을 보여주며, 사용자 정보 모달에서 표시 이름을 변경할 수 있다. 로그아웃은 현재 탭의 mock 세션을 제거하고 `/login`으로 보낸다.

## Non-goals

- 실제 백엔드 인증 구현
- 권한별 메뉴/화면 제한
- 사용자 ID/권한 변경
- 토큰 갱신, MFA, 비밀번호 재설정
