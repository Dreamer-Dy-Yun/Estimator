import type { ProductPrimarySummary, ProductSecondaryDetail } from '../types'

/** Persisted order snapshot schema version. */
export const ORDER_SNAPSHOT_SCHEMA_VERSION = 2 as const

/** Source ratio scale saved from API data: 0..1, not a display percent. */
export type OrderSnapshotSourceRatio = number

/** Display/calculation percent scale: 0..100. */
export type OrderSnapshotPercent = number

export type OrderSnapshotCompetitorRatioBySizeV2 = Record<string, OrderSnapshotSourceRatio>

export type OrderSnapshotSizeOrderV2 = {
  size: string
  selfSharePct: OrderSnapshotPercent
  competitorSharePct: OrderSnapshotPercent
  blendedSharePct: OrderSnapshotPercent
  forecastQty: number
  recommendedQty: number
  confirmQty: number
}

export interface OrderSnapshotUnitEconomicsV2 {
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: OrderSnapshotPercent
}

export interface OrderSnapshotStockOrderDisplaySizeRowV2 {
  size: string
  currentStockQty: number
  totalOrderBalance: number
  expectedInboundOrderBalance: number
}

export interface OrderSnapshotStockOrderDisplayV2 {
  currentStockQtyTotal: number
  totalOrderBalanceTotal: number
  expectedInboundOrderBalanceTotal: number
  sizeRows: OrderSnapshotStockOrderDisplaySizeRowV2[]
}

export interface OrderSnapshotStockOrderRequestV2 {
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  leadTimeDays: number
  /** Optional operator override. Omitted means the snapshot used the calculated daily mean. */
  dailyMeanOverride?: number
}

export interface OrderSnapshotStockOrderAmountBlockV2 {
  recommendedOrderQty: number
  expectedOrderAmount: number
  expectedSalesAmount: number
  expectedOpProfit: number
}

export interface OrderSnapshotStockOrderSafetyBlockV2 extends OrderSnapshotStockOrderAmountBlockV2 {
  safetyStock: number
}

export interface OrderSnapshotStockOrderForecastBlockV2 extends OrderSnapshotStockOrderAmountBlockV2 {
  safetyStock: null
}

export interface OrderSnapshotStockOrderResultV2 {
  trendDailyMean: number
  dailyMean: number
  sigma: number
  /** Size-keyed display rows are copied on snapshot restore to avoid mutating cached drawer state. */
  display: OrderSnapshotStockOrderDisplayV2
  safetyStockCalc: OrderSnapshotStockOrderSafetyBlockV2
  forecastQtyCalc: OrderSnapshotStockOrderForecastBlockV2
}

export interface OrderSnapshotAiCommentV2 {
  prompt: string
  answer: string
  generatedAt: string | null
}

/** Explicit primary fields persisted by snapshot v2. Heavy source fields must be reloaded from the product bundle. */
export type OrderSnapshotPrimarySummaryV2 = Pick<
  ProductPrimarySummary,
  'skuGroupKey' | 'productName' | 'brand' | 'category' | 'code' | 'colorCode' | 'price' | 'qty' | 'availableStock'
>

export type OrderSnapshotDrawer1V2 = {
  summary: OrderSnapshotPrimarySummaryV2
}

/** Competitor sales basis saved from ProductSecondaryDetail, not the full secondary detail. */
export interface OrderSnapshotCompetitorBasisV2 {
  skuGroupKey: ProductSecondaryDetail['skuGroupKey']
  competitorPrice: ProductSecondaryDetail['competitorPrice']
  competitorQty: ProductSecondaryDetail['competitorQty']
  competitorRatioBySize: OrderSnapshotCompetitorRatioBySizeV2
}

export interface OrderSnapshotConfirmedTotalsV2 {
  /** Required sum derived from current drawer2.sizeOrders[].confirmQty by the current snapshot builder. */
  orderQty: number
  expectedSalesAmount: number
  expectedOpProfit: number
  /** Percent-point operating profit rate. May be negative when expected operating profit is negative. */
  expectedOpProfitRatePct: number | null
}

