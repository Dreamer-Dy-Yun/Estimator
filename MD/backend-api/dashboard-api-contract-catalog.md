# Dashboard API Contract Catalog

최종 수정일: 2026-05-22

이 문서는 백엔드가 프론트 API를 구현할 때 참고할 수 있도록, 현재 프론트 요청 계층의 API 계약과 주요 JSON 구조를 설명한다.

기준 소스:

- `dashboard-app/src/api/requests/*`
- `dashboard-app/src/api/types/*`
- `dashboard-app/src/types.ts`
- `dashboard-app/src/snapshot/orderSnapshotTypes.ts`
- `dashboard-app/src/dashboard/components/product-drawer/secondary/secondaryDrawerTypes.ts`

## 1. 공통 계약

### 1.1 기본 규칙

| 항목 | 계약 |
|---|---|
| Base URL | 프론트 환경변수 `VITE_API_BASE_URL` 기준. 기본 HTTP adapter는 `/api/v1` prefix를 기준으로 작성되어 있다. |
| JSON 필드명 | camelCase |
| 인증 | 세션 기반. 프론트는 `credentials: include`로 호출한다. |
| 날짜 문자열 | 날짜만 필요한 값은 `YYYY-MM-DD`, 일시는 ISO 8601 문자열 권장 |
| 금액/수량 | 프론트는 숫자형 `number`를 기대한다. 백엔드는 문자열 숫자로 내려주지 않는다. |
| nullable | 의미상 값이 아직 없거나 계산 불가인 경우에만 `null`을 사용한다. |
| optional | 요청자가 생략할 수 있거나 하위 호환을 위해 없는 필드는 optional로 둔다. |
| 실패 | 실패를 빈 배열/성공 응답으로 숨기지 않는다. HTTP status와 메시지로 구분한다. |

### 1.2 회사 scope

| scope 종류 | companyUuid 규칙 | 용도 |
|---|---|---|
| 전체 조회 | 생략 또는 빈 문자열 | 회사 조건 없이 전체 조회 |
| 단일 회사 조회 | UUID 문자열 | 특정 회사 기준 조회, 계산, 표시 |
| mutation/job/import | UUID 문자열 필수 | 특정 회사 소유 데이터만 변경 |

주의:

- `ALL_COMPANY_UUID`는 프론트 내부 sentinel이다. 백엔드로 보내지지 않아야 한다.
- 후보군 생성/수정/삭제, 상세확정 job, LLM comment job, Excel import는 단일 회사 UUID가 필수다.
- `secondary ai-comment`, `secondary stock-order-calc`는 현재 계약상 read-like POST다. 전체 scope에서는 `companyUuid`를 생략할 수 있다.

### 1.3 표준 실패 응답 권장

프론트는 실패를 `ApiClientError.kind`로 정규화한다. 백엔드는 아래 의미를 구분할 수 있게 HTTP status와 메시지를 내려주는 것이 좋다.

| kind | 대표 status | 의미 |
|---|---:|---|
| `auth` | 401 | 로그인 만료 또는 인증 없음 |
| `permission` | 403 | 로그인은 되었지만 권한 없음 |
| `validation` | 400, 422 | 요청값 검증 실패 |
| `not-found` | 404 | 대상 없음 |
| `server` | 500+ | 서버 내부 오류 |
| `network` | 없음 | 네트워크 연결 실패. 프론트 정규화 영역 |
| `timeout` | 없음 | 요청 timeout. 프론트 정규화 영역 |
| `parse` | 200 계열이지만 JSON 파싱 실패 | 응답 형식 불일치 |
| `stream-protocol` | SSE event 형식 오류 | SSE payload 파싱 또는 프로토콜 오류 |

권장 JSON:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "companyUuid is required.",
  "details": {
    "field": "companyUuid"
  }
}
```

### 1.4 SSE 공통 규칙

SSE endpoint는 `text/event-stream`으로 응답한다.

```text
event: progress
data: {"jobId":"job-1","status":"running","completedItems":3,"totalItems":10}

event: complete
data: {"jobId":"job-1","status":"completed","completedItems":10,"totalItems":10}

