# Dashboard 백엔드 API 스펙 (구현용)

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-04-23 |
| 최종 수정일 | 2026-05-07 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app/src/api/types`, 백엔드 REST API 계약 |

이 문서는 프론트의 **`AuthApi` / `DashboardApi` TypeScript 계약**을 만족하는 REST API를 설계·구현하기 위한 참고 자료입니다. 필드명은 **camelCase**, JSON 직렬화를 가정합니다.

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

- **`productId`**: 상품(SKU 단위 등) 식별자. 프론트와 동일 문자열을 사용해야 합니다.
- **`uuid`**: 후보 스태시·후보 아이템 등 **서버 생성 UUID** 문자열.
- 오더 스냅샷은 현재 독립 저장 API가 아니라 후보 아이템의 `details` JSON으로만 저장·복원합니다.

### 1.4 인증·에러

- 프론트는 `/login`과 `/dashboard/*` 보호 라우트를 분리합니다. 인증 계약은 `src/api/types/auth.ts`의 `AuthApi`가 소유합니다.
- 목 구현은 동작 확인용으로 로그인 입력값을 검증하지 않고 통과시키며 세션은 런타임 메모리에만 둡니다. `mock-user` ID는 일반 사용자 권한 확인용이고, 그 외 입력은 관리자 권한으로 처리합니다. 사용자 목록/후보군 목록의 실제 변경은 백엔드 DB가 소유해야 하며, 프론트 mock은 mutation 응답 흐름만 모사합니다. 실제 백엔드에서는 가능하면 **HttpOnly cookie 기반 세션**을 권장합니다.
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
| `deleteAdminUser(userUuid)` | DELETE | `/admin/users/:userUuid` |
| `logout()` | POST | `/auth/logout` |

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
| `user.role` | `'admin' \| 'user'` | 프론트 권한 분기용 역할. 관리자는 관리자 화면 접근 가능, 사용자는 일반 대시보드 접근만 가능 |
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
| `role` | `'admin' \| 'user'` | 사용자 권한 |
| `isActive` | boolean | 활성 계정 여부 |
| `dbUpdatedAt` | string | ISO 8601 최근 변경 시각 |

**`CreateAdminUserPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `loginId` | string | 로그인 ID. 실제 백엔드 검증 정책은 서버가 소유한다. 현재 mock은 값을 검증하지 않고 호출 성공만 모사한다 |
| `password` | string | 최초 로그인용 비밀번호 |
| `role` | `'admin' \| 'user'` | 사용자 권한 |
| `isActive` | boolean | 생성 시 활성 상태 |

**`UpdateAdminUserPayload`**

| 필드 | 타입 | 설명 |
|------|------|------|
| `uuid` | string | 변경 대상 사용자 UUID |
| `loginId` | string | 변경할 로그인 ID. UUID는 바뀌지 않음 |
| `role` | `'admin' \| 'user'` | 변경할 권한 |
| `isActive` | boolean | 활성 상태 |

`/admin/users` 계열은 관리자 권한이 필요합니다. 실제 백엔드는 현재 로그인한 관리자 본인을 삭제/비활성화하거나 마지막 활성 관리자 권한을 제거하지 못하도록 검증하는 정책을 권장합니다.

---

## 2. `DashboardApi` 메서드 ↔ REST 제안 매핑

아래 경로는 **제안**입니다. 팀 규칙에 맞게 접두사(`/api/v1` 등)를 붙이면 됩니다.

| 계약 메서드 | 제안 HTTP | 제안 경로·쿼리 |
|-------------|-----------|----------------|
| `getSelfSales(params?)` | GET | `/sales/self?startDate&endDate&brand&category` |
| `getCompetitorSales(params?)` | GET | `/sales/competitor?…` + `competitorChannelId` |
| `getSelfSalesFilterMeta()` | GET | `/sales/self/filter-meta` |
| `getProductDrawerBundle(id, params?)` | GET | `/products/:id/drawer-bundle?forecastMonths` |
| `getProductMonthlyTrend(id, params)` | GET | `/products/:id/monthly-trend?startDate&endDate&forecastMonths&competitorChannelId` |
| `getProductSalesInsight(id, params)` | GET | `/products/:id/sales-insight?startDate&endDate&competitorChannelId` |
| `getProductSecondaryDetail(id, params?)` | GET | `/products/:id/secondary-detail?minOpMarginPct` |
| `getSecondaryDailyTrend(params)` | GET | `/products/:productId/secondary/daily-trend?startMonth&leadTimeDays&competitorChannelId` |
| `getSecondaryCompetitorChannels()` | GET | `/secondary/competitor-channels` |
| `getCandidateStashes(productId?)` | GET | `/candidate-stashes?productId` |
| `getCandidateItemsByStash(stashUuid)` | GET | `/candidate-stashes/:stashUuid/items` |
| `getCandidateItemByUuid(itemUuid)` | GET | `/candidate-items/:itemUuid` |
| `deleteCandidateItem(itemUuid)` | DELETE | `/candidate-items/:itemUuid` |
| `deleteCandidateStash(stashUuid)` | DELETE | `/candidate-stashes/:stashUuid` |
| `createCandidateStash(payload)` | POST | `/candidate-stashes` |
| `updateCandidateStash(payload)` | PATCH | `/candidate-stashes/:stashUuid` |
| `duplicateCandidateStash(stashUuid)` | POST | `/candidate-stashes/:stashUuid/duplicate` |
| `appendCandidateItem(payload)` | POST | `/candidate-stashes/:stashUuid/items` |
| `updateCandidateItem(payload)` | PATCH | `/candidate-items/:itemUuid` |
| `uploadCandidateStashExcel(file)` | POST multipart/form-data | `/candidate-stashes/import/excel` |
| `startCandidateStashAnalysis(stashUuid)` | POST | `/candidate-stashes/:stashUuid/analysis` |
| `subscribeCandidateStashAnalysis(jobId, handlers)` | GET (SSE) | `/candidate-stash-analyses/:jobId/events` |
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
| `competitorChannelId` | string? | **경쟁 API만**. 선택한 경쟁 채널(가격·수량 스큐 적용 대상) |

**응답: `SelfSalesRow[]`**

| 필드 | 의미 |
|------|------|
| `id` | 행 고유 id (목업용 문자열) |
| `rank` | 순위 |
| `rankPercentile` | 전체 SKU 대비 백분위 순위 |
| `brand`, `category`, `productCode`, `name` | 상품 메타 |
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
| `competitorAvgPrice`, `competitorQty`, `competitorAmount` | 선택 경쟁 채널 기준 지표 |
| `selfAvgPrice`, `selfQty`, `selfAmount` | 자사 채널 비교용(없으면 `null`) |

### 3.2 `getSelfSalesFilterMeta`

**응답 (`SelfSalesFilterMeta`)**

| 필드 | 의미 |
|------|------|
| `brands` | 브랜드 목록 |
| `categories` | 카테고리 목록 |
| `historicalMonths` | **과거 실적** 월 축(슬라이더 등). 포캐스트 월과 구분 |

### 3.3 `getProductDrawerBundle`

**쿼리 (`ProductDrawerBundleParams`)**

| 필드 | 의미 |
|------|------|
| `forecastMonths` | 월간 판매추이에 포함할 **포캐스트 월 수**(1~24). 생략 시 구현 기본값(예: 8). |

**응답 (`ProductDrawerBundle`)**

| 필드 | 의미 |
|------|------|
| `summary` | [`ProductPrimarySummary`](#51-productprimarysummary) |
| `stockTrend` | [`ProductStockTrendPoint[]`](#52-productstocktrendpoint) |

### 3.4 `getProductMonthlyTrend`

기간·경쟁 채널 조건에 따라 1차 드로어의 **월간 판매 추이 그래프**를 구성합니다. `getProductDrawerBundle`은 상품 요약·재고 번들로 유지하고, 선택 경쟁 채널별 월간 시계열은 이 계약으로 분리합니다.

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
| `productId` | 상품 id |
| `targetPeriodDays.start/end` | 실제 표시·집계 대상 기간 |
| `competitorChannelId` | 응답에 적용된 경쟁 채널 id |
| `competitorChannelLabel` | 응답에 적용된 경쟁 채널 표시명 |
| `points` | [`ProductMonthlyTrendPoint[]`](#54-productmonthlytrendpoint) |

### 3.5 `getProductSalesInsight`

기간·경쟁 채널 조건에 따라 1차 드로어의 **판매 정보** 테이블을 구성합니다. 기존 `getProductDrawerBundle`은 월간 판매추이·재고·기본 요약용으로 유지하고, 일간/기간/채널 집계가 필요한 판매 정보는 이 계약으로 분리합니다.

**쿼리 (`ProductSalesInsightParams`)**

| 필드 | 의미 |
|------|------|
| `startDate` | 집계 시작일 (`YYYY-MM-DD` 권장) |
| `endDate` | 집계 종료일 (`YYYY-MM-DD` 권장) |
| `competitorChannelId` | 비교 경쟁 채널. 생략 시 구현체 기본 채널 |

**응답 (`ProductSalesInsight`)**

| 필드 | 의미 |
|------|------|
| `productId` | 상품 id |
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
| `id` | 상품 id |
| `competitorPrice` | 경쟁 베이스라인 단가 |
| `competitorQty` | 경쟁 추정 수량 |
| `competitorRatioBySize` | 사이즈별 경쟁 비중 맵 (`size` 문자열 → 비율) |

### 3.7 `getSecondaryDailyTrend`

**파라미터 (`SecondaryDailyTrendParams`)**

| 필드 | 의미 |
|------|------|
| `productId` | 상품 id |
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
| `priceSkew` | 가격 보정 계수(목업) |
| `qtySkew` | 수량 보정 계수(목업) |

현재 프론트 기준 유효 채널은 **`kream`, `musinsa`** 입니다(`naver` 제거됨).

### 3.9 후보군(Candidate stash / item)

**`CandidateStashSummary`**

| 필드 | 의미 |
|------|------|
| `uuid` | 스태시 PK |
| `name`, `note` | 이름·비고 |
| `productId` | 연결 상품 |
| `periodStart`, `periodEnd` | 후보군 생성 당시의 분석 기간. 프론트 상세 화면은 이 값을 조회 기준일 초기값으로 쓰며, 화면 내 변경값은 이너 후보 드로어를 열 때 기간 기준으로 적용 |
| `forecastMonths` | 후보군 생성 당시의 월간 판매추이 포캐스트 개월 수 |
| `itemCount` | 소속 후보 아이템 개수 |
| `dbCreatedAt`, `dbUpdatedAt` | 생성·수정 시각(아이템 추가로 스태시 “갱신” 시각을 반영할지는 백엔드 정책) |

**`CandidateItemListResult`** (`getCandidateItemsByStash` 응답)

| 필드 | 의미 |
|------|------|
| `items` | 후보 아이템 목록 |
| `badgeDefinitions` | 배지 이름을 key로 하는 정의 맵. 값은 `{ color, tooltip }` 형태이며, 색상/툴팁은 백엔드가 결정 |

배지 정의를 전역 랜딩 시점에 별도 호출로 받는 대신 후보군 아이템 응답에 같이 포함한다. 이렇게 하면 아이템의 `badgeNames`와 정의 맵의 버전이 같은 응답 안에서 맞아, 배지 이름만 있고 색상/툴팁이 없는 상태를 줄일 수 있다.

**`CandidateItemSummary`** (목록 행)

| 필드 | 의미 |
|------|------|
| `uuid` | 아이템 PK |
| `stashUuid` | 소속 스태시 |
| `productId` | 상품 id |
| `brand`, `productCode`, `productName` | 스냅샷 1차 요약에서 복사 |
| `qty` | 사이즈별 **`confirmQty` 합**(확정 수량 기준 EA) |
| `expectedOrderAmount` | 예상 **발주 금액(원)** — 스냅샷 `drawer2.stockDerived.expectedOrderAmount` 와 동일 의미 |
| `expectedSalesAmount` | 예상 매출 — `stockDerived.expectedSalesAmount` |
| `expectedOpProfit` | 예상 영업이익 — `stockDerived.expectedOpProfit` |
| `insight.badgeNames` | 이 아이템에 붙일 배지 이름 배열. 현재 목데이터 기준 허용 배지는 `크림판매`, `자사이익`, `자사판매` |
| `isLatestLlmComment` | 현재 저장 스냅샷 기준 LLM 코멘트/추천이 최신인지 여부. DB 컬럼은 `is_latest_llm_comment` 권장 |
| `dbCreatedAt`, `dbUpdatedAt` | 생성·수정 시각 |

**`CandidateItemDetail`**

| 필드 | 의미 |
|------|------|
| `details` | 저장 시점의 **`SecondaryOrderSnapshotPayload` 전체 JSON** |
| `isLatestLlmComment` | 상세 스냅샷 기준 LLM 코멘트/추천 최신 여부 |

**페이로드**

- `CreateCandidateStashPayload`: `{ productId, name, note?, periodStart, periodEnd, forecastMonths }`
- `UpdateCandidateStashPayload`: `{ stashUuid, name, note? }` — 메타만 갱신
- `AppendCandidateItemPayload`: `{ stashUuid, productId, details, isLatestLlmComment? }` — `details`가 오더 스냅샷 저장의 단일 경로이며, 기본값은 `false` 권장
- `UpdateCandidateItemPayload`: `{ itemUuid, details, isLatestLlmComment }`
- `CandidateStashExcelUploadResult`: `{ stashUuid, stashName, itemCount, warnings: string[] }`
- `CandidateStashAnalysisStartResult`: `{ jobId, stashUuid, itemCount }`
- `CandidateStashAnalysisProgressEvent`: `{ jobId, stashUuid, status, totalItems, completedItems, currentItemUuid, currentProductName, message, error? }`
- 2차 드로워에서 후보 아이템 스냅샷을 다시 저장할 때 프론트는 `updateCandidateItem`에 `isLatestLlmComment: false`를 보냅니다. 백엔드는 해당 아이템의 DB `is_latest_llm_comment`를 `false`로 저장해 기존 LLM 코멘트/추천이 최신 스냅샷 기준이 아님을 표시해야 합니다.

**동작 메모**

- `duplicateCandidateStash`: 동일 스태시·아이템 복제(구현 세부는 백엔드 결정). 프론트는 완료 후 `getCandidateStashes()`를 다시 호출해 목록을 동기화합니다.
- `uploadCandidateStashExcel`: 프론트는 파일을 파싱하지 않습니다. `multipart/form-data`의 `file` 필드로 엑셀 파일을 전송하고,
  백엔드는 파일 내용을 검증한 뒤 DB 트랜잭션 안에서 후보군과 후보 아이템을 생성해야 합니다.
  성공 후 프론트는 응답 객체를 목록에 직접 삽입하지 않고 `getCandidateStashes()`를 다시 호출해 DB 기준 목록과 동기화합니다.
- 엑셀 업로드 검증 권장:
  - 필수 컬럼 예: `productCode` 또는 `skuUuid`, `orderQty` 또는 사이즈별 확정 수량 컬럼.
  - 보조 컬럼 예: `brand`, `productName`, `memo`, `expectedInboundDate`, `channel`, `unitPrice`, `unitCost`, `feeRate`, 사이즈 컬럼.
  - 필수 컬럼 누락, 알 수 없는 상품 코드, 수량 파싱 실패, 중복 행, 음수 수량은 에러 또는 행 단위 경고로 명확히 반환합니다.
  - 백엔드는 생성된 후보군 UUID, 등록 아이템 수, 무시/보정된 행 경고를 응답합니다.
  - 검증 실패 시 후보군/아이템을 부분 저장하지 않는 것을 기본 정책으로 권장합니다.

**후보군 스냅샷 LLM 분석**

- 후보군 상세 모달이 열리면 프론트는 `startCandidateStashAnalysis(stashUuid)`를 호출합니다.
- 백엔드는 해당 `stashUuid`에 속한 후보 아이템의 저장 스냅샷(`CandidateItemDetail.details`)을 DB에서 읽고, 각 스냅샷을 LLM 분석 작업에 투입합니다.
- 시작 응답은 `{ jobId, stashUuid, itemCount }`입니다. 프론트는 후보군 상세 모달이 열려 있는 동안만 이 `jobId`로 SSE 스트림을 엽니다.
- SSE는 `Content-Type: text/event-stream`으로 제공하고, 각 `data:`는 `CandidateStashAnalysisProgressEvent` JSON입니다.
- `status` 값은 `'queued' | 'running' | 'completed' | 'failed'` 중 하나입니다.
- 진행 이벤트는 최소한 `totalItems`, `completedItems`, `message`를 포함해야 합니다. 특정 아이템 처리 중이면 `currentItemUuid`, `currentProductName`을 채웁니다.
- 각 후보 아이템의 LLM 분석/코멘트 갱신이 완료되면 백엔드는 해당 아이템의 DB `is_latest_llm_comment`를 `true`로 갱신해야 합니다.
- 실패 시 `status: 'failed'`와 `error` 메시지를 내려야 하며, 프론트는 진행 카드에 실패 상태를 표시합니다.
- 프론트는 모달 닫힘/언마운트 또는 `completed`/`failed` 수신 시 SSE 연결을 닫습니다. 백엔드는 terminal 이벤트(`completed` 또는 `failed`) 전송 후 스트림을 종료하는 것을 권장합니다.
- 브라우저가 SSE 연결을 끊어도 백엔드 작업 취소를 의미하지 않습니다. 별도 취소 API가 필요하면 독립 계약으로 추가합니다.
- LLM 분석 결과를 후보 아이템·후보군에 저장할 경우, 저장 위치와 요약 필드는 별도 응답/조회 계약으로 추가해야 합니다. 현재 프론트 계약은 “요청 발생 + 진행 상태 표시”까지만 요구합니다.

### 3.10 `getSecondaryStockOrderCalc`

**요청 (`SecondaryStockOrderCalcParams`)**

| 필드 | 의미 |
|------|------|
| `productId` | 상품 id |
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
| `id`, `name`, `brand`, `category`, `productCode` | 기본 메타 |
| `price` | 자사 채널 판매가 |
| `qty` | 판매 수량 등 요약 값 |
| `availableStock` | 판매 가능 재고 |
| `recommendedOrderQty` | 추천 발주 수량 |
| `monthlySalesTrend` | 월별 [`MonthlySalesPoint`](#57-monthlysalespoint) |
| `seasonality` | 1~12월 계절 비중 배열 (`ratio` 합 ≈ 1) |
| `sizeMix` | 사이즈 믹스 행 [`ProductSizeMixRow`](#53-productsizemixrow) |

### 5.2 `ProductStockTrendPoint`

| 필드 | 의미 |
|------|------|
| `date` | 시점 |
| `stock` | 재고 |
| `inboundExpected` | 1차 드로어·포캐스트 표시용 기대 입고 |
| `inboundQty` | 실제 입고 수량(없으면 표시 시 `inboundExpected` 대체 가능) |

### 5.3 `ProductSizeMixRow`

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
| `productId` | 상품 id |
| `savedAt` | 후보 아이템 `details`에 저장되는 스냅샷 시각 |
| `context` | 재조회용 컨텍스트 |
| `context.periodStart`, `periodEnd` | 분석 구간 |
| `context.forecastMonths` | 포캐스트 월 수 |
| `context.dailyTrendStartMonth` | 일간 트렌드 API의 `startMonth` 와 맞출 것 |
| `context.dailyTrendLeadTimeDays` | 일간 트렌드 API의 `leadTimeDays` 와 맞출 것 |
| `drawer1` | 1차 드로어 스냅샷 |
| `drawer2` | 2차 패널 스냅샷 |

**`drawer1` (`OrderSnapshotDrawer1V2`)**

| 필드 | 의미 |
|------|------|
| `summary` | `ProductPrimarySummary`에서 **`monthlySalesTrend` 제외**한 요약(`OrderSnapshotPrimarySummaryV2`). 재조회 시 트렌드는 번들 API로 복원 |

**`drawer2` (`OrderSnapshotDrawer2V1`)**

| 필드 | 의미 |
|------|------|
| `secondary` | 당시 `ProductSecondaryDetail` 스냅샷 |
| `competitorChannelId`, `competitorChannelLabel` | 선택 경쟁 채널 |
| `minOpMarginPct` | 스냅샷 시점 영업이익률 하한; `null` = 하한 없음 |
| `salesSelf`, `salesCompetitor` | [`SalesKpiColumn`](#41-saleskpicolumn) |
| `stockInputs` | [`SecondaryForecastInputs`](#42-secondaryforecastinputs) |
| `stockDerived` | [`SecondaryForecastDerived`](#43-secondaryforecastderived) |
| `selfWeightPct` | 자사 가중(%) |
| `sizeForecastSource` | `'periodMean'` \| `'forecastQty'` — 사이즈 예측 소스 |
| `bufferStock` | 추가 버퍼 재고 |
| `llmPrompt`, `llmAnswer` | LLM 컨텍스트 |
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
3. 후보 아이템 목록 집계 필드는 스냅샷 **`drawer2.stockDerived`** 및 **`sizeRows[].confirmQty`** 와 일관되게 계산해야 합니다.
4. 필드 리네이밍 시 프론트 TypeScript와 동시 배포 또는 버전 분기 필요.

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
