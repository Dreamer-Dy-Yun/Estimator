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
  /** Echoed size filter. Null means all-size aggregate. */
  size: string | null
  /** Opening stock before the first returned date. */
  baseStock: number | null
  /** Date-keyed base/comparison daily sale and inbound flow. */
  data: {
    base: Record<string, SecondaryDailyTrendBaseFlow>
    comparison: Record<string, SecondaryDailyTrendComparisonFlow>
  }
}

export interface SecondaryDailyTrendParams {
  skuGroupKey: string
  startDate: string
  endDate: string
  forecastDays: number
  /** Optional size filter. Omit or null for all sizes. */
  size?: string | null
  base: ProductComparisonBaseSubjectRef
  comparison: ProductComparisonComparisonSubjectRef
}

export interface SecondaryExistingOrderInboundPoint {
  /** Date when this quantity becomes available for split-inbound simulation. */
  date: string
  /** Quantity that increases available stock on `date`. */
  qty: number
}

export interface SecondaryInboundSplitExpectationPoint {
  /** Date when an already-ordered inbound quantity becomes available. */
  date: string
  /** Existing-order inbound quantity. This is unrelated to the current split order. */
  inbound: number
}

export interface SecondaryInboundSplitSizeInfo {
  /** Size sales mix ratio. 0.072 means 7.2%. */
  salesRate: number
  /** Opening stock used by split-inbound planning. */
  baseStock: number
}

export interface SecondaryInboundSplitConfirmedPhase {
  phase: number
  inbound_date: string
  quantity: Record<string, number>
}

export interface SecondaryInboundSplitConfirmed {
  total_phase: number
  data: SecondaryInboundSplitConfirmedPhase[]
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

export type SecondaryExistingOrderInboundSupplyBySize = Record<string, SecondaryExistingOrderInboundPoint[]>

export interface SecondaryInboundSplitSource {
  /** Aggregate recommendation and daily whole-product sales forecast. */
  total: {
    suggestion: number
    sales: Record<string, number>
  }
  /** Size-keyed sales ratio and opening stock. */
  sizeInfo: Record<string, SecondaryInboundSplitSizeInfo>
  /** Existing already-ordered inbound quantities by size. */
  expectation: Record<string, SecondaryInboundSplitExpectationPoint[]>
  /** Initial confirmed split rows, when supplied by a saved snapshot/API response. */
  confirmed: SecondaryInboundSplitConfirmed
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
  comparison: ProductComparisonComparisonSubjectRef
  periodStart: string
  periodEnd: string
  /** Inventory calculation base date. Existing-order inbound supply is interpreted from this date. */
  calculationBaseDate: string
  /** Current order inbound date. Existing-order inbound before this date is displayed as pre-current-order inbound balance. */
  currentOrderInboundDueDate: string
  /** Exclusive next-order inbound date; stock-order recommendation and split-inbound planning cover dates before this day. */
  nextOrderInboundDueDate: string
  forecastPeriodEndMonth?: string
  orderCoverageDays: number
  /** Size mix weight used by both detailed recommendation rows and split-inbound source generation. */
  selfWeightPct: number
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
  /** Single source used by both detailed recommendation rows and split-inbound planning. */
  inboundSplitSource: SecondaryInboundSplitSource
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
