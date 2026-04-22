/** One row in the self (own channel) sales analysis table. */
export type SelfSalesRow = {
  id: string
  rank: number
  /** Percentile rank among all SKUs. */
  rankPercentile: number
  brand: string
  category: string
  /** Product code. */
  productCode: string
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
  productCode: string
  name: string
  competitorAvgPrice: number
  competitorQty: number
  competitorAmount: number
  selfAvgPrice: number | null
  selfQty: number | null
  selfAmount: number | null
}

/** One month bucket from monthly summary / aggregate pipeline (not daily raw). */
export type MonthlySalesPoint = {
  date: string
  sales: number
  isForecast: boolean
}

/** 1차 드로어 사이즈 행 (비교 채널 없음 — 접두어 없음). */
export type ProductSizeMixRow = {
  size: string
  ratio: number
  confirmedQty: number
  avgPrice: number
  qty: number
  availableStock: number
}

export type ProductPrimarySummary = {
  id: string
  name: string
  brand: string
  category: string
  productCode: string
  /** Selling price (자사 채널). */
  price: number
  qty: number
  /** Sellable on-hand quantity. */
  availableStock: number
  recommendedOrderQty: number
  monthlySalesTrend: MonthlySalesPoint[]
  /**
   * Seasonal mix by calendar month (e.g. estimator seasonal_rates).
   * month 1–12, ratios sum to 1; some months may be 0.
   */
  seasonality: Array<{ month: number; ratio: number }>
  /** Per-size mix; 경쟁 비중은 `ProductSecondaryDetail`에서 별도 fetch. */
  sizeMix: ProductSizeMixRow[]
}

/** 2차 패널 전용: 경쟁 베이스라인 + 사이즈별 경쟁 비중 — 별도 API. */
export type ProductSecondaryDetail = {
  id: string
  competitorPrice: number
  competitorQty: number
  competitorRatioBySize: Record<string, number>
}

/** 2차 UI에서 1차 사이즈 행 + 경쟁 비중을 합친 행. */
export type ProductSizeMixMergedRow = ProductSizeMixRow & { competitorRatio: number }

/** API 단위 컴포넌트 에러 표시용 공통 정보 */
export type ApiUnitErrorInfo = {
  checkedAt: string
  page: string
  request: string
  error: string
}
