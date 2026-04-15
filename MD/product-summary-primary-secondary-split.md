# ProductSummary 1차/2차 데이터 분리 계획

## 배경·문제

- `ProductSummary`에 **자사 채널 요약**, **경쟁사 베이스라인**, **사이즈별 경쟁 비중**, **시계열** 등이 한 타입에 섞여 있음.
- 소비처가 다름: **1차 드로어**는 주로 자사 KPI·차트·사이즈(자사 중심), **2차 패널**은 경쟁 채널 스큐·경쟁 KPI·가중 블렌드·동일 시계열 기반 재고 연산 등.
- 데이터 **도메인(관심사)** 기준으로 나누는 것이 맞고, “같은 상품 id”만으로 한 객체에 묶는 것은 **계약·캐시·로딩** 측면에서도 불리함.

## 목표

1. **타입**: 1차용 요약과 2차용(경쟁·믹스 확장)을 **분리된 타입**으로 정의한다.
2. **API**: `DashboardApi`에 **별도 메서드**(또는 명시적 번들 필드)로 노출해, 호출 경계가 코드에서 드러나게 한다.
3. **화면**: 1차는 1차 번들만, **2차는 2차 드로어(패널)가 열릴 때** 별도 요청으로 로딩한다.
4. **mock → 실서버**: 동일 계약으로 HTTP 클라이언트만 갈아끼울 수 있게 유지.

---

## 확정 사항 (요청·로딩 경계)

- **2차 데이터는 2차 드로어 쪽에서 로딩**한다. 1차 상품 선택 시점에 2차 상세까지 **한 번에 묶어서 서버가 내려주는 방식은 쓰지 않는다.**
- **2차는 별도 HTTP/API 요청**으로 둔다. “상세까지 합쳐서 반환”하는 단일 엔드포인트 가정은 제거한다.
- **2차 영역 안에서도** 일간 추이·재고 연산 등은 **조회 조건(기간, 리드타임, 서비스 수준 등)에 따라** 이미 **추가 요청**이 들어가는 구조이므로, 그 흐름과 맞게 **상위 `ProductSecondary*` 조회도 독립 요청**으로 두는 것이 일관된다.

---

## 데이터 배치 원칙 (초안)

| 데이터 | 1차 드로어 | 2차 패널 | 비고 |
|--------|------------|----------|------|
| id, name, brand, category, productCode | ✅ | ✅ | 공통 메타 |
| price, selfQty, availableStock, recommendedOrderQty | ✅ | ✅ (자사 KPI) | 2차 `buildSalesKpiColumn('self')` |
| **월별** 판매 시계열 (`monthlySalesTrend` 등) | ✅ | 조건부 | **월별 요약(aggregate)**에서만 추출. 1차 번들에 포함. |
| **일별** 판매·재고 시계열 | ❌ (1차 차트는 월 단위) | ✅ | **원본/일별 테이블**에서만 추출 → **서브 API** (`getSecondaryDailyTrend` 등) |
| seasonality | ✅ | ❌ (현재) | 1차 전용 가능 |
| stockTrend | ✅ (`ProductSummaryBundle`) | ❌ 직접 | 번들 유지 또는 1차 전용 fetch |
| competitorPrice, competitorQty | ❌ | ✅ | 2차 전용으로 이동 후보 |
| sizeMix: self* | ✅ | ✅ | |
| sizeMix: competitorRatio | ❌ | ✅ | 행 분리 또는 2차 전용 배열 |
| confirmedQty (발주 확정) | 혼재 | ✅ | 2차 입력 상태와 연동 시 2차 쪽 책임 명확화 검토 |

### “salesTrend”가 뭐냐 (용어 정리)

