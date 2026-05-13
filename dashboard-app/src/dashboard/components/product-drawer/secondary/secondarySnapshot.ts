import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import { ORDER_SNAPSHOT_SCHEMA_VERSION, type OrderSnapshotDocumentV1 } from '../../../../snapshot/orderSnapshotTypes'
import type { SalesKpiColumn, SecondaryForecastDerived, SecondaryForecastInputs } from './secondaryDrawerTypes'

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
  selectedStart: string
  leadTimeDays: number
  competitorChannelId: string
  competitorChannelLabel: string
  selfCol: SalesKpiColumn
  compCol: SalesKpiColumn
  forecastInputs: SecondaryForecastInputs
  forecastDerived: SecondaryForecastDerived
  selfWeightPct: number
  bufferStock: number
  aiPrompt: string
  aiComment: string
  unitPrice: number
  unitCost: number
  expectedFeeRatePct: number
  sizeRows: SecondarySnapshotSizeRow[]
}

export function buildSecondaryOrderSnapshot({
  primary,
  secondary,
  periodStart,
  periodEnd,
  forecastMonths,
  selectedStart,
  leadTimeDays,
  competitorChannelId,
  competitorChannelLabel,
  selfCol,
  compCol,
  forecastInputs,
  forecastDerived,
  selfWeightPct,
  bufferStock,
  aiPrompt,
  aiComment,
  unitPrice,
  unitCost,
  expectedFeeRatePct,
  sizeRows,
}: BuildSecondaryOrderSnapshotParams): OrderSnapshotDocumentV1 {
  const orderQty = sizeRows.reduce((acc, row) => acc + Math.max(0, Math.round(row.confirmQty)), 0)
  const perUnitFee = Math.round((unitPrice * expectedFeeRatePct) / 100)
  const perUnitOpMargin = unitPrice - unitCost - perUnitFee
  const expectedSalesAmount = orderQty * unitPrice
  const expectedOpProfit = orderQty * perUnitOpMargin
  const { monthlySalesTrend, ...summary } = primary
  void monthlySalesTrend

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
      secondary,
      competitorChannelId,
      competitorChannelLabel,
      minOpMarginPct: null,
      salesSelf: selfCol,
      salesCompetitor: compCol,
      stockInputs: forecastInputs,
      stockDerived: forecastDerived,
      selfWeightPct,
      sizeForecastSource: 'forecastQty',
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

