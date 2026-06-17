import type { SecondaryStockOrderCalcResult } from '../api/types'
import type { ComparisonBaseSubjectRef, ComparisonComparisonSubject } from '../api/types/subject'
import type { ProductMonthlyTrendChartPoint } from '../dashboard/components/product-drawer/primary/monthlyTrendChartModel'
import type { SalesForecastInboundDateFields, SalesForecastUnitEconomicsFields } from '../dashboard/components/product-drawer/secondary/model/salesForecastOrderInputModel'
import type { SecondaryAiCommentView } from '../dashboard/components/product-drawer/secondary/model/secondaryAiCommentModel'
import type { SecondaryConfirmedRound, SecondaryConfirmedRounds } from '../dashboard/components/product-drawer/secondary/model/secondaryConfirmedRoundModel'
import type { SecondarySizeOrderRestoreRow } from '../dashboard/components/product-drawer/secondary/model/secondarySizeOrderRows'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../types'

export const ORDER_SNAPSHOT_SCHEMA_VERSION: 4 = 4 as const

export type OrderSnapshotSourceRatio = number
export type OrderSnapshotPercent = number
export type OrderSnapshotComparisonRatioBySize = Record<string, OrderSnapshotSourceRatio>
export type OrderSnapshotBaseSubject = ComparisonBaseSubjectRef
export type OrderSnapshotComparisonSubject = ComparisonComparisonSubject

export type OrderSnapshotSizeOrder = SecondarySizeOrderRestoreRow

export type OrderSnapshotConfirmedRound = SecondaryConfirmedRound
export type OrderSnapshotConfirmed = SecondaryConfirmedRounds

export type OrderSnapshotUnitEconomics = SalesForecastUnitEconomicsFields

export type OrderSnapshotStockOrderDisplay = SecondaryStockOrderCalcResult['display']
export type OrderSnapshotStockOrderDisplaySizeRow = OrderSnapshotStockOrderDisplay['sizeRows'][number]

export type OrderSnapshotStockOrderRequest = SalesForecastInboundDateFields & {
  leadTimeDays: number
  dailyMeanOverride?: number
}

export type OrderSnapshotStockOrderResult = SecondaryStockOrderCalcResult

export type OrderSnapshotAiComment = SecondaryAiCommentView

export type OrderSnapshotPrimarySummary = Pick<
  ProductPrimarySummary,
  'skuGroupKey' | 'productName' | 'brand' | 'category' | 'code' | 'colorCode' | 'price' | 'qty' | 'availableStock'
>

export type OrderSnapshotDrawer1 = {
  summary: OrderSnapshotPrimarySummary
  monthlySalesTrend: OrderSnapshotMonthlySalesTrendPoint[]
}

export type OrderSnapshotMonthlySalesTrendPoint = ProductMonthlyTrendChartPoint

export interface OrderSnapshotComparisonBasis {
  skuGroupKey: ProductSecondaryDetail['skuGroupKey']
  comparisonPrice: ProductSecondaryDetail['comparisonPrice']
  comparisonQty: ProductSecondaryDetail['comparisonQty']
  comparisonRatioBySize: OrderSnapshotComparisonRatioBySize
}

export type OrderSnapshotDrawer2 = {
  baseSubject: OrderSnapshotBaseSubject
  comparisonSubject: OrderSnapshotComparisonSubject
  comparisonBasis: OrderSnapshotComparisonBasis
  stockOrderRequest: OrderSnapshotStockOrderRequest
  stockOrderResult?: OrderSnapshotStockOrderResult
  unitEconomics?: OrderSnapshotUnitEconomics
  selfWeightPct: OrderSnapshotPercent
  bufferStock: number
  aiComment: OrderSnapshotAiComment
  confirmed: OrderSnapshotConfirmed
  sizeOrders: OrderSnapshotSizeOrder[]
}

export type OrderSnapshotDocument = {
  schemaVersion: typeof ORDER_SNAPSHOT_SCHEMA_VERSION
  skuGroupKey: string
  savedAt: string
  context: {
    periodStart: string
    periodEnd: string
    forecastMonths: number
    dailyTrendStartMonth: string
    dailyTrendLeadTimeDays: number
  }
  drawer1: OrderSnapshotDrawer1
  drawer2: OrderSnapshotDrawer2
}

export function createOrderSnapshotPrimarySummary(primary: ProductPrimarySummary): OrderSnapshotPrimarySummary {
  const { skuGroupKey, productName, brand, category, code, colorCode, price, qty, availableStock }: ProductPrimarySummary = primary
  return { skuGroupKey, productName, brand, category, code, colorCode, price, qty, availableStock }
}

