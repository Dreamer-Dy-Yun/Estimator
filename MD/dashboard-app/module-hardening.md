# dashboard-app 모듈 하드닝 레지스트리

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-14 |
| 최종 수정일 | 2026-05-21 |
| 상태 | 유지 문서 |
| 적용 범위 | `dashboard-app/src` 모듈 하드닝 기준과 완료 목록 |

## 목적

이 문서는 사용자가 정의한 모듈 하드닝 기준을 `dashboard-app`에서 실제로 적용한 파일 목록과 계약으로 남긴다. 하드닝 완료 파일은 일반 정리나 리팩터링 대상이 아니며, 해당 파일을 수정해야 할 때는 권한 상태와 무관하게 사용자에게 명시적으로 수정 허가를 받아야 한다.

## 하드닝 정의

2026-05-14 사용자 지시 기준:

모듈 하드닝은 파일 또는 모듈을 재사용 가능한 안정 단위로 만드는 작업이다. 각 파일의 책임, 공개 함수/클래스, 매개변수, 반환값, 부작용, 변경 가능 범위를 명확히 하고, 예상 가능한 변화는 내부 일반화로 흡수한다. 하드닝 완료 모듈은 개발자나 LLM이 내부 구현을 직접 파악하거나 수정하지 않고도 문서화된 계약만 보고 참조·확장할 수 있어야 한다.

## 운영 규칙

- `상태 = 하드닝 완료`인 소스 파일은 명시적 사용자 허가 없이 수정하지 않는다.
- 새 호출부가 하드닝 모듈을 import해 사용하는 것은 허용된다. 단, 아래 공개 계약과 전제 조건을 벗어나면 먼저 계약 변경 허가를 받아야 한다.
- 테스트나 문서 보강은 가능하지만, 하드닝 계약을 약화하거나 동작 기대값을 바꾸는 변경은 소스 수정과 동일하게 사용자 허가 대상이다.
- 하드닝 대상은 무리하게 넓히지 않는다. 최근 UI 조정이 잦거나 백엔드 계약이 아직 흔들리는 파일은 후보로만 둔다.
- 실패 UX 정책은 [failure-ux-matrix.md](./failure-ux-matrix.md)를 따른다. 실패 surface를 바꾸기 위해 하드닝 완료 소스 파일을 수정해야 하면 먼저 사용자에게 명시적 수정 허가를 받아야 한다.

## 실패 UX와 하드닝 경계

- `ApiClientError.kind` 기반 실패 분류는 API 계층 계약이지만, 현재 `dashboard-app/src/api/requests/*`는 백엔드 엔드포인트 전환 중이라 하드닝 완료로 등록하지 않는다.
- row/cell 실패는 실패 배지와 툴팁을 기본 surface로 문서화한다. 이 정책을 구현하기 위해 하드닝 완료 utility의 숫자/문자열 fallback 계약을 바꾸면 안 된다.
- 목록, 권한, mutation, SSE 실패는 기존 화면 surface를 사용한다. 실패 표시만을 위한 신규 카드 추가나 레이아웃 밀림은 하드닝 방향이 아니다.
- 하드닝 완료 모듈은 실패를 성공/빈 값으로 바꾸는 fallback을 제공하지 않는다. 필요하면 호출부의 error state, toast, row/cell 실패 상태로 드러낸다.
- stale UX는 사용자에게 보이는 기존 데이터 유지와 실패 표시 정책이고, async stale guard는 늦은 응답을 무시하는 내부 방어다. 하드닝 문서에서 두 개념을 같은 책임으로 묶지 않는다.

## 1차 하드닝 기준

- React, DOM, API 요청, 브라우저 저장소에 의존하지 않는 순수 leaf 모듈.
- 파일 책임이 한 문장으로 설명되고 공개 API 수가 작을 것.
- 기존 또는 신규 단위 테스트로 공개 계약을 확인할 수 있을 것.
- 앞으로도 화면 정책 변화보다 공통 계약으로 유지될 가능성이 높을 것.

## 하드닝 완료 모듈

