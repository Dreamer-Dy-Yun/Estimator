# 상품 상세 분석(모달) 구현 요구사항

이 문서는 스크린샷 기준의 **상품 상세 분석** 화면을 구현하기 위한 요구사항을 정리한다.  
해당 화면은 자사/경쟁사/오더 시뮬레이션 리스트에서 상품 행 클릭 시 열리는 상세 모달(또는 독립 상세 페이지)로 사용한다.

## 1) 화면 목적

- 선택한 단일 상품의 판매/가격/재고/오더 의사결정 정보를 한 번에 제공한다.
- 자사와 경쟁사(예: 크림) 지표를 동일 구조로 비교한다.
- 오더 추천량, 기대 실적, 재고 추이, 사이즈별 판매비중까지 연결해 최종 발주 판단을 지원한다.

## 2) 레이아웃 구조(상단 → 하단)

## 2.1 헤더

- 제목: `상품 상세 분석`
- 우측 상단 상태 버튼: `발주대상` (상태 뱃지 형태)

## 2.2 1행: 좌측 이미지 + 우측 기본정보

- 좌측:
  - 상품 이미지 2장(자사/경쟁사 혹은 서로 다른 뷰)
  - 이미지 하단 산점도(영업이익율/판매액 기준)
- 우측:
  - 조회기간(시작일 ~ 종료일)
  - 기본정보 비교 테이블(자사 vs 크림)
    - 브랜드
    - 카테고리
    - 품번
    - 상품명
  - 성과 요약 비교 테이블(자사 vs 크림)
    - 평균 판매가
    - 판매량
    - 총 판매액
    - 평균 원가(또는 매입가)
    - 평균 매출이익(율/액)
    - 평균 수수료
    - 평균 영업이익

## 2.3 2행: 예측/재고/오더 KPI 블록

- 판매 예측:
  - 최근 일수, 시즌 가중치 입력
  - 현재 판매(일평균 판매량)
  - 예측 판매량(현재~오더입고, 오더입고 후)
- 재고 현황:
  - 가용재고, 현재고, 입고예정
  - 안전재고, 재고 가용일수, 안전재고 도달일수
- 오더 일정:
  - 오더 입고 예정일, 차후 오더 입고 예정일, D-day
- 오더:
  - 추천 오더량
  - 오더량 변경(수동 입력)
  - 오더액
- 기대 실적:
  - 판매액
  - 영업이익액

## 2.4 3행: 기간별 추이 차트

- 제목: `기간별 판매`
- 시리즈(예시):
  - 자사 실측
  - 경쟁사 실측
  - 예측(자사)
  - 예측(경쟁사) 또는 보조선
- 우측 범례에 `판매액/판매량` 라디오 또는 토글 옵션

## 2.5 4행: 입력/메모 영역

- 좌측: `프롬프트 입력창`
- 우측: `답변 창`
- 추후 AI 분석/코멘트 기능 연결을 고려한 확장 구역

## 2.6 5행: 재고 추이 차트

- 제목: `재고 현황`
- 톱니형(입고 시 상승, 판매 시 하락) 재고 라인 차트
- 안전재고 기준선 표시

## 2.7 6행: 사이즈별 판매량 + 오더 배분

- 제목: `사이즈별 판매량`
- 표 구조:
  - 헤더: 사이즈(235~280 등)
  - 행:
    - 자사 판매비중(%)
    - 경쟁사 판매비중(%)
    - 추천 오더량
    - 오더량 확정

## 3) 데이터 모델(프론트 기준)

