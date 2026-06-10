# Analysis Pages Boundary

Last updated: 2026-06-10

## Scope

Self/Competitor 분석 페이지는 다음 책임을 갖는다.

- 분석 조건(기간, 회사, 채널) 요청
- 결과 리스트/산점도 조회 상태 제어(로딩/에러 포함)
- 분석 리스트 컬럼은 체크박스, 판매 순위, 이미지, 상품 식별자, 지표 컬럼을 분리한다.
- 분석 리스트 썸네일은 row summary의 `thumbnailUrl: string | null`을 `ProductThumbnailCell`로 표시한다.
- 산점도 grid는 현재 필터링된 리스트 row에서 프론트가 계산하고, 산점도 축/tooltip의 수량 값은 `formatGroupedNumber`로 천 단위 쉼표를 표시한다.
- 인-메모리 필터링(브랜드/카테고리/상품군/색상 등)
- 행 선택과 drawer 진입 액션
- bulk add 모달 진입 및 전달 데이터 구성

컴포넌트는 API 경계를 직접 임포트하지 않고, 대시보드 API 훅/모델 경계를 통해 동작한다.

## Source ownership

| 소스 | 책임 |
|---|---|
| `src/dashboard/pages/SelfPage.tsx` | Self 분석 페이지 오케스트레이션, self API 요청 연결 |
| `src/dashboard/pages/CompetitorPage.tsx` | Competitor 페이지 오케스트레이션, competitor 채널 요청 조건 처리 |
| `src/dashboard/components/AnalysisPageLayout.tsx` | 공통 프레임(쿼리 카드, 필터 카드, 목록/산점도/액션 슬롯) |
| `src/dashboard/components/AnalysisListRequestFrame.tsx` | 초기 리스트 로딩/상태 표기 |
| `src/dashboard/components/AnalysisPeriodTools.tsx` | 기간 프리셋, 기간 바 컨트롤 |
| `src/dashboard/components/FilterBar.tsx` | 공용 필터 렌더러 |
| `src/dashboard/components/FilterListCombo.tsx` | 텍스트 필터 + 옵션 제안 |
| `src/dashboard/model/analysisFacetFilter.ts` | 행 단위 facet 계산 및 필터 적용 |
| `src/dashboard/hooks/useAnalysisSalesFilters.ts` | draft/apply 분리, 리스트 필터 상태 |
| `src/dashboard/hooks/useAnalysisSalesDataGate.ts` | 리스트/산점도 요청 상태 게이팅 |
| `src/dashboard/hooks/useAnalysisPageSelection.ts` | 행 선택/배치선택/스캐터 연동 상태 |

## Query / Filter boundary

- 조회 조건은 쿼리 카드에서 관리한다(조회 버튼 클릭 전에는 API 재요청을 발생시키지 않음).
- 기간 바의 드래그 상태는 UI 상태(draft)로 분리하고, 조회 실행 시 applied 상태로 반영한다.
- competitor 채널은 API 요청 조건이며 리스트 필터 조건으로 오인되지 않는다.
- 리스트 facet는 이미 가져온 데이터에만 적용한다.
- `전체(공통)`은 내부 행 정렬 시 “필터 미적용”을 의미한다.
- `전체(공통)` 선택 상태에서 텍스트를 입력하면 기존 라벨은 입력 텍스트로 바뀐다.
- 검색 결과가 없을 때는 no-match 메시지를 명시적으로 보여준다.
- 필터 변경만으로 API 호출을 다시 하지 않는다(로딩 오버레이로 차단 X).

## Loading / Refresh behavior

- 페이지 진입 최초 로딩은 리스트 영역 중심의 로딩 상태를 허용한다.
- 기간/회사/채널 변경은 API 재요청 후 현재 리스트를 유지하며 내부 상태를 갱신한다.
- 리스트 필터 조작은 API 재요청을 유발하지 않으며 입력/클릭/키보드 조작을 막지 않는다.

## Company scope rule

- 헤더 회사 선택은 분석 API `companyUuid`를 통해 scope를 전달한다.
- 전체(=all) 선택 시 읽기 계열 API는 `companyUuid`를 생략한다.
- 후보군 bulk add는 단일 회사 context에서만 동작한다.

## Candidate bulk-add boundary

- `AnalysisCandidateBulkAddModal.tsx`는 분석에서 선택한 항목을 후보군 stash에 추가하는 진입점이다.
- 전달 값: `stashUuid + skuGroupKeys + companyUuid`
- 후보군 상세 정보 스냅샷을 새로 생성하지 않으며, 후보군 API 경계 밖에서 파일을 임의 변경하지 않는다.

## Non-goals

- 분석 페이지는 후보군 세부 확정 로직을 소유하지 않는다.
- 분석 페이지는 secondary order 계산/AI comment의 결과 계산 책임을 소유하지 않는다.
- 분석 페이지는 `snapshot` 저장 포맷 변환 책임을 갖지 않는다.
