# dashboard-app 리팩터 인벤토리 (Estimator 제외)

작업일 기준 `dashboard-app/src` 기준 파일 목록과 조치 요약.

## 엔트리·라우팅

| 파일 | 역할 | 비고 |
|------|------|------|
| `main.tsx` | React 마운트, `tokens.css` + `base.css` | |
| `App.tsx` | BrowserRouter, `/v2/*`만 | |
| `app.module.css` | `.app`, `.main`, `.mainV2` | |
| `v2/V2DashboardLayout.tsx` | 탭 + `<Outlet />` | |

## API·타입

| 파일 | 역할 |
|------|------|
| `api/mock.ts` | 목 API 전부 |
| `types.ts` | `SalesRow`, `ProductDetail`, … |

## 유틸

| 파일 | 역할 |
|------|------|
| `utils/format.ts` | `won`, `c`, `pct` 등 |
| `utils/date.ts` | 월/기간 문자열 헬퍼 (V2 자사 페이지용) |

## 스타일 (전역)

| 파일 | 역할 |
|------|------|
| `styles/tokens.css` | CSS 변수 |
| `styles/base.css` | 리셋·기본 |

## v2 페이지

| 파일 | 역할 |
|------|------|
| `v2/pages/V2SelfPage.tsx` | 자사 분석 |
| `v2/pages/V2CompetitorPage.tsx` | 경쟁사 |

## v2 컴포넌트

| 파일 | 역할 |
|------|------|
| `v2/components/ProductInsightDrawer.tsx` | 상품 인사이트 드로어 |
| `v2/components/PortalHelpPopover.tsx` | 포털 도움말 |
| `v2/components/PaginatedTable.tsx` | 정렬 + 페이지네이션(또는 전체 표시 모드) |
| `v2/components/V2ChartCard.tsx` | 차트 카드 래퍼 |
| `v2/components/V2FilterBar.tsx` | 필터 바 |
| `v2/components/V2KpiGrid.tsx` | KPI 그리드 |
| `v2/components/V2PageHeader.tsx` | 페이지 헤더 |
| `v2/components/v2-common.module.css` | v2 공통 스타일 |
| `v2/v2-layout.module.css` | 레이아웃 탭 |

## v2 훅

| 파일 | 역할 |
|------|------|
| `v2/hooks/useProductDetail.ts` | `selectedId` → `getProductDetail` 로딩 |

## 삭제한 것 (미사용·Vite 템플릿 잔재)

- `components/common/filter-card.tsx` + `.module.css` — import 없음
- `components/common/data-table.tsx` + `.module.css` — import 없음
- `App.css`, `index.css` — 어디에서도 import 안 함
- `src/assets/` 폴더(미사용 svg·png) 제거

## 이번에 추가·변경한 것

- `utils/date.ts` — 월/기간 문자열
- `v2/hooks/useProductDetail.ts` — 상품 상세 단일 로딩
- `PaginatedTable` — `paginated={false}` 시 전체 행 + 페이저 숨김 (noop 제거)
- `mock.getProductStockTrend` — 알 수 없는 id 시 첫 SKU 흐름으로 폴백 (`?? []` 제거)

## 공통화·단순화 원칙

- 목 API가 품번 단위로만 쓰이는 화면에서는 **이중 필터·이중 useMemo** 제거 (`filteredRows === rows` 같은 무의미 래퍼 삭제).
- 상품 상세는 **`useProductDetail(selectedId)`** 한 곳에서만 fetch.
- 표는 **페이지네이션 불필요한 화면**은 `paginated={false}`로 페이저·noop 제거.

## 의도적으로 남긴 경계

- `getProductDetail` / `getProductStockTrend`: 존재하지 않는 `id`에 대한 목 단일 폴백은 **목 전용**으로 유지 (실 API 연동 시 제거).
- `ProductInsightDrawer` 내부: `detail` 없음은 **바깥 컴포넌트에서만** 처리 (훅 순서 유지).
