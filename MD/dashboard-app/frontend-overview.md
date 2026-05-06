# dashboard-app — 프론트엔드 개요·기능 상세

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-04-23 |
| 변경일 | 2026-05-06 |
| 지시 | Yun Daeyoung |

---

## 1. 이 문서의 목적

온보딩, 기획·백엔드 연동, 유지보수 시 **이 저장소에서 무엇을 하는지** 빠르게 파악하기 위한 참고 자료입니다. 구현 세부는 소스의 타입·주석·[`MD/backend-api`](../backend-api/)와 함께 보는 것을 권장합니다.

---

## 2. 프로젝트 목적 — **코드·UI 기반 추정**

> **주의:** 공식 제품 비전·OKR 문서는 이 저장소에 없습니다. 아래는 **화면 명칭, 데이터 모델, 사용자 흐름**을 근거로 한 추정입니다. 조직에서 정의한 목적과 다르면 이 절을 수정해 주시면 됩니다.

**추정 요약:**  
브랜드·카테고리·기간·채널 조건으로 **자사 판매 실적**과 **경쟁 채널 대비 지표**를 보고, SKU 단위로 **1차 요약(가격·재고·월간 추이 등)**과 **2차 심화(경쟁 비중, 일별 추이, 안전재고·발주 시뮬, 사이즈별 확정 수량, LLM 보조)**를 한 화면 흐름에서 다룹니다. 확정한 시나리오는 **오더 스냅샷 JSON**으로 후보군 아이템 `details`에 저장하고, **오더 후보군(스태시)**에 여러 SKU 후보를 모아 비교·관리할 수 있습니다.

즉, **판매·재고 인사이트 + 발주 의사결정 보조 + 후보안 보관**을 엮은 **내부용 대시보드(프로토타입/목 중심)** 로 읽는 것이 타당합니다.

---

## 3. 기술 스택

| 영역 | 선택 |
|------|------|
| 런타임 | React 19, TypeScript |
| 빌드 | Vite 8, Rolldown code splitting |
| 라우팅 | react-router-dom 7 |
| 차트 | Recharts 3 |
| 수식 표시 | KaTeX / react-katex (2차 패널 등) |
| 스타일 | CSS Modules (`.module.css`) |

테스트는 Vitest(`npm run test:run`)로 실행합니다.

프로덕션 번들은 `src/App.tsx`의 라우트 lazy import와 `vite.config.ts`의 vendor code splitting으로 분리합니다. Vite의 500KB chunk 경고가 다시 나오면 우선 라우트가 정적 import로 되돌아가지 않았는지, 새 대형 라이브러리가 어느 vendor group에 들어가야 하는지 확인합니다. Recharts처럼 내부 모듈 순서에 민감한 라이브러리는 `maxSize`로 한 패키지 안을 강제 세분화하지 않습니다.

---

## 4. 진입·라우팅

| 경로 | 화면 |
|------|------|
| `/`, `/dashboard`, `/dashboard/self` | 자사 분석 |
| `/dashboard/competitor` | 경쟁사 분석 |
| `/dashboard/snapshot-confirm` | 오더 후보군 |

레이아웃: [`dashboard-app/src/dashboard/DashboardLayout.tsx`](../../dashboard-app/src/dashboard/DashboardLayout.tsx) — 상단 탭 3개.

라우트 화면(`SelfPage`, `CompetitorPage`, `SnapshotConfirmPage`)은 [`App.tsx`](../../dashboard-app/src/App.tsx)에서 lazy 로딩됩니다. 새 라우트를 추가할 때도 같은 방식으로 route chunk를 분리합니다. 기본 배포는 `BrowserRouter`를 쓰며, 서버가 SPA fallback을 제공하면 `/dashboard/self` 같은 일반 URL로 동작합니다. GitHub Pages workflow만 `VITE_ROUTER_MODE=hash`를 주입해 `/Estimator/#/dashboard/self` 형태를 사용하고, `404.html` fallback도 함께 배포합니다.

---

## 5. 화면별 기능

### 5.1 자사 분석 (`SelfPage`)

