import type { SecondaryCompetitorChannel, SecondaryStockOrderCalcResult } from '../../../api/types'

/** API `SecondaryCompetitorChannel`과 동일(단일 소스). */
export type CompetitorChannel = SecondaryCompetitorChannel

export type { SalesKpiColumn } from '../../../utils/salesKpiColumn'

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

