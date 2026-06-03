import type { OrderSnapshotDocumentV2 } from '../../snapshot/orderSnapshotTypes'
import type { CompanyScopeParams } from './company'

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

export interface SecondaryDailyTrendParams extends CompanyScopeParams {
  skuGroupKey: string
  startDate: string
  endDate: string
  forecastDays: number
  /** Competitor channel used for the competitor daily-sales series. */
  competitorChannelId: string
}

export interface SecondaryCompetitorChannel {
  id: string
  label: string
}

export interface SecondaryAiCommentParams extends CompanyScopeParams {
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  competitorChannelId: string
  candidateItemUuid?: string | null
  /** Full secondary snapshot used by AI generation at click time when available. */
  snapshotForAiComment?: OrderSnapshotDocumentV2
}

export interface SecondaryAiCommentResult {
  prompt: string
  answer: string
  generatedAt: string
}

/**
 * Query options for `getProductSecondaryDetail`.
 * When a value changes the same SKU panel should request a fresh response.
 */
export interface ProductSecondaryDetailParams extends CompanyScopeParams {
  minOpMarginPct?: number | null
}

export interface SecondaryStockOrderCalcParams extends CompanyScopeParams {
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastPeriodEnd?: string
  leadTimeDays: number
  /** Optional demand mean supplied by the frontend; backend computes it when omitted. */
  dailyMean?: number
}

export interface SecondaryStockOrderAmountBlock {
  recommendedOrderQty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
}

export interface SecondaryStockSafetyCalcBlock extends SecondaryStockOrderAmountBlock {
  safetyStock: number
}

export interface SecondaryStockForecastQtyCalcBlock extends SecondaryStockOrderAmountBlock {
  safetyStock: null
}

export interface SecondaryStockOrderDisplaySizeRow {
  size: string
  currentStockQty: number
  totalOrderBalance: number
  expectedInboundOrderBalance: number
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
    sizeRows: SecondaryStockOrderDisplaySizeRow[]
  }
  safetyStockCalc: SecondaryStockSafetyCalcBlock
  forecastQtyCalc: SecondaryStockForecastQtyCalcBlock
}
