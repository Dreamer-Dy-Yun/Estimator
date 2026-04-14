# 오더 시뮬레이션 페이지 구현 요구사항

이 문서는 스크린샷 기준의 **오더 시뮬레이션** 페이지를 구현하기 위한 요구사항을 정리한다.  
목적은 판매 현황/예측/재고/오더/기대실적을 한 화면에서 계산·비교할 수 있는 데모 구조를 명확히 하는 것이다.

## 1) 페이지 목적

- 상품별 판매 속도와 재고 상태를 바탕으로 추천 오더량을 산출한다.
- 오더 단가/목표 판매가를 반영해 오더액, 기대 판매액, 영업이익액을 확인한다.
- 향후 실 API 연동 시에도 동일한 UI/데이터 계약을 유지할 수 있게 설계한다.

## 2) 레이아웃 구조

### 2.1 상단 공통 영역

- 탭 3개:
  - `자사 분석`
  - `경쟁사 분석`
  - `오더 시뮬레이션`(현재 활성)
- 우측 상단 보조 정보:
  - 기준일(예: `2026-03-01`)
  - 기준 인덱스/코드(예: `523`)

### 2.2 타이틀/조건 영역

- 메인 타이틀: `오더 시뮬레이션`
- 조건 입력 행:
  - 판매기간 시작일 / 종료일
  - 최근 일수 가중치(%)
  - 시즌 가중치(%)
  - 오더 입고 예정일
  - 차후 오더 입고 예정일
  - D-day 정보(`D-184`, `D-365`)

### 2.3 본문 테이블

- 대형 테이블 1개로 구성
- 컬럼 그룹(구분/판매현황/판매예측/재고현황/오더/기대실적) 유지
- 행은 상품 단위

## 3) 컬럼 그룹 상세 정의

## 3.1 구분

- 선택
- 순위
- 백분위
- 브랜드
- 카테고리
- 품번
- 상품명

## 3.2 판매 현황

- 평균 판매가
- 평균 원가
- 평균 영업이익율
- 평균 수수료율
- 일평균 판매량

## 3.3 판매 예측

- 일평균 판매량(현재~오더입고)
- 일평균 판매량(오더입고 후)

## 3.4 재고 현황

- 가용재고
- 현재고
- 입고예정
- 안전재고
- 재고 가용일수
- 안전재고 도달일수

## 3.5 오더

- 추천 오더량
- 오더량 확정
- 오더 원가
- 목표 판매가
- 오더액

## 3.6 기대 실적

- 판매액
- 영업이익액

## 4) 계산/시뮬레이션 규칙(권장)

### 4.1 판매 예측

- 기본식:
  - `예측 일평균 판매량 = 최근 가중 평균 + 시즌성 보정`
- 현재~오더입고, 오더입고 후 구간을 분리 계산

### 4.2 재고 일수

- `재고 가용일수 = 가용재고 / 일평균 판매량(현재~오더입고)`
- `안전재고 도달일수 = (가용재고 - 안전재고) / 일평균 판매량`

### 4.3 추천 오더량

- 개념식:
  - `추천 오더량 = 목표 커버기간 수요 + 안전재고 보충 - (현재고 + 입고예정)`
- 음수면 0으로 보정

### 4.4 기대 실적

- `오더액 = 오더량 확정 * 오더 원가`
- `기대 판매액 = 오더량 확정 * 목표 판매가`
- `기대 영업이익액 = 기대 판매액 - 오더액 - 수수료/기타비용`

## 5) 데이터 모델(프론트 기준)

```ts
type OrderSimulationRow = {
  id: string
  selected: boolean
  rank: number
  percentile: number
  brand: string
  category: string
  type: string
  name: string
  avgPrice: number
  avgCost: number
  opMarginRate: number
  feeRate: number
  dailyQty: number
  dailyQtyUntilInbound: number
  dailyQtyAfterInbound: number
  availableStock: number
  currentStock: number
  inboundQty: number
  safetyStock: number
  stockCoverDays: number
  safetyReachDays: number
  recommendedOrderQty: number
  confirmedOrderQty: number
  orderCost: number
  targetPrice: number
  orderAmount: number
  expectedSales: number
  expectedOpMargin: number
}
```

## 6) API 가정(목 데이터)

### 6.1 시뮬레이션 리스트

- `GET /api/order-sim`
- query 예시:
  - `from`, `to`
  - `recentWeight`, `seasonWeight`
  - `inboundDate`, `nextInboundDate`
  - `brand`, `category`

응답 예시:

```json
{
  "items": [],
  "meta": {
    "baseDate": "2026-03-01",
    "code": 523
  }
}
```

### 6.2 행 상세

- `GET /api/product/:id/detail`
- 행 클릭 시 상세 모달 연동(공용 상세 API 재사용)

## 7) UI/스타일 규칙

- 컬럼 그룹 헤더(진한 배경)와 데이터 셀 대비 유지
- 중요 셀 강조:
  - 안전재고/추천오더량/오더량 확정/오더액
- 숫자 우측 정렬, 텍스트 좌측 정렬
- 테이블은 화면 하단까지 채우고 내부 스크롤
- 헤더 sticky 적용

## 8) 포맷 규칙

- 금액: 천단위 콤마 (`397,015,800`)
- 비율: 소수점 1자리 + `%`
- 수량/일수: 소수 1자리 또는 정수(지표별 고정)
- 날짜: `YYYY-MM-DD`

## 9) 구현 순서(권장)

1. 상단 탭/타이틀/조건 입력 레이아웃 구성
2. 대형 그룹 헤더 테이블 마크업 구성
3. 목 데이터 바인딩 및 숫자 포맷 적용
4. 계산 필드(추천오더량, 기대실적) 함수화
5. 행 클릭 상세 모달 연동
6. 스크롤/헤더 sticky/화면 높이 채움 검증
7. 조건 변경 시 재조회 + 재계산 연동

## 10) 완료 기준(Definition of Done)

- 스크린샷과 동일한 정보 그룹 구조 구현 완료
- 추천오더량/오더액/기대실적이 계산되어 표시
- 리스트가 화면 끝까지 차고 내부 스크롤 정상
- 행 클릭 시 상세 모달 오픈 정상
- API mock 호출 흐름 유지
- 빌드/린트 오류 없음