export function createOrderSnapshotPrimarySummary(primary: ProductPrimarySummary): OrderSnapshotPrimarySummaryV2 {
  const { skuGroupKey, productName, brand, category, code, colorCode, price, qty, availableStock } = primary
  return { skuGroupKey, productName, brand, category, code, colorCode, price, qty, availableStock }
}

export function createOrderSnapshotStockOrderRequest(stockOrderRequest: OrderSnapshotStockOrderRequestV2): OrderSnapshotStockOrderRequestV2 {
  const { currentOrderInboundDueDate, nextOrderInboundDueDate, leadTimeDays, dailyMeanOverride } = stockOrderRequest
  return {
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    leadTimeDays,
    ...(dailyMeanOverride == null ? {} : { dailyMeanOverride }),
  }
}

export function createOrderSnapshotStockOrderResult(result: OrderSnapshotStockOrderResultV2 | null): OrderSnapshotStockOrderResultV2 | undefined {
  if (result == null) return undefined
  const { display } = result
  return {
    ...result,
    display: {
      ...display,
      sizeRows: display.sizeRows.map((row) => ({ ...row })),
    },
    safetyStockCalc: { ...result.safetyStockCalc },
    forecastQtyCalc: { ...result.forecastQtyCalc },
  }
}

export function createOrderSnapshotAiComment(aiComment: OrderSnapshotAiCommentV2): OrderSnapshotAiCommentV2 {
  const { prompt, answer, generatedAt } = aiComment
  return {
    prompt,
    answer,
    generatedAt,
  }
}

export function createOrderSnapshotCompetitorRatioBySize(
  competitorRatioBySize: ProductSecondaryDetail['competitorRatioBySize'],
): OrderSnapshotCompetitorRatioBySizeV2 {
  return { ...competitorRatioBySize }
}

export function toProductPrimarySummaryFromSnapshotSummary(base: ProductPrimarySummary, summary: OrderSnapshotPrimarySummaryV2): ProductPrimarySummary {
  return { ...base, ...summary }
}

export function createOrderSnapshotCompetitorBasis(secondary: ProductSecondaryDetail): OrderSnapshotCompetitorBasisV2 {
  const { skuGroupKey, competitorPrice, competitorQty, competitorRatioBySize } = secondary
  return {
    skuGroupKey,
    competitorPrice,
    competitorQty,
    competitorRatioBySize: createOrderSnapshotCompetitorRatioBySize(competitorRatioBySize),
  }
}

export function toProductSecondaryDetailFromSnapshotBasis(base: ProductSecondaryDetail, basis: OrderSnapshotCompetitorBasisV2): ProductSecondaryDetail {
  return { ...base, ...basis, competitorRatioBySize: { ...basis.competitorRatioBySize } }
}

/** Secondary drawer snapshot: competitor channel, stock-order request/result, confirmed quantity, economics, comment. */
export type OrderSnapshotDrawer2V2 = {
  competitorBasis: OrderSnapshotCompetitorBasisV2
  competitorChannelId: string
  competitorChannelLabel: string
  stockOrderRequest: OrderSnapshotStockOrderRequestV2
  stockOrderResult?: OrderSnapshotStockOrderResultV2
  unitEconomics?: OrderSnapshotUnitEconomicsV2
  selfWeightPct: OrderSnapshotPercent
  bufferStock: number
  aiComment: OrderSnapshotAiCommentV2
  confirmedTotals: OrderSnapshotConfirmedTotalsV2
  sizeOrders: OrderSnapshotSizeOrderV2[]
}

/** Single JSON document persisted by DB/local storage for snapshot schema v2. Row UUID is generated by the backend. */
export type OrderSnapshotDocumentV2 = {
  schemaVersion: typeof ORDER_SNAPSHOT_SCHEMA_VERSION
  skuGroupKey: string
  /** New candidate/order snapshots should include this; omission means explicitly unscoped snapshot. */
  companyUuid?: string
  savedAt: string
  context: {
    periodStart: string
    periodEnd: string
    forecastMonths: number
    dailyTrendStartMonth: string
    dailyTrendLeadTimeDays: number
  }
  drawer1: OrderSnapshotDrawer1V2
  drawer2: OrderSnapshotDrawer2V2
}
