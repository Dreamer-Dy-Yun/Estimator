import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import {
  createOrderSnapshotCompetitorSalesBasis,
  createOrderSnapshotPrimarySummary,
  createOrderSnapshotStockInputs,
  ORDER_SNAPSHOT_SCHEMA_VERSION,
  type OrderSnapshotDocumentV2,
  type OrderSnapshotStockDisplayV1,
} from '../../../../snapshot/orderSnapshotTypes'
import type { SecondaryForecastInputs } from './secondaryDrawerTypes'

export type SecondarySnapshotSizeRow = {
  size: string
  selfSharePct: number
  competitorSharePct: number
  blendedSharePct: number
  forecastQty: number
  recommendedQty: number
  confirmQty: number
}

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
  forecastInputs: SecondaryForecastInputs
  stockDisplay: OrderSnapshotStockDisplayV1 | null
  selfWeightPct: number
  bufferStock: number
  aiPrompt: string
  aiComment: string
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
  sizeRows: SecondarySnapshotSizeRow[]
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
    forecastInputs,
    stockDisplay,
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
  const storedStockInputs = createOrderSnapshotStockInputs(forecastInputs)
  const storedStockDisplay = stockDisplay == null ? undefined : {
    currentStockQtyTotal: stockDisplay.currentStockQtyTotal,
    totalOrderBalanceTotal: stockDisplay.totalOrderBalanceTotal,
    expectedInboundOrderBalanceTotal: stockDisplay.expectedInboundOrderBalanceTotal,
    currentStockQtyBySize: [...stockDisplay.currentStockQtyBySize],
    totalOrderBalanceBySize: [...stockDisplay.totalOrderBalanceBySize],
    expectedInboundOrderBalanceBySize: [...stockDisplay.expectedInboundOrderBalanceBySize],
  }

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
      competitorSalesBasis: createOrderSnapshotCompetitorSalesBasis(secondary),
      competitorChannelId,
      competitorChannelLabel,
      stockInputs: storedStockInputs,
      orderUnitInputs: {
        unitPrice,
        unitCost,
        expectedFeeRatePct,
      },
      ...(storedStockDisplay == null ? {} : { stockDisplay: storedStockDisplay }),
      selfWeightPct,
      bufferStock,
      llmPrompt: aiPrompt,
      llmAnswer: aiComment,
      confirmedTotals: {
        orderQty,
        expectedSalesAmount,
        expectedOpProfit,
        expectedOpProfitRatePct: expectedSalesAmount > 0
          ? (expectedOpProfit / expectedSalesAmount) * 100
          : null,
      },
      sizeRows: sizeRows.map((row) => ({
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
