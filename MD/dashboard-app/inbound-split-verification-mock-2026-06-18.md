# 분할입고 검증용 목데이터

Current rule note: this historical mock note is superseded where it says the ignore-existing-order-inbound option excludes the whole split window or that split-count-only changes must never change totals. Current behavior uses `[round n-1 inbound date, round n inbound date)` for existing-order inbound, round 1 is not affected by the toggle, and small integer-rounding total differences can occur.

## Goal

분할입고 설정 화면에서 기간별 판매 예상량, 사이즈별 판매비중, 시작 재고, 기존 주문 입고예정량, UI 여유재고 목표 반영을 한 품목으로 확인할 수 있게 한다.

## Scope

- 대상 SKU: `TEST-SHOE__210`
- 화면 표시명: `예상입고/기존재고 분할설정 적용 테스트`
- 관련 mock 원천:
  - `dashboard-app/src/api/mock/salesTables.ts`
  - `dashboard-app/src/api/mock/productCatalog.ts`
  - `dashboard-app/src/api/mock/secondaryStockOrderCalcApi.ts`
  - `dashboard-app/src/api/mock/secondaryStockOrderCalcApi.ts`
  - `dashboard-app/src/api/mock/secondaryStockOrderCalcApi.ts generated inboundSplitSource`

## Data profile

사이즈는 `230`, `240`, `250`, `260` 네 개로 고정했다.

현재재고는 계산 기준일 point로 들어간다.

| size | current stock |
|---|---:|
| 230 | 87 |
| 240 | 29 |
| 250 | 0 |
| 260 | 11 |

기오더 입고예정 재고는 사이즈/날짜별로 들어간다.

| date | 230 | 240 | 250 | 260 | note |
|---|---:|---:|---:|---:|---|
| 2027-01-15 | 0 | 43 | 0 | 17 | 1차/2차/3차 모두 첫 구간 중간 |
| 2027-02-18 | 31 | 0 | 23 | 0 | 3분할 2차 시작 경계 |
| 2027-03-18 | 0 | 37 | 0 | 0 | 2분할 2차 시작 경계 |
| 2027-04-15 | 0 | 0 | 79 | 0 | 3분할 2차 종료 직전 |
| 2027-05-10 | 19 | 0 | 0 | 41 | 마지막 구간 중간 |

판매 예상량은 구간별로 달라진다. 값은 일 단위 예상 판매량이다.

| period | days | 230 | 240 | 250 | 260 | note |
|---|---:|---:|---:|---:|---:|---|
| 2026-12-18 <= date < 2027-01-15 | 28 | 0.72 | 1.28 | 1.95 | 0.88 | 초반 낮은 수요 |
| 2027-01-15 <= date < 2027-02-18 | 34 | 1.05 | 1.72 | 2.35 | 1.26 | 첫 입고예정 이후 수요 증가 |
| 2027-02-18 <= date < 2027-03-18 | 28 | 1.38 | 2.18 | 3.10 | 0.96 | 3분할 2차 시작 경계 |
| 2027-03-18 <= date < 2027-04-15 | 28 | 0.84 | 1.36 | 2.05 | 1.74 | 2분할 2차 시작 경계 |
| 2027-04-15 <= date < 2027-05-10 | 25 | 1.62 | 2.45 | 3.55 | 1.22 | 250 입고 직후 수요 집중 |
| 2027-05-10 <= date < 2027-06-18 | 39 | 1.14 | 1.88 | 2.70 | 2.08 | 후반 260 수요 확대 |

## Check points

- 1차만 둘 때는 오더 상세 추천 총량과 같은 planning 함수 결과가 제안량이 된다.
- 2차로 나누면 기본 날짜는 `2026-12-18`, `2027-03-18`이 되며 `2027-03-18`의 입고예정은 2차에 들어가야 한다.
- 3차로 나누면 기본 날짜는 `2026-12-18`, `2027-02-18`, `2027-04-18`이 되며 `2027-02-18`의 입고예정은 2차에 들어가야 한다.
- `기오더 입고전 미입고량 제외` 옵션을 켜면 n차에 반영되는 `[n-1차 입고일, n차 입고일)` 기존 주문 입고예정량을 반영하지 않는다. 1차는 이전 차수 구간이 없으므로 옵션 여부와 무관하게 동일하게 계산된다. 2차 이상은 구간별 재고 이월과 정수화 때문에 총합이 소폭 달라질 수 있으나, 차수 수 변경만으로 큰 차이가 나면 계산 오류로 본다.
- `240`, `250`, `260`은 옵션 ON/OFF에 따른 제안량 차이가 크게 보이도록 입고예정량을 크게 배치했다.
- 모든 값은 일부러 비균일하게 두었다. 균일 일판매 또는 둥근 입고량으로 인해 기간 경계, 반올림, 총량 고정 오류가 숨는 것을 피하기 위함이다.

## Expected suggested quantities

아래 값은 기본 날짜 `2026-12-18 <= date < 2027-06-18`, 기오더 입고예정 반영 기준의 기대값이다.

| split | round/date range | 230 | 240 | 250 | 260 | total |
|---|---|---:|---:|---:|---:|---:|
| 1분할 | 2026-12-18 <= date < 2027-06-18 | 66 | 220 | 371 | 186 | 843 |
| 2분할 | 2026-12-18 <= date < 2027-03-18 | 0 | 84 | 199 | 67 | 350 |
| 2분할 | 2027-03-18 <= date < 2027-06-18 | 66 | 136 | 172 | 119 | 493 |
| 3분할 | 2026-12-18 <= date < 2027-02-18 | 0 | 23 | 135 | 40 | 198 |
| 3분할 | 2027-02-18 <= date < 2027-04-18 | 5 | 69 | 121 | 79 | 274 |
| 3분할 | 2027-04-18 <= date < 2027-06-18 | 61 | 128 | 115 | 67 | 371 |

## Non-goals

- 실데이터 유사성은 목표가 아니다.
- 백엔드 계약 변경은 없다. 기존 mock/API 계약 안에서 검증용 값을 조정했다.