```ts
type ProductDetailAnalysis = {
  id: string
  status: '발주대상' | '관찰대상' | '제외'
  period: { from: string; to: string }
  basic: {
    self: { brand: string; category: string; type: string; name: string }
    competitor: { brand: string; category: string; type: string; name: string }
  }
  summary: {
    self: {
      avgPrice: number
      qty: number
      amount: number
      avgCost: number
      grossMarginRate: number
      feeRate: number
      opMarginRate: number
    }
    competitor: {
      avgPrice: number
      qty: number
      amount: number
      avgCost?: number
      grossMarginRate?: number
      feeRate?: number
      opMarginRate?: number
    }
    ranking: {
      selfQtyRank?: string
      competitorQtyRank?: string
      selfAmountRank?: string
      competitorAmountRank?: string
    }
  }
  forecast: {
    recentDays: number
    recentWeight: number
    seasonWeight: number
    currentDailyQty: number
    predictedDailyQtyUntilInbound: number
    predictedDailyQtyAfterInbound: number
  }
  inventory: {
    availableStock: number
    currentStock: number
    inboundQty: number
    safetyStock: number
    stockCoverDays: number
    safetyReachDays: number
  }
  orderPlan: {
    inboundDate: string
    nextInboundDate: string
    dDayInbound: number
    dDayNextInbound: number
    recommendedOrderQty: number
    editableOrderQty: number
    orderCost: number
    targetPrice: number
    orderAmount: number
  }
  expected: {
    expectedSalesAmount: number
    expectedOpMarginAmount: number
  }
  trend: Array<{
    date: string
    selfActual: number
    competitorActual: number
    selfForecast?: number
    competitorForecast?: number
  }>
  stockTrend: Array<{ date: string; stock: number; safetyLine: number }>
  sizeMix: Array<{
    size: string
    selfRatio: number
    competitorRatio: number
    recommendedQty: number
    confirmedQty: number
  }>
  notes: {
    prompt: string
    answer: string
  }
}
```

## 4) API 가정(목 데이터)

### 4.1 상세 조회 API

- `GET /api/product/:id/detail-analysis`
- query:
  - `from`, `to`
  - `brand`, `category`
  - `recentDays`, `recentWeight`, `seasonWeight`

### 4.2 오더량 변경 API(선택)

- `PATCH /api/product/:id/order`
- body:
  - `editableOrderQty`

### 4.3 응답 특성

- 모달 오픈 시 1회 조회
- 오더량 변경 시 기대 실적 재계산 값 반환
- 차트 데이터는 시계열 배열 형태로 제공

## 5) 계산 로직(권장)

- `오더액 = editableOrderQty * orderCost`
- `기대 판매액 = editableOrderQty * targetPrice`
- `기대 영업이익액 = 기대 판매액 - 오더액 - 수수료/기타비용`
- `재고 가용일수 = availableStock / currentDailyQty`
- `안전재고 도달일수 = (availableStock - safetyStock) / currentDailyQty`

## 6) 인터랙션 요구사항

- 리스트 행 클릭 시 모달 오픈
- 모달 닫기(배경 클릭, 닫기 버튼, ESC) 지원
- 오더량 변경 입력 시 하단 KPI 즉시 재계산(프론트 계산 우선)
- 차트 범례 토글(판매액/판매량, 자사/경쟁사 시리즈 on/off)
- 입력창/답변창은 임시 텍스트 저장(세션 상태)

## 7) 스타일/UX 기준

- 섹션 헤더 바(진한 배경) 스타일 통일
- 수치 KPI는 강조 박스(옅은 배경 + 굵은 숫자)
- 표/차트 간 간격 및 정렬(8px 배수)
- 모달은 큰 폭(`min 1200px`) + 내부 스크롤
- 모든 숫자 포맷 통일:
  - 금액: 천단위 콤마
  - 비율: 소수점 1자리 + `%`
  - 수량: 천단위 콤마

## 8) 구현 순서(권장)

1. 모달 프레임(헤더/닫기/스크롤) 구축
2. 상단 이미지+기본정보+요약표 블록 구성
3. 예측/재고/오더/기대실적 KPI 블록 구성
4. 기간별 판매 차트 연결
5. 입력창/답변창 배치
6. 재고추이 차트 + 사이즈별 표 연결
7. 오더량 변경 재계산 로직 연결
8. 모달 오픈/닫기 이벤트와 리스트 페이지 연동

## 9) 완료 기준(Definition of Done)

- 스크린샷의 정보 구조(상단 요약, KPI, 다중 차트, 사이즈 표)가 구현됨
- 행 클릭 시 상세 모달 정상 오픈/닫기
- 오더량 변경 시 기대 실적 값 즉시 갱신
- 차트/표 데이터가 목 API에서 일관되게 로드됨
- 빌드/린트 오류 없음

