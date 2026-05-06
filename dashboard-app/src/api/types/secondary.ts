export interface SecondaryDailyTrendPoint {
  idx: number
  date: string
  month: string
  sales: number
  stockBar: number
  inboundAccumBar: number
  /** Self-channel daily sales quantity in EA. */
  selfSales: number | null
  /** Competitor-channel daily sales quantity in EA. */
  competitorSales: number | null
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

/**
 * Query options for `getProductSecondaryDetail`.
 * When a value changes the same SKU panel should request a fresh response.
 */
export interface ProductSecondaryDetailParams {
  minOpMarginPct?: number | null
}

export interface SecondaryStockOrderCalcParams {
  productId: string
  periodStart: string
  periodEnd: string
  forecastPeriodEnd?: string
  serviceLevelPct: number
  leadTimeDays: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  /** Optional demand mean supplied by the frontend; backend computes it when omitted. */
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
  /** Display daily mean based on the period trend, rounded to one decimal place. */
  trendDailyMean: number
  /** Demand mean actually used for calculation. */
  dailyMean: number
  sigma: number
  /** UI display data owned by the backend/mock response. */
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
