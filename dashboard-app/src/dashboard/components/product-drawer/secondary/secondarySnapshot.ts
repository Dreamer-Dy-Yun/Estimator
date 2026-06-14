import type { OrderSnapshotPrimarySummary } from '../../../../snapshot/orderSnapshotTypes'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import {
  createOrderSnapshotAiComment,
  createOrderSnapshotBaseSubject,
  createOrderSnapshotComparisonBasis,
  createOrderSnapshotComparisonSubject,
  createOrderSnapshotConfirmed,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockOrderRequest,
  createOrderSnapshotStockOrderResult,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
  type OrderSnapshotConfirmed,
  type OrderSnapshotConfirmedRound,
  type OrderSnapshotAiComment,
  type OrderSnapshotDocument,
  type OrderSnapshotSizeOrder,
  type OrderSnapshotStockOrderRequest,
  type OrderSnapshotStockOrderResult,
  type OrderSnapshotBaseSubject,
  type OrderSnapshotComparisonSubject,
} from '../../../../snapshot/orderSnapshotTypes'
import type { SecondarySizeOrderDisplayRow } from './model/secondarySizeOrderRows'

export type BuildSecondaryOrderSnapshotParams = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  forecastMonths: number
  baseSubject: OrderSnapshotBaseSubject
  comparisonSubject: OrderSnapshotComparisonSubject
  selectedStart: string
  leadTimeDays: number
  stockOrderRequest: OrderSnapshotStockOrderRequest
  stockOrderResult: OrderSnapshotStockOrderResult | null
  selfWeightPct: number
  bufferStock: number
  aiComment: OrderSnapshotAiComment
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
  sizeRows: SecondarySizeOrderDisplayRow[]
  confirmedRounds?: OrderSnapshotConfirmedRound[]
}

export function buildSecondaryOrderSnapshot(params: BuildSecondaryOrderSnapshotParams): OrderSnapshotDocument {
  const {
    primary,
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
  const storedStockOrderResult: OrderSnapshotStockOrderResult | undefined = createOrderSnapshotStockOrderResult(stockOrderResult)

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

function buildCurrentConfirmed(confirmedRounds: OrderSnapshotConfirmedRound[], sizeRows: SecondarySizeOrderDisplayRow[], defaultDate: string): OrderSnapshotConfirmed {
  if (confirmedRounds.length > 0) return createOrderSnapshotConfirmed({ rounds: confirmedRounds })
  if (sizeRows.length === 0) return { rounds: [] }
  return createOrderSnapshotConfirmed({
    rounds: [{
      date: defaultDate,
      qtyBySize: Object.fromEntries(sizeRows.map((row: SecondarySizeOrderDisplayRow): [string, number] => [row.size, row.confirmQty])),
    }],
  })
}
