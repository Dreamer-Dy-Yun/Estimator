import type { ProductPrimarySummary, ProductSecondaryDetail } from '../types'
import type { SecondaryForecastInputs } from '../dashboard/components/product-drawer/secondary/secondaryDrawerTypes'

/** Persisted order snapshot schema version. */
export const ORDER_SNAPSHOT_SCHEMA_VERSION = 2 as const

export type OrderSnapshotSizeRowV1 = {
  size: string
  selfSharePct: number
  competitorSharePct: number
  blendedSharePct: number
  forecastQty: number
  recommendedQty: number
  confirmQty: number
}

export interface OrderSnapshotOrderUnitInputsV1 {
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
}

export interface OrderSnapshotStockDisplayV1 {
  currentStockQtyTotal: number
  totalOrderBalanceTotal: number
  expectedInboundOrderBalanceTotal: number
  currentStockQtyBySize: number[]
  totalOrderBalanceBySize: number[]
  expectedInboundOrderBalanceBySize: number[]
}

/**
 * Primary summary saved in the snapshot.
 * Heavy or recalculable source fields are intentionally excluded and must be
 * reloaded from the product bundle when needed. Keep this explicit-field-only:
 * new ProductPrimarySummary fields must not persist without a contract update.
 */
export type OrderSnapshotPrimarySummaryV2 = Pick<
  ProductPrimarySummary,
  | 'skuGroupKey'
  | 'productName'
  | 'brand'
  | 'category'
  | 'code'
  | 'colorCode'
  | 'price'
  | 'qty'
  | 'availableStock'
>

export type OrderSnapshotDrawer1V2 = {
  summary: OrderSnapshotPrimarySummaryV2
}

/**
 * Competitor sales basis saved from ProductSecondaryDetail.
 * Keep this as explicit fields instead of storing the full secondary detail.
 */
export interface OrderSnapshotCompetitorSalesBasisV2 {
  skuGroupKey: ProductSecondaryDetail['skuGroupKey']
  competitorPrice: ProductSecondaryDetail['competitorPrice']
  competitorQty: ProductSecondaryDetail['competitorQty']
  competitorRatioBySize: ProductSecondaryDetail['competitorRatioBySize']
}

export function createOrderSnapshotPrimarySummary(
  primary: ProductPrimarySummary,
): OrderSnapshotPrimarySummaryV2 {
  return {
    skuGroupKey: primary.skuGroupKey,
    productName: primary.productName,
    brand: primary.brand,
    category: primary.category,
    code: primary.code,
    colorCode: primary.colorCode,
    price: primary.price,
    qty: primary.qty,
    availableStock: primary.availableStock,
  }
}

export function createOrderSnapshotStockInputs(
  stockInputs: SecondaryForecastInputs,
): SecondaryForecastInputs {
  return {
    trendDailyMean: stockInputs.trendDailyMean,
    dailyMean: stockInputs.dailyMean,
    leadTimeStartDate: stockInputs.leadTimeStartDate,
    leadTimeEndDate: stockInputs.leadTimeEndDate,
    leadTimeDays: stockInputs.leadTimeDays,
    safetyStockMode: stockInputs.safetyStockMode,
    manualSafetyStock: stockInputs.manualSafetyStock,
    sigma: stockInputs.sigma,
    serviceLevelPct: stockInputs.serviceLevelPct,
  }
}

export function toProductPrimarySummaryFromSnapshotSummary(
  base: ProductPrimarySummary,
  summary: OrderSnapshotPrimarySummaryV2,
): ProductPrimarySummary {
  return {
    ...base,
    ...summary,
  }
}

export function createOrderSnapshotCompetitorSalesBasis(
  secondary: ProductSecondaryDetail,
): OrderSnapshotCompetitorSalesBasisV2 {
  return {
    skuGroupKey: secondary.skuGroupKey,
    competitorPrice: secondary.competitorPrice,
    competitorQty: secondary.competitorQty,
    competitorRatioBySize: cloneSnapshotValue(secondary.competitorRatioBySize),
  }
}

export function toProductSecondaryDetailFromSnapshotBasis(
  base: ProductSecondaryDetail,
  basis: OrderSnapshotCompetitorSalesBasisV2,
): ProductSecondaryDetail {
  return {
    ...base,
    skuGroupKey: basis.skuGroupKey,
    competitorPrice: basis.competitorPrice,
    competitorQty: basis.competitorQty,
    competitorRatioBySize: cloneSnapshotValue(basis.competitorRatioBySize),
  }
}

function cloneSnapshotValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => (isRecord(item) ? { ...item } : item)) as T
  }
  if (isRecord(value)) return { ...value } as T
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Secondary drawer snapshot.
 * Stores the selected competitor channel, forecast inputs, confirmed quantity,
 * order unit inputs, stock display values, and AI comment context.
 */
export type OrderSnapshotDrawer2V1 = {
  competitorSalesBasis: OrderSnapshotCompetitorSalesBasisV2
  competitorChannelId: string
  competitorChannelLabel: string
  stockInputs: SecondaryForecastInputs
  orderUnitInputs?: OrderSnapshotOrderUnitInputsV1
  stockDisplay?: OrderSnapshotStockDisplayV1
  selfWeightPct: number
  bufferStock: number
  llmPrompt: string
  llmAnswer: string
  /** Confirmed totals saved for candidate-list summaries and columns. */
  confirmedTotals?: {
    orderQty: number
    expectedSalesAmount: number
    expectedOpProfit: number
    expectedOpProfitRatePct: number | null
  }
  sizeRows: OrderSnapshotSizeRowV1[]
}

/** Single JSON document persisted by DB/local storage. Row UUID is generated by the backend. */
export type OrderSnapshotDocumentV1 = {
  schemaVersion: typeof ORDER_SNAPSHOT_SCHEMA_VERSION
  skuGroupKey: string
  savedAt: string
  context: {
    periodStart: string
    periodEnd: string
    forecastMonths: number
    /** `getSecondaryDailyTrend` 재조회용 `startMonth` */
    dailyTrendStartMonth: string
    /** `getSecondaryDailyTrend` 재조회용 `leadTimeDays` */
    dailyTrendLeadTimeDays: number
  }
  drawer1: OrderSnapshotDrawer1V2
  drawer2: OrderSnapshotDrawer2V1
}