- 현재 코드의 `ProductSummary.salesTrend`는 **월 단위** 포인트(`YYYY-MM` 계열, `isForecast` 포함)이며, **월별 요약 파이프**에 해당한다.
- **1차 드로어**의 “월간 판매추이”는 이 **월별 시계열**만 쓰면 된다.
- **2차**의 “일간” 차트·연산은 **일별 원본**에서 나와야 하므로, **같은 필드로 취급하면 안 된다.** (mock은 예외적으로 월별에서 일별을 합성했을 뿐, 백엔드 기준으로는 분리.)

### 백엔드 소스 기준 (확정 방향)

| 구분 | 소스 | API·타입 |
|------|------|----------|
| 월별 | 월별 **서머리/집계** | **1차 번들**의 `monthlySalesTrend`(명칭 권장) 또는 `GET …/monthly-summary?productId&…` |
| 일별 | **원본(일 단위) 테이블** | **2차 서브** `getSecondaryDailyTrend` 또는 `GET …/daily-sales?productId&from&to&…` |

### 2차 본편 응답에 월별을 넣을지?

- **넣지 않는 것을 기본**으로 한다. 월별은 **1차와 동일 도메인**(요약 테이블)이므로, 2차에서 월별 슬라이스·평균이 필요하면:
  - **(A)** 상위에서 1차 로드 시 내려준 월별을 props로 전달하거나,
  - **(B)** 2차가 `productId` + 기간으로 **월별 요약 API만 따로 호출**한다.
- **일별**은 2차 본편에 한꺼번에 넣지 않고, **기간·조건이 바뀔 때마다 서브 API**로 원본에서 가져온다 (이미 조건부 요청 패턴과 동일).

### 그래서 어떻게 해야 하냐 (요약)

1. 타입 이름을 **`salesTrend` → `monthlySalesTrend`**(또는 동일 의미의 명시적 이름)로 바꿔 **월별만** 담는다.
2. **1차 번들**에만 월별 시계열을 둔다.
3. **2차 본편**(`ProductSecondaryDetail`)에는 월별·일별 시계열을 **기본 포함하지 않는다** (경쟁·믹스 등 2차 전용만).
4. 2차 화면에서 필요한 **일별**은 **항상 일별 전용 서브 API**; **월별**이 추가로 필요하면 **월별 요약 API 재조회 또는 1차 props**.

---

## 타입 설계 방향 (제안)

**채택 방향**: **두 응답 타입 + 네트워크 상으로는 항상 분리** (별도 `getProduct…` 호출). 단일 번들로 primary·secondary를 한 JSON에 넣는 **B안(통합 응답)은 하지 않는다.**

- `ProductPrimarySummary` (또는 `ProductDrawerSummary`): 메타 + 자사 스칼라 + **`monthlySalesTrend`** + `seasonality` + 자사 중심 `sizeMix` (경쟁 필드 없음).
- `ProductSecondaryDetail`(가칭): `competitorPrice`, `competitorQty`, 경쟁 비중이 포함된 `sizeMix` 등 2차 전용.
- **1차 번들** (`ProductDrawerBundle` 등): `{ summary: ProductPrimarySummary, stockTrend: ... }` — **1차 드로어만** 책임.

---

## API 계약 (초안)

`DashboardApi` 예시 (이름은 확정 시 조정). **1차·2차는 별도 메서드.**

```ts
// 예시 — 실제 코드와 다를 수 있음
getProductDrawerBundle(productId: string): Promise<ProductDrawerBundle>  // 1차만
getProductSecondaryDetail(productId: string): Promise<ProductSecondaryDetail>  // 2차 드로어 오픈 시
```

**2차 패널 내부 기존 메서드**(`getSecondaryDailyTrend`, `getSecondaryStockOrderCalc` 등)는 조건 파라미터를 유지하고, mock에서는 `ProductSummary` 단일 테이블 대신 **primary/secondary 조회 결과**를 참조하도록 정리한다.

---

## 마이그레이션 단계 (권장 순서)

### Phase 0: ~~의사결정~~ → “확정 사항” 반영 완료 (네트워크 분리)

### Phase 1: 타입만 분리 (동작 동일)

