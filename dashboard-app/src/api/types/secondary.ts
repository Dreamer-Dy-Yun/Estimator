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

export interface SecondaryInboundSplitSupplyPoint {
  /** Date when this quantity becomes available for split-inbound simulation. */
  date: string
  /** Quantity that increases available stock on `date`. */
  qty: number
}

export interface SecondaryProductIdentity {
  /** Backend product/SKU UUID when available. */
  productUuid?: string | null
  /** Frontend/backend grouping key for SKU.code + SKU.color_code. */
  skuGroupKey: string
  brand: string
  code: string
  colorCode: string
}

export type SecondaryExistingOrderInboundSupplyBySize = Record<string, SecondaryInboundSplitSupplyPoint[]>

export interface SecondaryInboundSplitSource {
  productId: string
  /** Echoed product identity used to reject mismatched inbound-source responses. */
  productIdentity: SecondaryProductIdentity
  /** Inventory simulation base date. Supply points on this date represent current stock. */
  calculationBaseDate: string
  /** Inclusive first date covered by the current order split rounds. */
  coverageStartDate: string
  /** Exclusive next-order inbound date; split coverage ends at coverageEndDate - 1 day. */
  coverageEndDate: string
  /** Size-keyed current stock and existing-order inbound quantities by available date. */
  supplyBySize: Record<string, SecondaryInboundSplitSupplyPoint[]>
  /** Date-keyed, size-keyed sales forecast from calculationBaseDate <= date < coverageEndDate. */
  salesForecastByDate: Record<string, Record<string, number>>
}

export interface SecondaryInboundSplitSourceParams {
  skuGroupKey: string
  productIdentity: SecondaryProductIdentity
  calculationBaseDate: string
  coverageStartDate: string
  coverageEndDate: string
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
  productIdentity: SecondaryProductIdentity
  base: ProductComparisonBaseSubjectRef
  periodStart: string
  periodEnd: string
  /** Inventory calculation base date. Existing-order inbound supply is interpreted from this date. */
  calculationBaseDate: string
  /** Current order inbound date. Existing-order inbound before this date is displayed as pre-current-order inbound balance. */
  currentOrderInboundDueDate: string
  forecastPeriodEndMonth?: string
  orderCoverageDays: number
  /** Optional demand mean supplied by the frontend; backend computes it when omitted. */
  dailyMean?: number
}

export interface SecondaryStockOrderDisplaySizeRow {
  size: string
  currentStockQty: number
  totalOrderBalance: number
  expectedInboundOrderBalance: number
}

export interface SecondaryStockOrderCalcResult {
  /** Echoed product identity used to reject mismatched stock-order responses. */
  productIdentity: SecondaryProductIdentity
  /** Existing ordered but not-yet-inbound quantities, keyed by size and expected inbound date. */
  existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize
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
}
