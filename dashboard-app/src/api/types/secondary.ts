export interface SecondaryDailyTrendPoint {
  idx: number
  date: string
  month: string
  sales: number
  stockBar: number
  inboundAccumBar: number
  isForecast: boolean
}

export interface SecondaryDailyTrendParams {
  productId: string
  startMonth: string
  leadTimeDays: number
}

export interface SecondaryCompetitorChannel {
  id: string
  label: string
  priceSkew: number
  qtySkew: number
}

export interface SecondaryLlmAnswerParams {
  productId: string
  prompt: string
}

export interface SecondaryOrderSnapshotPayload {
  snapshotId: string
  productId: string
  savedAt: string
  periodStart: string
  periodEnd: string
  competitorChannelId: string
  minOpMarginPct: number
  salesSelf: unknown
  salesCompetitor: unknown
  stockInputs: unknown
  stockDerived: unknown
  llmPrompt: string
  llmAnswer: string
  selfWeightPct: number
  sizeRows: unknown[]
}

export interface SecondaryStockOrderCalcParams {
  productId: string
  periodStart: string
  periodEnd: string
  serviceLevelPct: number
  leadTimeDays: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  /** 미지정 시 백엔드(목)가 기간 트렌드로 산출 */
  dailyMean?: number
}

export interface SecondaryStockSafetyCalcBlock {
  safetyStock: number
  recommendedOrderQty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
}

export interface SecondaryStockForecastQtyCalcBlock {
  safetyStock: null
  recommendedOrderQty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
}

export interface SecondaryStockOrderCalcResult {
  /** 표시용: 트렌드 기반 일평균(소수 첫째 자리) */
  trendDailyMean: number
  /** 연산에 사용된 μ */
  dailyMean: number
  sigma: number
  /** UI 표시용 목데이터(하드코딩) */
  display: {
    currentStockQtyTotal: number
    totalOrderBalanceTotal: number
    expectedInboundOrderBalanceTotal: number
    currentStockQtyBySize: number[]
    totalOrderBalanceBySize: number[]
    expectedInboundOrderBalanceBySize: number[]
  }
  safetyStockCalc: SecondaryStockSafetyCalcBlock
  forecastQtyCalc: SecondaryStockForecastQtyCalcBlock
}
