export type SalesRow = {
  id: string
  rank: number
  percentile: number
  brand: string
  category: string
  type: string
  name: string
  avgPrice: number
  qty: number
  amount: number
  avgCost: number
  marginRate: number
  feeRate: number
  opMarginRate: number
  opMarginAmount: number
}

export type CompetitorRow = {
  id: string
  rank: number
  percentile: number
  brand: string
  category: string
  type: string
  name: string
  competitorAvgPrice: number
  competitorQty: number
  competitorAmount: number
  selfAvgPrice: number | null
  selfQty: number | null
  selfAmount: number | null
}

export type OrderRow = {
  id: string
  rank: number
  percentile: number
  brand: string
  category: string
  type: string
  name: string
  dailyQty: number
  predictedDailyQtyUntilInbound: number
  predictedDailyQtyAfterInbound: number
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

export type ProductDetail = {
  id: string
  name: string
  brand: string
  category: string
  type: string
  selfPrice: number
  competitorPrice: number
  selfQty: number
  competitorQty: number
  /** 가용 재고(판매 가능 수량) */
  availableStock: number
  recommendedOrderQty: number
  salesTrend: Array<{ date: string; sales: number; isForecast: boolean }>
  /**
   * 연간 계절성 비율 (Estimator `_seasonal_rates` 등과 동일 계열)
   * month: 1~12, ratio: 해당 월 비중. 합은 1, 일부 월은 0일 수 있음.
   */
  seasonality: Array<{ month: number; ratio: number }>
  /**
   * 사이즈별 믹스·오더 및 KPI 원천.
   * `selfAvgPrice` / `selfQty` / `availableStock`는 API가 내려주는 사이즈 단위 값(목은 합계에 맞춰 생성).
   */
  sizeMix: Array<{
    size: string
    selfRatio: number
    competitorRatio: number
    confirmedQty: number
    /** 사이즈별 자사 평균 판매가 */
    selfAvgPrice: number
    /** 사이즈별 기간 판매 수량 */
    selfQty: number
    /** 사이즈별 가용 재고 */
    availableStock: number
  }>
}
