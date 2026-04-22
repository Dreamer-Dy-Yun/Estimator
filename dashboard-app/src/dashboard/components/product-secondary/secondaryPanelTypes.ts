import type { SecondaryCompetitorChannel, SecondaryStockOrderCalcResult } from '../../../api/types'

/** API `SecondaryCompetitorChannel`과 동일(단일 소스). */
export type CompetitorChannel = SecondaryCompetitorChannel

/** One column of sales KPIs for self or competitor. */
export type SalesKpiColumn = {
  avgPrice: number
  qty: number
  amount: number
  avgCost: number
  grossMarginPerUnit: number
  feePerUnit: number
  feeRatePct: number
  opMarginPerUnit: number
  opMarginRatePct: number
  qtyRank: number
  amountRank: number
  costRatioPct: number
}

export type SecondaryHelpId =
  | 'confirmOrder'
  | 'forecastQtyCalc'
  | 'expectedOpProfitRate'
  | 'totalOrderBalance'
  | 'expectedInboundOrderBalance'
  | 'sizeRecQty'
  | 'salesForecastSizeOrder'

/** `getSecondaryStockOrderCalc` 응답과 동일(단일 소스: `api/types/secondary`). */
export type SecondaryForecastCalc = SecondaryStockOrderCalcResult

export type SecondaryForecastInputs = {
  /** 판매추이 기간에서 산출한 일평균 판매량(μ, 표시·동기화 기준) */
  trendDailyMean: number
  dailyMean: number
  leadTimeStartDate: string
  leadTimeEndDate: string
  leadTimeDays: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  sigma: number
  serviceLevelPct: number
}

export type SecondaryForecastDerived = {
  safetyStock: number
  recommendedOrderQty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
}

