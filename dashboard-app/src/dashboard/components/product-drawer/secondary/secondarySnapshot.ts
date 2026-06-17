import type { OrderSnapshotPrimarySummary } from '../../../../snapshot/orderSnapshotTypes'
import type { SecondaryStockOrderCalcResult } from '../../../../api/types'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import {
  createOrderSnapshotAiComment,
  createOrderSnapshotBaseSubject,
  createOrderSnapshotComparisonBasis,
  createOrderSnapshotComparisonSubject,
  createOrderSnapshotMonthlySalesTrend,
  createOrderSnapshotConfirmed,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockOrderRequest,
  createOrderSnapshotStockOrderResult,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
  type OrderSnapshotConfirmed,
  type OrderSnapshotDocument,
  type OrderSnapshotMonthlySalesTrendPoint,
  type OrderSnapshotSizeOrder,
  type OrderSnapshotStockOrderRequest,
  type OrderSnapshotBaseSubject,
  type OrderSnapshotComparisonSubject,
} from '../../../../snapshot/orderSnapshotTypes'
import type { SecondaryAiCommentView } from './model/secondaryAiCommentModel'
import type { SecondaryConfirmedRound } from './model/secondaryConfirmedRoundModel'
import type { SecondarySizeOrderDisplayRow } from './model/secondarySizeOrderRows'

export type BuildSecondaryOrderSnapshotParams = {
  primary: ProductPrimarySummary
  monthlySalesTrend: OrderSnapshotMonthlySalesTrendPoint[]
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  forecastMonths: number
  baseSubject: OrderSnapshotBaseSubject
  comparisonSubject: OrderSnapshotComparisonSubject
  selectedStart: string
  leadTimeDays: number
  stockOrderRequest: OrderSnapshotStockOrderRequest
  stockOrderResult: SecondaryStockOrderCalcResult | null
  selfWeightPct: number
  bufferStock: number
  aiComment: SecondaryAiCommentView
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
  sizeRows: SecondarySizeOrderDisplayRow[]
  confirmedRounds?: SecondaryConfirmedRound[]
}

export function buildSecondaryOrderSnapshot(params: BuildSecondaryOrderSnapshotParams): OrderSnapshotDocument {
  const {
    primary,
    monthlySalesTrend,
    secondary,
    periodStart,
    periodEnd,
    forecastMonths,
    baseSubject,
    comparisonSubject,
    selectedStart,
    leadTimeDays,
    stockOrderRequest,
    stockOrderResult,
    selfWeightPct,
    bufferStock,
    aiComment,
    unitPrice,
    unitCost,
    expectedFeeRatePct,
    sizeRows,
    confirmedRounds = [],
  }: BuildSecondaryOrderSnapshotParams = params
  const sizeOrders: OrderSnapshotSizeOrder[] = buildCurrentSnapshotSizeOrders(sizeRows)
  const confirmed: OrderSnapshotConfirmed = buildCurrentConfirmed(confirmedRounds, sizeRows, stockOrderRequest.currentOrderInboundDueDate)
  const summary: OrderSnapshotPrimarySummary = createOrderSnapshotPrimarySummary(primary)
  const storedStockOrderResult: SecondaryStockOrderCalcResult | undefined = createOrderSnapshotStockOrderResult(stockOrderResult)

  return {
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey: primary.skuGroupKey,
    savedAt: new Date().toISOString(),
    context: {
      periodStart,
      periodEnd,
      forecastMonths,
      dailyTrendStartMonth: selectedStart,
      dailyTrendLeadTimeDays: leadTimeDays,
    },
    drawer1: {
      summary,
      monthlySalesTrend: createOrderSnapshotMonthlySalesTrend(monthlySalesTrend),
    },
    drawer2: {
      baseSubject: createOrderSnapshotBaseSubject(baseSubject),
      comparisonSubject: createOrderSnapshotComparisonSubject(comparisonSubject),
      comparisonBasis: createOrderSnapshotComparisonBasis(secondary),
      stockOrderRequest: createOrderSnapshotStockOrderRequest(stockOrderRequest),
      ...(storedStockOrderResult == null ? {} : { stockOrderResult: storedStockOrderResult }),
      unitEconomics: {
        unitPrice,
        unitCost,
        expectedFeeRatePct,
      },
      selfWeightPct,
      bufferStock,
      aiComment: createOrderSnapshotAiComment(aiComment),
      confirmed,
      sizeOrders,
    },
  }
}

function buildCurrentSnapshotSizeOrders(sizeRows: SecondarySizeOrderDisplayRow[]): OrderSnapshotSizeOrder[] {
  return sizeRows.map((row: SecondarySizeOrderDisplayRow) : OrderSnapshotSizeOrder => ({
    size: row.size,
    baseSharePct: row.baseSharePct,
    comparisonSharePct: row.comparisonSharePct,
    blendedSharePct: row.blendedSharePct,
    forecastQty: row.forecastQty,
    recommendedQty: row.recommendedQty,
  }))
}

function buildCurrentConfirmed(confirmedRounds: SecondaryConfirmedRound[], sizeRows: SecondarySizeOrderDisplayRow[], defaultDate: string): OrderSnapshotConfirmed {
  if (confirmedRounds.length > 0) return createOrderSnapshotConfirmed({ rounds: confirmedRounds })
  if (sizeRows.length === 0) return { rounds: [] }
  return createOrderSnapshotConfirmed({
    rounds: [{
      date: defaultDate,
      qtyBySize: Object.fromEntries(sizeRows.map((row: SecondarySizeOrderDisplayRow): [string, number] => [row.size, row.confirmQty])),
    }],
  })
}
