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
  | 'totalOrderBalance'
  | 'expectedInboundOrderBalance'
  | 'sizeRecQty'
  | 'stockCalcColumn'

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

export type SecondaryOrderSnapshot = {
  snapshotId: string
  productId: string
  savedAt: string
  periodStart: string
  periodEnd: string
  competitorChannelId: string
  minOpMarginPct: number
  salesSelf: SalesKpiColumn
  salesCompetitor: SalesKpiColumn
  stockInputs: SecondaryForecastInputs
  stockDerived: SecondaryForecastDerived
  llmPrompt: string
  llmAnswer: string
  selfWeightPct: number
  sizeRows: Array<{
    size: string
    selfSharePct: number
    competitorSharePct: number
    blendedSharePct: number
    forecastQty: number
    recommendedQty: number
    confirmQty: number
  }>
}

/** 호환 별칭(점진 정리용) */
export type SecondaryStockCalc = SecondaryForecastCalc
export type SecondaryStockInputs = SecondaryForecastInputs
export type SecondaryStockDerived = SecondaryForecastDerived