| 파일 | 공개 계약 | 매개변수·반환값 | 부작용 | 변경 가능 범위 | 계약 테스트 |
|------|-----------|----------------|--------|----------------|-------------|
| `dashboard-app/src/utils/hashRank.ts` | `hashRank(seed, mod)`는 문자열 seed에서 안정적인 표시용 순위를 만든다. | `seed`: 안정 식별 문자열, `mod`: 양의 정수 상한. 반환값은 항상 `1..mod` 정수. | 없음 | 해시 알고리즘이나 범위 정책은 목업/표시 순위 기대값을 전체 이관할 때만 변경. | `hashRank.test.ts` |
| `dashboard-app/src/utils/uniqueSortedStrings.ts` | 문자열 옵션을 trim, 빈 값 제거, 중복 제거, 공통 정렬 순서로 변환한다. | `Iterable<string>` 입력을 한 번 읽고 `string[]` 반환. 입력 컬렉션은 변경하지 않음. | 없음 | 옵션 정렬 기준이 전역으로 바뀌는 경우에만 변경. | `uniqueSortedStrings.test.ts`, `sort.test.ts` |
| `dashboard-app/src/utils/analysisKpiWeighted.ts` | 자사 분석 KPI의 매출액 가중 평균 비율을 계산한다. | 이미 필터링된 `SelfSalesRow[]` 입력. 총 매출액이 0이면 `0`, 아니면 매출액 가중 평균 rate 반환. | 없음 | KPI 산정 방식이 매출액 가중 평균에서 바뀌는 경우에만 변경. | `analysisKpiWeighted.test.ts` |
| `dashboard-app/src/utils/sort.ts` | nullable 원시값 비교와 정렬 상태 순환을 제공한다. | `compareSortValues(a, b)`: 비교 숫자 반환. `nextSortState(current, key)`: `asc -> desc -> null` 순환. | 없음 | 누락값 정렬 위치, 한국어 locale, 정렬 순환 UX가 전역으로 바뀌는 경우에만 변경. | `sort.test.ts` |
| `dashboard-app/src/utils/adjacentListNavigation.ts` | 현재 보이는 id 순서 안에서 이전/다음 id를 구한다. | `order`, `currentId`, `direction` 입력. 빈 목록 또는 현재 id 없음은 `null`, 양끝은 wrap. | 없음 | 키보드/드로워 이동의 wrap 정책이 바뀌는 경우에만 변경. | `adjacentListNavigation.test.ts` |
| `dashboard-app/src/utils/format.ts` | 계산이 끝난 숫자 값을 한국어 UI 표시 문자열로 변환한다. | nullable number helper는 결측을 `-`로 표시하고, 비율/수량 helper는 정해진 소수 자리와 단위를 붙인다. | 없음 | 전체 UI 숫자 표기 정책이나 결측 표기 정책이 바뀌는 경우에만 변경. | `format.test.ts` |
| `dashboard-app/src/utils/displayRank.ts` | 현재 렌더링 대상 rows 안에서 값 기준 표시 순위 map을 만든다. 동률은 같은 competition rank를 공유하고, 동률 내부는 입력 순서를 보존한다. | `rows`, `rowIdOf`, `rankValueOf`, `direction` 입력. 반환값은 `row id -> 표시 순위` `Map`. 입력 rows는 변경하지 않는다. | 없음 | 자사/경쟁사 분석의 순위 정의가 판매량 기반 competition rank에서 바뀌거나, 누락값 정렬 정책이 전역으로 바뀌는 경우에만 변경. | `displayRank.test.ts` |
| `dashboard-app/src/utils/scatterGridDisplay.ts` | 백엔드가 계산한 scatter-grid cell의 `count/meta`를 UI 표시 색상과 점 반지름으로 변환한다. 격자 binning 자체는 소유하지 않는다. | `getScatterGridCellColor(count, maxCount)`는 낮은 밀도일수록 밝고 높은 밀도일수록 어두운 같은 blue hue HSL 문자열을 반환한다. `getScatterGridCellPointRadius(meta, chartWidth, chartHeight)`는 bucket pixel size 기반 반지름을 `2.5..9` 범위로 반환한다. | 없음 | 산점도 색상 계열, 명도 범위, 반지름 비율/범위 또는 백엔드 scatter-grid meta 계약이 바뀌는 경우에만 변경. | `scatterGridDisplay.test.ts` |

## 하드닝 후보이나 보류한 모듈

| 파일 | 보류 사유 |
|------|-----------|
| `dashboard-app/src/utils/candidateOrderExcelData.ts`, `dashboard-app/src/utils/candidateOrderExcelWorkbook.ts`, `dashboard-app/src/utils/candidateOrderExcelExport.ts` | 엑셀 컬럼·스타일·템플릿 정책이 계속 조정 중이므로 출력 계약이 고정된 뒤 하드닝한다. |
| `dashboard-app/src/api/requests/*` | 실제 백엔드 엔드포인트가 아직 없어서 mock 위임과 HTTP 전환 계약이 확정되지 않았다. |
| `dashboard-app/src/dashboard/components/product-drawer/*` | 드로워 UX와 1차/2차 노출 정책이 아직 제품 흐름과 함께 조정 중이다. |
| `dashboard-app/src/dashboard/components/candidate-stash/*` | 이너후보군 실시간 계산, 추천/배지, 상세확정 흐름이 아직 큰 단위로 변하고 있다. hook별 현재 상태 책임과 수정 경계는 아래 표로만 고정하고, 하드닝 완료로 승격하지 않는다. |

