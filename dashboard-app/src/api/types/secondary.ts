import type { OrderSnapshotDocument } from '../../snapshot/orderSnapshotTypes'
import type { ProductComparisonBaseSubjectRef, ProductComparisonComparisonSubjectRef } from './drawer'

export interface SecondaryDailyTrendPoint {
  idx: number
  date: string
  month: string
  sales: number
  stockBar: number | null
  inboundAccumBar: number | null
  /** Base subject daily sales quantity in EA. */
  baseSales: number | null
  /** Comparison subject daily sales quantity in EA. */
  comparisonSales: number | null
  isForecast: boolean
}

export interface SecondaryDailyTrendBaseFlow {
  /** Daily sale quantity for one aggregate subject. */
  sale: number
  /** Known base inbound quantity for the same date. Use explicit 0 for known zero. */
  inbound: number
}

export interface SecondaryDailyTrendComparisonFlow {
  /** Daily sale quantity for one aggregate subject. */
  sale: number
  /** Comparison inbound is not rendered by the current UI. Null means unavailable for that subject. */
  inbound: number | null
}

export type SecondaryDailyTrendSubjectFlow = SecondaryDailyTrendComparisonFlow

export interface SecondaryDailyTrendFlowCell {
  base: SecondaryDailyTrendBaseFlow
  comparison: SecondaryDailyTrendComparisonFlow
}

export interface SecondaryDailyTrendSource {
  productId: string
  /** Inclusive first date in flowByDate. */
  dateStart: string
  /** Inclusive final date in flowByDate. Includes forecast days when forecastDays > 0. */
  dateEnd: string
  /** First forecast date; normally request endDate + 1 day. */
  forecastStartDate: string
  /** Opening stock immediately before dateStart is applied. */
  baseStockAtStart: number | null
  /** Reserved for comparison stock. Current UI does not render comparison stock bars. */
  comparisonStockAtStart: number | null
  /** Aggregate per-date flow. Keys must cover every date from dateStart through dateEnd. */
  flowByDate: Record<string, SecondaryDailyTrendFlowCell>
}

export interface SecondaryDailyTrendParams {
  skuGroupKey: string
  startDate: string
  endDate: string
  forecastDays: number
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
}

export interface SecondaryInboundSplitExpectationCell {
  /** Expected sale quantity for this date and size. */
  sale: number
  /** Already-known inbound quantity for this date and size, excluding the draft being edited. */
  inbound: number
}

export interface SecondaryInboundSplitSource {
  productId: string
  /** Inclusive first date in the requested expectation source window. */
  dateStart: string
  /** Exclusive end date; expectationByDate covers dateStart <= date < dateEnd. */
  dateEnd: string
  /** Size-keyed stock at dateStart. */
  stockBySize: Record<string, number>
  /** Date-keyed, size-keyed expected sale and known inbound cells. */
  expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>>
}

export interface SecondaryInboundSplitSourceParams {
  skuGroupKey: string
  dateStart: string
  dateEnd: string
  base: ProductComparisonBaseSubjectRef
}

export interface SecondaryCompetitorChannel {
  id: string
  label: string
}

export interface SecondaryAiCommentParams {
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
  candidateItemUuid?: string | null
  /** Full secondary snapshot used by AI generation at click time when available. */
  snapshotForAiComment?: OrderSnapshotDocument
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
export interface ProductSecondaryDetailParams {
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
  minOpMarginPct?: number | null
}

export interface SecondaryStockOrderCalcParams {
  skuGroupKey: string
  base: ProductComparisonBaseSubjectRef
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