- **필터:** 기간(날짜·프리셋·이중 범위 슬라이더), 브랜드, 카테고리 — API [`getSelfSales`](../../dashboard-app/src/api/types/dashboard-api.ts), [`getSelfSalesFilterMeta`](../../dashboard-app/src/api/types/dashboard-api.ts).
- **KPI:** 총 판매액, 평균 영업이익률 등.
- **차트:** 영업이익률–판매액 스캐터(포지셔닝).
- **목록:** `AnalysisList` + 정렬 가능한 컬럼(내부 [`PaginatedTable`](../../dashboard-app/src/dashboard/components/PaginatedTable.tsx)).
- **행 클릭:** [`ProductSummaryDrawer`](../../dashboard-app/src/dashboard/components/ProductSummaryDrawer.tsx) — 1차 번들 [`useProductDrawerBundle`](../../dashboard-app/src/dashboard/hooks/useProductDrawerBundle.ts) ([`getProductDrawerBundle`](../../dashboard-app/src/api/types/dashboard-api.ts)).
- **포캐스트 월 수:** 로컬 스토리지에 저장 ([`forecastMonthsStorage`](../../dashboard-app/src/utils/forecastMonthsStorage.ts)).

### 5.2 경쟁사 분석 (`CompetitorPage`)

- 자사와 동일한 기간·브랜드·카테고리 + **경쟁 채널** 선택 — [`getCompetitorSales`](../../dashboard-app/src/api/types/dashboard-api.ts), 채널 목록 [`getSecondaryCompetitorChannels`](../../dashboard-app/src/api/types/dashboard-api.ts).
- KPI·차트·목록은 경쟁/자사 갭 중심으로 구성.
- 드로어·번들 흐름은 자사와 동일.

### 5.3 오더 후보군 (`SnapshotConfirmPage` + `CandidateStashDetailModal`)

- **후보군(스태시) 목록:** 이름·비고 검색, 정렬, 엑셀 업로드, 생성·이름/비고 수정·삭제·복제. 목업도 localStorage에 실제 반영한 뒤 목록을 재조회합니다. 엑셀 업로드 카드는 카드 자체가 `제목/안내문/드래그 영역/업로드 버튼` 4열 grid를 소유하며, 좁은 화면에서만 반응형으로 줄을 접습니다.
- **상세 모달:** 한 스태시에 속한 **이너 후보** 목록 — 브랜드·상품코드·상품명 필터([`FilterBar`](../../dashboard-app/src/dashboard/components/FilterBar.tsx) + [`FilterListCombo`](../../dashboard-app/src/dashboard/components/FilterListCombo.tsx)).
- **행 클릭:** 해당 아이템의 스냅샷을 불러와 드로어를 **2차까지 펼친 상태**로 표시(`initialExpandSecondary`), 스냅샷 병합·저장·삭제 등 [`candidateItemContext`](../../dashboard-app/src/dashboard/components/product-secondary/candidateActionCards.tsx) 연동. 드로어를 닫을 때는 닫힘 전환 동안 이너 후보 모달의 왼쪽 기준 폭 보정을 유지해, 열릴 때의 역방향으로 목록 영역이 다시 넓어집니다.
- **AI 코멘트:** 목업 후보 아이템 스냅샷은 `drawer2.llmAnswer`에 임시 AI 코멘트를 포함합니다. 기존 localStorage 목업 데이터도 값이 비어 있으면 자동 보강되어 2차 드로어의 AI 코멘트 카드에 표시됩니다.

---

## 6. 제품 요약 드로어 (`ProductSummaryDrawer`)

