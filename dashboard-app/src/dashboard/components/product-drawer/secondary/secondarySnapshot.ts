import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import {
  createOrderSnapshotCompetitorBasis,
  createOrderSnapshotAiComment,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockOrderRequest,
  createOrderSnapshotStockOrderResult,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
  type OrderSnapshotConfirmedTotalsV2,
  type OrderSnapshotAiCommentV2,
  type OrderSnapshotDocumentV2,
  type OrderSnapshotSizeOrderV2,
  type OrderSnapshotStockOrderRequestV2,
  type OrderSnapshotStockOrderResultV2,
} from '../../../../snapshot/orderSnapshotTypes'
import type { SecondarySizeOrderDisplayRow } from './model/secondarySizeOrderRows'

export type BuildSecondaryOrderSnapshotParams = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  forecastMonths: number
  companyUuid?: string
  selectedStart: string
  leadTimeDays: number
  competitorChannelId: string
  competitorChannelLabel: string
  stockOrderRequest: OrderSnapshotStockOrderRequestV2
  stockOrderResult: OrderSnapshotStockOrderResultV2 | null
  selfWeightPct: number
  bufferStock: number
  aiComment: OrderSnapshotAiCommentV2
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
  sizeRows: SecondarySizeOrderDisplayRow[]
}

type ConfirmedTotalsInput = {
  sizeOrders: OrderSnapshotSizeOrderV2[]
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
}

export function buildSecondaryOrderSnapshot(params: BuildSecondaryOrderSnapshotParams): OrderSnapshotDocumentV2 {
  const {
    primary,
    secondary,
    periodStart,
    periodEnd,
    forecastMonths,
    companyUuid,
    selectedStart,
    leadTimeDays,
    competitorChannelId,
    competitorChannelLabel,
    stockOrderRequest,
    stockOrderResult,
    selfWeightPct,
    bufferStock,
    aiComment,
    unitPrice,
    unitCost,
    expectedFeeRatePct,
    sizeRows,
  } = params
  const sizeOrders = buildCurrentSnapshotSizeOrders(sizeRows)
  const confirmedTotals = buildCurrentConfirmedTotals({
    sizeOrders,
    unitPrice,
    unitCost,
    expectedFeeRatePct,
  })
  const summary = createOrderSnapshotPrimarySummary(primary)
  const storedStockOrderResult = createOrderSnapshotStockOrderResult(stockOrderResult)

  return {
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey: primary.skuGroupKey,
    ...createSnapshotCompanyScope(companyUuid),
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
      competitorBasis: createOrderSnapshotCompetitorBasis(secondary),
      competitorChannelId,
      competitorChannelLabel,
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

function buildCurrentSnapshotSizeOrders(sizeRows: SecondarySizeOrderDisplayRow[]): OrderSnapshotSizeOrderV2[] {
  return sizeRows.map((row) => ({
    size: row.size,
    selfSharePct: row.selfSharePct,
    competitorSharePct: row.competitorSharePct,
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
}: ConfirmedTotalsInput): OrderSnapshotConfirmedTotalsV2 {
  const orderQty = sumCurrentSizeOrderConfirmQty(sizeOrders)
  const perUnitFee = Math.round((unitPrice * expectedFeeRatePct) / 100)
  const perUnitOpMargin = unitPrice - unitCost - perUnitFee
  const expectedSalesAmount = orderQty * unitPrice
  const expectedOpProfit = orderQty * perUnitOpMargin

  return {
    orderQty,
    expectedSalesAmount,
    expectedOpProfit,
    expectedOpProfitRatePct: expectedSalesAmount > 0
      ? (expectedOpProfit / expectedSalesAmount) * 100
      : null,
  }
}

function sumCurrentSizeOrderConfirmQty(sizeOrders: Pick<OrderSnapshotSizeOrderV2, 'confirmQty'>[]): number {
  return sizeOrders.reduce((acc, row) => acc + row.confirmQty, 0)
}

function createSnapshotCompanyScope(companyUuid: string | undefined): Pick<OrderSnapshotDocumentV2, 'companyUuid'> | Record<string, never> {
  if (companyUuid === undefined) return {}
  if (!companyUuid) throw new Error('companyUuid must be a non-empty string when provided')
  return { companyUuid }
}