export function createOrderSnapshotMonthlySalesTrend(monthlySalesTrend: OrderSnapshotMonthlySalesTrendPoint[]): OrderSnapshotMonthlySalesTrendPoint[] {
  return monthlySalesTrend.map((point: OrderSnapshotMonthlySalesTrendPoint): OrderSnapshotMonthlySalesTrendPoint => ({ ...point }))
}

export function createOrderSnapshotBaseSubject(subject: OrderSnapshotBaseSubject): OrderSnapshotBaseSubject {
  return {
    role: 'base',
    kind: 'self-company',
    ...(subject.sourceId == null ? {} : { sourceId: subject.sourceId }),
  }
}

export function createOrderSnapshotComparisonSubject(subject: OrderSnapshotComparisonSubject): OrderSnapshotComparisonSubject {
  if (subject.kind === 'competitor-channel' && !subject.sourceId) {
    throw new Error('comparisonSubject.sourceId is required for competitor-channel subjects')
  }
  return {
    role: 'comparison',
    kind: subject.kind,
    id: subject.id,
    label: subject.label,
    ...(subject.sourceId == null ? {} : { sourceId: subject.sourceId }),
  } as OrderSnapshotComparisonSubject
}

export function createOrderSnapshotStockOrderRequest(stockOrderRequest: OrderSnapshotStockOrderRequest): OrderSnapshotStockOrderRequest {
  const { currentOrderInboundDueDate, nextOrderInboundDueDate, leadTimeDays, dailyMeanOverride }: OrderSnapshotStockOrderRequest = stockOrderRequest
  return {
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    leadTimeDays,
    ...(dailyMeanOverride == null ? {} : { dailyMeanOverride }),
  }
}

export function createOrderSnapshotStockOrderResult(result: OrderSnapshotStockOrderResult | null): OrderSnapshotStockOrderResult | undefined {
  if (result == null) return undefined
  const { display }: OrderSnapshotStockOrderResult = result
  return {
    ...result,
    display: {
      ...display,
      sizeRows: display.sizeRows.map((row: OrderSnapshotStockOrderDisplaySizeRow) : OrderSnapshotStockOrderDisplaySizeRow => ({ ...row })),
    },
  }
}

export function createOrderSnapshotAiComment(aiComment: OrderSnapshotAiComment): OrderSnapshotAiComment {
  const { prompt, answer, generatedAt }: OrderSnapshotAiComment = aiComment
  return { prompt, answer, generatedAt }
}

export function createOrderSnapshotConfirmed(confirmed: OrderSnapshotConfirmed): OrderSnapshotConfirmed {
  return {
    rounds: confirmed.rounds.map((round: OrderSnapshotConfirmedRound): OrderSnapshotConfirmedRound => ({
      date: round.date,
      qtyBySize: { ...round.qtyBySize },
    })),
  }
}

export function getOrderSnapshotConfirmedQtyBySize(confirmed: OrderSnapshotConfirmed): Record<string, number> {
  const totals: Record<string, number> = {}
  confirmed.rounds.forEach((round: OrderSnapshotConfirmedRound): void => {
    Object.entries(round.qtyBySize).forEach(([size, qty]: [string, number]): void => {
      totals[size] = (totals[size] ?? 0) + qty
    })
  })
  return totals
}

export function getOrderSnapshotConfirmedTotalQty(confirmed: OrderSnapshotConfirmed): number {
  return Object.values(getOrderSnapshotConfirmedQtyBySize(confirmed)).reduce((sum: number, qty: number): number => sum + qty, 0)
}

export function createOrderSnapshotComparisonRatioBySize(
  comparisonRatioBySize: ProductSecondaryDetail['comparisonRatioBySize'],
): OrderSnapshotComparisonRatioBySize {
  return { ...comparisonRatioBySize }
}

export function toProductPrimarySummaryFromSnapshotSummary(base: ProductPrimarySummary, summary: OrderSnapshotPrimarySummary): ProductPrimarySummary {
  return { ...base, ...summary }
}

export function createOrderSnapshotComparisonBasis(secondary: ProductSecondaryDetail): OrderSnapshotComparisonBasis {
  const { skuGroupKey, comparisonPrice, comparisonQty, comparisonRatioBySize }: ProductSecondaryDetail = secondary
  return {
    skuGroupKey,
    comparisonPrice,
    comparisonQty,
    comparisonRatioBySize: createOrderSnapshotComparisonRatioBySize(comparisonRatioBySize),
  }
}

export function toProductSecondaryDetailFromSnapshotBasis(base: ProductSecondaryDetail, basis: OrderSnapshotComparisonBasis): ProductSecondaryDetail {
  return { ...base, ...basis, comparisonRatioBySize: { ...basis.comparisonRatioBySize } }
}
