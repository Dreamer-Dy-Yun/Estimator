import type { ProductPrimarySummary } from '../../types'

export interface ProductDrawerBundle {
  summary: ProductPrimarySummary
}

export interface ProductMonthlyTrendParams {
  startDate: string
  endDate: string
  forecastMonths: number
  competitorChannelId: string
}

export interface ProductMonthlyTrendPoint {
  date: string
  selfSales: number
  competitorSales: number | null
  isForecast: boolean
}

export interface ProductMonthlyTrend {
  skuGroupKey: string
  targetPeriodDays: {
    start: string
    end: string
  }
  competitorChannelId: string
  competitorChannelLabel: string
  points: ProductMonthlyTrendPoint[]
}

export interface ProductSalesInsightParams {
  startDate: string
  endDate: string
  competitorChannelId?: string
}

export interface ProductSalesInsightColumn {
  avgPrice: number
  qty: number
  amount: number
  avgCost: number | null
  grossMarginPerUnit: number | null
  feePerUnit: number | null
  feeRatePct: number | null
  opMarginPerUnit: number | null
  opMarginRatePct: number | null
  qtyRank: number
  amountRank: number
  feeRank: number | null
  opMarginRank: number | null
  rankTotal: number
  costRatioPct: number | null
}

export interface ProductSalesInsight {
  skuGroupKey: string
  targetPeriodDays: {
    start: string
    end: string
  }
  competitorChannelId: string
  competitorChannelLabel: string
  self: ProductSalesInsightColumn
  competitor: ProductSalesInsightColumn
}
