# Auth / Admin Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-19 |
| 상태 | 유지 문서 |
| 적용 범위 | `src/auth`, `src/admin`, 관리자 API 화면 |

## 인증

| 파일/영역 | 역할 |
|------|------|
| `src/auth/AuthContext.ts` | 인증 context와 `useAuth` public hook |
| `src/auth/AuthProvider.tsx` | 세션 로딩과 API 호출 orchestration |
| `src/auth/RequireAuth.tsx` | 일반 보호 라우트 |
| `src/auth/RequireAdmin.tsx` | 관리자 보호 라우트 |
| `src/auth/LoginPage.tsx` | 로그인 화면 |
| `src/auth/UserProfileDialog.tsx` | 사용자 정보/비밀번호 변경 모달 |

## 인증 정책

- 권한은 `admin`과 `user`만 사용한다.
- 세션이 없으면 `/login?redirect=...`로 이동하고 로그인 성공 후 원래 경로로 복귀한다.
- 목 로그인은 입력값을 검증하지 않고 통과시키며, `mock-user`는 일반 사용자, 그 외 입력은 관리자 권한으로 처리한다.
- 실제 백엔드 전환 시 권장 형태는 HttpOnly cookie 기반 세션이다. 화면은 `AuthApi` 계약을 유지하고 request 구현만 교체한다.

## 관리자 화면

관리자 화면은 `/admin` 별도 라우트이며 같은 `DashboardLayout` 안에서 렌더된다. 관리자 권한 사용자에게만 `오더 후보군` 뒤에 관리자 전용 탭을 보여준다.

| 패널 | 소유 내용 | 대표 API 타입 |
|------|-----------|---------------|
| 사용자 관리 | 로그인 ID, 이름, 비고, 권한, 활성 상태, 임시 비밀번호 재설정 | `admin-user.ts`, `auth.ts` |
| GPT 키 관리 | GPT API 키 이름, 용도, 모델, 활성 상태, 메모, 연결 테스트 | `admin-gpt-key.ts` |
| 구글 시트 관리 | 서비스 계정 JSON, 시트 주소, 용도, 비고, 시트 이동 | `admin-google-sheet.ts` |

## 공통 관리자 UI

- 사용자/GPT/구글 시트 목록은 `AdminListPanel.tsx` 공통 shell을 사용한다.
- 공통 shell은 패널 제목, 건수, header action, 컬럼 헤더, 로딩/오류 상태, 스크롤 본문만 소유한다.
- 데이터 조회, 생성/상세 dialog 상태, 행 렌더링은 각 panel/row 컴포넌트가 소유한다.
- 목록이 많아지면 컬럼 헤더 아래 본문만 스크롤한다.

## 관리자별 주의점

- 사용자 임시 비밀번호는 재설정 응답 직후 한 번만 표시하고, 클릭 시 클립보드에 복사한다.
- GPT 키 원문은 생성/변경 요청 payload에만 존재한다. 목록 응답은 `maskedKey`만 표시한다.
- 구글 시트 서비스 계정 JSON 원문은 생성/변경 요청 payload에만 존재한다. 목록 응답은 `maskedServiceAccountKey`만 표시한다.
- 구글 시트 `시트로 이동`은 이미 받은 `spreadsheetUrl` 또는 `spreadsheetId`로 새 탭을 여는 순수 프론트 액션이다.
- 현재 mock은 DB 대체 저장소가 아니라 런타임 메모리/정적 seed로 동작한다. 실제 정합성은 백엔드 DB가 소유한다.
