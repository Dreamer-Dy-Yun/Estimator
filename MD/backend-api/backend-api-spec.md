# Dashboard 백엔드 API 스펙 (구현용)

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-04-23 |
| 최종 수정일 | 2026-05-15 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app/src/api/types`, `dashboard-app/src/api/requests`, 백엔드 REST API 계약 |

이 문서는 프론트의 **`AuthApi` / `DashboardApi` TypeScript 계약**을 만족하는 REST API를 설계·구현하기 위한 참고 자료입니다. 필드명은 **camelCase**, JSON 직렬화를 가정합니다.

현재 백엔드 엔드포인트는 아직 작성되지 않았다. 따라서 프론트의 실제 요청 교체 지점은 `dashboard-app/src/api/requests/*`이며, 백엔드는 `src/api/types/*` 계약과 이 문서를 기준으로 엔드포인트를 구성한다. 지금 `requests` 파일은 mock API를 호출하지만, 백엔드 연결 시 화면/훅을 건드리지 않고 해당 파일 내부만 HTTP 요청으로 교체하는 것을 기본 원칙으로 한다.

---

## 0. 프론트 요청 adapter 경계

| 파일 | 기능 범위 | 백엔드 구현 시 주의점 |
|------|-----------|----------------------|
| `src/api/requests/authRequests.ts` | 로그인, 세션, 사용자 정보 변경, 관리자 사용자 관리 | HttpOnly cookie 기반 세션 권장. 비밀번호/임시 비밀번호는 요청 또는 1회 응답에만 존재해야 하며 목록·세션 응답에 포함하지 않는다 |
| `src/api/requests/adminGptKeyRequests.ts` | 관리자 GPT 키 목록, 생성, 메타/키 변경, 연결 테스트, 삭제 | GPT 전용 계약이다. 생성/변경 요청만 `plainKey`를 담을 수 있고, 응답은 `maskedKey`만 내려준다. 키 저장/암호화/감사 로그는 백엔드 책임이다 |
| `src/api/requests/dashboardRequests.ts` | 자사/경쟁 판매, 상품 드로워, 후보군, 분석 SSE, 엑셀 업로드 템플릿 | 후보군 계열 요청은 현재 사용자 `USER_ACCOUNT.uuid` 기준으로 소유자 필터를 강제한다. 프론트 UI는 사용자 UUID를 들고 다니지 않고 request adapter에서만 붙인다. 세션 기반 백엔드라면 요청값보다 서버 세션을 우선한다. 경쟁 분석 목록은 `competitorChannelId` 생략 시 전체 경쟁 채널 합계를 반환하고, 상품 드로워 판매 인사이트는 선택 경쟁 채널을 필수로 받는다. 이너후보군 리스트는 데이터 참조기간의 전체 상품 분포로 배지를 계산한 뒤 stash item만 반환한다. 발주 엑셀 다운로드는 백엔드 재호출 없이 이미 받은 `orderExport` DTO로 프론트가 생성한다 |

`src/api/client.ts`는 public export facade다. 화면에서 import하는 이름을 안정적으로 유지하기 위한 파일이며, mock과 실제 HTTP를 선택하는 책임은 갖지 않는다.

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

### 1.4 인증·에러

- 프론트는 `/login`과 `/dashboard/*` 보호 라우트를 분리합니다. 인증 계약은 `src/api/types/auth.ts`의 `AuthApi`가 소유합니다.
- 목 구현은 동작 확인용으로 로그인 입력값을 검증하지 않고 통과시키며 세션은 런타임 메모리에만 둡니다. `mock-user` ID는 일반 사용자 권한 확인용이고, 그 외 입력은 관리자 권한으로 처리합니다. 사용자 목록/후보군 목록의 실제 변경은 백엔드 DB가 소유해야 하며, 프론트 mock은 mutation 응답 흐름만 모사합니다. 실제 백엔드에서는 가능하면 **HttpOnly cookie 기반 세션**을 권장합니다.
- 프론트 mock 로그인 화면은 기본값 `mock-admin` / `admin`을 미리 채워 두어, 수정 없이 로그인하면 해당 관리자 세션으로 들어갑니다. 이 값은 동작 확인용이며 실제 백엔드 연결 시 제거/교체 대상입니다.
- 모든 보호 API에 동일 정책을 적용하고, 실패 시 **HTTP 401/403** 과 JSON 에러 바디를 권장합니다.
- 클라이언트 계약에는 공통 에러 타입이 없습니다. 최소 `{ "message": string }` 형태를 권장합니다.

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
| `testAdminGptKey(keyUuid)` | POST | `/admin/gpt-keys/:keyUuid/test` |
| `deleteAdminGptKey(keyUuid)` | DELETE | `/admin/gpt-keys/:keyUuid` |

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

**`USER_ACCOUNT` 정합성 메모**

- 계정 테이블은 `USER_ACCOUNT`를 기준으로 하며, 외부/API 사용자 식별자는 `USER_ACCOUNT.uuid`를 사용한다.
- `login_id`, `password_hash`, `name`, `note`, `role`, `must_change_password`, `is_active`, `failed_login_count`, `uuid`는 프론트 인증 계약과 직접 맞물린다.
- `role` 허용값은 `admin`, `user` 두 가지다. DB 표 양식상 CHECK 제약을 적기 어렵다면 백엔드 저장 검증 규칙으로 강제한다.
- `must_change_password`는 사용자 추가/비밀번호 재설정 시 백엔드가 `true`로 세팅하는 상태값이다. 관리자 추가 화면의 직접 입력값으로 두지 않는다.
- `is_active = false`는 관리자 비활성화 상태, `failed_login_count`/`locked_at`은 로그인 실패 잠금 상태, `must_change_password`는 로그인 후 비밀번호 변경 강제 상태다.

---

## 2. `DashboardApi` 메서드 ↔ REST 제안 매핑

아래 경로는 **제안**입니다. 팀 규칙에 맞게 접두사(`/api/v1` 등)를 붙이면 됩니다.

| 계약 메서드 | 제안 HTTP | 제안 경로·쿼리 |
|-------------|-----------|----------------|
| `getSelfSales(params?)` | GET | `/sales/self?startDate&endDate&brand&category&codeQuery&colorCode&nameQuery` |
| `getCompetitorSales(params?)` | GET | `/sales/competitor?startDate&endDate&brand&category&codeQuery&colorCode&nameQuery&competitorChannelId` |
| `getSalesFilterMeta()` | GET | `/sales/filter-meta` |
| `getProductDrawerBundle(skuGroupKey)` | GET | `/products/:skuGroupKey/drawer-bundle` |
| `getProductMonthlyTrend(skuGroupKey, params)` | GET | `/products/:skuGroupKey/monthly-trend?startDate&endDate&forecastMonths&competitorChannelId` |
| `getProductSalesInsight(skuGroupKey, params)` | GET | `/products/:skuGroupKey/sales-insight?startDate&endDate&competitorChannelId` |
| `getProductSecondaryDetail(skuGroupKey, params?)` | GET | `/products/:skuGroupKey/secondary-detail?minOpMarginPct` |
| `getSecondaryDailyTrend(params)` | GET | `/products/:skuGroupKey/secondary/daily-trend?startMonth&leadTimeDays&competitorChannelId` |
| `getSecondaryCompetitorChannels()` | GET | `/secondary/competitor-channels` |
| `getCandidateStashes()` | GET | `/candidate-stashes` 세션 소유자 기준 |
| `getCandidateItemsByStash(params)` | GET | `/candidate-stashes/:stashUuid/items?dataReferencePeriodStart&dataReferencePeriodEnd` |
| `getCandidateRecommendations(params)` | GET | `/candidate-stashes/:stashUuid/recommendations?dataReferencePeriodStart&dataReferencePeriodEnd` |
| `getCandidateItemByUuid(itemUuid)` | GET | `/candidate-items/:itemUuid` |
| `deleteCandidateItem(itemUuid)` | DELETE | `/candidate-items/:itemUuid` 세션 소유자 기준 |
| `deleteCandidateItems(stashUuid, itemUuids)` | DELETE | `/candidate-stashes/:stashUuid/items` body `{ itemUuids }`, 세션 소유자 기준 |
| `deleteCandidateStash(stashUuid)` | DELETE | `/candidate-stashes/:stashUuid` 세션 소유자 기준 |
| `createCandidateStash(payload)` | POST | `/candidate-stashes` body `{ name, note?, periodStart, periodEnd, forecastMonths }`, 생성자는 세션 기준 |
| `updateCandidateStash(payload)` | PATCH | `/candidate-stashes/:stashUuid` body `{ name, note? }`, 세션 소유자 기준 |
| `duplicateCandidateStash(stashUuid)` | POST | `/candidate-stashes/:stashUuid/duplicate` 세션 소유자 기준 |
| `appendCandidateItem(payload)` | POST | `/candidate-stashes/:stashUuid/items` body `{ skuGroupKey, details, isLatestLlmComment }`, 세션 소유자 기준 |
| `appendCandidateItems(payload)` | POST | `/candidate-stashes/:stashUuid/items/bulk` body `{ skuGroupKeys }`, 세션 소유자 기준 |
| `updateCandidateItem(payload)` | PATCH | `/candidate-items/:itemUuid` body `{ details, isLatestLlmComment }`, 세션 소유자 기준 |
| `uploadCandidateStashExcel(file)` | POST multipart/form-data | `/candidate-stashes/import/excel` 세션 생성자 기준 |
| `startCandidateStashAnalysis(stashUuid)` | POST | `/candidate-stashes/:stashUuid/analysis` 세션 소유자 기준 |
| `subscribeCandidateStashAnalysis(jobId, handlers)` | GET (SSE) | `/candidate-stash-analyses/:jobId/events` 세션 소유자 기준 |
| `getSecondaryStockOrderCalc(params)` | GET 또는 POST | 쿼리가 길면 POST `/secondary/stock-order-calc` body 권장 |

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

### 3.8 `getSecondaryCompetitorChannels`

**응답 (`SecondaryCompetitorChannel[]`)**

| 필드 | 의미 |
|------|------|
| `id` | 채널 id (`getCompetitorSales`, 스냅샷 `competitorChannelId` 와 연결) |
| `label` | 표시 이름 |

`priceSkew`, `qtySkew` 같은 목업 보정 계수는 운영 API 응답에 포함하지 않는다. 목업 데이터 생성에만 필요한 값은 `src/api/mock` 내부 모델에 둔다.

현재 프론트 기준 유효 채널은 **`kream`, `musinsa`** 입니다(`naver` 제거됨).

### 3.9 후보군(Candidate stash / item)

**`CandidateStashSummary`**

| 필드 | 의미 |
|------|------|
| `uuid` | 스태시 PK |
| `name`, `note` | 이름·비고 |
| `periodStart`, `periodEnd` | 후보군 생성 당시의 데이터 참조 기간. 프론트 상세 화면은 이 값을 초기값으로 쓰며, 이후 사용자가 바꾼 `dataReferencePeriodStart`/`dataReferencePeriodEnd`가 후보군 리스트 재계산과 추천 판단에 적용된다 |
| `forecastMonths` | 후보군 생성 당시의 월간 판매추이 포캐스트 개월 수 |
| `itemCount` | 소속 후보 아이템 개수 |
| `dbCreatedAt`, `dbUpdatedAt` | 생성·수정 시각(아이템 추가로 스태시 “갱신” 시각을 반영할지는 백엔드 정책) |

`getCandidateStashes`, `getCandidateItemsByStash`, `getCandidateRecommendations`, `getCandidateItemByUuid` 및 후보군 mutation 계열은 현재 인증 세션을 기준으로 동작한다. 프론트는 사용자 UUID를 요청 파라미터로 보내지 않으며, 백엔드는 세션의 `USER_ACCOUNT.uuid`와 후보군의 `userUuid`가 일치하는 데이터만 반환/수정해야 한다.

**`CandidateItemListParams`** (`getCandidateItemsByStash` 요청)

| 필드 | 의미 |
|------|------|
| `stashUuid` | 조회할 후보군 UUID. REST 경로의 `:stashUuid`와 동일 |
| `dataReferencePeriodStart` | 후보군 리스트 수치와 배지 판단에 사용할 데이터 참조 시작일 (`YYYY-MM-DD`) |
| `dataReferencePeriodEnd` | 후보군 리스트 수치와 배지 판단에 사용할 데이터 참조 종료일 (`YYYY-MM-DD`) |

이 API는 단순히 후보군에 담긴 상품만 조회해 계산하면 안 된다. 배지 기준이 “조회 기간 전체에서 상위 몇 %인가”처럼 전체 분포에 의존하므로, 백엔드는 먼저 해당 기간의 전체 대상 상품 데이터를 집계하고 그 전체 분포 기준으로 배지를 부여한 뒤, 그 결과 중 `stashUuid`에 담긴 상품만 추려 반환해야 한다. 기간 변경마다 호출될 수 있으므로 기간+경쟁채널 기준 랭킹/배지 계산 결과를 캐시하거나 materialized view/batch 집계를 두는 방식을 권장한다.

**`CandidateItemListResult`** (`getCandidateItemsByStash` 응답)

| 필드 | 의미 |
|------|------|
| `items` | 후보 아이템 목록. 각 아이템의 `insight.badges`가 `CANDIDATE_ITEM.badge` JSON 배열과 같은 `{ name, color, tooltip }[]` 형태를 가진다 |

배지는 DB 테이블 정의의 `CANDIDATE_ITEM.badge`처럼 아이템별 JSON 배열로 내려준다. 같은 배지명이 여러 아이템에 반복되어도 후보군 상세 응답 규모에서는 중복 비용보다 계약 단순성이 더 중요하다. 색상/툴팁은 백엔드가 기간 기준 계산과 함께 확정해 내려주며, 프론트는 별도 배지 정의 호출이나 이름-정의 조인을 하지 않는다.

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

**`CandidateRecommendationParams`** (`getCandidateRecommendations` 요청)

| 필드 | 의미 |
|------|------|
| `stashUuid` | 추천을 조회할 후보군 UUID. REST 경로의 `:stashUuid`와 동일 |
| `dataReferencePeriodStart` | 추천 판단에 사용할 데이터 참조 시작일 (`YYYY-MM-DD`) |
| `dataReferencePeriodEnd` | 추천 판단에 사용할 데이터 참조 종료일 (`YYYY-MM-DD`) |

**`CandidateRecommendationResult`**

`CandidateItemListResult`와 같은 `{ items }` 구조를 쓴다. 단, `items`는 백엔드가 `dataReferencePeriodStart`~`dataReferencePeriodEnd` 기간의 판매/이익/배지 조건을 기준으로 추천한 후보만 내려준다. 추천이 비어 있을 때 전체 후보를 내려줄지, 빈 배열을 내려줄지는 백엔드 정책으로 확정해야 하며, 현재 mock은 화면 확인을 위해 추천 조건이 없으면 전체 후보를 반환한다.

**`CandidateItemSummary`** (목록 행)

| 필드 | 의미 |
|------|------|
| `uuid` | 아이템 PK |
| `stashUuid` | 소속 스태시 |
| `skuGroupKey` | 상품 단위 식별자. 현재 프론트 계약에서는 `SKU.code + SKU.color_code`에 대응하며, 사이즈는 2차 드로워/스냅샷의 사이즈별 행에서 다룬다 |
| `brand`, `code`, `productName`, `colorCode` | 현재 상품 마스터와 기간 집계 결과의 SKU 메타. 색상은 SKU 식별 메타이므로 목록·엑셀에 함께 노출한다. |
| `qty` | 데이터 참조 기간 기준 추천/예상 오더 수량 합계(EA). 저장 스냅샷이 있더라도 리스트 기본값은 현재 기간 live 계산값이다 |
| `expectedOrderAmount` | 데이터 참조 기간 기준 예상 **발주 금액(원)** |
| `expectedSalesAmount` | 데이터 참조 기간 기준 예상 매출 |
| `expectedOpProfit` | 데이터 참조 기간 기준 예상 영업이익 |
| `insight.badges` | 이 아이템에 붙일 배지 배열. 각 값은 `{ name, color, tooltip }`이며 현재 목데이터 기준 허용 배지는 `크림판매`, `자사이익`, `자사판매` |
| `orderExport` | 발주 엑셀을 프론트에서 즉시 생성하기 위한 요청 기간 기준 다운로드 DTO. 전체 `details` 스냅샷을 다시 받지 않도록 `competitorChannelLabel`, 자사/경쟁 기간 판매량, 총 오더량/금액, 평균 원가/판매가/수수료율/영업이익율, 오더 입고 예정일, 사이즈별 오더량만 포함 |
| `isLatestLlmComment` | 현재 저장 스냅샷 기준 AI 코멘트/추천이 최신인지 여부. DB 컬럼은 `is_latest_llm_comment` 권장 |
| `isDetailConfirmed` | 이너후보군 2차 드로워에서 저장한 스냅샷이 있으면 `true`. 리스트의 상세확정 컬럼은 이 값을 표시한다 |
| `dbCreatedAt`, `dbUpdatedAt` | 생성·수정 시각 |

**`CandidateItemDetail`**

| 필드 | 의미 |
|------|------|
| `details` | 저장 시점의 **`SecondaryOrderSnapshotPayload` 전체 JSON**. 스냅샷 없이 후보군에 담긴 아이템은 `null`이다 |
| `isLatestLlmComment` | 상세 스냅샷 기준 AI 코멘트/추천 최신 여부 |

**페이로드**

- `CreateCandidateStashPayload`: `{ name, note?, periodStart, periodEnd, forecastMonths }` — 후보군은 컨테이너이며 단일 상품을 소유하지 않는다
- `UpdateCandidateStashPayload`: `{ stashUuid, name, note? }` — 메타만 갱신
- `AppendCandidateItemsPayload`: `{ stashUuid, skuGroupKeys }` — 자사/경쟁사 분석 리스트에서 선택한 상품들을 스냅샷 없이 후보군에 추가한다. 현재 프론트의 `skuGroupKey`는 내부적으로 `SKU.code + SKU.color_code` 상품 단위에 대응하며, 사이즈별 확정 오더량과 AI 코멘트는 이너후보군 2차 드로워에서 저장하기 전까지 비어 있거나 미확정 상태다
- `AppendCandidateItemPayload`: `{ stashUuid, skuGroupKey, details, isLatestLlmComment? }` — `details`가 오더 스냅샷 저장의 단일 경로이며, 기본값은 `false` 권장
- `UpdateCandidateItemPayload`: `{ itemUuid, details, isLatestLlmComment }`
- `CandidateStashExcelUploadResult`: `{ stashUuid, stashName, itemCount, warnings: string[] }`
- `CandidateStashAnalysisStartResult`: `{ jobId, stashUuid, itemCount }`
- `CandidateStashAnalysisProgressEvent`: `{ jobId, stashUuid, status, totalItems, completedItems, currentItemUuid, currentProductName, message, error? }`
- 2차 드로워에서 후보 아이템 스냅샷을 다시 저장할 때 프론트는 `updateCandidateItem`에 `isLatestLlmComment: false`를 보냅니다. 백엔드는 해당 아이템의 DB `is_latest_llm_comment`를 `false`로 저장해 기존 AI 코멘트/추천이 최신 스냅샷 기준이 아님을 표시해야 합니다.

**동작 메모**

- `duplicateCandidateStash`: 동일 스태시·아이템 복제(구현 세부는 백엔드 결정). 프론트는 완료 후 `getCandidateStashes()`를 다시 호출해 목록을 동기화합니다.
- 자사/경쟁사 분석 탭의 `appendCandidateItems`는 후보군에 상품 식별자만 추가하고 스냅샷을 만들지 않습니다. 따라서 새로 담긴 아이템의 `details`는 `null`, `isDetailConfirmed`는 `false`여야 합니다. 스냅샷은 이너후보군 2차 드로워에서 개별 저장/수정할 때만 생성합니다.
- 이너후보군 리스트 기본 화면은 `CandidateItemSummary`의 live 계산값을 표시합니다. 저장 스냅샷이 있는 경우에도 상세확정 여부만 표시하고, 사용자가 2차 드로워에서 “스냅샷 기준 보기”를 켰을 때 저장 당시의 통합 오더 설정, AI 코멘트, 사이즈별 오더 수치와 기간을 복원합니다. 그래프 데이터는 스냅샷에 저장하지 않으므로 스냅샷 기간 기준으로 다시 조회해 표시합니다.
- `uploadCandidateStashExcel`: 프론트는 파일을 파싱하지 않습니다. `multipart/form-data`의 `file` 필드로 엑셀 파일을 전송하고,
  백엔드는 파일 내용을 검증한 뒤 DB 트랜잭션 안에서 후보군과 후보 아이템을 생성해야 합니다.
  생성자/소유자는 요청 body가 아니라 인증 세션의 `USER_ACCOUNT.uuid`를 기준으로 결정합니다.
  성공 후 프론트는 응답 객체를 목록에 직접 삽입하지 않고 `getCandidateStashes()`를 다시 호출해 DB 기준 목록과 동기화합니다.
- `getCandidateStashExcelTemplateDownload`: 현재 프론트는 정적 파일 URL을 반환하지만, 운영 백엔드 연결 시에는 같은 프론트 계약을 유지한 채 템플릿 다운로드 endpoint로 교체할 수 있습니다. 예: `GET /candidate-stashes/excel-template`.
- 후보군 발주 엑셀 다운로드: 별도 백엔드 다운로드 endpoint를 두지 않습니다. 프론트는 이미 `getCandidateItemsByStash` 응답으로 받은 `CandidateItemSummary.orderExport` DTO를 사용해 브라우저에서 XLSX를 생성합니다. 주 데이터 시트는 후보 아이템 1개를 1행으로 두며, 기본 컬럼은 `브랜드`, `품번`, `상품명`, `색상`, `배지`, `자사 기간 총 판매량`, `{선택 경쟁사} 기간 총 판매량`, `총 오더량`, `총 오더 금액`, `평균 원가`, `평균 판매가`, `평균 수수료율`, `평균 영업이익율`입니다. `배지`가 복수인 경우 한 셀 안에서 줄바꿈으로 구분합니다. 그 뒤에는 해당 후보군 전체에서 등장한 모든 사이즈를 동적 컬럼으로 추가하고, 각 제품의 사이즈별 오더량을 기재합니다. 제품에 존재하지 않는 사이즈 컬럼은 `N/A`로 표시해 실제 오더량 `0`과 구분합니다. 메타 시트는 `오더 입고 예정일`, `이름`을 포함합니다. `이름`은 현재 세션의 `USER_ACCOUNT.name` 또는 운영에서 정한 사용자 표시명을 사용합니다.
- 엑셀 업로드 검증 권장:
  - 현재 템플릿 초안의 `DATA` 시트 필수 컬럼 예: `브랜드`, `품번`, `오더 수량`, `금번 오더 입고일`, `차기 오더 입고일`.
  - `오더 수량`은 사이즈별 입력이 아니라 총 발주 수량입니다. 사이즈별 오더 배분/조정은 시스템 내부 계산 흐름이 담당합니다.
  - 보조 컬럼 예: `memo`, `channel`, `unitPrice`, `unitCost`, `feeRate`.
  - 필수 컬럼 누락, 알 수 없는 품번, 수량 파싱 실패, 중복 행, 음수 수량은 에러 또는 행 단위 경고로 명확히 반환합니다.
  - 백엔드는 생성된 후보군 UUID, 등록 아이템 수, 무시/보정된 행 경고를 응답합니다.
  - 검증 실패 시 후보군/아이템을 부분 저장하지 않는 것을 기본 정책으로 권장합니다.

**후보군 스냅샷 AI 분석**

- 후보군 상세 모달이 열리면 프론트는 `startCandidateStashAnalysis(stashUuid)`를 호출합니다.
- 백엔드는 해당 `stashUuid`에 속한 후보 아이템 중 저장 스냅샷(`CandidateItemDetail.details`)이 존재하는 항목만 AI 분석 작업에 투입합니다. 스냅샷 없이 담긴 미확정 항목은 AI 코멘트/사이즈별 확정 오더량의 근거가 없으므로 건너뛰거나 “미확정” 상태로 보고합니다.
- 시작 응답은 `{ jobId, stashUuid, itemCount }`입니다. 프론트는 후보군 상세 모달이 열려 있는 동안만 이 `jobId`로 SSE 스트림을 엽니다.
- SSE는 `Content-Type: text/event-stream`으로 제공하고, 각 `data:`는 `CandidateStashAnalysisProgressEvent` JSON입니다.
- `status` 값은 `'queued' | 'running' | 'completed' | 'failed'` 중 하나입니다.
- 진행 이벤트는 최소한 `totalItems`, `completedItems`, `message`를 포함해야 합니다. 특정 아이템 처리 중이면 `currentItemUuid`, `currentProductName`을 채웁니다.
- 각 후보 아이템의 AI 분석/코멘트 갱신이 완료되면 백엔드는 해당 아이템의 DB `is_latest_llm_comment`를 `true`로 갱신해야 합니다.
- 실패 시 `status: 'failed'`와 `error` 메시지를 내려야 하며, 프론트는 진행 카드에 실패 상태를 표시합니다.
- 프론트는 모달 닫힘/언마운트 또는 `completed`/`failed` 수신 시 SSE 연결을 닫습니다. 백엔드는 terminal 이벤트(`completed` 또는 `failed`) 전송 후 스트림을 종료하는 것을 권장합니다.
- 브라우저가 SSE 연결을 끊어도 백엔드 작업 취소를 의미하지 않습니다. 별도 취소 API가 필요하면 독립 계약으로 추가합니다.
- AI 분석 결과를 후보 아이템·후보군에 저장할 경우, 저장 위치와 요약 필드는 별도 응답/조회 계약으로 추가해야 합니다. 현재 프론트 계약은 “요청 발생 + 진행 상태 표시”까지만 요구합니다.

### 3.10 `getSecondaryStockOrderCalc`

**요청 (`SecondaryStockOrderCalcParams`)**

| 필드 | 의미 |
|------|------|
| `skuGroupKey` | 상품 단위 묶음 키. `SKU.code + SKU.color_code`에 대응하며 DB `SKU.uuid`가 아니다 |
| `periodStart`, `periodEnd` | 분석 구간 |
| `forecastPeriodEnd` | 선택. 기대 일평균 산출용 예측 구간 종료 월/일. 비우면 `periodEnd` 사용 |
| `serviceLevelPct` | 재고·안전재고 계산용 **서비스 수준(%)** |
| `leadTimeDays` | 리드타임 일수 |
| `safetyStockMode` | `'manual'` \| `'formula'` |
| `manualSafetyStock` | 수동 안전재고 수량 |
| `dailyMean` | 선택. 비우면 백엔드가 기간 트렌드 등으로 **일평균 수요 μ** 산출 |

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
  - Query params: `startDate`, `endDate`, `brand`, `category`, `codeQuery`, `colorCode`, `nameQuery`, `xBucketSize`, `yBucketSize`, `maxSkuIdsPerCell`
  - Response: `ScatterSalesGridResponse` (`cells` + `meta`)
- `getCompetitorSalesScatterGrid(params?)`
  - `GET /sales/competitor/scatter-grid`
  - Query params: `startDate`, `endDate`, `brand`, `category`, `codeQuery`, `colorCode`, `nameQuery`, `competitorChannelId`, `xBucketSize`, `yBucketSize`, `maxSkuIdsPerCell`
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
