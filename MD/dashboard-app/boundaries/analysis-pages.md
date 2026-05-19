# Analysis Pages Boundary

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-19 |
| 최종 수정일 | 2026-05-19 |
| 상태 | 유지 문서 |
| 적용 범위 | 자사 분석, 경쟁사 분석, 분석 리스트, 산점도, 후보군 담기 |

## 책임 요약

자사/경쟁사 분석 탭은 후보군에 상품을 담는 입구다. 분석 리스트의 체크박스와 `선택한 물품을 후보군으로` 모달은 스냅샷 없이 `stashUuid + skuGroupKeys`만 API에 전달한다.

`row.id`는 화면 행 식별자이고, `skuGroupKey`는 `SKU.code + SKU.color_code` 상품 단위에 대응한다. AI 코멘트와 사이즈별 확정 오더량은 이너후보군 2차 드로워에서 저장하기 전까지 미확정이다.

## 페이지

| 파일 | 역할 |
|------|------|
| `dashboard/pages/SelfPage.tsx` | 자사 분석 페이지 조립. API 결과, 필터, KPI, 산점도, 리스트, 드로워 연결 |
| `dashboard/pages/CompetitorPage.tsx` | 경쟁사 분석 페이지 조립. 경쟁 채널 필터와 경쟁/자사 판매 비교 |

페이지는 feature controller 역할을 최소화하고, 필터/선택/키보드/요청 상태는 hook으로 분리한다.

## 필터와 조회

- 기간 입력은 draft 상태로 남고 `조회` 버튼을 눌러야 API 요청용 applied 기간으로 반영된다.
- 기간 값이 마지막 조회 기간과 같으면 조회 버튼은 비활성화한다.
- 브랜드, 카테고리, 품번, 색상, 상품명, 경쟁 채널 필터는 즉시 요청 조건에 반영한다.
- 산점도 cell 선택 시 기간 외 필터는 UI상 공란처럼 보이고, 리스트는 이미 받은 rows 안에서 cell 대상만 필터링한다.

대표 hook:

| 파일 | 역할 |
|------|------|
| `dashboard/hooks/useAnalysisSalesFilters.ts` | 기간 draft/applied, 필터 상태, filter meta 요청 |
| `dashboard/hooks/useDashboardRequest.ts` | 요청 생명주기와 stale 응답 차단 |
| `dashboard/hooks/useAnalysisVisibleSelection.ts` | 산점도 cell 선택, 현재 보이는 행, 후보군 담기 체크박스 상태 |
| `dashboard/hooks/useAnalysisRowKeyboardFocus.ts` | 리스트 상/하 포커스와 좌/우 드로워 키보드 조작 연결 |
| `dashboard/hooks/useAnalysisScatterGridView.ts` | 백엔드 scatter-grid 응답을 chart point view-model로 변환 |

## 리스트와 순위

| 파일 | 역할 |
|------|------|
| `SelfAnalysisList.tsx` | 자사 분석 목록 column 정의와 row 렌더 |
| `CompetitorAnalysisList.tsx` | 경쟁사 분석 목록 column 정의와 row 렌더 |
| `AnalysisListRequestFrame.tsx` | 분석 목록 최초 로딩/갱신 중 스피너 표시. 갱신 중에는 기존 rows를 비우지 않는다 |
| `PaginatedTable.tsx` | 정렬 가능한 table shell, 현재 정렬 row id 전달 |
| `utils/displayRank.ts` | 현재 화면 rows 기준 표시 순위 계산. 하드닝 완료 |

순위는 화면 행 번호나 seed rank가 아니라 현재 렌더링 대상 rows의 판매량 기준 표시 순위다. 자사는 `qty`, 경쟁사는 `competitorQty` 기준이며 판매량이 가장 많은 항목이 1위다.

목록 첫 요청에는 리스트 영역 전체 스피너를 표시한다. 한 번 rows가 표시된 뒤 필터/기간/경쟁 채널 변경으로 재조회가 들어가면 기존 리스트는 유지하고 중앙 오버레이 스피너만 표시한다.

## 산점도

- 산점도 격자화는 운영 백엔드가 소유한다.
- 프론트는 `cells`와 `meta` 응답을 표시용 point, 색상, 반지름으로 변환한다.
- `utils/scatterGridDisplay.ts`는 표시 색상/반지름 변환만 맡고 binning을 재계산하지 않는다. 하드닝 완료 모듈이다.
- 산점도 점 클릭은 백엔드 재호출 없이 현재 rows 안에서 해당 cell 목록을 보여준다.

## 드로워 연결

- 자사/경쟁사 분석 탭에서는 `ProductDrawer.secondaryEnabled={false}`로 2차 드로워를 열지 않는다.
- 2차 드로워 코드는 유지하되, 반원 버튼과 키보드 2차 진입은 이너후보군에서만 허용한다.
- 드로워가 열리지 않아도 상/하 방향키로 리스트 포커스가 이동한다. 좌 키는 포커스된 row의 1차 드로워를 연다. 오른쪽 방향키 닫기는 1차 드로워가 열린 뒤 `ProductDrawer`가 처리한다.

## 후보군 담기

`AnalysisCandidateBulkAddModal.tsx`가 분석 리스트에서 선택한 상품을 기존 후보군에 넣거나 새 후보군을 만든 뒤 넣는 흐름을 소유한다. 스냅샷은 만들지 않고 `appendCandidateItems`만 호출한다.
