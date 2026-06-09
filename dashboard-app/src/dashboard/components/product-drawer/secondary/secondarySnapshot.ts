import type { OrderSnapshotPrimarySummary } from '../../../../snapshot/orderSnapshotTypes'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import {
  createOrderSnapshotAiComment,
  createOrderSnapshotBaseSubject,
  createOrderSnapshotComparisonBasis,
  createOrderSnapshotComparisonSubject,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockOrderRequest,
  createOrderSnapshotStockOrderResult,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
  type OrderSnapshotConfirmedTotals,
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
}

export type ConfirmedTotalsInput = {
  sizeOrders: OrderSnapshotSizeOrder[]
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
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
  }: BuildSecondaryOrderSnapshotParams = params
  const sizeOrders: OrderSnapshotSizeOrder[] = buildCurrentSnapshotSizeOrders(sizeRows)
  const confirmedTotals: OrderSnapshotConfirmedTotals = buildCurrentConfirmedTotals({
    sizeOrders,
    unitPrice,
    unitCost,
    expectedFeeRatePct,
  })
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
      confirmedTotals,
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
    confirmQty: row.confirmQty,
  }))
}

function buildCurrentConfirmedTotals({
  sizeOrders,
  unitPrice,
  unitCost,
  expectedFeeRatePct,
}: ConfirmedTotalsInput): OrderSnapshotConfirmedTotals {
  const orderQty: number = sumCurrentSizeOrderConfirmQty(sizeOrders)
  const perUnitFee: number = Math.round((unitPrice * expectedFeeRatePct) / 100)
  const perUnitOpMargin: number = unitPrice - unitCost - perUnitFee
  const expectedSalesAmount: number = orderQty * unitPrice
  const expectedOpProfit: number = orderQty * perUnitOpMargin

  return {
    orderQty,
    expectedSalesAmount,
    expectedOpProfit,
    expectedOpProfitRatePct: expectedSalesAmount > 0
      ? (expectedOpProfit / expectedSalesAmount) * 100
      : null,
  }
}

function sumCurrentSizeOrderConfirmQty(sizeOrders: Pick<OrderSnapshotSizeOrder, 'confirmQty'>[]): number {
  return sizeOrders.reduce((acc: number, row: Pick<OrderSnapshotSizeOrder, 'confirmQty'>) : number => acc + row.confirmQty, 0)
}
