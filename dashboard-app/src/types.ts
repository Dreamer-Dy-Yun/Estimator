/** One row in the self (own channel) sales analysis table. */
export type SelfSalesRow = {
  id: string
  rank: number
  /** Percentile rank among all SKUs. */
  rankPercentile: number
  brand: string
  category: string
  /** Style / product code. */
  styleCode: string
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

/** One row in the competitor comparison sales table. */
export type CompetitorSalesRow = {
  id: string
  rank: number
  rankPercentile: number
  brand: string
  category: string
  styleCode: string
  name: string
  competitorAvgPrice: number
  competitorQty: number
  competitorAmount: number
  selfAvgPrice: number | null
  selfQty: number | null
  selfAmount: number | null
}

/** One row in the order simulation / plan result table. */
export type OrderPlanRow = {
  id: string
  rank: number
  rankPercentile: number
  brand: string
  category: string
  styleCode: string
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

/**
 * Product summary for the primary drawer (charts, KPIs, size mix).
 * Deeper detail for the secondary pane will use a separate type/API later.
 */
export type ProductSummary = {
  id: string
  name: string
  brand: string
  category: string
  styleCode: string
  selfPrice: number
  competitorPrice: number
  selfQty: number
  competitorQty: number
  /** Sellable on-hand quantity. */
  availableStock: number
  recommendedOrderQty: number
  salesTrend: Array<{ date: string; sales: number; isForecast: boolean }>
  /**
   * Seasonal mix by calendar month (e.g. estimator seasonal_rates).
   * month 1–12, ratios sum to 1; some months may be 0.
   */
  seasonality: Array<{ month: number; ratio: number }>
  /**
   * Size-level mix and order inputs for KPIs.
   * Per-size selfAvgPrice / selfQty / availableStock come from the API (mock aligns to totals).
   */
  sizeMix: Array<{
    size: string
    selfRatio: number
    competitorRatio: number
    confirmedQty: number
    selfAvgPrice: number
    selfQty: number
    availableStock: number
  }>
}
