import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import {
  createOrderSnapshotCompetitorBasis,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockOrderRequest,
  createOrderSnapshotStockOrderResult,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
  type OrderSnapshotDocumentV2,
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
  aiPrompt: string
  aiComment: string
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
  sizeRows: SecondarySizeOrderDisplayRow[]
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
    aiPrompt,
    aiComment,
    unitPrice,
    unitCost,
    expectedFeeRatePct,
    sizeRows,
  } = params
  const orderQty = sizeRows.reduce((acc, row) => acc + Math.max(0, Math.round(row.confirmQty)), 0)
  const perUnitFee = Math.round((unitPrice * expectedFeeRatePct) / 100)
  const perUnitOpMargin = unitPrice - unitCost - perUnitFee
  const expectedSalesAmount = orderQty * unitPrice
  const expectedOpProfit = orderQty * perUnitOpMargin
  const summary = createOrderSnapshotPrimarySummary(primary)
  const storedStockOrderResult = createOrderSnapshotStockOrderResult(stockOrderResult)

  return {
    schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
    skuGroupKey: primary.skuGroupKey,
    ...(companyUuid ? { companyUuid } : {}),
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
      aiComment: {
        prompt: aiPrompt,
        answer: aiComment,
      },
      confirmedTotals: {
        orderQty,
        expectedSalesAmount,
        expectedOpProfit,
        expectedOpProfitRatePct: expectedSalesAmount > 0
          ? (expectedOpProfit / expectedSalesAmount) * 100
          : null,
      },
      sizeOrders: sizeRows.map((row) => ({
        size: row.size,
        selfSharePct: row.selfSharePct,
        competitorSharePct: row.competitorSharePct,
        blendedSharePct: row.blendedSharePct,
        forecastQty: row.forecastQty,
        recommendedQty: row.recommendedQty,
        confirmQty: row.confirmQty,
      })),
    },
  }
}