event: error
data: {"jobId":"job-1","status":"failed","message":"detail confirmation failed"}
```

규칙:

- `data`는 JSON 문자열이어야 한다.
- 파싱 불가 payload는 프론트에서 `stream-protocol` 오류로 처리된다.
- job start에 `companyUuid`가 필요한 작업은 SSE subscribe에도 같은 회사 scope를 검증하는 것이 좋다.
- jobId가 특정 회사 데이터에 묶이면, 다른 회사 UUID로 subscribe할 때 403 또는 404를 반환한다.

## 2. Auth API

### 2.1 GET `/auth/session`

현재 로그인 세션을 조회한다.

응답: `SessionInfo`

| 필드 | 타입 | 설명 |
|---|---|---|
| `authenticated` | boolean | 현재 브라우저 세션이 인증되었는지 여부 |
| `user` | `AuthUser \| null` | 로그인 사용자 정보. 미인증이면 `null` |

`AuthUser`

| 필드 | 타입 | 설명 |
|---|---|---|
| `uuid` | string | 사용자 UUID |
| `email` | string | 로그인 이메일 |
| `name` | string | 사용자 표시 이름 |
| `role` | string | 권한 역할. 현재 UI는 admin/user 계열을 예상한다. |
| `isActive` | boolean | 계정 활성 여부 |
| `createdAt` | string | 계정 생성 일시 |
| `updatedAt` | string | 계정 수정 일시 |

### 2.2 POST `/auth/login`

로그인한다.

요청: `LoginPayload`

| 필드 | 타입 | 설명 |
|---|---|---|
| `email` | string | 로그인 이메일 |
| `password` | string | 비밀번호 |

응답: `SessionInfo`

### 2.3 PATCH `/auth/me`

내 프로필을 수정한다.

요청: `UpdateMyProfilePayload`

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | string | 사용자 표시 이름 |

응답: `AuthUser`

### 2.4 POST `/auth/me/password`

내 비밀번호를 변경한다.

요청: `ChangeMyPasswordPayload`

| 필드 | 타입 | 설명 |
|---|---|---|
| `currentPassword` | string | 현재 비밀번호 |
| `newPassword` | string | 새 비밀번호 |

응답: 없음 또는 성공 JSON

### 2.5 POST `/auth/logout`

현재 세션을 종료한다.

응답: 없음 또는 성공 JSON

## 3. Admin User API

관리자 전용 사용자 관리 API다.

| endpoint | 설명 |
|---|---|
| GET `/admin/users` | 사용자 목록 조회 |
| POST `/admin/users` | 사용자 생성 |
| PATCH `/admin/users/{uuid}` | 사용자 정보 수정 |
| DELETE `/admin/users/{uuid}` | 사용자 삭제 또는 비활성 처리 |
| POST `/admin/users/{uuid}/password-reset` | 관리자 비밀번호 재설정 |

`CreateUserPayload`

| 필드 | 타입 | 설명 |
|---|---|---|
| `email` | string | 로그인 이메일 |
| `name` | string | 표시 이름 |
| `password` | string | 초기 비밀번호 |
| `role` | string | 권한 역할 |
| `isActive` | boolean | 활성 여부 |

`UpdateUserPayload`

| 필드 | 타입 | 설명 |
|---|---|---|
| `email` | string optional | 이메일 |
| `name` | string optional | 표시 이름 |
| `role` | string optional | 권한 역할 |
| `isActive` | boolean optional | 활성 여부 |

password reset 요청:

| 필드 | 타입 | 설명 |
|---|---|---|
| `newPassword` | string | 새 비밀번호 |

## 4. Admin GPT Key API

GPT API key 설정 관리 API다. 평문 key는 생성 또는 rotation 시에만 요청으로 전달한다.

| endpoint | 설명 |
|---|---|
| GET `/admin/gpt-keys` | key 목록 조회 |
| POST `/admin/gpt-keys` | key 생성 |
| PATCH `/admin/gpt-keys/{uuid}` | metadata 수정 |
| POST `/admin/gpt-keys/{uuid}/rotate` | 평문 key 교체 |
| POST `/admin/gpt-keys/{uuid}/test` | 연결 테스트 |
| DELETE `/admin/gpt-keys/{uuid}` | key 삭제 |

`AdminGptKey`

| 필드 | 타입 | 설명 |
|---|---|---|
| `uuid` | string | key record UUID |
| `name` | string | 관리용 이름 |
| `provider` | string | provider. 예: `openai` |
| `maskedKey` | string | 마스킹된 key |
| `model` | string | 기본 모델명 |
| `isActive` | boolean | 활성 여부 |
| `createdAt` | string | 생성 일시 |
| `updatedAt` | string | 수정 일시 |
| `lastTestedAt` | string optional | 마지막 테스트 일시 |
| `lastTestStatus` | string optional | 마지막 테스트 결과 |

`CreateAdminGptKeyPayload`

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | string | 관리용 이름 |
| `provider` | string | provider |
| `plainKey` | string | 평문 API key. 백엔드는 저장 전 암호화해야 한다. |
| `model` | string | 기본 모델 |
| `isActive` | boolean | 활성 여부 |

`UpdateAdminGptKeyPayload`는 `name`, `provider`, `model`, `isActive`를 optional로 가진다. `plainKey` 변경은 rotate endpoint에서만 처리한다.

`AdminGptKeyTestResult`

| 필드 | 타입 | 설명 |
|---|---|---|
| `ok` | boolean | 테스트 성공 여부 |
| `message` | string | 결과 메시지 |
| `testedAt` | string | 테스트 일시 |

## 5. Admin Google Sheet API

Google Sheet 연결 정보를 관리한다.

| endpoint | 설명 |
|---|---|
| GET `/admin/google-sheets` | 설정 목록 조회 |
| POST `/admin/google-sheets` | 설정 생성 |
| PATCH `/admin/google-sheets/{uuid}` | 설정 수정 |
| DELETE `/admin/google-sheets/{uuid}` | 설정 삭제 |

`AdminGoogleSheetConfig`

| 필드 | 타입 | 설명 |
|---|---|---|
| `uuid` | string | 설정 UUID |
| `name` | string | 관리용 이름 |
| `spreadsheetId` | string | Google Spreadsheet ID |
| `sheetName` | string | Sheet tab 이름 |
| `range` | string | 조회 range |
| `isActive` | boolean | 활성 여부 |
| `createdAt` | string | 생성 일시 |
| `updatedAt` | string | 수정 일시 |

create/update payload는 위 metadata를 기준으로 하며, 서비스 계정 원문 key가 필요한 경우 응답에는 원문을 포함하지 않는다.

## 6. Company API

### 6.1 GET `/companies`

로그인 직후 회사 선택 dropdown에 표시할 자사 목록을 조회한다.

응답: `CompanyOption[]`

| 필드 | 타입 | 설명 |
|---|---|---|
| `uuid` | string | 회사 UUID. 다른 API의 `companyUuid`로 사용 |
| `name` | string | 회사명. 화면에서는 `자사` 대신 이 이름을 표시할 수 있다. |
| `registrationNumber` | string optional | 사업자 등록번호. 하이픈 제거 권장 |
| `note` | string optional | 비고 |

프론트는 이 응답에 내부 옵션 `전체`를 추가한다. 백엔드는 `전체` record를 내려주지 않아도 된다.

## 7. Inventory Arrival API

### 7.1 POST `/inventory-arrival-dates/collect-from-sheet`

Google Sheet 등 외부 출처에서 입고 예정일을 수집한다.

요청: `InventoryArrivalCollectPayload`

| 필드 | 타입 | 설명 |
|---|---|---|
| `sheetConfigUuid` | string optional | 특정 Sheet 설정 UUID. 생략 시 활성 설정 사용 가능 |
| `dryRun` | boolean optional | 실제 저장 없이 검증만 수행할지 여부 |

응답: `InventoryArrivalCollectResult`

| 필드 | 타입 | 설명 |
|---|---|---|
| `startedAt` | string | 수집 시작 일시 |
| `finishedAt` | string | 수집 종료 일시 |
| `insertedCount` | number | 신규 저장 수 |
| `updatedCount` | number | 갱신 수 |
| `skippedCount` | number | 건너뛴 수 |
| `errors` | array | 행 단위 오류 목록 |

## 8. Sales API

### 8.1 공통 Sales query

| 필드 | 타입 | 설명 |
|---|---|---|
| `periodStart` | string | 조회 시작일 |
| `periodEnd` | string | 조회 종료일 |
| `companyUuid` | string optional | 단일 회사 조회 조건. 생략 시 전체 |
| `brand` | string optional | 브랜드 필터 |
| `category` | string optional | 카테고리 필터 |
| `skuGroupKey` | string optional | 품번 또는 상품 그룹 key |
| `channelId` | string optional | 채널 필터 |

### 8.2 GET `/sales/self`

자사 판매 목록을 조회한다.

응답: `ProductListItem[]`

| 필드 | 타입 | 설명 |
|---|---|---|
| `skuGroupKey` | string | 상품 그룹 key. drawer와 snapshot의 연결 key |
| `brand` | string | 브랜드 |
| `category` | string | 카테고리 |
| `season` | string optional | 시즌 |
| `productName` | string | 상품명 |
| `thumbnailUrl` | string optional | 썸네일 URL |
| `salesAmount` | number | 조회 기간 매출 |
| `salesQty` | number | 조회 기간 판매 수량 |
| `avgPrice` | number | 평균 판매가 |
| `avgCost` | number optional | 평균 원가 |
| `avgFeeRatePct` | number optional | 평균 수수료율 |
| `opProfit` | number optional | 영업이익 |
| `opMarginPct` | number optional | 영업이익률 |

### 8.3 GET `/sales/competitor`

경쟁사 판매 목록을 조회한다. 구조는 `/sales/self`와 동일하되, 경쟁사 채널 기준 값이다.

### 8.4 GET `/sales/self/scatter-grid`

자사 scatter chart/grid 데이터를 조회한다.

주요 의미:

| 필드 | 설명 |
|---|---|
| `skuGroupKey` | 점과 drawer를 연결하는 key |
| `x` | x축 값. 현재 화면 기준 매출/판매량 계열 |
| `y` | y축 값. 현재 화면 기준 이익률/성장률 계열 |
| `label` | 점 표시 라벨 |

정확한 x/y 비즈니스 정의는 차트 설정과 함께 사용자 확인 필요.

### 8.5 GET `/sales/competitor/scatter-grid`

경쟁사 scatter chart/grid 데이터를 조회한다. 구조는 self scatter와 동일하다.

### 8.6 GET `/sales/filter-meta`

필터 dropdown 구성값을 조회한다.

응답: `SalesFilterMeta`

| 필드 | 타입 | 설명 |
|---|---|---|
| `brands` | string[] | 브랜드 옵션 |
| `categories` | string[] | 카테고리 옵션 |
| `channels` | array optional | 채널 옵션 |
| `period` | object optional | 사용 가능한 기간 범위 |

## 9. Product Drawer API

### 9.1 GET `/products/{skuGroupKey}/drawer-bundle`

1차 drawer 기본 bundle을 조회한다.

query:

| 필드 | 타입 | 설명 |
|---|---|---|
| `periodStart` | string | 조회 시작일 |
| `periodEnd` | string | 조회 종료일 |
| `companyUuid` | string optional | 회사 scope |

응답: `ProductDrawerBundle`

| 필드 | 타입 | 설명 |
|---|---|---|
| `summary` | `ProductPrimarySummary` | 1차 drawer 요약 |
| `monthlySalesTrend` | array | 월별 판매 추이 |
| `sizeMix` | array | 사이즈별 판매/비중 |
| `inventory` | object optional | 재고 요약 |

`ProductPrimarySummary`

| 필드 | 타입 | 설명 |
|---|---|---|
| `skuGroupKey` | string | 상품 그룹 key |
| `brand` | string | 브랜드 |
| `category` | string | 카테고리 |
| `productName` | string | 상품명 |
| `thumbnailUrl` | string optional | 썸네일 |
| `salesAmount` | number | 조회 기간 매출 |
| `qty` | number | 조회 기간 판매량. 정확한 집계 기준은 사용자 확인 필요 |
| `avgPrice` | number | 평균 판매가 |
| `avgCost` | number optional | 평균 원가 |
| `avgFeeRatePct` | number optional | 평균 수수료율 |
| `opProfit` | number optional | 영업이익 |
| `opMarginPct` | number optional | 영업이익률 |

### 9.2 GET `/products/{skuGroupKey}/monthly-trend`

월별 판매 추이를 조회한다.

응답: `MonthlySalesTrendPoint[]`

| 필드 | 타입 | 설명 |
|---|---|---|
| `month` | string | `YYYY-MM` |
| `salesAmount` | number | 해당 월 매출 |
| `salesQty` | number | 해당 월 판매량 |
| `source` | string optional | 자사/경쟁사/예측 등 데이터 출처 |

### 9.3 GET `/products/{skuGroupKey}/sales-insight`

1차 drawer 인사이트 데이터를 조회한다. 매출, 수량, 가격, 원가, 수수료, 이익률 등 상품 판매 분석에 필요한 값을 포함한다.

### 9.4 GET `/products/{skuGroupKey}/secondary-detail`

2차 drawer 상세 분석 데이터를 조회한다.

query:

| 필드 | 타입 | 설명 |
|---|---|---|
| `periodStart` | string | 조회 시작일 |
| `periodEnd` | string | 조회 종료일 |
| `companyUuid` | string optional | 회사 scope |
| `competitorChannelId` | string optional | 경쟁사 채널 |

응답: `ProductSecondaryDetail`

| 필드 | 타입 | 설명 |
|---|---|---|
| `skuGroupKey` | string | 상품 그룹 key |
| `productName` | string | 상품명 |
| `brand` | string | 브랜드 |
| `category` | string | 카테고리 |
| `thumbnailUrl` | string optional | 썸네일 |
| `self` | `SalesKpiColumn` | 자사 기준 KPI |
| `competitor` | `SalesKpiColumn` | 경쟁사 기준 KPI |
| `sizeRows` | `ProductSizeMixRow[]` | 사이즈별 판매/재고/추천/확정 값 |
| `competitorChannels` | `CompetitorChannelOption[]` optional | 선택 가능한 경쟁사 채널 |
| `minOpMarginPct` | number nullable | 최소 영업이익률 기준 |

`SalesKpiColumn`

| 필드 | 타입 | 설명 |
|---|---|---|
| `avgPrice` | number nullable | 평균 판매가 |
| `qty` | number nullable | 판매 수량 |
| `salesAmount` | number nullable | 매출 |
| `avgCost` | number nullable | 평균 원가 |
| `avgFeeRatePct` | number nullable | 평균 수수료율 |
| `opProfit` | number nullable | 영업이익 |
| `opMarginPct` | number nullable | 영업이익률 |

`ProductSizeMixRow`

| 필드 | 타입 | 설명 |
|---|---|---|
| `size` | string | 사이즈 라벨 |
| `selfQty` | number | 자사 판매 수량 |
| `competitorQty` | number | 경쟁사 판매 수량 |
| `selfSharePct` | number | 자사 사이즈 비중 |
| `competitorSharePct` | number | 경쟁사 사이즈 비중 |
| `blendedSharePct` | number | 자사/경쟁사 가중치를 반영한 비중 |
| `currentStockQty` | number optional | 현재 재고 |
| `orderBalanceQty` | number optional | 미입고 또는 주문 잔량 |
| `forecastQty` | number optional | 예측 판매량 |
| `recommendedQty` | number optional | 추천 오더 수량 |
| `confirmedQty` | number optional | 확정 오더 수량. 정확한 저장 원천은 사용자 확인 필요 |

### 9.5 GET `/products/{skuGroupKey}/secondary/daily-trend`

2차 drawer 일별 판매 추이를 조회한다.

응답: `SecondaryDailyTrendPoint[]`

| 필드 | 타입 | 설명 |
|---|---|---|
| `date` | string | `YYYY-MM-DD` |
| `selfSales` | number optional | 자사 일 판매량 또는 매출. 정확한 단위는 사용자 확인 필요 |
| `competitorSales` | number optional | 경쟁사 일 판매량 또는 매출. 정확한 단위는 사용자 확인 필요 |
| `sales` | number optional | 통합 표시값. 정확한 구성은 사용자 확인 필요 |

### 9.6 GET `/secondary/competitor-channels`

2차 drawer에서 선택할 경쟁사 채널 목록을 조회한다.

응답: `CompetitorChannelOption[]`

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 채널 ID |
| `label` | string | 표시 라벨 |

### 9.7 POST `/products/{skuGroupKey}/secondary/ai-comment`

2차 drawer AI 코멘트를 생성한다. 현재 계약상 read-like POST이며, 전체 scope에서도 호출 가능하다.

요청: `SecondaryAiCommentParams`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `skuGroupKey` | string | Y | 상품 그룹 key |
| `periodStart` | string | Y | 분석 시작일 |
| `periodEnd` | string | Y | 분석 종료일 |
| `forecastMonths` | number | Y | 예측 개월 수 |
| `competitorChannelId` | string | Y | 경쟁사 채널 |
| `companyUuid` | string | N | 회사 scope. 생략 시 전체 |
| `candidateItemUuid` | string | N | 후보군 item 기준 코멘트 요청 시 사용 |
| `snapshotForAiComment` | `OrderSnapshotDocumentV1` | N | 확정 전 코멘트 요청에 사용할 스냅샷 |

응답: `SecondaryAiCommentResult`

| 필드 | 타입 | 설명 |
|---|---|---|
| `llmPrompt` | string | AI 코멘트 생성에 사용한 prompt |
| `llmAnswer` | string | AI 응답 본문 |
| `generatedAt` | string | AI 코멘트 생성 일시 |

### 9.8 POST `/secondary/stock-order-calc`

오더 계산을 수행한다. 현재 계약상 read-like POST이며, 전체 scope에서도 호출 가능하다.

요청: `SecondaryStockOrderCalcParams`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `skuGroupKey` | string | Y | 상품 그룹 key |
| `periodStart` | string | Y | 분석 시작일 |
| `periodEnd` | string | Y | 분석 종료일 |
| `forecastPeriodEnd` | string | N | 예측 종료일 |
| `serviceLevelPct` | number | Y | 서비스 레벨. 안전재고 계산에 사용 |
| `leadTimeDays` | number | Y | 리드타임 일수 |
| `safetyStockMode` | string | Y | 안전재고 계산 방식 |
| `manualSafetyStock` | number | Y | 수동 안전재고 |
| `dailyMean` | number | N | 일 평균 판매량 override |
| `companyUuid` | string | N | 회사 scope. 생략 시 전체 |

응답: `SecondaryStockOrderCalcResult`

| 필드 | 타입 | 설명 |
|---|---|---|
| `trendDailyMean` | number | 추세 기반 일 평균 |
| `dailyMean` | number | 계산에 사용된 일 평균 |
| `sigma` | number | 표준편차 또는 변동성 계수. 공식은 사용자 확인 필요 |
| `display` | object | 화면 표시용 계산 결과 |
| `safetyStockCalc` | object | 안전재고 계산 상세 |
| `forecastQtyCalc` | object | 예측 수량 계산 상세 |

## 10. Candidate Stash API

후보군은 회사 소유 데이터다. 조회는 전체 scope가 가능하지만, 생성/수정/삭제/job/import는 단일 회사 UUID가 필수다.

| endpoint | scope | 설명 |
|---|---|---|
| GET `/candidate-stashes` | optional | 후보군 목록 |
| POST `/candidate-stashes` | required | 후보군 생성 |
| PATCH `/candidate-stashes/{stashUuid}` | required | 후보군 metadata 수정 |
| DELETE `/candidate-stashes/{stashUuid}` | required | 후보군 삭제 |
| POST `/candidate-stashes/{stashUuid}/duplicate` | required | 후보군 복제 |
| GET `/candidate-stashes/{stashUuid}/items` | optional | 후보군 item 목록 |
| POST `/candidate-stashes/{stashUuid}/items` | required | 단일 item 추가 |
| POST `/candidate-stashes/{stashUuid}/items/bulk` | required | 여러 item 추가 |
| PATCH `/candidate-items/{itemUuid}` | required | item 수정 |
| DELETE `/candidate-items/{itemUuid}` | required | item 삭제 |
| DELETE `/candidate-stashes/{stashUuid}/items` | required | item 일괄 삭제 |
| GET `/candidate-stashes/{stashUuid}/recommendations` | optional | 추천 item |
| GET `/candidate-items/{itemUuid}` | optional | item 상세 |
| POST `/candidate-stashes/{stashUuid}/items/detail-confirmation-jobs` | required | 상세확정 job 시작 |
| GET `/candidate-item-detail-confirmation-jobs/{jobId}/events` | required 권장 | 상세확정 SSE |
| POST `/candidate-stashes/{stashUuid}/llm-comment-jobs` | required | LLM comment job 시작 |
| GET `/candidate-stash-llm-comment-jobs/{jobId}/events` | required 권장 | LLM comment SSE |
| GET `/candidate-stashes/excel-template` | none | Excel template |
| POST `/candidate-stashes/import/excel` | required | Excel import |

`CandidateStashSummary`

| 필드 | 타입 | 설명 |
|---|---|---|
| `uuid` | string | 후보군 UUID |
| `name` | string | 후보군 이름 |
| `note` | string nullable | 후보군 메모 |
| `periodStart` | string | 후보군 기준 분석 시작일 |
| `periodEnd` | string | 후보군 기준 분석 종료일 |
| `forecastMonths` | number | 후보군 기준 예측 개월 수 |
| `itemCount` | number | 포함 item 수 |
| `dbCreatedAt` | string | DB 생성 일시 |
| `dbUpdatedAt` | string | DB 수정 일시 |

`CandidateItemListResult`

`GET /candidate-stashes/{stashUuid}/items` 응답은 저장 record 요약과 화면 표시용 item 요약을 함께 내려준다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `candidateItems` | `CandidateStashItemSummary[]` | 저장된 후보 item record 요약. 스냅샷 보유 여부와 최신 AI 코멘트 여부를 포함한다. |
| `items` | `CandidateItemSummary[]` | 화면 표시용 후보 item 요약. SKU metadata, 기간 판매/예상 값, insight, order export 상태를 포함한다. |

`CandidateStashItemSummary`

| 필드 | 타입 | 설명 |
|---|---|---|
| `uuid` | string | 후보 item UUID |
| `stashUuid` | string | 소속 후보군 UUID |
| `skuUuid` | string | `CANDIDATE_ITEM.sku_uuid`, 실제 SKU UUID |
| `skuGroupKey` | string | 기존 drawer API와 연결하는 상품-색상 그룹 key |
| `isLatestLlmComment` | boolean | 저장된 AI 코멘트가 최신 스냅샷 기준인지 여부 |
| `hasSnapshot` | boolean | item에 저장된 2차 drawer 스냅샷이 있는지 여부 |
| `snapshotUpdatedAt` | string optional | 저장 스냅샷의 마지막 수정 일시 |
| `dbCreatedAt` | string | DB 생성 일시 |
| `dbUpdatedAt` | string | DB 수정 일시 |

`CandidateItemSummary`

| 필드 | 타입 | 설명 |
|---|---|---|
| `uuid` | string | 후보 item UUID |
| `stashUuid` | string | 소속 후보군 UUID |
| `skuUuid` | string | `CANDIDATE_ITEM.sku_uuid`. 백엔드 미구현 mock에서는 `skuGroupKey`를 임시 사용한다. |
| `skuGroupKey` | string | 기존 drawer API와 연결하는 상품-색상 그룹 key |
| `brand` | string | 브랜드 |
| `code` | string | 상품 코드 |
| `productName` | string | 상품명 |
| `colorCode` | string | 색상 코드 |
| `orderMetricStatus` | `CandidateOrderMetricStatus` | 오더 지표 계산 상태 |
| `qty` | number | 조회 기준 기간 판매 수량 |
| `expectedOrderAmount` | number | 조회 기준 기간의 예상 오더 금액 |
| `expectedSalesAmount` | number | 조회 기준 기간의 예상 매출 |
| `expectedOpProfit` | number | 조회 기준 기간의 예상 영업이익 |
| `insightStatus` | `loading \| loaded \| failed` | badge/recommendation insight 로딩 상태 |
| `insight` | `CandidateItemInsightSummary` | 기간 판매 총합, 경쟁 채널 비교, 예상 값, 배지 요약 |
| `isLatestLlmComment` | boolean | 저장된 AI 코멘트가 최신 스냅샷 기준인지 여부 |
| `isDetailConfirmed` | boolean | item에 저장된 오더 스냅샷이 있는지 여부 |
| `orderExport` | `CandidateItemOrderExport \| null` | 발주 Excel export DTO. SSE로 로드되며 export 시 재조회하지 않는다. |
| `dbCreatedAt` | string | DB 생성 일시 |
| `dbUpdatedAt` | string | DB 수정 일시 |

mutation payload 공통:

| 필드 | 타입 | 설명 |
|---|---|---|
| `companyUuid` | string | 소유 회사 UUID. mutation/job/import에서 필수 |
| `skuGroupKey` | string optional | 상품 그룹 key |
| `skuGroupKeys` | string[] optional | bulk 추가 대상 |
| `itemUuids` | string[] optional | bulk 삭제/job 대상 |
| `name` | string optional | 후보군 이름 |
| `description` | string optional | 설명 |
| `snapshot` | `OrderSnapshotDocumentV1` optional | item에 저장할 스냅샷 |
| `llmComment` | string optional | AI 코멘트 |

job start 응답:

| 필드 | 타입 | 설명 |
|---|---|---|
| `jobId` | string | SSE subscribe에 사용할 job ID |
| `totalItems` | number | 처리 대상 수 |

SSE progress payload:

| 필드 | 타입 | 설명 |
|---|---|---|
| `jobId` | string | job ID |
| `status` | `running \| completed \| failed` | 진행 상태 |
| `totalItems` | number | 총 대상 수 |
| `completedItems` | number | 완료 수 |
| `currentProductName` | string optional | 현재 처리 중 상품명 |
| `message` | string optional | 상태 메시지 또는 오류 사유 |

Excel import FormData:

| 필드 | 타입 | 설명 |
|---|---|---|
| `file` | File | Excel 파일 |
| `companyUuid` | string | 소유 회사 UUID |

Excel import 응답:

| 필드 | 타입 | 설명 |
|---|---|---|
| `createdStashCount` | number | 생성된 후보군 수 |
| `createdItemCount` | number | 생성된 item 수 |
| `skippedCount` | number | 건너뛴 행 수 |
| `errors` | array | 행 단위 오류 |

## 11. Order Snapshot JSON

스냅샷은 확정 또는 AI 코멘트 요청 시점의 분석 상태를 고정하는 문서다. 확정 이후에만 생성된다는 가정은 폐기되었다. AI 코멘트 요청 시에도 그 시점의 화면/계산 상태로 스냅샷을 만들어 전송할 수 있어야 한다.

타입명: `OrderSnapshotDocumentV1`

주의:

- 현재 `schemaVersion` 상수값은 `2`다. 타입명은 `V1`로 남아 있지만 runtime schema version은 2다.
- 백엔드는 snapshot을 단순 JSON blob으로 저장할 수 있으나, 각 필드의 의미를 알고 검증해야 한다.
- 백엔드가 필드 의미를 모르면 임의 계산하거나 이름만 보고 확정하지 말고 사용자에게 확인해야 한다.

### 11.1 Top-level

```json
{
  "schemaVersion": 2,
  "skuGroupKey": "ADIDAS:D:110",
  "savedAt": "2026-05-22T10:00:00.000Z",
  "context": {},
  "drawer1": {},
  "drawer2": {}
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `schemaVersion` | number | 스냅샷 구조 버전. 현재 값은 `2` |
| `skuGroupKey` | string | 상품 그룹 식별자. 브랜드/품번/색상 등 조합일 수 있으나 정확한 조합 규칙은 사용자 확인 필요 |
| `savedAt` | string | 스냅샷 생성 시각 |
| `context` | object | 조회/예측 조건 |
| `drawer1` | object | 1차 drawer 요약 |
| `drawer2` | object | 2차 drawer 분석/오더/AI 코멘트 상태 |

### 11.2 `context`

| 필드 | 타입 | 설명 |
|---|---|---|
| `periodStart` | string | 분석 기간 시작일 |
| `periodEnd` | string | 분석 기간 종료일 |
| `forecastMonths` | number | 예측 개월 수 |
| `dailyTrendStartMonth` | string | 일별 추이 기준 시작월. `YYYY-MM` 예상 |
| `dailyTrendLeadTimeDays` | number | 일별 추이와 오더 계산에 사용하는 리드타임 일수 |

확인 필요:

- `periodStart`, `periodEnd`가 포함 경계인지, 종료일 exclusive인지 사용자 확인 필요.
- `dailyTrendStartMonth`가 월초 날짜 문자열인지 `YYYY-MM`인지 백엔드 저장 규칙을 확정해야 한다.

### 11.3 `drawer1.summary`

`drawer1.summary`는 `ProductPrimarySummary`에서 `monthlySalesTrend`를 제외한 값이다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `skuGroupKey` | string | 상품 그룹 key |
| `brand` | string | 브랜드 |
| `category` | string | 카테고리 |
| `productName` | string | 상품명 |
| `thumbnailUrl` | string optional | 썸네일 |
| `salesAmount` | number | 기간 매출 |
| `qty` | number | 기간 판매량. 정확한 기준은 사용자 확인 필요 |
| `avgPrice` | number | 평균 판매가 |
| `avgCost` | number optional | 평균 원가 |
| `avgFeeRatePct` | number optional | 평균 수수료율 |
| `opProfit` | number optional | 영업이익 |
| `opMarginPct` | number optional | 영업이익률 |

용도:

- 확정 기록에서 1차 분석 당시 상품 요약을 복원한다.
- 이후 원천 데이터가 바뀌어도 확정 당시 기준값을 보존한다.

### 11.4 `drawer2.secondary`

2차 drawer 상세 원천 데이터다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `skuGroupKey` | string | 상품 그룹 key |
| `productName` | string | 상품명 |
| `brand` | string | 브랜드 |
| `category` | string | 카테고리 |
| `self` | `SalesKpiColumn` | 자사 KPI |
| `competitor` | `SalesKpiColumn` | 경쟁사 KPI |
| `sizeRows` | `ProductSizeMixRow[]` | 사이즈별 상세 |
| `competitorChannels` | array optional | 경쟁사 채널 목록 |
| `minOpMarginPct` | number nullable | 최소 영업이익률 |

용도:

- `salesSelf`, `salesCompetitor`, `sizeRows` 계산의 원천 비교값이다.
- 백엔드는 snapshot 저장 시 이 object를 그대로 보존해야 하며, 저장 시점에 재계산해 덮어쓰지 않는다.

### 11.5 `drawer2` 분석 조건 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `competitorChannelId` | string | 선택된 경쟁사 채널 ID |
| `competitorChannelLabel` | string | 선택된 경쟁사 채널 표시명 |
| `minOpMarginPct` | number nullable | 최소 영업이익률 조건 |
| `selfWeightPct` | number | 자사 가중치. 0~100 |
| `sizeForecastSource` | `periodMean \| forecastQty` | 사이즈 예측 출처 |
| `bufferStock` | number | 버퍼 재고. 적용 공식은 사용자 확인 필요 |

용도:

- 사용자가 2차 drawer에서 선택한 비교 채널과 가중치 조건을 보존한다.
- 나중에 같은 확정 결과를 다시 열 때 화면 입력 상태를 복원한다.

### 11.6 `drawer2.salesSelf`, `drawer2.salesCompetitor`

둘 다 `SalesKpiColumn` 구조다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `avgPrice` | number nullable | 평균 판매가 |
| `qty` | number nullable | 판매 수량 |
| `salesAmount` | number nullable | 매출 |
| `avgCost` | number nullable | 평균 원가 |
| `avgFeeRatePct` | number nullable | 평균 수수료율 |
| `opProfit` | number nullable | 영업이익 |
| `opMarginPct` | number nullable | 영업이익률 |

용도:

- 자사/경쟁사 KPI 테이블 표시와 AI 코멘트 입력에 사용한다.
- `null`은 값이 없거나 계산 불가라는 의미다. `0`과 구분해야 한다.

### 11.7 `drawer2.stockInputs`

오더 계산 입력값이다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `serviceLevelPct` | number | 서비스 레벨 |
| `leadTimeDays` | number | 리드타임 일수 |
| `safetyStockMode` | string | 안전재고 방식 |
| `manualSafetyStock` | number | 수동 안전재고 |
| `dailyMean` | number optional | 일 평균 판매량 override |

용도:

- 오더 계산 API에 전달한 입력을 확정 기록에 남긴다.
- 계산 결과만 저장하면 왜 그 수량이 나왔는지 추적할 수 없기 때문에 입력도 함께 보존한다.

### 11.8 `drawer2.stockDerived`

오더 계산 결과다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `trendDailyMean` | number | 추세 기반 일 평균 |
| `dailyMean` | number | 실제 계산에 사용한 일 평균 |
| `sigma` | number | 변동성 값. 공식은 사용자 확인 필요 |
| `display` | object | 화면 표시용 계산 결과 |
| `safetyStockCalc` | object | 안전재고 계산 상세 |
| `forecastQtyCalc` | object | 예측 수량 계산 상세 |

용도:

- 확정 당시 계산 결과를 보존한다.
- 백엔드는 schema를 무시하고 임의 JSON으로만 저장하지 말고, 최소한 필수 하위 object 존재와 숫자 타입을 검증해야 한다.

### 11.9 `drawer2.orderUnitInputs`

오더 금액/이익 계산 단가 입력이다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `unitPrice` | number | 기대 판매가 |
| `unitCost` | number | 기대 원가 |
| `expectedFeeRatePct` | number | 기대 수수료율 |

용도:

- 예상 매출, 예상 영업이익, 예상 영업이익률 계산에 사용한다.
- 값이 없으면 백엔드는 프론트와 같은 fallback을 만들지 말고 요청 계약 또는 오류로 드러내야 한다.

### 11.10 `drawer2.stockDisplay`

화면 표시용 재고/잔량 집계다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `currentStockQtyTotal` | number | 현재 재고 총량 |
| `totalOrderBalanceTotal` | number | 총 오더 잔량. 정확한 업무 용어는 사용자 확인 필요 |
| `expectedInboundOrderBalanceTotal` | number | 입고 예정 잔량. 정확한 업무 용어는 사용자 확인 필요 |
| `currentStockQtyBySize` | number[] | 사이즈별 현재 재고 |
| `totalOrderBalanceBySize` | number[] | 사이즈별 총 오더 잔량 |
| `expectedInboundOrderBalanceBySize` | number[] | 사이즈별 입고 예정 잔량 |

용도:

- 2차 drawer의 사이즈별 오더 테이블에서 재고/잔량을 표시한다.
- 배열 순서는 `sizeRows`의 `size` 순서와 일치해야 한다.

확인 필요:

- 배열 길이가 `sizeRows.length`와 다를 때 백엔드가 reject할지, missing을 `null`로 받을지 정책 확인 필요.
- 음수 재고/잔량 허용 여부 확인 필요.

### 11.11 `drawer2.confirmedTotals`

확정 오더 총합이다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `orderQty` | number | 확정 오더 수량 합계 |
| `expectedSalesAmount` | number | 확정 수량 기준 예상 매출 |
| `expectedOpProfit` | number | 확정 수량 기준 예상 영업이익 |
| `expectedOpProfitRatePct` | number nullable | 예상 영업이익률 |

용도:

- 후보군 확정 이후 목록/상세에서 확정 결과를 빠르게 표시한다.
- `expectedOpProfitRatePct`는 분모가 0이거나 계산 불가면 `null`이어야 한다.

### 11.12 `drawer2.sizeRows`

확정/추천 오더의 사이즈별 상세다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `size` | string | 사이즈 라벨 |
| `selfSharePct` | number | 자사 비중 |
| `competitorSharePct` | number | 경쟁사 비중 |
| `blendedSharePct` | number | 가중 반영 비중 |
| `forecastQty` | number | 예측 수량 |
| `recommendedQty` | number | 추천 수량 |
| `confirmQty` | number | 사용자가 확정한 수량 |

용도:

- 스냅샷에서 가장 중요한 확정 단위다.
- 백엔드가 실제 오더 생성 또는 저장 로직을 구현할 경우 `confirmQty`를 기준으로 처리해야 한다.

확인 필요:

- `confirmQty`가 0인 사이즈를 저장할지 제외할지 사용자 확인 필요.
- `recommendedQty`와 `confirmQty`가 다를 때 변경 사유를 별도 저장할지 사용자 확인 필요.
- 퍼센트 값의 소수 자리 반올림 정책 확인 필요.

### 11.13 `drawer2.llmPrompt`, `drawer2.llmAnswer`

| 필드 | 타입 | 설명 |
|---|---|---|
| `llmPrompt` | string | AI 코멘트 생성에 사용한 prompt |
| `llmAnswer` | string | AI 응답 본문 |

용도:

- 같은 스냅샷으로 생성된 AI 코멘트 결과를 추적한다.
- 개인정보/민감정보가 prompt에 포함될 수 있으면 백엔드 저장/마스킹 정책을 별도 확정해야 한다.

## 12. Snapshot 저장/검증 권장 정책

최소 검증:

- `schemaVersion === 2`
- `skuGroupKey` 존재
- `savedAt` ISO 일시 문자열
- `context.periodStart`, `context.periodEnd` 존재
- `drawer1.summary` 존재
- `drawer2.secondary` 존재
- `drawer2.sizeRows` 배열 존재
- `drawer2.sizeRows[].confirmQty` 숫자

권장 검증:

- `companyUuid`가 있는 후보군 item에 저장할 때 snapshot의 `skuGroupKey`와 item의 `skuGroupKey` 일치
- `stockDisplay.*BySize` 배열 길이와 `drawer2.sizeRows` 길이 일치
- 퍼센트 값은 0~100 범위
- 수량/금액은 음수 불가. 반품/차감 업무가 있으면 별도 필드로 표현
- 스냅샷 저장 시 백엔드 재계산 금지. 재계산이 필요하면 새 snapshot version으로 저장

## 13. 백엔드 구현자가 사용자에게 확인해야 할 항목

아래 항목은 타입명만으로 비즈니스 의미를 완전히 확정할 수 없다.

| 항목 | 확인 질문 |
|---|---|
| `skuGroupKey` | 어떤 컬럼 조합인지, delimiter와 대소문자/공백 정규화 규칙은 무엇인지 |
| 조회 기간 | `periodEnd`가 포함인지 exclusive인지 |
| `qty` | 판매량인지 주문량인지, 취소/반품 차감 후 값인지 |
| 경쟁사 데이터 | 경쟁사 판매량/가격의 채널, 기간, 중복 제거 기준 |
| `competitorRatioBySize` | 0~1 비율인지 0~100 퍼센트인지 |
| `sigma` | 표준편차 공식과 표본/모집단 기준 |
| `bufferStock` | 안전재고와 다른 개념인지, 어떤 계산식에 반영되는지 |
| `totalOrderBalance` | 미입고, 발주잔량, 입고예정 중 정확히 어떤 업무 용어인지 |
| `confirmQty=0` | 확정 row로 저장할지 생략할지 |
| LLM prompt 저장 | prompt 원문 저장 가능 여부와 민감정보 정책 |

위 항목은 백엔드가 임의로 확정하지 않는다. 모르면 사용자에게 물어본 뒤 API 계약 또는 DB 문서에 반영한다.
