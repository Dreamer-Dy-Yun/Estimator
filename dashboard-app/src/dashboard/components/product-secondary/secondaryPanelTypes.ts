/** Competitor channel option (mock; replace with API). */
export type CompetitorChannel = {
  id: string
  label: string
  /** Multipliers vs `ProductSecondaryDetail` competitor price/qty baseline */
  priceSkew: number
  qtySkew: number
}

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
  | 'serviceLevel'
  | 'leadTime'
  | 'confirmOrder'
  | 'safetyStockCalc'
  | 'forecastQtyCalc'
  | 'recOrderQty'

export type SecondaryStockCalc = {
  safetyStockCalc: {
    safetyStock: number
    recommendedOrderQty: number
    expectedOrderAmount: number
    expectedSalesAmount: number
    expectedOpProfit: number
  }
  forecastQtyCalc: {
    safetyStock: null
    recommendedOrderQty: number
    expectedOrderAmount: number
    expectedSalesAmount: number
    expectedOpProfit: number
  }
}

export type SecondaryStockInputs = {
  dailyMean: number
  leadTimeStartDate: string
  leadTimeEndDate: string
  leadTimeDays: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  sigma: number
  serviceLevelPct: number
}

export type SecondaryStockDerived = {
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
  stockInputs: SecondaryStockInputs
  stockDerived: SecondaryStockDerived
  llmPrompt: string
  llmAnswer: string
  selfWeightPct: number
  sizeRows: Array<{
    size: string
    selfSharePct: number
    competitorSharePct: number
    blendedSharePct: number
    recommendedQty: number
    confirmQty: number
  }>
}