- `types.ts`에 `ProductPrimarySummary` / `ProductSecondaryDetail`(가칭) 추가.
- 기존 `ProductSummary`는 **deprecated alias**로 `Primary & Secondary` 교차 타입 또는 **임시 합성 타입**으로 두어 기존 코드 컴파일 유지.
- 또는 한 번에 `ProductSummary` 제거하고 모든 참조를 새 타입으로 교체 (리팩터 범위 큼).

### Phase 2: mock 분리

- `productSummaries` 생성 로직을 `buildPrimary` / `buildSecondary`로 쪼갬.
- **1차**: `getProductDrawerBundle`(가칭)은 **primary + stockTrend**만 반환.
- **2차**: `getProductSecondaryDetail`(가칭)은 **secondary만** 반환. 기존 `getProductSummaryBundle` 단일 객체는 제거하거나 thin wrapper로 잠깐 유지 후 삭제.

### Phase 3: API·훅 분리

- `useProductDrawerBundle`: 1차 행 선택 시에만 호출.
- `useProductSecondaryDetail`(가칭): **2차 드로어/패널 마운트(또는 열림)** 시에만 호출 — **별도 요청**.

### Phase 4: 컴포넌트

- `ProductSummaryDrawer`: `ProductPrimarySummary`만 props (1차 번들).
- `ProductSecondaryPanel`: `ProductSecondaryDetail`만으로 동작하도록 맞추고, 시계열·스칼라가 2차 응답에 없으면 **해당 서브 API**만 추가 호출 (기존 패턴 유지).

### Phase 5: 정리

- deprecated 타입·합성 제거, `DashboardApi` 문서화, `MD/api-request-migration-plan.md`와 링크 상호 참조.

---

## 리스크·테스트

- **2차만 먼저 열 수 있는 UI가 생기면** 1차 없이 secondary만 있는 상태 — `productId`만으로 2차 요청이 가능한지 명시.
- **동일 productId**에 대해 primary/secondary가 **서로 다른 시점 스냅샷**이 되면 KPI 불일치; 필요 시 조회 시각·버전 필드.
- `getSecondaryStockOrderCalc` 등: 요청 body에 **자사 단가·수량 등 필요한 스칼라를 명시**해 1차 캐시에 묶이지 않게 함.

---

## 남은 의사결정 (선택)

1. **sizeMix**: 한 행에 optional 경쟁 필드 vs **자사/경쟁 테이블 분리** — 타입만의 정리 문제.

2. **호환**: `ProductSummary` **alias 잔존 기간** vs 즉시 삭제.

3. **2차에서 월별이 꼭 필요할 때**: (A) 1차에서 props 전달 vs (B) 월별 API 재호출 — UX·캐시 정책에 따라 선택.

---

## 문서 상태

- **네트워크·로딩**: “2차는 2차 드로어에서 별도 요청, 통합 반환 없음” **확정** 반영됨.
- **시계열**: **월별 = 요약 테이블 → 1차**, **일별 = 원본 테이블 → 2차 서브 API** — `salesTrend` 혼용 금지, 위 절 참고.
- 구현 착수 시 메서드·타입 **최종 이름**만 고정하면 됨.

## 구현 반영 (코드)

- 타입: `ProductPrimarySummary` (`monthlySalesTrend`), `ProductSecondaryDetail`, `MonthlySalesPoint` — `dashboard-app/src/types.ts`
- API: `getProductDrawerBundle`, `getProductSecondaryDetail`, 번들 타입 `ProductDrawerBundle` — `src/api/types.ts`, `mock.ts`, `client.ts`
- 훅: `useProductDrawerBundle` — `src/dashboard/hooks/useProductDrawerBundle.ts`
- 1차 드로어: 확장 패널 열 때만 `getProductSecondaryDetail` 호출 후 로딩 문구 → `ProductSecondaryPanel`에 `primary` + `secondary` 전달
- 2차 패널: `mergePrimarySecondarySizeMix`, `buildSalesKpiColumn(primary, secondary, …)`
