# dashboard-app — 프론트엔드 개요·기능 상세

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-04-23 |
| 최종 수정일 | 2026-05-08 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app` 화면, 라우팅, 데이터 흐름 |

---

## 1. 이 문서의 목적

온보딩, 기획·백엔드 연동, 유지보수 시 **이 저장소에서 무엇을 하는지** 빠르게 파악하기 위한 참고 자료입니다. 구현 세부는 소스의 타입·주석·[`MD/backend-api`](../backend-api/)와 함께 보는 것을 권장합니다.

---

## 2. 프로젝트 목적 — **코드·UI 기반 추정**

> **주의:** 공식 제품 비전·OKR 문서는 이 저장소에 없습니다. 아래는 **화면 명칭, 데이터 모델, 사용자 흐름**을 근거로 한 추정입니다. 조직에서 정의한 목적과 다르면 이 절을 수정해 주시면 됩니다.

**추정 요약:**  
브랜드·카테고리·기간·채널 조건으로 **자사 판매 실적**과 **경쟁 채널 대비 지표**를 보고, SKU 단위로 **1차 요약(가격·재고·월간 추이 등)**과 **2차 심화(경쟁 비중, 일별 추이, 안전재고·발주 시뮬, 사이즈별 확정 수량, AI 코멘트)**를 한 화면 흐름에서 다룹니다. 확정한 시나리오는 **오더 스냅샷 JSON**으로 후보군 아이템 `details`에 저장하고, **오더 후보군(스태시)**에 여러 SKU 후보를 모아 비교·관리할 수 있습니다.

즉, **판매·재고 인사이트 + 발주 의사결정 보조 + 후보안 보관**을 엮은 **내부용 대시보드(프로토타입/목 중심)** 로 읽는 것이 타당합니다.

---

## 3. 기술 스택

| 영역 | 선택 |
|------|------|
| 런타임 | React 19, TypeScript |
| 빌드 | Vite 8, Rolldown code splitting |
| 라우팅 | react-router-dom 7 |
| 차트 | Recharts 3 |
| 수식 표시 | KaTeX / react-katex (2차 드로워 등) |
| 스타일 | CSS Modules (`.module.css`) |

테스트는 Vitest(`npm run test:run`)로 실행합니다.

프로덕션 번들은 `src/App.tsx`의 라우트 lazy import와 `vite.config.ts`의 vendor code splitting으로 분리합니다. Vite의 500KB chunk 경고가 다시 나오면 우선 라우트가 정적 import로 되돌아가지 않았는지, 새 대형 라이브러리가 어느 vendor group에 들어가야 하는지 확인합니다. Recharts처럼 내부 모듈 순서에 민감한 라이브러리는 `maxSize`로 한 패키지 안을 강제 세분화하지 않습니다.

---

## 4. 진입·라우팅

| 경로 | 화면 |
|------|------|
| `/login` | 로그인 |
| `/admin` | 관리자 유저 정보 관리 |
| `/`, `/dashboard`, `/dashboard/self` | 자사 분석 |
| `/dashboard/competitor` | 경쟁사 분석 |
| `/dashboard/snapshot-confirm` | 오더 후보군 |

레이아웃: [`dashboard-app/src/dashboard/DashboardLayout.tsx`](../../dashboard-app/src/dashboard/DashboardLayout.tsx) — 상단 업무 탭과 우상단 사용자 정보/로그아웃 버튼. 관리자 권한 사용자는 `오더 후보군` 뒤에 관리자 전용 탭이 표시되며, 일반 탭과 같은 형태지만 별도 색상으로 강조됩니다.

라우트 화면(`LoginPage`, `AdminUsersPage`, `SelfPage`, `CompetitorPage`, `SnapshotConfirmPage`)은 [`App.tsx`](../../dashboard-app/src/App.tsx)에서 lazy 로딩됩니다. 새 라우트를 추가할 때도 같은 방식으로 route chunk를 분리합니다. `/dashboard/*`는 [`RequireAuth`](../../dashboard-app/src/auth/RequireAuth.tsx)가 보호하며, `/admin`은 [`RequireAdmin`](../../dashboard-app/src/auth/RequireAdmin.tsx)이 관리자 권한을 추가로 확인한 뒤 같은 `DashboardLayout` 안에서 렌더됩니다. 세션이 없으면 `/login?redirect=...`으로 이동한 뒤 로그인 성공 시 원래 경로로 복귀합니다. 기본 배포는 `BrowserRouter`를 쓰며, 서버가 SPA fallback을 제공하면 `/dashboard/self` 같은 일반 URL로 동작합니다. GitHub Pages workflow만 `VITE_ROUTER_MODE=hash`를 주입해 `/Estimator/#/dashboard/self` 형태를 사용하고, `404.html` fallback도 함께 배포합니다.

### 4.1 인증

- 인증 UI와 세션 상태는 [`src/auth`](../../dashboard-app/src/auth/)가 소유합니다.
- 로그인/세션 확인/사용자 정보 변경/비밀번호 변경/관리자 유저 관리/로그아웃 호출은 [`src/api/client.ts`](../../dashboard-app/src/api/client.ts)의 개별 인증 함수로만 접근합니다.
- 현재 목 구현은 [`api/mock/authApi.ts`](../../dashboard-app/src/api/mock/authApi.ts)에서 로그인 입력값을 검증하지 않고 통과시키며, 세션은 런타임 메모리에만 둡니다. `mock-user` ID는 일반 사용자 권한 확인용이고, 그 외 입력은 관리자 권한으로 처리합니다. 헤더 우상단의 사용자 정보 버튼은 로그인 ID와 역할을 표시하고, 모달에서 로그인 ID와 비밀번호 변경 API를 호출합니다.
- 권한은 `admin`과 `user`만 사용합니다. `admin`은 관리자 화면 접근이 가능하고, `user`는 일반 대시보드만 접근합니다.
- 관리자 화면은 로그인 ID, 초기 비밀번호, 이름, 비고, 권한, 활성 상태 기반 유저 추가와 UUID 기준 제거, 로그인 ID/이름/비고/권한/활성 상태 수정, 임시 비밀번호 재설정 계약을 호출합니다. mock은 저장하지 않고 재조회 시 정적 seed를 돌려주며, 실제 반영은 백엔드 DB가 소유합니다. 이메일 초대 발송은 상정하지 않습니다.
- 실제 백엔드 전환 시 우선 권장 형태는 HttpOnly cookie 기반 세션이며, 프론트 화면은 `AuthApi` 계약을 유지한 채 client 구현만 교체합니다.

---

## 5. 화면별 기능

### 5.1 자사 분석 (`SelfPage`)

- **필터:** 기간(날짜·프리셋·이중 범위 슬라이더), 브랜드, 카테고리 — API [`getSelfSales`](../../dashboard-app/src/api/types/dashboard-api.ts), [`getSelfSalesFilterMeta`](../../dashboard-app/src/api/types/dashboard-api.ts).
- **KPI:** 총 판매액, 평균 영업이익률 등.
- **차트:** 영업이익률–판매액 스캐터(포지셔닝).
- **목록:** `AnalysisList` + 정렬 가능한 컬럼(내부 [`PaginatedTable`](../../dashboard-app/src/dashboard/components/PaginatedTable.tsx)).
- **행 클릭:** [`ProductDrawer`](../../dashboard-app/src/dashboard/components/product-drawer/ProductDrawer.tsx) — 1차 기본 번들은 [`useProductDrawerBundle`](../../dashboard-app/src/dashboard/hooks/useProductDrawerBundle.ts)가 받고, drawer 내부의 판매 정보/월간 추이/2차 상세는 1차/2차 드로워 컨테이너가 각각 별도 API를 요청합니다.
- **포캐스트 월 수:** 로컬 스토리지에 저장 ([`forecastMonthsStorage`](../../dashboard-app/src/utils/forecastMonthsStorage.ts)).

### 5.2 경쟁사 분석 (`CompetitorPage`)

- 자사와 동일한 기간·브랜드·카테고리 + **경쟁 채널** 선택 — [`getCompetitorSales`](../../dashboard-app/src/api/types/dashboard-api.ts), 채널 목록 [`getSecondaryCompetitorChannels`](../../dashboard-app/src/api/types/dashboard-api.ts).
- KPI·차트·목록은 경쟁/자사 갭 중심으로 구성.
- 드로어·번들 흐름은 자사와 동일.

### 5.3 오더 후보군 (`SnapshotConfirmPage` + `CandidateStashDetailModal`)

- **후보군(스태시) 목록:** 이름·비고 검색, 정렬, 엑셀 업로드, 생성·이름/비고 수정·삭제·복제. 화면은 mutation 응답을 목록에 직접 삽입/제거하지 않고 항상 후보군 목록을 재조회합니다. mock은 브라우저 저장소에 후보군을 만들거나 지우지 않으며, 실제 반영은 백엔드 DB가 소유합니다. 엑셀 업로드 카드는 카드 자체가 `제목/안내문/템플릿 다운로드/드래그 영역/업로드 버튼` grid를 소유하며, 안내문은 `엑셀 업로드` 제목 옆에 두고 템플릿 다운로드는 제목 아래에 둡니다. 드래그 영역과 업로드 버튼은 데스크톱에서 두 행을 합쳐 쓰고, 좁은 화면에서만 반응형으로 줄을 접습니다. 템플릿 다운로드는 현재 `public/templates` 정적 파일을 쓰되, 화면은 `src/api/client.ts`의 다운로드 계약만 알아서 나중에 백엔드 endpoint로 옮길 수 있습니다.
- **상세 모달:** 한 스태시에 속한 **이너 후보** 목록 — 브랜드·상품코드·상품명 필터([`FilterBar`](../../dashboard-app/src/dashboard/components/FilterBar.tsx) + [`FilterListCombo`](../../dashboard-app/src/dashboard/components/FilterListCombo.tsx)). 필터 카드 끝 칸에는 발주 엑셀 다운로드 버튼을 두며, 현재는 해당 후보군 아이템 스냅샷에서 제품 1개당 1행의 주 데이터 시트와 메타 시트(오더 입고 예정일, 사용자 이름)를 프론트에서 생성합니다. 주 데이터 시트는 브랜드·상품코드·상품명·배지·오더량, 자사/선택 경쟁사 기간 총 판매량, 예상 판매/오더 금액, 평균 원가·판매가·수수료율·영업이익율과 후보군 전체 사이즈 동적 컬럼을 포함합니다. 복수 배지는 한 셀 안에서 줄바꿈합니다. 상세 헤더에는 후보군명과 `조회 기간 : 시작일 ~ 종료일` 인라인 입력을 함께 두고, 조회 기간을 바꾸면 이후 여는 이너 후보 드로어의 1차 판매 정보와 2차 계산 기준에 즉시 적용합니다. 1차 드로어가 열린 축소 상태에서도 조회 기간 입력의 위치와 폭은 유지하고, 헤더 버튼은 같은 줄에 남도록 40칸 grid를 유지합니다. 상세 헤더/필터/요약은 모달에 고정하고, 이너 후보 리스트 영역만 내부 스크롤합니다. 리스트 컬럼 헤더는 스크롤 중에도 상단에 남습니다.
- **행 클릭:** 해당 아이템의 스냅샷을 불러와 드로어를 **2차까지 펼친 상태**로 표시(`initialExpandSecondary`), 스냅샷 병합·저장·삭제 등 [`candidateItemContext`](../../dashboard-app/src/dashboard/components/product-drawer/secondary/candidateActionCards.tsx) 연동. 드로어를 닫을 때는 닫힘 전환 동안 이너 후보 모달의 왼쪽 기준 폭 보정을 유지해, 열릴 때의 역방향으로 목록 영역이 다시 넓어집니다.
- **AI 코멘트:** 목업 후보 아이템 스냅샷은 `drawer2.llmAnswer`에 임시 AI 코멘트를 포함해 2차 드로어의 AI 코멘트 카드에 표시됩니다.

---

## 6. 상품 드로어 (`ProductDrawer`)

- **1차 드로워:** [`product-drawer/primary`](../../dashboard-app/src/dashboard/components/product-drawer/primary/)가 소유합니다. 상품 이미지, 기간·경쟁 채널 기준 판매 정보([`getProductSalesInsight`](../../dashboard-app/src/api/types/dashboard-api.ts)), 선택 경쟁 채널 기준 월간 판매 추이([`getProductMonthlyTrend`](../../dashboard-app/src/api/types/dashboard-api.ts))를 다룹니다. 판매 정보 표의 주요 수치는 굵게 강조하고 기본 표 글자보다 10% 크게 표시합니다. 판매 추이 그래프는 선형 축으로 고정하고, 자사/선택 경쟁 채널(예: 크림·무신사) 표시를 각각 토글합니다. 계절성 카드는 현재 화면에서 제외.
- **2차 드로워:** [`product-drawer/secondary`](../../dashboard-app/src/dashboard/components/product-drawer/secondary/)가 소유합니다. 상품 메타, 후보군 저장/수정, 저장된 AI 코멘트 표시(`drawer2.llmAnswer`, 본문 15px), 사이즈별 확정 수량 등을 다룹니다. 2차 상세 조회([`getProductSecondaryDetail`](../../dashboard-app/src/api/types/dashboard-api.ts)), 재고·발주 시뮬([`getSecondaryStockOrderCalc`](../../dashboard-app/src/api/types/dashboard-api.ts)), 선택 경쟁 채널 기준 일별 추이([`getSecondaryDailyTrend`](../../dashboard-app/src/api/types/dashboard-api.ts))도 이 경계 안에 둡니다.
- **스냅샷:** [`OrderSnapshotDocumentV1`](../../dashboard-app/src/snapshot/orderSnapshotTypes.ts) 스키마 v2, 파싱 [`parseOrderSnapshot`](../../dashboard-app/src/snapshot/parseOrderSnapshot.ts). 독립 스냅샷 목록 API는 없고 후보 아이템 `details`가 저장·복원 경로입니다.
- **키보드(2차가 열리고 2차 데이터 준비 완료 시):** `←` / `→`로 **현재 목록의 이전·다음 SKU**(또는 이너 후보의 uuid 순) 순환 — [`adjacentListNavigation`](../../dashboard-app/src/utils/adjacentListNavigation.ts). 입력·콤보 패널 포커스 시에는 무시.
- **번들 로딩:** 자사/경쟁은 [`allowStaleWhileRevalidate`](../../dashboard-app/src/dashboard/hooks/useProductDrawerBundle.ts) 기본 `true`로 드로어 언마운트 방지(2차 접힘 방지). 이너 후보는 `false`로 스냅샷과 번들 id 정합 유지.

---

## 7. 데이터 계층

| 구분 | 설명 |
|------|------|
| 계약 | [`DashboardApi`](../../dashboard-app/src/api/types/dashboard-api.ts) 인터페이스 |
| 인증 계약 | [`AuthApi`](../../dashboard-app/src/api/types/auth.ts) 인터페이스 |
| 구현체 | [`mock.ts`](../../dashboard-app/src/api/mock.ts) — mock 구현 진입점. 인증 mock은 [`api/mock/authApi.ts`](../../dashboard-app/src/api/mock/authApi.ts), 후보군 seed와 계약 stub은 [`api/mock/candidateSeeds.ts`](../../dashboard-app/src/api/mock/candidateSeeds.ts)와 [`api/mock/dashboardApi.ts`](../../dashboard-app/src/api/mock/dashboardApi.ts)가 소유 |
| 진입점 | [`client.ts`](../../dashboard-app/src/api/client.ts) `dashboardApi`, 개별 `getXxx` 함수 |
| 타입 | [`api/types/*`](../../dashboard-app/src/api/types/) — 인증 계약은 [`auth.ts`](../../dashboard-app/src/api/types/auth.ts), 후보군 계약은 [`candidate.ts`](../../dashboard-app/src/api/types/candidate.ts), 저장 스냅샷 계약은 [`snapshot.ts`](../../dashboard-app/src/api/types/snapshot.ts), 2차 드로워 계약은 [`secondary.ts`](../../dashboard-app/src/api/types/secondary.ts) |

HTTP 백엔드로 교체 시 `AuthApi` / `DashboardApi` 계약과 `client.ts`만 갈아끼우고, mock 전용 record 구조는 `api/mock/*` 밖으로 새지 않게 유지합니다. REST 스펙은 [backend-api-spec.md](../backend-api/backend-api-spec.md) 참고.

---

## 8. 소스 트리 요약

```
dashboard-app/src/
  App.tsx                 # 라우터
  admin/                  # 관리자 유저 관리 화면
  api/                    # client, mock, types
  auth/                   # 로그인 화면, 세션 provider, 보호 라우트
  components/             # ApiUnitErrorBadge, ComponentErrorBoundary
  dashboard/
    DashboardLayout.tsx
    components/           # FilterBar, ProductDrawer, AnalysisList, feature components
      candidate-stash/    # 후보군 상세/추천/배지 UI와 후보군 상세 훅
      product-drawer/     # 상품 drawer shell, primary/secondary 드로워
    hooks/                # useProductDrawerBundle, usePeriodRangeFilter
    pages/                # Self, Competitor, SnapshotConfirm route pages
  snapshot/               # 오더 스냅샷 타입/파서
  utils/                  # format, date, forecastMonthsStorage, adjacentListNavigation, xlsxWorkbook
  types.ts
```

상품 drawer 전용 UI·요청·계산은 [`product-drawer/`](../../dashboard-app/src/dashboard/components/product-drawer/) 아래에서 `primary`와 `secondary`로 나뉩니다.

---

## 9. 알려진 제약·메모

- **목록 정렬:** 방향키 네비 순서는 부모가 넘기는 `rows` / `tableRows` 배열 순입니다. 테이블에서 열 정렬을 바꾼 뒤에도 API 순서와 다를 수 있습니다.
- **README.md:** 패키지 루트 [`README.md`](../../dashboard-app/README.md)는 Vite 템플릿 문서가 남아 있어 제품 설명으로 쓰이지 않습니다. 제품 설명은 본 문서를 기준으로 합니다.

---

## 10. 목적 확인 요청 (선택)

조직에서의 **공식 제품명·타깃 사용자·배포 형태(내부 전용 여부)**를 알려 주시면 §2를 그에 맞게 고칠 수 있습니다. 지금은 코드 근거 추정만 기술했습니다.
