# dashboard-app 모듈 하드닝 레지스트리

| 항목 | 내용 |
|------|------|
| 작성 지시 | Yun Daeyoung |
| 작성자 | Codex |
| 작성일 | 2026-05-14 |
| 최종 수정일 | 2026-05-14 |
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

## 하드닝 후보이나 보류한 모듈

| 파일 | 보류 사유 |
|------|-----------|
| `dashboard-app/src/utils/scatterGridDisplay.ts` | 산점도 색상·점 크기·백엔드 격자 계약이 최근 변경 중이라 아직 안정 계약으로 묶지 않는다. |
| `dashboard-app/src/utils/candidateOrderExcelExport.ts` | 엑셀 컬럼·스타일·템플릿 정책이 계속 조정 중이므로 출력 계약이 고정된 뒤 하드닝한다. |
| `dashboard-app/src/api/requests/*` | 실제 백엔드 엔드포인트가 아직 없어서 mock 위임과 HTTP 전환 계약이 확정되지 않았다. |
| `dashboard-app/src/dashboard/components/product-drawer/*` | 드로워 UX와 1차/2차 노출 정책이 아직 제품 흐름과 함께 조정 중이다. |
| `dashboard-app/src/dashboard/components/candidate-stash/*` | 이너후보군 실시간 계산, 스냅샷 보기, 상세확정 흐름이 아직 큰 단위로 변하고 있다. |

## 새 하드닝 절차

1. 후보 파일이 단일 책임인지 먼저 확인한다. 책임이 둘 이상이면 하드닝 전에 파일을 분리한다.
2. 공개 함수/클래스, 매개변수, 반환값, 부작용, 변경 가능 범위를 문서화한다.
3. 계약을 확인하는 테스트를 추가하거나 기존 테스트를 보강한다.
4. `module-hardening.md`에 `하드닝 완료`로 등록한다.
5. 이후 해당 파일을 수정해야 하면 먼저 사용자에게 “하드닝 완료 파일 수정 허가”를 명시적으로 요청한다.
