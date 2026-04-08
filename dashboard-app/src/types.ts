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
  recommendedOrderQty: number
  stockTrend: Array<{ date: string; stock: number }>
  sizeMix: Array<{ size: string; selfRatio: number; competitorRatio: number; confirmedQty: number }>
}
