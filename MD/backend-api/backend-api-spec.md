# Dashboard 백엔드 API 스펙 (구현용)

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-04-23 |
| 최종 수정일 | 2026-05-22 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app/src/api/types`, `dashboard-app/src/api/requests`, 백엔드 REST API 계약 |

이 문서는 프론트의 **`AuthApi` / `DashboardApi` / `InventoryArrivalApi` TypeScript 계약**을 만족하는 REST API를 설계·구현하기 위한 참고 자료입니다. 필드명은 **camelCase**, JSON 직렬화를 가정합니다.

현재 프론트 요청 계층은 `/api/v1` prefix의 REST API를 기준으로 HTTP adapter를 작성해 둔다. 기본값은 mock API이며, `VITE_USE_MOCK_API=false`일 때만 `VITE_API_BASE_URL` 기본값 `http://localhost:8080/api/v1`로 실제 HTTP 요청을 보낸다. 화면/훅은 `src/api/client.ts` facade만 호출하며 mock/HTTP 선택을 알지 않는다.

---

## 0. 프론트 요청 adapter 경계

| 파일 | 기능 범위 | 백엔드 구현 시 주의점 |
|------|-----------|----------------------|
| `src/api/requests/authRequests.ts` | 로그인, 세션, 사용자 정보 변경, 관리자 사용자 관리 | HttpOnly cookie 기반 세션 권장. 비밀번호/임시 비밀번호는 요청 또는 1회 응답에만 존재해야 하며 목록·세션 응답에 포함하지 않는다 |
| `src/api/requests/adminGptKeyRequests.ts` | 관리자 GPT 키 목록, 생성, 메타/키 변경, 연결 테스트, 삭제 | GPT 전용 계약이다. 생성/변경 요청만 `plainKey`를 담을 수 있고, 응답은 `maskedKey`만 내려준다. 키 저장/암호화/감사 로그는 백엔드 책임이다 |
| `src/api/requests/adminGoogleSheetRequests.ts` | 관리자 구글 시트 설정 목록, 생성, 변경, 삭제 | 서비스 계정 JSON 키는 생성/변경 요청에만 담고 응답에는 `maskedServiceAccountKey`만 내려준다. 백엔드는 JSON의 `client_email`을 서비스 계정 이메일로 파싱하고, 키 원문은 암호화 저장 또는 secret manager로 보관한다 |
| `src/api/requests/inventoryArrivalRequests.ts` | 스프레드시트 기반 입고예정일 수집 | 모든 로그인 사용자가 호출할 수 있는 전역 작업이다. 프론트는 시트 키나 서비스 계정 원문을 보내지 않고, 백엔드가 활성 구글 시트 설정을 선택해 읽고 DB에 upsert한다. 응답은 수집/실패 건수와 상태 메시지만 반환한다 |
| `src/api/requests/dashboardRequests.ts` | 자사/경쟁 판매, 상품 드로워, 후보군, 엑셀 업로드 템플릿 | 회사 소유 업무 데이터는 header company selector의 `companyUuid` 전역 scope를 따른다. 단일 회사 선택 시 분석, 산점도, 필터 메타, 후보군, 드로워, 2차 드로워, 오더 계산/SSE/mutation 요청에 `companyUuid`를 포함하고, `전체` 선택 시 생략한다. 후보군 계열 요청은 회사 scope와 현재 사용자 `USER_ACCOUNT.uuid` 기준 소유자 필터를 함께 적용한다. 프론트 UI는 사용자 UUID를 들고 다니지 않고 request adapter에서만 붙인다. 세션 기반 백엔드라면 요청값보다 서버 세션을 우선한다. 경쟁 분석 목록은 `competitorChannelId` 생략 시 전체 경쟁 채널 합계를 반환하고, 상품 드로워 판매 인사이트는 선택 경쟁 채널을 필수로 받는다. 경쟁 채널 마스터 목록은 페이지 필터와 공통 드로워가 모두 참조하므로 프론트 request boundary에서 in-flight/result를 공유한다. 백엔드도 해당 endpoint를 사용자별 업무 데이터가 아닌 가벼운 master data로 보고 캐시 가능하게 유지한다. 이너후보군 기본 리스트는 stash item과 기간 판매량만 빠르게 반환하고, 배지/추천은 별도 `getCandidateRecommendations` 응답을 각 조회 결과 수신 직후 자동으로 page 조회해 병합한다. 기간 총판매량은 백엔드가 `*_MONTHLY_SUMMARY`와 raw 판매 테이블을 조합해 계산하고, 프론트는 내려온 값을 그대로 표시한다. 발주 엑셀 다운로드는 백엔드 재호출 없이 이미 받은 `orderExport` DTO로 프론트가 생성한다 |

`src/api/client.ts`는 public export facade다. 화면에서 import하는 이름을 안정적으로 유지하기 위한 파일이며, mock/HTTP 선택과 base URL 처리는 `src/api/requests/httpClient.ts`와 각 request adapter가 맡는다.

---

## 1. 공통 규칙

### 1.1 날짜·시간

- **API 문자열**: 가능하면 **ISO 8601** (`2026-04-23T12:34:56.789Z`). 프론트 목(mock)은 `YYYY-MM-DD` 형태도 혼용하므로, 백엔드는 일관된 형식을 선택해 문서화하면 됩니다.
- **`historicalMonths` 등 월 축**: `"2024-01"` 같은 **연-월 문자열**이 등장합니다.
- **`periodStart` / `periodEnd`**: 분석·예측 구간의 경계(포함 여부는 비즈니스 규칙으로 정하고 문서화).

### 1.2 수량·금액·비율

- **`qty` 등 수량**: 기본 단위 **EA(개)** 를 가정합니다(표기상 “오더 수량”).
- **금액 필드** (`amount`, `expectedSalesAmount`, `expectedOrderAmount`, `avgPrice`, `opMarginAmount` 등 **원(KRW) 및 단가성 수치**):
  - 실무에서 소수 원이 거의 안 나오더라도, **연산·반올림 과정에서 소수가 나올 수 있으므로 계약상 소수를 허용**합니다.
  - **JSON**: `number` — 정수처럼 보이는 값(`12345`)과 소수(`12345.67`) 모두 허용.
  - **Python 백엔드**: 필드 타입은 **`float`** 로 두는 것을 기본으로 합니다(Pydantic `float`, 내부 로직 동일).
  - **DB**(PostgreSQL/MySQL 등): 해당 컬럼은 **`DOUBLE PRECISION`** 또는 **`FLOAT`** 로 두어 JSON·Python과 정합을 맞추는 것을 권장합니다. 금전 정확도를 극단적으로 요구하면 별도 정책으로 `NUMERIC`/`DECIMAL`을 선택할 수 있으며, 그 경우에도 API 응답은 여전히 JSON 숫자로 직렬화하면 됩니다.
- **비율·퍼센트**:
  - 이름에 `Pct`, `RatePct` 가 붙으면 **퍼센트 포인트 표기**(예: `15` = 15%).
  - `ratio`, `feeRate`(자사 표 타입 일부) 등은 **0~1 소수**일 수 있음 — 각 필드 설명을 따르십시오.

### 1.3 식별자

- **`skuGroupKey`**: 상품 코드와 색상 코드가 묶인 상품 단위 식별자. 현재 프론트 계약에서는 `SKU.code + SKU.color_code`에 대응하며, 사이즈는 2차 드로워/스냅샷의 사이즈별 행에서 다룹니다. UI 행 id와 혼용하지 않습니다.
- **`uuid`**: 후보 스태시·후보 아이템 등 **서버 생성 UUID** 문자열.
- 오더 스냅샷은 현재 독립 저장 API가 아니라 후보 아이템의 `details` JSON으로만 저장·복원합니다.

### 1.4 회사 스코프

회사 선택은 프론트 헤더의 전역 dropdown에서 관리한다. 로그인 직후 프론트는 `CompanyApi.getCompanies()`를 호출해 선택 가능한 회사 목록을 가져오며, 실제 백엔드는 COMPANY 테이블의 `uuid`, `name`을 내려준다. 현재 확정된 프론트 mock 목록은 `전체`, `한아INT`, `T1글로벌`이다.

`전체` 선택은 실제 회사 UUID 조건이 아니라 company scope를 비우는 UI 의미다. read API에서 `전체`는 프론트 HTTP adapter가 `companyUuid` query/body field를 생략한다는 뜻이고, 백엔드는 해당 업무 조회에서 회사 `WHERE` 조건을 제거해 전체 회사를 조회한다. 단일 회사 선택 시 분석 목록, 산점도, 필터 메타, 상품 드로워, 2차 드로워, 후보군 조회, 오더 계산 조회에는 `companyUuid`를 포함한다. 반면 candidate mutation payload/params, bulk detail confirm job start, 후보군 LLM comment job start, 그리고 이들 job/SSE subscribe는 단일 회사 scope 전용이다. 이 계열은 `companyUuid`가 필수이며 `전체` 또는 누락 scope 요청을 백엔드에서 검증 오류로 처리한다. 후보군 UI는 단일 회사 기준 업무이므로 `전체` 선택 상태에서 탭과 후보군 추가 액션을 비활성화한다.

프론트 mock도 이 scope를 단순 수신값으로만 두지 않는다. `companyUuid`는 판매량/금액 계산, 후보군 seed/store 조회, 후보 item 접근, 오더 지표 SSE 계산의 실제 분기 입력이며, `전체` scope 생략은 전체 회사 합산 또는 전체 회사 조회 의미로만 사용한다.

현재 범위에서 사용자별 회사 접근 권한 부여는 구현 범위가 아니다. 백엔드는 인증된 사용자가 볼 수 있는 회사 목록을 정하는 정책을 별도로 확정할 수 있으나, 프론트는 임의 권한 flag나 소유권 값을 만들지 않는다.

### 1.5 인증·에러

- 프론트는 `/login`과 `/dashboard/*` 보호 라우트를 분리합니다. 인증 계약은 `src/api/types/auth.ts`의 `AuthApi`가 소유합니다.
- 목 구현은 동작 확인용으로 로그인 입력값을 검증하지 않고 통과시키며 세션은 런타임 메모리에만 둡니다. `mock-user` ID는 일반 사용자 권한 확인용이고, 그 외 입력은 관리자 권한으로 처리합니다. 사용자 목록/후보군 목록의 실제 변경은 백엔드 DB가 소유해야 하며, 프론트 mock은 mutation 응답 흐름만 모사합니다. 실제 백엔드에서는 가능하면 **HttpOnly cookie 기반 세션**을 권장합니다.
- 프론트 mock 로그인 화면은 기본값 `mock-admin` / `admin`을 미리 채워 두어, 수정 없이 로그인하면 해당 관리자 세션으로 들어갑니다. 이 값은 동작 확인용이며 실제 백엔드 연결 시 제거/교체 대상입니다.
- 모든 보호 API에 동일 정책을 적용하고, 인증 실패는 **HTTP 401**, 권한 실패는 **HTTP 403** 과 JSON 에러 바디를 반환합니다.
- 공통 실패 응답은 가능한 한 `ApiErrorResponse` 형태를 사용합니다. `message`는 사용자가 확인 가능한 기본 문구이고, `code`는 백엔드/도메인 에러 식별자, `details`는 필드 오류 등 구조화된 추가 정보입니다.
- 성공 응답이 비어야 하는 API는 **HTTP 204**를 사용합니다. 목록/요약처럼 빈 값 자체가 정상 데이터인 경우에는 endpoint별 계약에 맞춰 빈 배열(`[]`)이나 문서화된 빈 객체를 반환하고, 실패를 빈 성공값으로 감추지 않습니다.

**공통 실패 응답 (`ApiErrorResponse`)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `message` | string | 필수. 프론트 `ApiHttpError.message`로 유지되는 기본 오류 문구 |
| `code` | string \| undefined | 선택. 프론트 `ApiHttpError.code`로 노출되는 안정적인 에러 코드 |
| `details` | unknown | 선택. 필드별 검증 오류, 충돌 원인 등 구조화된 추가 정보 |

**HTTP status to `ApiFailureKind`**

| HTTP status | `ApiFailureKind` | 기준 |
|-------------|------------------|------|
| 401 | `authentication` | 로그인 만료, 인증 누락, 인증 실패 |
| 403 | `permission` | 인증은 되었지만 역할/소유권 권한 부족 |
| 404 | `not-found` | 대상 리소스 없음 또는 접근 가능한 범위에 없음 |
| 409 | `conflict` | 중복, 상태 충돌, 동시 수정 충돌 |
| 422 | `validation` | 요청 payload 또는 비즈니스 검증 실패 |
| 5xx | `server` | 서버 내부 오류, 외부 연동 실패, 미처리 예외 |
| 그 외 4xx | `client` | 위 기준으로 분리되지 않은 클라이언트 요청 오류 |

**`AuthApi` 제안 매핑**

| 계약 메서드 | 제안 HTTP | 제안 경로 |
|-------------|-----------|----------|
| `login(payload)` | POST | `/auth/login` |
| `getCurrentSession()` | GET | `/auth/session` |
| `updateCurrentUser(payload)` | PATCH | `/auth/me` |
| `changeCurrentUserPassword(payload)` | POST | `/auth/me/password` |
| `getAdminUsers()` | GET | `/admin/users` |
| `createAdminUser(payload)` | POST | `/admin/users` |
| `updateAdminUser(payload)` | PATCH | `/admin/users/:userUuid` |
| `resetAdminUserPassword(userUuid)` | POST | `/admin/users/:userUuid/password-reset` |
| `deleteAdminUser(userUuid)` | DELETE | `/admin/users/:userUuid` |
| `logout()` | POST | `/auth/logout` |