## candidate-stash hook별 상태 책임과 수정 경계

| hook | 현재 상태 책임 | async stale guard 경계 | 수정 경계 |
|------|----------------|------------------------|-----------|
| `useCandidateItemsLoader.ts` | 기본 후보 item 조회의 `candidateItemsLoading`, `candidateItemsLoadError`, `setItems` 반영, 상세확정 override 보호, 오더 지표 SSE 구독 트리거를 맡는다. 추천 state는 재조회 시 clear만 요청한다. | `beginItemLoad`와 `isCurrentItemLoad`로 받은 seq가 최신일 때만 결과, 오류, 오더 지표 구독을 반영한다. 늦은 이전 조회 응답은 실패 UX가 아니라 무시 대상이다. | 기본 리스트 조회, 기존 item 유지, 상세확정 override 병합, 오더 지표 구독 시작 조건을 바꿀 때만 수정한다. 추천 pagination, 추천 추가 mutation, SSE progress 팝업 책임을 합치지 않는다. |
| `useCandidateRecommendations.ts` | 추천 목록, 추천 로딩/오류, 기간별 추천 cache ref, 추천 배지 병합, 추천 후보 추가 mutation 후 추천 목록 제거와 toast를 맡는다. | `requestSeqRef`와 `mountedRef`로 이전 추천 조회와 unmount 이후 응답을 무시한다. 실패 시 기존 추천 ref를 반환하고 item 배지는 실패 상태로 표시한다. | 추천 조회/배지 실패, 추천 modal 목록, `appendCandidateItems` 성공 반영을 바꿀 때만 수정한다. 기본 후보 item 조회 실패나 오더 지표 SSE 실패 책임을 가져오지 않는다. |
| `useCandidateBulkDetailConfirm.ts` | 상세 일괄확정 시작, SSE subscription, `bulkConfirmBusy`, `bulkConfirmProgress`, progress popup close timer, 완료/실패 toast를 맡는다. | 현재 hook의 내부 guard는 `mountedRef` 중심이다. 기간 변경이나 다른 item load seq와의 충돌 방어는 caller 계약과 함께 다뤄야 하며, 문서만으로 새 seq 책임을 이 hook에 부여하지 않는다. | 일괄확정 progress UX, subscription 종료, `updatedItem` 반영 callback 호출 경계를 바꿀 때만 수정한다. 스냅샷 저장/해제 계산, 기본 리스트 재조회, 추천 state 책임을 합치지 않는다. |

## 다음 하드닝 후보

| 파일 | 후보 이유 | 선행 조건 |
|------|-----------|-----------|
| `dashboard-app/src/dashboard/drawer/drawerDom.ts` | 드로워 바깥 클릭/상호작용 target 판정의 DOM 계약이 작고 재사용성이 높다. | 버튼/입력/커스텀 keep-open 정책이 더 바뀌지 않는지 한 번 더 확인한다. |
| `dashboard-app/src/dashboard/interaction/interactionTarget.ts` | 키보드/마우스 이벤트에서 입력계 조작을 제외하는 공통 판정이다. | table, drawer, modal이 같은 제외 정책을 공유하는지 테스트로 고정한다. |
| `dashboard-app/src/api/requests/dashboardMasterDataCache.ts` | 페이지와 공통 드로워의 master data 중복 요청 coalescing 경계가 작다. | 캐시 대상이 master data로만 제한되는지, mutation 후 무효화 대상이 아닌지 백엔드 계약 문서와 맞춘다. |
| `dashboard-app/src/dashboard/components/candidate-stash/candidateItemLocalMutationModel.ts` | 삭제 성공 후 로컬 row 제거만 맡는 순수 모델이다. | 상세확정/일괄확정/추천 병합 흐름이 더 흔들리지 않는지 확인한 뒤 candidate-stash broad 보류에서 분리한다. |

## 새 하드닝 절차

1. 후보 파일이 단일 책임인지 먼저 확인한다. 책임이 둘 이상이면 하드닝 전에 파일을 분리한다.
2. 공개 함수/클래스, 매개변수, 반환값, 부작용, 변경 가능 범위를 문서화한다.
3. 계약을 확인하는 테스트를 추가하거나 기존 테스트를 보강한다.
4. `module-hardening.md`에 `하드닝 완료`로 등록한다.
5. 이후 해당 파일을 수정해야 하면 먼저 사용자에게 “하드닝 완료 파일 수정 허가”를 명시적으로 요청한다.