- **1차:** 상품 이미지, 기간·경쟁 채널 기준 판매 정보([`getProductSalesInsight`](../../dashboard-app/src/api/types/dashboard-api.ts)), 월간 판매 추이(포캐스트 구간) 등. 계절성 카드는 현재 화면에서 제외.
- **2차 확장 패널:** [`ProductSecondaryPanel`](../../dashboard-app/src/dashboard/components/product-secondary/ProductSecondaryPanel.tsx) — 상품 메타, 후보군 저장/수정, 재고·발주 시뮬([`getSecondaryStockOrderCalc`](../../dashboard-app/src/api/types/dashboard-api.ts)), 저장된 AI 코멘트 표시(`drawer2.llmAnswer`), 일별 추이, 사이즈별 확정 수량 등.
- **스냅샷:** [`OrderSnapshotDocumentV1`](../../dashboard-app/src/snapshot/orderSnapshotTypes.ts) 스키마 v2, 파싱 [`parseOrderSnapshot`](../../dashboard-app/src/snapshot/parseOrderSnapshot.ts). 독립 스냅샷 목록 API는 없고 후보 아이템 `details`가 저장·복원 경로입니다.
- **키보드(2차가 열리고 2차 데이터 준비 완료 시):** `←` / `→`로 **현재 목록의 이전·다음 SKU**(또는 이너 후보의 uuid 순) 순환 — [`adjacentListNavigation`](../../dashboard-app/src/utils/adjacentListNavigation.ts). 입력·콤보 패널 포커스 시에는 무시.
- **번들 로딩:** 자사/경쟁은 [`allowStaleWhileRevalidate`](../../dashboard-app/src/dashboard/hooks/useProductDrawerBundle.ts) 기본 `true`로 드로어 언마운트 방지(2차 접힘 방지). 이너 후보는 `false`로 스냅샷과 번들 id 정합 유지.

---

## 7. 데이터 계층

| 구분 | 설명 |
|------|------|
| 계약 | [`DashboardApi`](../../dashboard-app/src/api/types/dashboard-api.ts) 인터페이스 |
| 구현체 | [`mock.ts`](../../dashboard-app/src/api/mock.ts) — 후보군 localStorage와 mock 응답 |
| 진입점 | [`client.ts`](../../dashboard-app/src/api/client.ts) `dashboardApi`, 개별 `getXxx` 함수 |
| 타입 | [`api/types/*`](../../dashboard-app/src/api/types/), [`types.ts`](../../dashboard-app/src/types.ts), [`snapshot/*`](../../dashboard-app/src/snapshot/) |

HTTP 백엔드로 교체 시 클라이언트만 갈아끼우면 되도록 설계되어 있습니다. REST 스펙은 [backend-api-spec.md](../backend-api/backend-api-spec.md) 참고.

---

## 8. 소스 트리 요약

```
dashboard-app/src/
  App.tsx                 # 라우터
  api/                    # client, mock, types
  components/             # ApiUnitErrorBadge, ComponentErrorBoundary
  dashboard/
    DashboardLayout.tsx
    components/           # FilterBar, ProductSummaryDrawer, AnalysisList, feature components
      candidate-stash/    # 후보군 상세/추천/배지 UI와 후보군 상세 훅
      product-secondary/  # 2차 패널 UI/계산
    hooks/                # useProductDrawerBundle, usePeriodRangeFilter
    pages/                # Self, Competitor, SnapshotConfirm route pages
  snapshot/               # 오더 스냅샷 타입/파서
  utils/                  # format, date, forecastMonthsStorage, adjacentListNavigation
  types.ts
```

2차 패널 전용 UI·계산은 [`product-secondary/`](../../dashboard-app/src/dashboard/components/product-secondary/) 하위에 집중되어 있습니다.

---

## 9. 알려진 제약·메모

- **목록 정렬:** 방향키 네비 순서는 부모가 넘기는 `rows` / `tableRows` 배열 순입니다. 테이블에서 열 정렬을 바꾼 뒤에도 API 순서와 다를 수 있습니다.
- **README.md:** 패키지 루트 [`README.md`](../../dashboard-app/README.md)는 Vite 템플릿 문서가 남아 있어 제품 설명으로 쓰이지 않습니다. 제품 설명은 본 문서를 기준으로 합니다.

---

## 10. 목적 확인 요청 (선택)

조직에서의 **공식 제품명·타깃 사용자·배포 형태(내부 전용 여부)**를 알려 주시면 §2를 그에 맞게 고칠 수 있습니다. 지금은 코드 근거 추정만 기술했습니다.