**`AdminGptKeyApi` 제안 매핑**

관리자 GPT 키는 사용자 인증과 별도 계약(`src/api/types/admin-gpt-key.ts`)으로 둔다. 현재 운영 전제는 GPT만 사용하므로 공급자, Base URL, Project ID를 API 계약에서 제외한다. 모든 경로는 관리자 권한이 필요하다.

| 계약 메서드 | 제안 HTTP | 제안 경로 |
|-------------|-----------|----------|
| `getAdminGptKeys()` | GET | `/admin/gpt-keys` |
| `createAdminGptKey(payload)` | POST | `/admin/gpt-keys` |
| `updateAdminGptKey(payload)` | PATCH | `/admin/gpt-keys/:keyUuid` |
| `rotateAdminGptKey(payload)` | POST | `/admin/gpt-keys/:keyUuid/rotate` |
| `testAdminGptKey(keyUuid)` | POST | `/admin/gpt-keys/:keyUuid/test` |
| `deleteAdminGptKey(keyUuid)` | DELETE | `/admin/gpt-keys/:keyUuid` |

**`AdminGoogleSheetApi` 제안 매핑**

관리자 구글 시트 설정은 Google Sheets API 접근을 위한 서버 설정 계약(`src/api/types/admin-google-sheet.ts`)이다. 모든 경로는 관리자 권한이 필요하다. 원문 서비스 계정 JSON 키는 프론트가 생성/변경 요청에만 보내고, 목록/조회 응답에는 절대 포함하지 않는다.

| 계약 메서드 | 제안 HTTP | 제안 경로 |
|-------------|-----------|----------|
| `getAdminGoogleSheetConfigs()` | GET | `/admin/google-sheets` |
| `createAdminGoogleSheetConfig(payload)` | POST | `/admin/google-sheets` |
| `updateAdminGoogleSheetConfig(payload)` | PATCH | `/admin/google-sheets/:configUuid` |
| `deleteAdminGoogleSheetConfig(configUuid)` | DELETE | `/admin/google-sheets/:configUuid` |

**`InventoryArrivalApi` 제안 매핑**

입고예정일 수집은 관리자 설정 화면이 아니라 대시보드 헤더의 전역 작업이다. 모든 로그인 사용자가 실행할 수 있으며, 프론트는 결과 목록을 표시하지 않고 성공/부분성공/실패와 건수만 toast로 알린다.

| 계약 메서드 | 제안 HTTP | 제안 경로 |
|-------------|-----------|----------|
| `collectInventoryArrivalDates()` | POST | `/inventory-arrival-dates/collect-from-sheet` |

백엔드 구현 방향: Python 백엔드는 활성 Google Sheets 설정 중 입고예정일 수집용 설정을 선택하고, 서비스 계정으로 시트를 읽은 뒤 SKU/품번/색상/입고예정일 등 운영에서 확정한 매핑 기준에 따라 입고예정일 테이블을 upsert한다. 프론트 요청에는 시트 ID나 서비스 계정 키가 포함되지 않는다. 시트 접근 실패, 컬럼 누락, 날짜 파싱 실패, DB 저장 실패는 `{ "message": string }` 에러 바디로 구분 가능하게 반환한다. 일부 행만 실패한 경우 HTTP 200으로 `status: "partial"`, `failedCount > 0`을 반환할 수 있다.

**`InventoryArrivalCollectionResult`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `status` | `'success' \| 'partial' \| 'failed'` | 작업 결과 상태. 완전 실패를 HTTP 에러로 처리하는 경우 `failed`는 쓰지 않아도 된다 |
| `collectedCount` | number | 수집·저장 또는 갱신에 성공한 행/레코드 수 |
| `failedCount` | number | 행 단위 검증/저장 실패 수 |
| `message` | string | toast에 그대로 표시 가능한 사용자 메시지 |
| `collectedAt` | string | ISO 8601 작업 완료 시각 |

**`LoginRequest`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `loginId` | string | 로그인 ID. 실제 백엔드 검증 정책은 서버가 소유한다. 현재 mock은 동작 확인용으로 값을 검증하지 않고, `mock-user`만 일반 사용자 권한으로 처리한다 |
| `password` | string | 비밀번호. 실제 백엔드는 서버에서 검증한다. 현재 mock은 값을 검증하지 않는다 |

**`AuthSession`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `user.uuid` | string | 서버 생성 사용자 UUID. 화면 수정/삭제의 식별자 |
| `user.loginId` | string | 로그인 ID. 헤더와 사용자 정보 모달의 계정 표시값 |
| `user.name` | string | 사용자 표시명. 발주 엑셀 메타 시트의 `이름`처럼 사람 이름이 필요한 곳에서 사용한다 |
| `user.role` | `'admin' \| 'user'` | 프론트 권한 분기용 역할. 관리자는 관리자 화면 접근 가능, 사용자는 일반 대시보드 접근만 가능 |
| `user.mustChangePassword` | boolean | 임시/초기 비밀번호로 로그인했거나 관리자 재설정 후 아직 직접 변경하지 않은 상태 |
| `expiresAt` | string | ISO 8601 세션 만료 시각 |

**`UpdateAuthUserPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `loginId` | string | 변경할 로그인 ID. UUID는 바뀌지 않음 |

**`ChangePasswordPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `currentPassword` | string | 현재 비밀번호 |
| `newPassword` | string | 새 비밀번호 |

프론트는 새 비밀번호 확인 입력을 화면 내부에서 비교한 뒤 `newPassword`만 API로 보냅니다. 실제 백엔드는 현재 비밀번호와 새 비밀번호 정책을 서버에서 검증합니다. 현재 mock은 동작 확인용으로 호출 성공만 모사합니다.

**`AdminUserSummary`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uuid` | string | 서버 생성 사용자 UUID. 화면 수정/삭제의 식별자 |
| `loginId` | string | 로그인 ID |
| `name` | string | 사용자 이름. `USER_ACCOUNT.name`과 대응하며 관리자 생성/수정 화면에서 편집한다 |
| `note` | string \| null | 직책, 부서 등 내부 관리 메모. 인증 판단에는 쓰지 않는다 |
| `role` | `'admin' \| 'user'` | 사용자 권한 |
| `mustChangePassword` | boolean | 다음 로그인 후 비밀번호 변경이 필요한지 여부. 관리자가 비밀번호를 조회하는 용도가 아니라 상태 표시/강제 변경 흐름용 |
| `isActive` | boolean | 활성 계정 여부 |
| `dbUpdatedAt` | string | ISO 8601 최근 변경 시각 |

**`CreateAdminUserPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `loginId` | string | 로그인 ID. 실제 백엔드 검증 정책은 서버가 소유한다. 현재 mock은 값을 검증하지 않고 호출 성공만 모사한다 |
| `password` | string | 최초 로그인용 비밀번호 |
| `name` | string | 사용자 이름 |
| `note` | string \| null | 직책, 부서 등 내부 관리 메모 |
| `role` | `'admin' \| 'user'` | 사용자 권한 |
| `isActive` | boolean | 생성 시 활성 상태 |

**`UpdateAdminUserPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uuid` | string | 변경 대상 사용자 UUID |
| `loginId` | string | 변경할 로그인 ID. UUID는 바뀌지 않음 |
| `name` | string | 변경할 사용자 이름 |
| `note` | string \| null | 변경할 내부 관리 메모 |
| `role` | `'admin' \| 'user'` | 변경할 권한 |
| `isActive` | boolean | 활성 상태 |

**`ResetAdminUserPasswordResult`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `temporaryPassword` | string | 백엔드가 생성한 임시 비밀번호. 응답 직후 관리자 화면에 한 번만 표시하며, 이후 조회 API로 다시 내려주지 않는다 |
| `mustChangePassword` | boolean | 일반적으로 `true`. 사용자가 임시 비밀번호로 로그인한 뒤 직접 비밀번호를 바꿔야 함을 뜻한다 |
| `dbUpdatedAt` | string | ISO 8601 최근 변경 시각 |

관리자 비밀번호 재설정은 비밀번호 **조회**가 아니라 새 임시 비밀번호 **발급**이다. 백엔드는 평문 비밀번호를 저장하지 않고 해시만 저장해야 하며, 재설정 수행 관리자 UUID, 대상 사용자 UUID, 시각, 요청 IP 등 감사 로그를 남기는 것을 권장한다.

`/admin/users` 계열은 관리자 권한이 필요합니다. 실제 백엔드는 현재 로그인한 관리자 본인을 삭제/비활성화하거나 마지막 활성 관리자 권한을 제거하지 못하도록 검증하는 정책을 권장합니다.

**`AdminGptKeySummary`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uuid` | string | 서버 생성 GPT 키 UUID. 수정/교체/테스트/삭제 식별자 |
| `name` | string | 관리자 화면 표시 이름 |
| `purpose` | `'ai-comment' \| 'candidate-recommendation' \| 'test' \| 'all'` | 사용 범위. 백엔드는 실제 호출 지점에서 이 범위를 적용한다 |
| `model` | string | GPT 모델명 |
| `maskedKey` | string | 목록/조회 화면 표시용 마스킹 키. 프론트 목록 응답은 원문 키를 받지 않는다 |
| `isActive` | boolean | 활성 여부 |
| `note` | string \| null | 내부 메모 |
| `lastUsedAt` | string \| null | 마지막 사용 시각 |
| `lastTestedAt` | string \| null | 마지막 연결 테스트 시각 |
| `lastTestStatus` | `'untested' \| 'success' \| 'failed'` | 마지막 연결 테스트 상태 |
| `dbUpdatedAt` | string | ISO 8601 최근 변경 시각 |

**`CreateAdminGptKeyPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string | 표시 이름 |
| `purpose` | AdminGptKeySummary.purpose | 사용 범위 |
| `model` | string | GPT 모델명 |
| `plainKey` | string | 관리자가 입력한 원문 GPT API 키. 프론트는 이 값을 저장하지 않고 요청에만 담는다 |
| `isActive` | boolean | 생성 시 활성 여부 |
| `note` | string \| null | 내부 메모 |

**`UpdateAdminGptKeyPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uuid` | string | 변경 대상 GPT 키 UUID |
| `name`, `purpose`, `model`, `isActive`, `note` | 위와 동일 | GPT 키 메타데이터 변경 |
| `plainKey` | string \| undefined | 새 원문 GPT 키. 값이 있으면 같은 `변경` 요청에서 키를 교체하고, 프론트는 요청 후 입력값을 비운다 |

**`AdminGptKeyTestResult`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uuid` | string | 테스트 대상 GPT 키 UUID |
| `status` | `'untested' \| 'success' \| 'failed'` | 테스트 결과 |
| `message` | string | 관리자 화면에 표시할 결과 메시지 |
| `testedAt` | string | ISO 8601 테스트 시각 |

운영 DB는 GPT 원문 키를 저장할 수 있지만, 프론트 응답 DTO는 기본적으로 `maskedKey`만 내려주는 방식을 권장한다. 키 생성/변경/테스트/비활성화는 수행 관리자 UUID, 대상 키 UUID, 시각, 요청 IP를 감사 로그로 남기는 것이 좋다.

**`AdminGoogleSheetConfigSummary`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uuid` | string | 서버 생성 구글 시트 설정 UUID |
| `name` | string | 관리자 화면 표시 이름 |
| `purpose` | `'db-schema' \| 'upload-template' \| 'operation-reference' \| 'test'` | 사용 범위. DB 설계 참조, 업로드 템플릿, 운영 참조, 연결 테스트 등 |
| `serviceAccountEmail` | string | Google Cloud 서비스 계정 이메일. 백엔드가 서비스 계정 JSON 키의 `client_email`에서 파싱한다 |
| `maskedServiceAccountKey` | string | 목록/조회 화면 표시용 마스킹 키. 원문 JSON 키는 응답하지 않는다 |
| `spreadsheetUrl` | string | 관리자가 입력한 Google Sheets URL |
| `spreadsheetId` | string | 백엔드가 URL에서 파싱하거나 직접 받은 spreadsheet id |
| `isActive` | boolean | 활성 설정 여부 |
| `note` | string \| null | 내부 비고 |
| `dbUpdatedAt` | string | ISO 8601 최근 변경 시각 |

**`CreateAdminGoogleSheetConfigPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `name`, `purpose`, `spreadsheetUrl`, `isActive`, `note` | 위와 동일 | 구글 시트 설정 메타데이터 |
| `serviceAccountKeyJson` | string | Google Cloud 서비스 계정 JSON 키 원문. 백엔드는 `client_email`을 파싱해 `serviceAccountEmail`로 저장하고, 키 원문은 암호화하거나 secret manager에 위임하며 응답에는 마스킹 값만 반환한다 |

**`UpdateAdminGoogleSheetConfigPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uuid` | string | 변경 대상 설정 UUID |
| `name`, `purpose`, `spreadsheetUrl`, `isActive`, `note` | 위와 동일 | 구글 시트 설정 메타데이터 변경 |
| `serviceAccountKeyJson` | string \| undefined | 새 서비스 계정 JSON 키. 값이 있으면 같은 변경 요청에서 교체한다 |

백엔드 구현 방향: Python에서는 Google API client 또는 gspread 계열을 사용하되, 설정 조회 API에서는 키 원문을 절대 직렬화하지 않는다. 시트 접근 실패는 권한 부족, 잘못된 spreadsheet id, 폐기된 서비스 계정 키를 구분해 관리자 화면에 표시 가능한 메시지로 반환하는 것이 좋다. 해당 설정 변경/삭제는 수행 관리자 UUID, 대상 설정 UUID, 시각, 요청 IP를 감사 로그로 남기는 것을 권장한다.

**`USER_ACCOUNT` 정합성 메모**

- 계정 테이블은 `USER_ACCOUNT`를 기준으로 하며, 외부/API 사용자 식별자는 `USER_ACCOUNT.uuid`를 사용한다.
- `login_id`, `password_hash`, `name`, `note`, `role`, `must_change_password`, `is_active`, `failed_login_count`, `uuid`는 프론트 인증 계약과 직접 맞물린다.
- `role` 허용값은 `admin`, `user` 두 가지다. DB 표 양식상 CHECK 제약을 적기 어렵다면 백엔드 저장 검증 규칙으로 강제한다.
- `must_change_password`는 사용자 추가/비밀번호 재설정 시 백엔드가 `true`로 세팅하는 상태값이다. 관리자 추가 화면의 직접 입력값으로 두지 않는다.
- `is_active = false`는 관리자 비활성화 상태, `failed_login_count`/`locked_at`은 로그인 실패 잠금 상태, `must_change_password`는 로그인 후 비밀번호 변경 강제 상태다.

---

## 2. `DashboardApi` 메서드 ↔ REST 제안 매핑

아래 경로는 프론트 HTTP adapter가 호출하는 `/api/v1` 뒤의 상대 경로다. prefix 또는 host는 `VITE_API_BASE_URL`에서 교체한다.

| 계약 메서드 | 제안 HTTP | 제안 경로·쿼리 |
|-------------|-----------|----------------|
| `getSelfSales(params?)` | GET | `/sales/self?companyUuid&startDate&endDate&brand&category&codeQuery&colorCode&nameQuery` |
| `getCompetitorSales(params?)` | GET | `/sales/competitor?companyUuid&startDate&endDate&brand&category&codeQuery&colorCode&nameQuery&competitorChannelId` |
| `getSelfSalesScatterGrid(params?)` | GET | `/sales/self/scatter-grid?companyUuid&startDate&endDate&brand&category&codeQuery&colorCode&nameQuery&xBucketSize&yBucketSize&maxSkuIdsPerCell` |
| `getCompetitorSalesScatterGrid(params?)` | GET | `/sales/competitor/scatter-grid?companyUuid&startDate&endDate&brand&category&codeQuery&colorCode&nameQuery&competitorChannelId&xBucketSize&yBucketSize&maxSkuIdsPerCell` |
| `getSalesFilterMeta(params?)` | GET | `/sales/filter-meta?companyUuid` |
| `getProductDrawerBundle(skuGroupKey, params?)` | GET | `/products/:skuGroupKey/drawer-bundle?companyUuid` |
| `getProductMonthlyTrend(skuGroupKey, params)` | GET | `/products/:skuGroupKey/monthly-trend?companyUuid&startDate&endDate&forecastMonths&competitorChannelId` |
| `getProductSalesInsight(skuGroupKey, params)` | GET | `/products/:skuGroupKey/sales-insight?companyUuid&startDate&endDate&competitorChannelId` |
| `getProductSecondaryDetail(skuGroupKey, params?)` | GET | `/products/:skuGroupKey/secondary-detail?companyUuid&minOpMarginPct` |
| `getSecondaryDailyTrend(params)` | GET | `/products/:skuGroupKey/secondary/daily-trend?companyUuid&startMonth&leadTimeDays&competitorChannelId` |
| `getSecondaryAiComment(params)` | POST 권장 | `/products/:skuGroupKey/secondary/ai-comment` body `{ companyUuid?, periodStart, periodEnd, forecastMonths, competitorChannelId, candidateItemUuid? }` |
| `getSecondaryCompetitorChannels()` | GET | `/secondary/competitor-channels` |
| `getCandidateStashes(params)` | GET | `/candidate-stashes?companyUuid` 세션 소유자와 회사 scope 기준 |
| `getCandidateItemsByStash(params)` | GET | `/candidate-stashes/:stashUuid/items?companyUuid&dataReferencePeriodStart&dataReferencePeriodEnd` |
| `subscribeCandidateOrderMetrics(params)` | SSE 권장 | `/candidate-stashes/:stashUuid/items/order-metrics/events?companyUuid&requestId&dataReferencePeriodStart&dataReferencePeriodEnd&candidateItemUuids` (`candidateItemUuids`는 반복 query param) |
| `startCandidateStashLlmCommentJob(stashUuid, params)` | POST | `/candidate-stashes/:stashUuid/llm-comment-jobs` body 또는 query `{ companyUuid }`, 세션 소유자 기준 |
| `subscribeCandidateStashLlmCommentJob(jobId, listener, params)` | GET (SSE) | `/candidate-stash-llm-comment-jobs/:jobId/events?companyUuid` 세션 소유자와 단일 회사 scope 기준 |
| `getCandidateRecommendations(params)` | GET | `/candidate-stashes/:stashUuid/recommendations?companyUuid&dataReferencePeriodStart&dataReferencePeriodEnd&limit&cursor` |
| `getCandidateItemByUuid(itemUuid, params)` | GET | `/candidate-items/:itemUuid?companyUuid` |
| `deleteCandidateItem(itemUuid, params)` | DELETE | `/candidate-items/:itemUuid?companyUuid` 세션 소유자 기준 |
| `deleteCandidateItems(stashUuid, itemUuids, params)` | DELETE | `/candidate-stashes/:stashUuid/items` body `{ companyUuid, itemUuids }`, 세션 소유자 기준 |
| `deleteCandidateStash(stashUuid, params)` | DELETE | `/candidate-stashes/:stashUuid?companyUuid` 세션 소유자 기준 |
| `createCandidateStash(payload)` | POST | `/candidate-stashes` body `{ companyUuid, name, note?, periodStart, periodEnd, forecastMonths }`, 생성자는 세션 기준 |
| `updateCandidateStash(payload)` | PATCH | `/candidate-stashes/:stashUuid` body `{ companyUuid, name, note? }`, 세션 소유자 기준 |
| `duplicateCandidateStash(stashUuid, params)` | POST | `/candidate-stashes/:stashUuid/duplicate` body 또는 query `{ companyUuid }`, 세션 소유자 기준 |
| `appendCandidateItem(payload)` | POST | `/candidate-stashes/:stashUuid/items` body `{ companyUuid, skuGroupKey, details, isLatestLlmComment }`, 세션 소유자 기준 |
| `appendCandidateItems(payload)` | POST | `/candidate-stashes/:stashUuid/items/bulk` body `{ companyUuid, skuGroupKeys }`, 세션 소유자 기준. 응답은 `{ candidateItems }` |
| `updateCandidateItem(payload)` | PATCH | `/candidate-items/:itemUuid` body `{ companyUuid, details, isLatestLlmComment }`, 세션 소유자 기준. 성공 응답은 commit/cache 반영 이후 최신 `UpdateCandidateItemResponse` |
| `getCandidateStashExcelTemplateDownload()` | GET | `/candidate-stashes/excel-template` |
| `uploadCandidateStashExcel(file)` | POST multipart/form-data | `/candidate-stashes/import/excel` 세션 생성자 기준 |
| `getSecondaryStockOrderCalc(params)` | POST | `/secondary/stock-order-calc` body |

---

## 3. 엔드포인트별 계약 상세

### 3.1 `getSelfSales` / `getCompetitorSales`

**파라미터 (`SelfSalesParams` / `CompetitorSalesParams`)**

| 필드 | 타입 | 의미 |
|------|------|------|
| `startDate` | string? | 필터 시작일(목업 관례에 맞춘 문자열) |
| `endDate` | string? | 필터 종료일 |
| `brand` | string? | 브랜드 필터 |
| `category` | string? | 카테고리 필터 |
| `codeQuery` | string? | SKU.`code` 품번 부분 일치 필터 |
| `colorCode` | string? | SKU.`color_code` 색상 코드 필터 |
| `nameQuery` | string? | 상품명 부분 일치 필터 |
| `competitorChannelId` | string? | **경쟁 API만**. 선택한 경쟁 채널 id. 생략하면 경쟁 채널 전체 합계로 집계한다 |

**응답: `SelfSalesRow[]`**

| 필드 | 의미 |
|------|------|
| `id` | 행 고유 id (목업용 문자열) |
| `skuGroupKey` | 후보군 담기와 상품 드로워 조회에 쓰는 상품 단위 식별자. `code + colorCode` 상품 단위이며 UI 행 id와 별개 |
| `rank` | 순위 |
| `rankPercentile` | 전체 SKU 대비 백분위 순위 |
| `brand`, `category`, `code`, `productName`, `colorCode` | SKU 메타. `code + colorCode + size` 조합을 실제 SKU 식별 기준으로 본다. |
| `avgPrice` | 평균 판매 단가 |
| `qty` | 판매 수량 |
| `amount` | 매출액 |
| `avgCost` | 평균 원가 |
| `marginRate` | 마진율(타입상 소수 또는 % — 목 데이터 관례에 따름) |
| `feeRate` | 수수료율 |
| `opMarginRate` | 영업이익률 |
| `opMarginAmount` | 영업이익 금액 |

**응답: `CompetitorSalesRow[]`**

| 필드 | 의미 |
|------|------|
| `competitorAvgPrice`, `competitorQty`, `competitorAmount` | 선택 경쟁 채널 기준 지표. `competitorChannelId`가 없으면 전체 경쟁 채널의 판매수량·판매액 합계와 수량 가중 평균가 |
| `selfAvgPrice`, `selfQty`, `selfAmount` | 자사 채널 비교용(없으면 `null`) |

경쟁사 분석 화면에서 경쟁 채널 필터가 `전체`이면 프론트는 `competitorChannelId`를 보내지 않습니다. 이때 백엔드는 `skuGroupKey`별로 모든 경쟁 채널의 `competitorQty`와 `competitorAmount`를 합산하고, `competitorAvgPrice = competitorAmount / competitorQty`의 수량 가중 평균으로 내려줍니다. 자사 수량·금액은 경쟁 채널 수만큼 중복 합산하지 않습니다. 특정 채널 id가 들어오면 해당 채널 데이터만 반환합니다.

기본 응답 순서는 판매량 내림차순입니다. `getSelfSales`는 필터 적용 후 `qty DESC`, `getCompetitorSales`는 경쟁 채널 집계 후 `competitorQty DESC`로 내려줍니다. 프론트 테이블에서 정렬을 해제하면 이 API 응답 순서로 돌아가므로, DB 쿼리 또는 백엔드 집계 결과에서 기본 정렬을 보장해야 합니다.

### 3.2 `getSalesFilterMeta`

**응답 (`SalesFilterMeta`)**

| 필드 | 의미 |
|------|------|
| `brands` | 브랜드 목록 |
| `categories` | 카테고리 목록 |
| `codes` | 자사·경쟁 분석 필터 제안용 SKU.`code` 목록 |
| `colorCodes` | 자사·경쟁 분석 필터 제안용 SKU.`color_code` 목록. 운영에서 별도 색상 정렬 정책이 있으면 그 순서를 내려준다 |
| `productNames` | 자사·경쟁 분석 필터 제안용 상품명 목록 |
| `historicalMonths` | **과거 실적** 월 축(슬라이더 등). 포캐스트 월과 구분 |

### 3.3 `getProductDrawerBundle`

**응답 (`ProductDrawerBundle`)**

| 필드 | 의미 |
|------|------|
| `summary` | [`ProductPrimarySummary`](#51-productprimarysummary) |

### 3.4 `getProductMonthlyTrend`

기간·경쟁 채널 조건에 따라 1차 드로어의 **월간 판매 추이 그래프**를 구성합니다. `getProductDrawerBundle`은 상품 요약만 유지하고, 선택 경쟁 채널별 월간 시계열은 이 계약으로 분리합니다.

**쿼리 (`ProductMonthlyTrendParams`)**

| 필드 | 의미 |
|------|------|
| `startDate` | 조회 기준 시작일 (`YYYY-MM-DD` 권장). UI의 기간 음영 기준과 동일 |
| `endDate` | 조회 기준 종료일 (`YYYY-MM-DD` 권장). UI의 기간 음영 기준과 동일 |
| `forecastMonths` | 월간 판매추이에 포함할 포캐스트 월 수(1~24) |
| `competitorChannelId` | 경쟁사 월간 판매량 시리즈에 적용할 선택 경쟁 채널 id |

**응답 (`ProductMonthlyTrend`)**

| 필드 | 의미 |
|------|------|
| `skuGroupKey` | 상품 단위 묶음 키. `SKU.code + SKU.color_code`에 대응하며 DB `SKU.uuid`가 아니다 |
| `targetPeriodDays.start/end` | 실제 표시·집계 대상 기간 |
| `competitorChannelId` | 응답에 적용된 경쟁 채널 id |
| `competitorChannelLabel` | 응답에 적용된 경쟁 채널 표시명 |
| `points` | [`ProductMonthlyTrendPoint[]`](#54-productmonthlytrendpoint) |

### 3.5 `getProductSalesInsight`

기간·경쟁 채널 조건에 따라 1차 드로어의 **판매 정보** 테이블을 구성합니다. `getProductDrawerBundle`은 기본 요약용으로 유지하고, 일간/기간/채널 집계가 필요한 판매 정보는 이 계약으로 분리합니다.

**쿼리 (`ProductSalesInsightParams`)**

| 필드 | 의미 |
|------|------|
| `startDate` | 집계 시작일 (`YYYY-MM-DD` 권장) |
| `endDate` | 집계 종료일 (`YYYY-MM-DD` 권장) |
| `competitorChannelId` | 비교 경쟁 채널 id. 1차 드로어는 선택 경쟁 채널을 반드시 가진 뒤 이 API를 호출한다 |

**응답 (`ProductSalesInsight`)**

| 필드 | 의미 |
|------|------|
| `skuGroupKey` | 상품 단위 묶음 키. `SKU.code + SKU.color_code`에 대응하며 DB `SKU.uuid`가 아니다 |
| `targetPeriodDays.start/end` | 실제 표시·집계 대상 기간 |
| `competitorChannelId` | 응답에 적용된 경쟁 채널 id |
| `competitorChannelLabel` | 응답에 적용된 경쟁 채널 표시명 |
| `self` | 자사 판매 정보 컬럼 |
| `competitor` | 경쟁 채널 판매 정보 컬럼 |

**컬럼 (`ProductSalesInsightColumn`)**

| 필드 | 의미 |
|------|------|
| `avgPrice` | 평균 판매가 |
| `qty`, `qtyRank` | 판매량과 순위 |
| `amount`, `amountRank` | 판매액과 순위 |
| `rankTotal` | 순위 모집단 수. UI는 `qtyRank/rankTotal위`처럼 표시 |
| `avgCost`, `costRatioPct` | 평균 원가와 원가 비율. 경쟁 컬럼은 `null` 가능 |
| `grossMarginPerUnit` | 개당 매출이익. 경쟁 컬럼은 `null` 가능. 현재 1차 판매 정보 표에서는 표시하지 않음 |
| `feePerUnit`, `feeRatePct`, `feeRank` | 평균 수수료, 수수료율, 순위. 경쟁 컬럼은 `null` 가능 |
| `opMarginPerUnit`, `opMarginRatePct`, `opMarginRank` | 영업이익, 이익률, 순위. 경쟁 컬럼은 `null` 가능 |

백엔드는 고객사 집계 테이블을 우선 사용하고, 필요한 보조 값만 일간 데이터에서 보강하는 것을 권장합니다.

### 3.6 `getProductSecondaryDetail`

**쿼리 (`ProductSecondaryDetailParams`)**

| 필드 | 의미 |
|------|------|
| `minOpMarginPct` | 영업이익률 **하한 필터**(퍼센트 포인트). UI 없으면 생략/`null`(하한 없음). 값이 바뀌면 동일 품번이라도 패널이 재조회합니다. |

**응답 (`ProductSecondaryDetail`)**

| 필드 | 의미 |
|------|------|
| `skuGroupKey` | 상품 단위 묶음 키. `SKU.code + SKU.color_code`에 대응하며 DB `SKU.uuid`가 아니다 |
| `competitorPrice` | 경쟁 베이스라인 단가 |
| `competitorQty` | 경쟁 추정 수량 |
| `competitorRatioBySize` | 사이즈별 경쟁 비중 맵 (`size` 문자열 → 비율) |

### 3.7 `getSecondaryDailyTrend`

**파라미터 (`SecondaryDailyTrendParams`)**

| 필드 | 의미 |
|------|------|
| `skuGroupKey` | 상품 단위 묶음 키. `SKU.code + SKU.color_code`에 대응하며 DB `SKU.uuid`가 아니다 |
| `startMonth` | 일별 트렌드 시작 월 (`getSecondaryDailyTrend` 재조회와 스냅샷 `context.dailyTrendStartMonth` 와 동일 역할) |
| `leadTimeDays` | 리드타임 일수 (스냅샷 `context.dailyTrendLeadTimeDays` 와 동일 역할) |
| `competitorChannelId` | 경쟁사 일별 판매량 시리즈에 적용할 선택 경쟁 채널 id |

**응답 (`SecondaryDailyTrendPoint[]`)**

| 필드 | 의미 |
|------|------|
| `idx` | 시계열 인덱스 |
| `date` | 일자 |
| `month` | 소속 월 표시용 |
| `sales` | 해당 일 판매(표시용 합성 값일 수 있음) |
| `stockBar` | 재고 바 차트 값 |
| `inboundAccumBar` | 입고 누적 바 값 |
| `selfSales` | 자사 **실판매 수량(EA)**. 예측 구간 등에서는 `null` 가능 |
| `competitorSales` | 경쟁 **실판매 수량(EA)**. 예측 구간 등에서는 `null` 가능 |
| `isForecast` | 포캐스트 구간 여부 |

### 3.8 `getSecondaryAiComment`

2차 드로워가 열릴 때 live 기준 AI 코멘트를 요청한다. 이 요청은 후보 아이템 스냅샷을 자동 저장하거나 수정하지 않는다. 사용자가 2차 드로워에서 저장/수정 버튼을 눌렀을 때만 반환된 `llmAnswer`가 후보 아이템 `details.drawer2.llmAnswer`에 저장된다.

**요청 (`SecondaryAiCommentParams`)**

| 필드 | 의미 |
|------|------|
| `skuGroupKey` | 상품 단위 묶음 키. `SKU.code + SKU.color_code`에 대응 |
| `periodStart`, `periodEnd` | AI 코멘트 생성 기준 데이터 참조 기간 |
| `forecastMonths` | 현재 드로워의 예측 개월 수 |
| `competitorChannelId` | 현재 선택된 경쟁 채널 id |
| `candidateItemUuid` | 선택. 이너후보군에서 열린 후보 아이템 UUID. 저장 전 일반 2차 드로워이면 `null` 또는 생략 |

**응답 (`SecondaryAiCommentResult`)**

| 필드 | 의미 |
|------|------|
| `llmPrompt` | 백엔드가 사용한 프롬프트/요약 컨텍스트. 스냅샷 저장 시 판단 근거로 함께 보관한다 |
| `llmAnswer` | 화면의 AI 코멘트 카드에 표시할 본문 |
| `generatedAt` | 생성 시각 |

백엔드 구현 방향: Python 백엔드는 활성 GPT 키(`purpose = ai-comment` 또는 `all`)를 선택해, 상품 기본 정보, 조회 기간 판매 요약, 선택 경쟁 채널 지표, 재고·발주 계산에 필요한 요약값을 서버에서 구성한 뒤 코멘트를 생성한다. 프론트가 화면에 이미 가진 값만 그대로 되돌려 보내게 만들지 말고, DB/집계 기준으로 같은 컨텍스트를 재구성하는 쪽이 정합성에 유리하다. 다만 응답은 화면 표시와 스냅샷 저장에 필요한 `llmPrompt`, `llmAnswer`, `generatedAt`만 내려준다.

### 3.9 `getSecondaryCompetitorChannels`

**응답 (`SecondaryCompetitorChannel[]`)**

| 필드 | 의미 |
|------|------|
| `id` | 채널 id (`getCompetitorSales`, 스냅샷 `competitorChannelId` 와 연결) |
| `label` | 표시 이름 |

`priceSkew`, `qtySkew` 같은 목업 보정 계수는 운영 API 응답에 포함하지 않는다. 목업 데이터 생성에만 필요한 값은 `src/api/mock` 내부 모델에 둔다.

현재 프론트 기준 유효 채널은 **`kream`, `musinsa`** 입니다(`naver` 제거됨).

### 3.10 후보군(Candidate stash / item)

**`CandidateStashSummary`**

| 필드 | 의미 |
|------|------|
| `uuid` | 스태시 PK |
| `name`, `note` | 이름·비고 |
| `periodStart`, `periodEnd` | 후보군 생성 당시의 데이터 참조 기간. 프론트 이너 후보군 상세 화면의 조회 데이터 기간 초기값은 이 값이 아니라 화면 진입일 기준 `오늘 - 1년` ~ `오늘`이다. 사용자가 기간 입력 후 `조회` 버튼을 누른 시점의 `dataReferencePeriodStart`/`dataReferencePeriodEnd`가 후보군 리스트 재계산과 추천 판단에 적용된다 |
| `forecastMonths` | 후보군 생성 당시의 월간 판매추이 포캐스트 개월 수 |
| `itemCount` | 소속 후보 아이템 개수 |
| `dbCreatedAt`, `dbUpdatedAt` | 생성·수정 시각(아이템 추가로 스태시 “갱신” 시각을 반영할지는 백엔드 정책) |

`getCandidateStashes`, `getCandidateItemsByStash`, `getCandidateRecommendations`, `getCandidateItemByUuid` 및 후보군 mutation/job/SSE 계열은 현재 인증 세션과 `companyUuid` scope를 기준으로 동작한다. 프론트는 사용자 UUID를 요청 파라미터로 보내지 않으며, 백엔드는 세션의 `USER_ACCOUNT.uuid`와 후보군의 `userUuid`가 일치하고 요청 회사 scope에 속한 데이터만 반환/수정해야 한다. 조회 API는 `전체` scope일 때 `companyUuid` 생략을 허용하고 전체 회사 기준으로 반환할 수 있다. mutation payload/params, job start, SSE subscribe는 전체 scope를 허용하지 않으며 단일 `companyUuid`가 없으면 검증 오류로 실패해야 한다.

**`CandidateItemListParams`** (`getCandidateItemsByStash` 요청)

| 필드 | 의미 |
|------|------|
| `stashUuid` | 조회할 후보군 UUID. REST 경로의 `:stashUuid`와 동일 |
| `dataReferencePeriodStart` | 후보군 리스트의 기간 판매량과 이후 지표 계산에 사용할 데이터 참조 시작일 (`YYYY-MM-DD`) |
| `dataReferencePeriodEnd` | 후보군 리스트의 기간 판매량과 이후 지표 계산에 사용할 데이터 참조 종료일 (`YYYY-MM-DD`) |

이 API는 조회 버튼 적용 결과와 후보군 상세 모달 최초 자동 조회 결과에 공통으로 쓰이는 기본 후보 리스트 조회다. 백엔드는 후보군에 실제로 담긴 `candidateItems`와 화면 행에 필요한 기본 SKU 메타/기간 판매량만 내려준다. 전체 SKU 분포를 기반으로 한 배지와 추천 후보는 `getCandidateRecommendations`에서 별도 계산한다. 프론트는 이 기본 리스트를 받은 직후 `getCandidateRecommendations`를 page 단위로 자동 조회해, 추천 응답 안에서 현재 후보군 `skuUuid`와 일치하는 row를 기존 행에 병합한다. 따라서 `추천 보기` 버튼은 배지 계산을 시작하는 트리거가 아니라 이미 로드된 추천 목록을 여는 UI이며, 추천 응답 실패 시 배지 컬럼은 `실패` 상태를 표시한다.

기간 총판매량은 백엔드 계산 계약이다. 자사 판매는 `ERP_MONTHLY_SUMMARY`를 우선 사용하되, 조회 시작/종료가 월 전체를 덮지 않는 부분 월과 아직 확정되지 않은 월은 `SALES_ERP`를 일자 기준으로 합산해 보정한다. 경쟁 판매는 `SALES_EXTERNAL`을 원천으로 보며, `EXTERNAL_MONTHLY_SUMMARY`의 `site` 축이 제공되면 확정된 전체 월은 월 요약을 사용하고 부분 월/미확정 월은 `SALES_EXTERNAL`로 보정한다. 전체 경쟁 채널 조회는 site 전체 합산이고, 특정 경쟁 채널 조회는 해당 `site`만 합산한다. 프론트는 이 계산을 재현하지 않고 `CandidateItemSummary.insight.selfQty`와 `competitorQty`를 그대로 표시한다.

**`CandidateItemListResult`** (`getCandidateItemsByStash` 응답)

| 필드 | 의미 |
|------|------|
| `candidateItems` | 후보군에 실제로 담긴 `CANDIDATE_ITEM` 목록. `uuid`는 `CANDIDATE_ITEM.uuid`, `skuUuid`는 `CANDIDATE_ITEM.sku_uuid = SKU.uuid`, `hasSnapshot`은 `details != null` |
| `items` | 후보군에 담긴 아이템만 포함하는 화면 행. 총 오더 수량/금액은 기본 조회 응답에서 로딩 상태이고, 배지/랭킹성 insight는 조회 결과 직후 별도 추천 조회가 끝날 때까지 로딩 상태일 수 있다 |

**후보군 조회 캐시/무효화 규칙**

`getCandidateItemsByStash`의 최종 응답은 현재 `CANDIDATE_ITEM` membership을 반영해야 한다. 백엔드가 `(ownerUserUuid, stashUuid, dataReferencePeriodStart, dataReferencePeriodEnd)` 기준으로 최종 응답 전체를 TTL 캐시하면, `deleteCandidateItem`, `deleteCandidateItems`, `appendCandidateItems`, `updateCandidateItem` 직후 삭제 전/수정 전 후보가 다시 내려올 수 있다. 따라서 최종 후보군 item 목록 응답 자체는 캐시하지 않거나, 아래 mutation 성공 전에 같은 stash 관련 캐시를 반드시 무효화해야 한다.

무효화 대상 mutation:

- `POST /candidate-stashes/:stashUuid/items`
- `POST /candidate-stashes/:stashUuid/items/bulk`
- `DELETE /candidate-items/:itemUuid`
- `DELETE /candidate-stashes/:stashUuid/items`
- `PATCH /candidate-items/:itemUuid`
- `DELETE /candidate-stashes/:stashUuid`

캐시 가능한 영역은 "현재 후보군 membership"이 아니라 계산 원천이다. 예를 들어 조회 기간/채널별 SKU 판매 집계, 랭킹/percentile, 배지 판정용 전체 SKU 분포, 추천 후보 원천 pool은 캐시할 수 있다. 다만 응답을 만들 때는 캐시된 계산 결과를 현재 DB의 `CANDIDATE_ITEM`과 다시 join/filter해야 한다. 즉 삭제된 candidate item이 `candidateItems`나 `items`에 다시 나타나면 안 되고, 현재 후보군에 이미 담긴 SKU를 추천 UI에서 제외하는 판단도 최신 membership 기준이어야 한다.

프론트는 삭제 성공 직후 후보 아이템 전체 목록을 재조회하지 않고 현재 화면의 row만 로컬 제거한다. 사용자가 이후 `조회`를 다시 누를 때는 백엔드가 최신 membership 기준 응답을 내려줘야 하며, 프론트는 후보군 item 목록에 별도 TTL 캐시를 두지 않는다.

**`CandidateRecommendationParams`** (`getCandidateRecommendations` 요청)

| 필드 | 의미 |
|------|------|
| `stashUuid` | 조회할 후보군 UUID |
| `dataReferencePeriodStart` | 배지와 추천 기준이 되는 데이터 참조 시작일 |
| `dataReferencePeriodEnd` | 배지와 추천 기준이 되는 데이터 참조 종료일 |
| `limit` | 추천 후보 반환 개수. 기본 50 권장 |
| `cursor` | 다음 추천 페이지 조회용 cursor. offset 문자열 또는 opaque cursor 모두 가능 |

이 API는 조회 기간 전체 SKU 분포를 집계해 배지가 있는 SKU 목록만 계산한다. 전체 분포를 봐야 하는 비용은 백엔드가 부담하되, 프론트로 전체 reference 목록을 내려주지 않는다. 각 추천 row는 배지만이 아니라 같은 기간 기준 `insight.selfQty`, `insight.competitorQty`, `selfAmount`, `competitorAmount`도 함께 포함한다. 프론트는 이 값으로 기존 후보 행의 배지를 패치할 때 기간 총판매량도 같은 계약의 값으로 유지한다. 응답의 `recommendations`에는 현재 후보군에 이미 담긴 SKU가 포함될 수 있다. 프론트는 후보군 기본 조회 결과가 들어올 때마다 이 API를 `nextCursor`가 없어질 때까지 page 조회하고, 같은 `skuUuid`를 가진 후보 행에는 배지/랭킹성 insight로 병합하며, 추천 UI에서는 현재 후보군 row를 숨긴다. 백엔드는 배지가 붙은 현재 후보군 SKU를 먼저 응답에 포함하고, 그 뒤에 현재 후보군에 없는 추천 SKU를 `limit`만큼 붙이는 구현을 권장한다. 이 경우 `limit/cursor`는 추천 UI에 노출될 "신규 후보" 기준으로 적용하고, 배지 패치용 현재 후보군 SKU는 `limit` 차감 대상에서 제외한다.

**`CandidateRecommendationResult`** (`getCandidateRecommendations` 응답)

| 필드 | 의미 |
|------|------|
| `recommendations` | 배지가 있는 추천 SKU 목록. 각 `uuid`는 `SKU.uuid`다. 각 row는 SKU 메타, 배지, 자사/경쟁사 기간 총판매량을 함께 포함한다. 현재 후보군에 이미 있는 SKU도 포함될 수 있으며, 프론트가 `CandidateItemSummary.skuUuid`와 비교해 행 배지 병합과 추천 UI 제외를 처리한다 |
| `nextCursor` | 다음 페이지가 있으면 cursor, 없으면 `null` |

배지는 DB 테이블 정의의 badge JSON처럼 항목별 `{ name, color, tooltip }[]` 배열로 내려준다. 색상/툴팁은 백엔드가 기간 기준 계산과 함께 확정해 내려주며, 프론트는 별도 배지 정의 호출이나 이름-정의 조인을 하지 않는다.

```ts
badges: [
  {
    name: '크림판매',
    color: '#0f766e',
    tooltip: '조회 기간 내 크림 경쟁사 판매수량 상위 10% 이내 후보입니다.',
  },
  {
    name: '자사이익',
    color: '#be123c',
    tooltip: '조회 기간 내 자사 영업이익률이 9% 이상인 후보입니다.',
  },
  {
    name: '자사판매',
    color: '#c2410c',
    tooltip: '조회 기간 내 자사 판매수량 상위 10% 이내 후보입니다.',
  },
]
```

**추천 보기 제외 규칙**

추천 응답은 배지 패치와 추천 UI를 한 배열로 처리한다. 백엔드는 조회 기간 전체 SKU 분포에서 배지가 있는 row를 만들고, 그중 현재 후보군에 이미 있는 SKU는 기존 행 배지 패치용으로 응답에 포함할 수 있다. 추천 UI용 신규 후보는 `candidateItems.skuUuid`를 `Set` 또는 DB hash/semi join 기준으로 제외한 뒤 `limit/cursor`를 적용한다. 프론트는 같은 응답 배열에서 현재 화면에 있는 `skuUuid`와 중복되는 row를 숨기고, 대량 reference 전체를 받아 중복 제외하지 않는다.

**`CandidateItemSummary`** (목록 행)

| 필드 | 의미 |
|------|------|
| `uuid` | `CANDIDATE_ITEM.uuid` |
| `stashUuid` | 소속 스태시 |
| `skuUuid` | `CANDIDATE_ITEM.sku_uuid`. 반드시 `SKU.uuid`를 가리킨다 |
| `skuGroupKey` | 상품 단위 식별자. 현재 프론트 계약에서는 `SKU.code + SKU.color_code`에 대응하며, 사이즈는 2차 드로워/스냅샷의 사이즈별 행에서 다룬다 |
| `brand`, `code`, `productName`, `colorCode` | 현재 상품 마스터와 기간 집계 결과의 SKU 메타. 색상은 SKU 식별 메타이므로 목록·엑셀에 함께 노출한다. |
| `orderMetricStatus` | `loading`, `loaded`, `failed`. 총 오더 지표 SSE 진행 상태 |
| `qty` | 데이터 참조 기간 기준 추천/예상 오더 수량 합계(EA). SSE 도착 전에는 화면상 로딩 상태로 취급한다 |
| `expectedOrderAmount` | 데이터 참조 기간 기준 예상 **발주 금액(원)**. SSE 도착 전에는 화면상 로딩 상태로 취급한다 |
| `expectedSalesAmount` | 데이터 참조 기간 기준 예상 매출 |
| `expectedOpProfit` | 데이터 참조 기간 기준 예상 영업이익 |
| `insightStatus` | `loading`, `loaded`, `failed`. 배지/추천성 insight 패치 로딩 상태 |
| `insight.selfQty`, `insight.competitorQty` | `getCandidateItemsByStash` 기본 응답에 포함되는 자사/경쟁사 기간 총판매량. 배지/추천 조회를 기다리지 않고 표시한다. 값이 없으면 `null`이며, 백엔드와 프론트 모두 임의 기본값으로 채우지 않는다 |
| `insight.badges` | 이 아이템에 붙일 배지 배열. 각 값은 `{ name, color, tooltip }`이며 현재 목데이터 기준 허용 배지는 `크림판매`, `자사이익`, `자사판매` |
| `orderExport` | 발주 엑셀을 프론트에서 생성하기 위한 요청 기간 기준 다운로드 DTO. SSE 지표가 도착하기 전에는 `null`일 수 있으며, 프론트는 모든 행의 오더 지표가 로드된 뒤에만 다운로드를 허용한다 |
| `isLatestLlmComment` | 현재 저장 스냅샷 기준 AI 코멘트/추천이 최신인지 여부. DB 컬럼은 `is_latest_llm_comment` 권장 |
| `isDetailConfirmed` | 이너후보군 2차 드로워에서 저장한 스냅샷이 있으면 `true`. 리스트의 상세확정 컬럼은 이 값을 표시한다 |
| `dbCreatedAt`, `dbUpdatedAt` | 생성·수정 시각 |

`insight.selfQty`와 `insight.competitorQty`는 위 기간 총판매량 계약에 따라 백엔드가 계산한 SKU group(`SKU.code + SKU.color_code`) 단위 합산값이다. SKU가 size 단위로 분리되어 있으므로 백엔드는 같은 code/color의 size별 `sku_uuid`를 먼저 묶어 합산한다. 프론트는 화면 정렬과 엑셀 다운로드에 이 값을 사용하지만, 월 요약/raw 보정 여부나 경쟁 `site` 필터를 화면에서 직접 계산하지 않는다. 기간 내 판매가 실제로 0이면 `0`, 해당 축의 데이터가 없으면 `null`로 내려야 하며, 다른 테이블 값으로 대체하거나 최소값을 강제하지 않는다.

프론트 mock은 화면 검증을 위해 상품 카탈로그 자체를 생성할 수 있다. 다만 API 호출 시 알 수 없는 `skuGroupKey`를 첫 번째 상품으로 바꾸거나, 알 수 없는 경쟁 채널을 크림/기본 채널로 바꾸는 런타임 폴백은 하지 않는다. 백엔드는 필수 식별자/원천이 없으면 명시 오류, `null`, 또는 행 단위 실패를 반환해야 하며 임의 기본값으로 정상 데이터처럼 응답하지 않는다.

**`CandidateItemDetail`**

| 필드 | 의미 |
|------|------|
| `uuid` | `CANDIDATE_ITEM.uuid` |
| `stashUuid` | `CANDIDATE_ITEM.stash_uuid` |
| `skuUuid` | `CANDIDATE_ITEM.sku_uuid = SKU.uuid` |
| `skuGroupKey` | 상품 단위 식별자. 현재 프론트 계약에서는 `SKU.code + SKU.color_code`에 대응 |
| `details` | 저장 시점의 **`SecondaryOrderSnapshotPayload` 전체 JSON**. 스냅샷 없이 후보군에 담긴 아이템은 `null`이다 |
| `isDetailConfirmed` | `details != null`에서 파생되는 서버 확정 상태. 저장 성공 응답에서는 `details`와 반드시 같은 의미여야 한다 |
| `isLatestLlmComment` | 상세 스냅샷 기준 AI 코멘트/추천 최신 여부 |
| `dbCreatedAt` | 생성 시각 |
| `dbUpdatedAt` | 상세 저장/해제 직후 read-after-write 보호 기준. `details` 또는 `isLatestLlmComment` 변경 commit 이후 값이 갱신되어야 한다 |

**`UpdateCandidateItemResponse`** (`PATCH /candidate-items/:itemUuid` 성공 응답)

`UpdateCandidateItemResponse`는 `CandidateItemDetail`과 같은 shape다. 백엔드는 PATCH 요청을 성공으로 응답하기 전에 DB commit과 관련 캐시 무효화를 마치고, 방금 저장된 후보 아이템의 최신 상세 상태를 반환해야 한다.

| 응답 필드 | 백엔드 구현 기준 |
|------|------|
| `details` | 요청 `details`가 객체이면 저장된 스냅샷 객체, `null`이면 `null` |
| `isDetailConfirmed` | `details != null`과 같은 의미. 저장이면 `true`, 상세확정 해제면 `false` |
| `isLatestLlmComment` | 요청 `isLatestLlmComment` 저장 결과. 2차 드로워 저장/해제는 보통 `false` |
| `dbUpdatedAt` | 이번 PATCH로 실제 갱신된 새 시각. 후속 GET이 이전 값과 같은 stale row를 내려주면 프론트는 PATCH 응답 상태를 계속 보호한다 |

프론트는 이 응답을 mutation 직후의 권위 상태로 사용한다. 따라서 PATCH 응답을 `204 No Content`나 `{ ok: true }`로 축소하지 않는다. 백엔드가 성능상 전체 detail 재조회가 부담되면, 같은 필드를 가진 DTO를 UPDATE 결과와 반환 컬럼으로 조립해도 된다.

**`CandidateOrderMetricEvent`** (`subscribeCandidateOrderMetrics` SSE)

초기 `getCandidateItemsByStash` 응답 이후 총 오더 수량·총 오더 금액처럼 계산량이 큰 값을 항목별로 내려준다. `candidateItemUuids`는 전체 후보 아이템이 아니라 이번에 계산이 필요한 부분 집합만 반복 query param으로 보낼 수 있다. 추천 적용 직후 프론트는 새로 추가된 후보 아이템 UUID만 같은 SSE에 전달하며, 기존 행의 계산 완료 값은 유지한다.

후보군 오더 지표 hook은 부모 hook에서 DI로 받은 `companyUuid`를 `subscribeCandidateOrderMetrics` 요청에 포함한다. stream hook은 `AuthContext`나 전역 company selector를 직접 읽지 않으며, 같은 item UUID라도 회사 scope가 다르면 별도 계산 요청으로 취급한다.

프론트 타입 소유 파일은 `dashboard-app/src/api/types/candidate-order-metrics.ts`다. 후보군 기본 조회 계약(`candidate.ts`)과 분리되어 있으므로, 백엔드가 오더 계산 job/SSE 구조를 바꾸면 이 파일과 `subscribeCandidateOrderMetrics` adapter만 우선 확인한다.

오더 지표도 다른 데이터로 대체해 만들지 않는다. 예를 들어 자사 평균 판매가·평균 원가·수수료율이 없으면 경쟁사 가격이나 상품마스터 기본값으로 채우지 말고 `orderExport.avgPrice`, `avgCost`, `feeRatePct`를 `null`로 내려준다. 수량 산식에 필요한 원천 데이터가 없으면 해당 지표를 `0` 또는 `itemFailed`로 드러내고, 최소값 `1` 같은 임의 보정도 하지 않는다.

| 이벤트 | 의미 |
|--------|------|
| `item` | `requestId`, `itemUuid`, `skuUuid`, `metric`을 포함한다. `metric`은 `qty`, `expectedOrderAmount`, `expectedSalesAmount`, `expectedOpProfit`, `orderExport`를 가진다 |
| `itemFailed` | 특정 후보 아이템 지표 계산 실패. 행 단위 오류로 표시한다 |
| `completed` | 전체 candidate item 지표 계산 종료. `processedCount`, `failedCount`를 포함한다 |

프론트는 `requestId`가 현재 조회 요청과 다르면 stale 이벤트로 버린다. 사용자가 조회 데이터 기간을 바꿔 다시 조회하면 이전 SSE 연결을 닫아야 한다. EventSource transport 오류가 발생하면 프론트는 연결 실패로 표시하고, 오더 지표는 요청 대상 row만 실패 상태로 전환한다.

백엔드는 모든 요청 item이 `item` 또는 `itemFailed`로 처리된 뒤 `completed` 이벤트를 보내고 SSE 응답을 종료해야 한다. 브라우저 `EventSource`는 응답 종료 후 자동 재연결할 수 있으므로, 프론트는 방어적으로 모든 요청 item UUID가 settle되면 `completed` 수신 전이라도 연결을 닫는다. 따라서 백엔드는 동일한 `requestId` 재접속이 들어오더라도 가능한 한 idempotent하게 처리하고, 정상 구현에서는 `completed`를 누락하지 않아야 한다.

**페이로드**

- `CreateCandidateStashPayload`: `{ companyUuid, name, note?, periodStart, periodEnd, forecastMonths }` — 후보군은 단일 회사 scope의 컨테이너이며 단일 상품을 소유하지 않는다
- `UpdateCandidateStashPayload`: `{ companyUuid, stashUuid, name, note? }` — 같은 회사 scope 안에서 메타만 갱신
- `AppendCandidateItemsPayload`: `{ companyUuid, stashUuid, skuGroupKeys }` — 자사/경쟁사 분석 리스트 또는 추천 보기에서 선택한 상품들을 스냅샷 없이 후보군에 추가한다. 현재 프론트의 `skuGroupKey`는 내부적으로 `SKU.code + SKU.color_code` 상품 단위에 대응하며, 사이즈별 확정 오더량과 AI 코멘트는 이너후보군 2차 드로워에서 저장하기 전까지 비어 있거나 미확정 상태다
- `AppendCandidateItemsResponse`: `{ candidateItems: CandidateStashItemSummary[] }` — 이번 요청으로 새로 생성된 `CANDIDATE_ITEM`만 반환한다. 이미 존재해서 skip된 항목은 포함하지 않는다. 추천 보기에서 추가한 경우 프론트는 이 응답의 신규 `candidateItems`와 이미 조회해 둔 recommendation row를 매칭해 화면 리스트로 로컬 이동시키며, `getCandidateItemsByStash` 전체 재조회는 하지 않는다. 총 오더 수량/금액은 새로 생성된 `candidateItems[].uuid`만 `subscribeCandidateOrderMetrics`에 넘겨 SSE로 계산한다.
- `AppendCandidateItemPayload`: `{ companyUuid, stashUuid, skuGroupKey, details, isLatestLlmComment? }` — `details`가 오더 스냅샷 저장의 단일 경로이며, 기본값은 `false` 권장
- `UpdateCandidateItemPayload`: `{ companyUuid, itemUuid, details, isLatestLlmComment }`. `details`에 스냅샷이 있으면 상세확정으로 저장/갱신하고, `details`가 `null`이면 저장된 2차 드로워 스냅샷을 삭제해 상세확정을 해제한다. 이 작업은 복구 불가능한 사용자 명시 액션으로 취급한다. 성공 응답은 `UpdateCandidateItemResponse`다.
- `CandidateDetailBulkConfirmStartPayload`: `{ stashUuid, itemUuids, dataReferencePeriodStart, dataReferencePeriodEnd }`. 선택된 상세미확정 후보 아이템들을 백엔드 job으로 상세확정한다. 백엔드는 각 item의 2차 드로워 계산, AI 코멘트 포함 스냅샷 생성, `CANDIDATE_ITEM.details` 저장을 item 단위 트랜잭션 또는 안전한 batch 트랜잭션으로 수행한다.
- `CandidateStashExcelUploadResult`: `{ stashUuid, stashName, itemCount, warnings: string[] }`
- 2차 드로워에서 후보 아이템 스냅샷을 다시 저장할 때 프론트는 `updateCandidateItem`에 `isLatestLlmComment: false`를 보냅니다. 백엔드는 해당 아이템의 DB `is_latest_llm_comment`를 `false`로 저장해 기존 AI 코멘트/추천이 최신 스냅샷 기준이 아님을 표시해야 합니다.
- `updateCandidateItem` 성공 응답은 필수로 commit 이후 최신 `UpdateCandidateItemResponse`를 반환합니다. 프론트는 개별 확정 저장/해제와 상세확정 일괄해제 모두 PATCH 성공 직후 이 응답의 `isDetailConfirmed`, `isLatestLlmComment`, `dbUpdatedAt`을 현재 화면 기준 상태로 반영하고, 후보 아이템 전체 목록을 즉시 재조회하지 않습니다. 이후 사용자가 조회 버튼을 누르거나 다른 이유로 `getCandidateItemsByStash`/`getCandidateItemByUuid`가 실행될 때 이전 `dbUpdatedAt`을 가진 stale row가 내려와도 방금 mutation한 상태를 덮어쓰지 않습니다. 서버가 새 `dbUpdatedAt`과 같은 확정 상태를 내려오면 보호를 해제합니다. 백엔드는 PATCH 성공 응답을 보내기 전에 DB commit과 캐시 무효화를 끝내거나, 적어도 다음 GET이 이전 `details`를 읽지 않도록 read-after-write 일관성을 보장해야 합니다.

**동작 메모**

- `duplicateCandidateStash`: 동일 스태시·아이템 복제(구현 세부는 백엔드 결정). 프론트는 완료 후 `getCandidateStashes()`를 다시 호출해 목록을 동기화합니다.
- 자사/경쟁사 분석 탭과 이너후보군 추천 보기의 `appendCandidateItems`는 후보군에 상품 식별자만 추가하고 스냅샷을 만들지 않습니다. 따라서 새로 담긴 아이템의 `details`는 `null`, `isDetailConfirmed`는 `false`여야 합니다. 스냅샷은 이너후보군 2차 드로워에서 개별 저장/수정할 때만 생성합니다.
- 추천 보기의 `appendCandidateItems` 성공은 전체 후보군 조회나 전체 추천 재계산의 트리거가 아닙니다. 백엔드는 DB insert 후 신규 `CANDIDATE_ITEM` 요약만 응답하고, 프론트는 이미 받은 추천 row를 현재 리스트로 옮긴 뒤 신규 item UUID만 오더 지표 SSE에 추가 요청합니다. 후보군 membership cache가 있다면 mutation 성공 전에 해당 stash cache를 무효화해야 하지만, append 응답 자체에 전체 리스트를 다시 싣지 않습니다.
- 이너후보군 리스트 기본 화면은 `CandidateItemSummary`의 live 계산값을 표시합니다. 저장 스냅샷이 있는 경우에도 리스트는 상세확정 여부만 표시하고, 2차 드로워는 저장 스냅샷을 편집 가능한 초기값으로 hydrate합니다. 이후 사용자가 바꾸는 미확정 값은 DB가 아니라 프론트 메모리 draft에만 머물며, 후보군 상세 모달을 닫으면 폐기됩니다. `확정`은 현재 2차 드로워 상태를 `details`에 저장하고, `확정 해제`는 확인 후 `details: null`로 업데이트합니다. `초기화`는 DB 스냅샷을 건드리지 않고 현재 이너오더 조회 기간 기준 live 계산값으로 되돌립니다.
- `uploadCandidateStashExcel`: 프론트는 파일을 파싱하지 않습니다. `multipart/form-data`의 `file` 필드로 엑셀 파일을 전송하고,
  백엔드는 파일 내용을 검증한 뒤 DB 트랜잭션 안에서 후보군과 후보 아이템을 생성해야 합니다.
  생성자/소유자는 요청 body가 아니라 인증 세션의 `USER_ACCOUNT.uuid`를 기준으로 결정합니다. 회사 소유권은 요청 `companyUuid`와 대상 stash/item의 회사 scope가 일치하는지로 검증합니다.
  성공 후 프론트는 응답 객체를 목록에 직접 삽입하지 않고 `getCandidateStashes({ companyUuid })`를 다시 호출해 DB 기준 목록과 동기화합니다.
- `getCandidateStashExcelTemplateDownload`: 현재 프론트는 정적 파일 URL을 반환하지만, 운영 백엔드 연결 시에는 같은 프론트 계약을 유지한 채 템플릿 다운로드 endpoint로 교체할 수 있습니다. 예: `GET /candidate-stashes/excel-template`.
- 후보군 발주 엑셀 다운로드: 별도 백엔드 다운로드 endpoint를 두지 않습니다. 프론트는 이미 조회한 후보 아이템과 SSE로 받은 `CandidateItemSummary.orderExport` DTO를 사용해 브라우저에서 XLSX를 생성합니다. 모든 행의 오더 지표가 로드되기 전에는 다운로드를 막습니다. 주 데이터 시트는 후보 아이템 1개를 1행으로 두며, 기본 컬럼은 `브랜드`, `품번`, `상품명`, `색상`, `배지`, `자사 기간 총 판매량`, `{선택 경쟁사} 기간 총 판매량`, `총 오더량`, `총 오더 금액`, `평균 원가`, `평균 판매가`, `평균 수수료율`, `평균 영업이익율`입니다. `배지`가 복수인 경우 한 셀 안에서 줄바꿈으로 구분합니다. 그 뒤에는 해당 후보군 전체에서 등장한 모든 사이즈를 동적 컬럼으로 추가하고, 각 제품의 사이즈별 오더량을 기재합니다. 제품에 존재하지 않는 사이즈 컬럼은 `N/A`로 표시해 실제 오더량 `0`과 구분합니다. 메타 시트는 `오더 입고 예정일`, `이름`을 포함합니다. `이름`은 현재 세션의 `USER_ACCOUNT.name` 또는 운영에서 정한 사용자 표시명을 사용합니다.
- 엑셀 업로드 검증 권장:
  - 현재 템플릿 초안의 `DATA` 시트 필수 컬럼 예: `브랜드`, `품번`, `오더 수량`, `금번 오더 입고일`, `차기 오더 입고일`.
  - `오더 수량`은 사이즈별 입력이 아니라 총 발주 수량입니다. 사이즈별 오더 배분/조정은 시스템 내부 계산 흐름이 담당합니다.
  - 보조 컬럼 예: `memo`, `channel`, `unitPrice`, `unitCost`, `feeRate`.
  - 필수 컬럼 누락, 알 수 없는 품번, 수량 파싱 실패, 중복 행, 음수 수량은 에러 또는 행 단위 경고로 명확히 반환합니다.
  - 백엔드는 생성된 후보군 UUID, 등록 아이템 수, 무시/보정된 행 경고를 응답합니다.
  - 검증 실패 시 후보군/아이템을 부분 저장하지 않는 것을 기본 정책으로 권장합니다.

**후보군 LLM 코멘트/상세확정**

- 프론트 API 계약에는 후보군 LLM 코멘트 작업 시작 `startCandidateStashLlmCommentJob(stashUuid, params)`와 진행 SSE `subscribeCandidateStashLlmCommentJob(jobId, listener, params)`를 둔다. job start payload/query와 SSE subscribe query는 모두 같은 단일 `companyUuid`를 필수로 사용한다. 화면에서 호출할 때는 모달 생명주기에 맞춰 SSE를 닫아야 한다.
- 백엔드는 해당 `stashUuid`에 속한 후보 아이템 중 저장 스냅샷(`CandidateItemDetail.details`)이 존재하는 항목만 LLM 코멘트 생성 작업에 투입한다. 스냅샷 없이 담긴 미확정 항목은 건너뛰거나 미확정 상태로 보고한다.
- 시작 응답은 `{ jobId, stashUuid, itemCount }`이며 SSE 이벤트는 `{ jobId, stashUuid, status, totalItems, completedItems, currentItemUuid?, currentProductName?, message, error? }`를 내려준다.
- AI 코멘트와 사이즈별 확정 오더량은 이너후보군 2차 드로워에서 스냅샷을 저장/수정할 때 후보 아이템 `details`에 함께 저장합니다.
- 각 후보 아이템의 LLM 코멘트 갱신이 완료되면 백엔드는 해당 아이템의 DB `is_latest_llm_comment`를 `true`로 갱신한다. 실패 시 `status: 'failed'`와 `error` 메시지를 내려야 한다.

**상세 일괄확정**

| 계약 메서드 | 제안 HTTP | 제안 경로 |
|-------------|-----------|----------|
| `startCandidateDetailBulkConfirm(payload)` | POST | `/candidate-stashes/:stashUuid/items/detail-confirmation-jobs` body `{ companyUuid, itemUuids, dataReferencePeriodStart, dataReferencePeriodEnd }` |
| `subscribeCandidateDetailBulkConfirm(jobId, listener, params)` | SSE | `/candidate-item-detail-confirmation-jobs/:jobId/events?companyUuid` |

- 시작 요청 body는 `itemUuids`, `dataReferencePeriodStart`, `dataReferencePeriodEnd`를 포함한다. `stashUuid`는 path와 payload 모두 프론트 타입에 존재하지만, HTTP adapter는 path에 넣고 body에는 나머지 필드만 보낸다.
- 시작 응답은 `{ jobId, stashUuid, itemCount }`다. `itemCount`는 실제 처리 대상 item 수이며, 존재하지 않거나 권한 밖인 item은 포함하지 않는다.
- SSE 이벤트는 `{ jobId, stashUuid, status, totalItems, completedItems, currentItemUuid?, currentProductName?, updatedItem?, message, error? }`다.
- item 처리가 성공할 때마다 `updatedItem`에 commit 이후 최신 `CandidateItemDetail`을 포함한다. 프론트는 이 이벤트를 현재 리스트와 열린 드로워의 권위 상태로 사용하므로, 백엔드는 이벤트 발행 전에 `CANDIDATE_ITEM.details`, `is_latest_llm_comment`, `db_updated_at` 저장과 관련 캐시 무효화를 끝내야 한다.
- `updatedItem.details`는 반드시 `SecondaryOrderSnapshotPayload`, 즉 아래 5.5절의 `OrderSnapshotDocumentV1` v2 스키마와 동일한 JSON이어야 한다. 백엔드는 `schemaVersion: 2`, `skuGroupKey`, `savedAt`, `context`, `drawer1`, `drawer2`를 채워 `CANDIDATE_ITEM.details`에 저장한다.
- 상세 일괄확정에서 저장되는 스냅샷의 `context.periodStart`와 `context.periodEnd`는 시작 요청의 `dataReferencePeriodStart`와 `dataReferencePeriodEnd`를 따른다.
- `drawer2.confirmedTotals`와 `drawer2.sizeRows[].confirmQty`는 상세확정 상태, 스냅샷 기준 보기, 엑셀/오더 근거 복원에 사용되므로 누락하면 안 된다. AI 코멘트를 함께 생성하는 경우 `drawer2.llmPrompt`, `drawer2.llmAnswer`도 저장한다.
- 프론트는 진행 팝업을 표시하고 item 이벤트마다 row를 로컬로 `상세확정` 처리한다. 전체 후보 아이템 목록은 재조회하지 않는다.
- 실패 정책은 item 단위 실패와 전체 실패 중 하나를 택해 명확히 문서화한다. 현재 프론트 타입은 전체 job `failed`와 `error`를 표시할 수 있고, item 단위 실패가 필요하면 별도 event type 또는 `updatedItem` 없는 running 이벤트와 message로 확장한다.
- 이 job은 추천/배지 조회나 총 오더 수량/금액 SSE를 대체하지 않는다. 일괄확정 후 이미 화면에 있는 live 목록값은 그대로 두고, 상세확정 여부와 저장 스냅샷만 갱신한다.

### 3.11 `getSecondaryStockOrderCalc`

**요청 (`SecondaryStockOrderCalcParams`)**

| 필드 | 의미 |
|------|------|
| `companyUuid` | 선택. 단일 회사 선택 시 포함한다. `전체` 선택 시 생략하며 백엔드는 회사 조건 없이 계산한다 |
| `skuGroupKey` | 상품 단위 묶음 키. `SKU.code + SKU.color_code`에 대응하며 DB `SKU.uuid`가 아니다 |
| `periodStart`, `periodEnd` | 분석 구간 |
| `forecastPeriodEnd` | 선택. 기대 일평균 산출용 예측 구간 종료 월/일. 비우면 `periodEnd` 사용 |
| `serviceLevelPct` | 재고·안전재고 계산용 **서비스 수준(%)** |
| `leadTimeDays` | 리드타임 일수 |
| `safetyStockMode` | `'manual'` \| `'formula'` |
| `manualSafetyStock` | 수동 안전재고 수량 |
| `dailyMean` | 선택. 비우면 백엔드가 기간 트렌드 등으로 **일평균 수요 μ** 산출 |

프론트 호출 기준: 2차 드로워의 재고·발주 입력값이 바뀔 때마다 즉시 호출하지 않고, 마지막 입력 후 1초 동안 추가 변경이 없을 때만 이 API를 호출한다. 이미 나간 이전 요청은 네트워크 레벨에서 반드시 abort되지는 않을 수 있으나, 프론트는 cleanup된 요청의 응답을 stale로 보고 화면에 반영하지 않는다. 백엔드는 같은 SKU/기간/입력 조합에 대해 멱등적으로 계산 결과를 반환해야 하며, 빠른 연속 요청이 오더라도 마지막 요청 기준 결과가 화면의 기준이 된다.

**응답 (`SecondaryStockOrderCalcResult`)**

| 필드 | 의미 |
|------|------|
| `trendDailyMean` | 표시용 일평균(소수 첫째 자리 등 포맷된 값) |
| `dailyMean` | 연산에 사용된 μ |
| `sigma` | 수요 변동성 지표 |
| `display` | UI용 목 데이터 블록: 전체·사이즈별 재고/발주잔량/입고예정 등 **배열·합계** |
| `safetyStockCalc` | 안전재고 모드 연산 결과(`safetyStock`, `recommendedOrderQty`, 기대 매출·이익 등) |
| `forecastQtyCalc` | 포캐스트 수량 모드 결과 블록 — **`safetyStock`은 `null` 고정 타입**(수식 분기용) |

---

## 4. 보조 타입 (`secondaryDrawerTypes.ts`, `utils/salesKpiColumn.ts`)

### 4.1 `SalesKpiColumn`

자사·경쟁 한 열의 KPI 묶음입니다.

현재 단일 소스 타입 정의는 `dashboard-app/src/utils/salesKpiColumn.ts` 입니다.

| 필드 | 의미 |
|------|------|
| `avgPrice`, `qty`, `amount` | 평균 단가·수량·금액 |
| `avgCost` | 평균 원가 |
| `grossMarginPerUnit` | 단위 매출총이익 |
| `feePerUnit`, `feeRatePct` | 단위 수수료·수수료율(%) |
| `opMarginPerUnit`, `opMarginRatePct` | 단위 영업이익·영업이익률(%) |
| `qtyRank`, `amountRank` | 순위 |
| `costRatioPct` | 원가 비중(%) |

### 4.2 `SecondaryForecastInputs`

재고·발주 시뮬 입력 상태입니다.

| 필드 | 의미 |
|------|------|
| `trendDailyMean` | 트렌드 기반 일평균(표시·동기화) |
| `dailyMean` | 연산 μ |
| `leadTimeStartDate`, `leadTimeEndDate`, `leadTimeDays` | 리드타임 창 |
| `safetyStockMode`, `manualSafetyStock` | 안전재고 모드 |
| `sigma` | 표준편차 등 |
| `serviceLevelPct` | 서비스 수준 |

### 4.3 `SecondaryForecastDerived`

입력으로부터 도출된 발주·매출·이익 요약입니다.

| 필드 | 의미 |
|------|------|
| `safetyStock` | 안전재고 수량 |
| `recommendedOrderQty` | 추천 발주 수량 |
| `expectedOrderAmount` | 예상 발주 금액 |
| `expectedSalesAmount` | 예상 매출 |
| `expectedOpProfit` | 예상 영업이익 |

---

## 5. 주요 도메인 타입 참조

### 5.1 `ProductPrimarySummary`

| 필드 | 의미 |
|------|------|
| `skuGroupKey`, `productName`, `brand`, `category`, `code`, `colorCode` | 상품 단위 메타. `skuGroupKey`는 `SKU.code + SKU.color_code` 묶음이고, 실제 SKU 유일성은 `code + colorCode + size` 조합이다 |
| `price` | 자사 채널 판매가 |
| `qty` | 판매 수량 등 요약 값 |
| `availableStock` | 판매 가능 재고 |
| `recommendedOrderQty` | 추천 발주 수량 |
| `seasonality` | 1~12월 계절 비중 배열 (`ratio` 합 ≈ 1) |
| `sizeMix` | 사이즈 믹스 행 [`ProductSizeMixRow`](#53-productsizemixrow) |

### 5.2 `ProductSizeMixRow`

| 필드 | 의미 |
|------|------|
| `size` | 사이즈 코드 |
| `ratio` | 구성비 |
| `confirmedQty` | 확정 수량 |
| `avgPrice` | 평균 단가 |
| `qty` | 수량 |
| `availableStock` | 가용 재고 |

### 5.4 `ProductMonthlyTrendPoint`

| 필드 | 의미 |
|------|------|
| `date` | 월 식별 |
| `selfSales` | 자사 월간 판매량 |
| `competitorSales` | 선택 경쟁 채널 월간 판매량. 포캐스트 구간 등 값이 없으면 `null` |
| `isForecast` | 포캐스트 여부 |

### 5.5 `OrderSnapshotDocumentV1` (v2 스키마)

상수: `ORDER_SNAPSHOT_SCHEMA_VERSION = 2`.

**최상위**

| 필드 | 의미 |
|------|------|
| `schemaVersion` | 스키마 버전 (현재 `2`) |
| `skuGroupKey` | 상품 단위 묶음 키. `SKU.code + SKU.color_code`에 대응하며 DB `SKU.uuid`가 아니다 |
| `savedAt` | 후보 아이템 `details`에 저장되는 스냅샷 시각 |
| `context` | 재조회용 컨텍스트 |
| `context.periodStart`, `periodEnd` | 분석 구간 |
| `context.forecastMonths` | 포캐스트 월 수 |
| `context.dailyTrendStartMonth` | 일간 트렌드 API의 `startMonth` 와 맞출 것 |
| `context.dailyTrendLeadTimeDays` | 일간 트렌드 API의 `leadTimeDays` 와 맞출 것 |
| `drawer1` | 1차 드로어 스냅샷 |
| `drawer2` | 2차 드로워 스냅샷 |

**`drawer1` (`OrderSnapshotDrawer1V2`)**

| 필드 | 의미 |
|------|------|
| `summary` | `ProductPrimarySummary`에서 **`monthlySalesTrend` 제외**한 요약(`OrderSnapshotPrimarySummaryV2`). 재조회 시 트렌드는 `getProductMonthlyTrend` / `getSecondaryDailyTrend` 계열 API로 복원 |

**`drawer2` (`OrderSnapshotDrawer2V1`)**

| 필드 | 의미 |
|------|------|
| `secondary` | 당시 `ProductSecondaryDetail` 스냅샷 |
| `competitorChannelId`, `competitorChannelLabel` | 선택 경쟁 채널 |
| `minOpMarginPct` | 스냅샷 시점 영업이익률 하한; `null` = 하한 없음 |
| `salesSelf`, `salesCompetitor` | [`SalesKpiColumn`](#41-saleskpicolumn) |
| `stockInputs` | [`SecondaryForecastInputs`](#42-secondaryforecastinputs) |
| `stockDerived` | [`SecondaryForecastDerived`](#43-secondaryforecastderived) |
| `orderUnitInputs` | 저장 당시 통합 오더 설정의 단가·원가·예상 수수료율: `{ unitPrice, unitCost, expectedFeeRatePct }`. 스냅샷 기준 보기에서 live 판매 정보로 재계산하지 않고 이 값을 표시한다 |
| `stockDisplay` | 저장 당시 사이즈별 오더 카드의 재고/미입고/입고예정 표시값. `getSecondaryStockOrderCalc.display`와 같은 구조이며, 스냅샷 기준 보기에서 현재 API 응답 대신 사용한다 |
| `selfWeightPct` | 자사 가중(%) |
| `sizeForecastSource` | `'periodMean'` \| `'forecastQty'` — 사이즈 예측 소스 |
| `bufferStock` | 추가 버퍼 재고 |
| `llmPrompt`, `llmAnswer` | AI 코멘트 컨텍스트 |
| `confirmedTotals` | 저장 시점 확정 합계(선택): `orderQty`, `expectedSalesAmount`, `expectedOpProfit`, `expectedOpProfitRatePct` |
| `sizeRows` | [`OrderSnapshotSizeRowV1[]`](#56-ordersnapshotsizerowv1) |

### 5.6 `OrderSnapshotSizeRowV1`

| 필드 | 의미 |
|------|------|
| `size` | 사이즈 |
| `selfSharePct`, `competitorSharePct`, `blendedSharePct` | 자사/경쟁/블렌드 점유(%) |
| `forecastQty` | 예측 수량 |
| `recommendedQty` | 추천 수량 |
| `confirmQty` | 사용자 확정 수량 |

### 5.7 `MonthlySalesPoint`

| 필드 | 의미 |
|------|------|
| `date` | 월 식별 |
| `sales` | 매출 규모 |
| `isForecast` | 포캐스트 여부 |

---

## 6. 구현 체크리스트

1. OpenAPI 또는 JSON Schema로 위 타입을 Export 가능하면 프론트 codegen과 공유하기 쉽습니다.
2. 후보 아이템 저장 시 **`schemaVersion`** 과 **`context`** 필드를 클라이언트가 그대로 보내므로 검증 후 저장합니다.
3. 후보 아이템 목록 집계 필드는 `CandidateItemListParams.dataReferencePeriodStart`~`dataReferencePeriodEnd` 기준 live 계산값입니다. 스냅샷 값으로 목록을 덮어쓰지 말고, 스냅샷은 상세확정 여부와 2차 드로워의 저장 당시 근거 복원에만 사용합니다.
4. 배지는 조회 기간 전체 대상 상품의 분포를 먼저 계산한 뒤 후보군 포함 상품만 추려 반환합니다. 성능이 부담되면 기간/채널별 랭킹·배지 결과 캐시를 우선 고려합니다.
5. 필드 리네이밍 시 프론트 TypeScript와 동시 배포 또는 버전 분기 필요.

---

## 7. 참조 소스 파일

- [`dashboard-app/src/api/types/dashboard-api.ts`](../../dashboard-app/src/api/types/dashboard-api.ts)
- [`dashboard-app/src/api/types/company.ts`](../../dashboard-app/src/api/types/company.ts)
- [`dashboard-app/src/api/types/auth.ts`](../../dashboard-app/src/api/types/auth.ts)
- [`dashboard-app/src/api/types/candidate.ts`](../../dashboard-app/src/api/types/candidate.ts)
- [`dashboard-app/src/api/types/snapshot.ts`](../../dashboard-app/src/api/types/snapshot.ts)
- [`dashboard-app/src/api/types/secondary.ts`](../../dashboard-app/src/api/types/secondary.ts)
- [`dashboard-app/src/api/types/sales.ts`](../../dashboard-app/src/api/types/sales.ts)
- [`dashboard-app/src/api/types/drawer.ts`](../../dashboard-app/src/api/types/drawer.ts)
- [`dashboard-app/src/types.ts`](../../dashboard-app/src/types.ts)
- [`dashboard-app/src/snapshot/orderSnapshotTypes.ts`](../../dashboard-app/src/snapshot/orderSnapshotTypes.ts)
- [`dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawerTypes.ts`](../../dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawerTypes.ts)
- [`dashboard-app/src/utils/salesKpiColumn.ts`](../../dashboard-app/src/utils/salesKpiColumn.ts)

## 2.1 Scatter grid endpoints (added)

### 2.1.1 `DashboardApi` additions

- `getSelfSalesScatterGrid(params?)`
  - `GET /sales/self/scatter-grid`
  - Query params: `companyUuid`, `startDate`, `endDate`, `brand`, `category`, `codeQuery`, `colorCode`, `nameQuery`, `xBucketSize`, `yBucketSize`, `maxSkuIdsPerCell`
  - Response: `ScatterSalesGridResponse` (`cells` + `meta`)
- `getCompetitorSalesScatterGrid(params?)`
  - `GET /sales/competitor/scatter-grid`
  - Query params: `companyUuid`, `startDate`, `endDate`, `brand`, `category`, `codeQuery`, `colorCode`, `nameQuery`, `competitorChannelId`, `xBucketSize`, `yBucketSize`, `maxSkuIdsPerCell`
  - Response: `ScatterSalesGridResponse` (`cells` + `meta`)

### 2.1.2 Python backend implementation notes

산점도 API는 반드시 백엔드 집계 API로 구현한다. 수만 행의 원천 판매 row를 프론트로 내려서 브라우저에서 격자화하지 않는다.

프론트 mock의 참고 구현은 `dashboard-app/src/api/mock/scatterGrid.ts`에 분리되어 있다. 이는 운영 프론트 책임이 아니라 백엔드 격자화 계약을 검증하기 위한 reference/mock 계산이며, 운영 연결 시 같은 계산 책임은 Python 백엔드로 옮긴다.

공통 구현 방향:

- FastAPI/SQLAlchemy 기준으로는 목록 API와 동일한 filter builder를 공유한다.
- `startDate`, `endDate`, `brand`, `category`, `codeQuery`, `colorCode`, `nameQuery`, `competitorChannelId` 조건은 DB/서버에서 먼저 적용한다.
- SKU 원천 row는 `SKU.code + SKU.color_code` 단위의 `skuGroupKey`로 먼저 집계한다. `SKU.size` 단위 row는 산점도 기준에서는 하나의 product-color 그룹으로 접는다.
- bucket size는 요청의 `xBucketSize`, `yBucketSize`가 있으면 그대로 쓰고, 없으면 필터링된 결과의 min/max 범위에서 파생한다.
- 현재 기본 정책은 최초 12분할 bucket의 약 70% 크기를 사용해, 12x12보다 조금 더 촘촘한 격자를 만든다.
- 응답은 occupied cell만 내려준다. 빈 cell을 전부 채워 보내지 않는다.
- 점 색상과 화면 반지름은 프론트 표시 문제다. 백엔드는 색상이나 pixel radius를 계산하지 않고, `count`와 `meta`만 정확히 내려준다.
- 점 클릭은 백엔드 재요청 없이 이미 받은 목록을 좁히는 동작이다. 따라서 `cells[].skuIds`에는 현재 legacy 이름과 달리 `skuGroupKey` 값들을 넣는다. 계약명을 정리할 수 있는 시점에는 `skuGroupKeys`로 바꾸는 것이 더 정확하다.
- `maxSkuIdsPerCell`을 적용하면 점 클릭 결과가 일부만 보일 수 있다. 현재 UX는 "초기 리스트 안에서 해당 점의 항목을 모두 표시"가 원칙이므로 기본적으로 truncate하지 않는다.

자사 분석 산점도:

- `GET /sales/self/scatter-grid`
- X축: 기간 가중 영업이익률 `%`
- Y축: 기간 내 자사 판매량 `EA`
- 목록 API(`GET /sales/self`)와 같은 기간/브랜드/카테고리/품번/색상/상품명 필터를 적용한 뒤 집계한다.

경쟁사 분석 산점도:

- `GET /sales/competitor/scatter-grid`
- X축: 자사 판매량 `EA`
- Y축: 선택 경쟁 채널 판매량 `EA`
- `competitorChannelId`가 없으면 전체 경쟁 채널 합계다.
- 경쟁 채널을 합산할 때 자사 판매량/판매액을 채널 수만큼 중복 합산하지 않는다.
- 자사 판매량이 없는 row는 X축 좌표가 없으므로 산점도 cell 집계에서는 제외한다.

권장 Python 처리 흐름:

1. 필터 조건을 적용한 base query를 만든다.
2. `skuGroupKey = code + color_code` 기준으로 판매량/판매액/마진 계산에 필요한 값을 집계한다.
3. 산점도 축 값 `x`, `y`를 계산한다.
4. `min/max`와 `bucketSize`를 구한다.
5. `floor((value - min) / bucketSize)`로 bucket index를 구하고 마지막 bucket은 max 값 포함 처리한다.
6. `(xIndex, yIndex)` 또는 range 기반 key로 group by 하여 `count`, `skuGroupKey[]`, range, representative point를 만든다.
7. `cells`는 count 내림차순 등 안정적인 순서로 반환하고, `meta.xAxis/yAxis`에는 실제 사용한 min/max/bucketSize를 넣는다.

기본 bucket size는 최초 12분할 기준 bucket의 약 70%로 잡아 더 촘촘한 격자를 만든다. 프론트가 `xBucketSize`/`yBucketSize`를 명시하면 백엔드는 요청값을 우선하고, 응답 `meta.xAxis.bucketSize`/`meta.yAxis.bucketSize`에 실제 사용값을 내려준다. 산점도 격자 집계는 백엔드 책임이다. 수만 행 규모의 원본 행을 프론트로 내려서 브라우저에서 binning하지 않는다. 셀 색상과 표시 반지름은 백엔드가 주지 않고, 프론트가 `count`, 현재 응답의 최대 count, 응답 `meta`, 실제 차트 크기로 계산한다.

## 8. 2026-05-21 API 런타임 모드와 실패 정규화 기준

프론트 API 런타임 모드는 `dashboard-app/src/api/index.ts`의 `API_ADAPTER_MODE`로 mock/http 경계를 구분한다.

- `API_ADAPTER_MODE` 값은 `mock` 또는 `http`다.
- `mock`은 `src/api/mock/*`의 계약 대체 구현을 사용한다.
- `http`는 `VITE_API_BASE_URL`과 `src/api/requests/httpClient.ts` 경계를 통해 실제 백엔드로 요청한다.
- 네트워크/timeout/parse 실패는 `ApiClientError`, HTTP 실패는 `ApiHttpError`로 정규화한다.
- `ApiClientError.kind`는 `network`, `timeout`, `parse`, `stream-protocol`, `auth`, `permission`, `validation`, `server` 등 UI 정책 분기에 사용할 수 있는 값을 유지한다.
- 401은 인증 실패, 403은 권한 실패로 구분해 UX 문구를 다르게 표시한다.
- SSE 연결 실패, 프로토콜 오류, JSON parse 실패는 transport 실패로 숨기지 않고 `stream-protocol` 등 명시적 실패로 전달한다.

후보군 상세 조회 실패처럼 기존 데이터가 남아 있는 화면은 빈 배열 성공으로 수렴하지 않고, 기존 데이터 유지와 최신화 실패 surface를 함께 보여준다.

## 9. Company list and company scope contract

Company list API는 header company selector dropdown을 위한 최소 계약이다. 실제 백엔드는 COMPANY 테이블의 `uuid`, `name`을 사용한다.

| Contract method | Suggested HTTP | Suggested path | Response |
|------|------|------|------|
| `getCompanies()` | GET | `/companies` | `CompanySummary[]` |

**`CompanySummary`**

| Field | Type | Description |
|------|------|------|
| `uuid` | string | 회사 식별자. dropdown 선택값과 단일 회사 scope query의 기준 id이다. |
| `name` | string | dropdown에 표시할 회사명이다. mock 기준 값은 `전체`, `한아INT`, `T1글로벌`이다. |

**회사 scope query 정책**

| 선택 상태 | 프론트 요청 | 백엔드 조회 기준 |
|------|------|------|
| `전체` | `companyUuid` 생략 | 회사 `WHERE` 조건을 적용하지 않는다. |
| `한아INT`, `T1글로벌` 등 단일 회사 | `companyUuid=<CompanySummary.uuid>` 포함 | 해당 회사 UUID 조건을 적용한다. |

- `전체`는 프론트 dropdown의 scope 선택지이며, 특정 회사 row의 업무 데이터 필터로 쓰지 않는다.
- `companyUuid`는 분석 API만의 옵션이 아니라 회사 소유 업무 데이터 전체의 전역 scope다.
- 단일 회사 선택 시 프론트는 분석, 산점도, filter meta, 후보군, 상품 드로워, 2차 드로워, 오더 계산/SSE/mutation 요청에 `companyUuid=<CompanySummary.uuid>`를 포함한다.
- `전체` 선택 시 프론트는 `companyUuid`를 생략하고, 백엔드는 해당 업무 조회에서 회사 `WHERE` 조건을 적용하지 않는다.
- 오더 후보군은 단일 회사 기준 업무 흐름이다. 프론트는 `전체` 선택 상태에서 오더 후보군 탭과 자사/경쟁사 후보군 추가 액션을 비활성화하며, 후보군 API 호출로 빈 scope를 보내지 않는다.

**회사 scope 적용 endpoint**

| 영역 | 계약 메서드/제안 endpoint | `companyUuid` 위치 | `전체` 선택 처리 |
|------|------|------|------|
| 회사 목록 | `GET /companies` | 없음 | 회사 선택지 자체 조회이므로 scope 없음 |
| 필터 메타 | `GET /sales/filter-meta` | query | 생략 시 전체 회사 기준 |
| 자사 분석 | `GET /sales/self` | query | 생략 시 전체 회사 기준 |
| 자사 산점도 | `GET /sales/self/scatter-grid` | query | 생략 시 전체 회사 기준 |
| 경쟁사 분석 | `GET /sales/competitor` | query | 생략 시 전체 회사 기준 |
| 경쟁사 산점도 | `GET /sales/competitor/scatter-grid` | query | 생략 시 전체 회사 기준 |
| 1차 드로워 요약 | `GET /products/:skuGroupKey/drawer-bundle` | query | 생략 시 전체 회사 기준 |
| 1차 판매 정보 | `GET /products/:skuGroupKey/sales-insight` | query | 생략 시 전체 회사 기준 |
| 1차 월간 추이 | `GET /products/:skuGroupKey/monthly-trend` | query | 생략 시 전체 회사 기준 |
| 2차 상세 | `GET /products/:skuGroupKey/secondary-detail` | query | 생략 시 전체 회사 기준 |
| 2차 일간 추이 | `GET /products/:skuGroupKey/secondary/daily-trend` | query | 생략 시 전체 회사 기준 |
| 2차 AI 코멘트 | `POST /products/:skuGroupKey/secondary/ai-comment` | payload 또는 query adapter 계약 | 생략 시 전체 회사 기준 |
| 2차 재고·발주 계산 | `POST /secondary/stock-order-calc` | payload | 생략 시 전체 회사 기준 |
| 후보군 목록/조회 | `GET /candidate-stashes`, `GET /candidate-stashes/:stashUuid/items`, `GET /candidate-stashes/:stashUuid/recommendations` | query | read 계약상 생략 시 전체 회사 기준. 현재 후보군 UI는 단일 회사 흐름이라 화면에서 호출 차단 가능 |
| 후보군 mutation | 후보군 생성/수정/삭제/복제, item 추가/삭제/수정 | payload 또는 query adapter 계약 | UI에서 호출 차단, 서버는 누락 요청을 검증 오류 처리 |
| 후보군 SSE/job | 오더 지표 SSE, 후보군 LLM 코멘트 job/SSE, 상세 일괄확정 job/SSE | query 또는 start payload | UI에서 호출 차단, 서버는 누락 요청을 검증 오류 처리 |
- 백엔드 사용자별 회사 접근 권한 부여는 현재 범위가 아니다. 권한 정책이 추가되면 `/companies` 응답 범위, 403 기준, 업무 API scope 검증을 함께 문서화해야 한다.
- backend는 dropdown 편의를 위해 의미 없는 scope flag, 집계 값, 가짜 성공 상태를 추가하지 않는다.
- 인증 실패는 401, 권한 실패는 403의 기존 오류 정책을 따른다.
