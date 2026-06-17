import type { SecondaryStockOrderDisplaySizeRow } from '../../../../../api/types/secondary'
import type { SecondarySizeShare } from '../model/secondarySizeOrderRows'
import { useMemo } from 'react'
import type { SecondaryStockOrderCalcResult } from '../../../../../api/types'
import type { ProductSecondaryDetail } from '../../../../../types'
import { SecondaryOrderDraft } from '../model/SecondaryOrderDraft'
import {
  buildDailyTrendSizeOptions,
  buildSecondarySizeOrderRows,
  buildSecondarySizeShares,
  type SecondarySizeOrderDisplayRow,
  type SecondarySizeOrderRestoreRow,
} from '../model/secondarySizeOrderRows'

export type Args = {
  secondary: ProductSecondaryDetail
  forecastSalesHorizonDays: number
  dailyMeanClient: number | null
  forecastCalc: SecondaryStockOrderCalcResult | null
  stockOrderCalculationReady?: boolean
  selfWeightPct: number
  bufferStock: number
  confirmBySize: Record<string, number>
  snapshotConfirmBySize: Record<string, number>
  useSnapshotConfirmBaseline: boolean
  snapshotSizeOrders?: SecondarySizeOrderRestoreRow[] | null
}

export function useSecondaryOrderCalculations({
  secondary,
  forecastSalesHorizonDays,
  dailyMeanClient,
  forecastCalc,
  stockOrderCalculationReady,
  selfWeightPct,
  bufferStock,
  confirmBySize,
  snapshotConfirmBySize,
  useSnapshotConfirmBaseline,
  snapshotSizeOrders,
}: Args) : { stockOrderCalculationReady: boolean; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; } {
  const calculationReady: boolean = stockOrderCalculationReady == null
    ? forecastCalc != null
    : stockOrderCalculationReady && forecastCalc != null
  const stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; } = useMemo(() : { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; } => {
    if (!calculationReady || forecastCalc == null) {
      return {
        trendDailyMean: null,
        dailyMean: null,
        sigma: null,
      }
    }
    return {
      trendDailyMean: forecastCalc.trendDailyMean,
      dailyMean: dailyMeanClient ?? forecastCalc.dailyMean,
      sigma: forecastCalc.sigma,
    }
  }, [
    calculationReady,
    dailyMeanClient,
    forecastCalc,
  ])

  const orderDraft: SecondaryOrderDraft = useMemo(
    () : SecondaryOrderDraft => new SecondaryOrderDraft({
      mode: useSnapshotConfirmBaseline ? 'snapshot' : 'live',
      manualConfirmBySize: confirmBySize,
      snapshotConfirmBySize,
    }),
    [confirmBySize, snapshotConfirmBySize, useSnapshotConfirmBaseline],
  )

  const sizeShares: SecondarySizeShare[] = useMemo(
    () : SecondarySizeShare[] => buildSecondarySizeShares(secondary, selfWeightPct),
    [secondary, selfWeightPct],
  )

  const sizeRows: SecondarySizeOrderDisplayRow[] = useMemo(() : SecondarySizeOrderDisplayRow[] => {
    if (useSnapshotConfirmBaseline && snapshotSizeOrders != null) {
      return snapshotSizeOrders.map<SecondarySizeOrderDisplayRow>((row: SecondarySizeOrderRestoreRow) : { size: string; baseSharePct: number; comparisonSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; confirmQty: number; } => ({
        size: row.size,
        baseSharePct: row.baseSharePct,
        comparisonSharePct: row.comparisonSharePct,
        blendedSharePct: row.blendedSharePct,
        forecastQty: row.forecastQty,
        recommendedQty: row.recommendedQty,
        confirmQty: orderDraft.confirmQty(row.size, row.recommendedQty),
      }))
    }
    const readyForecastCalc: SecondaryStockOrderCalcResult | null = calculationReady ? forecastCalc : null
    if (readyForecastCalc == null) {
      return sizeShares.map<SecondarySizeOrderDisplayRow>((row: SecondarySizeShare) : { size: string; baseSharePct: number; comparisonSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; confirmQty: number; } => ({
        size: row.size,
        baseSharePct: row.baseSharePct,
        comparisonSharePct: row.comparisonSharePct,
        blendedSharePct: row.blendedSharePct,
        forecastQty: 0,
        recommendedQty: 0,
        confirmQty: 0,
      }))
    }
    const display: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } = readyForecastCalc?.display ?? null
    const dailyMeanEa: number = dailyMeanClient ?? readyForecastCalc.dailyMean
    return buildSecondarySizeOrderRows({
      shares: sizeShares,
      dailyMeanEa,
      forecastSalesHorizonDays,
      stockOrderSizeRows: display?.sizeRows ?? [],
      bufferStock,
      orderDraft,
    })
  }, [
    bufferStock,
    calculationReady,
    dailyMeanClient,
    forecastCalc,
    forecastSalesHorizonDays,
    orderDraft,
    snapshotSizeOrders,
    sizeShares,
    useSnapshotConfirmBaseline,
  ])

  return {
    stockOrderCalculationReady: calculationReady,
    stockOrderDisplayInputs,
    sizeRows,
    manualConfirmDerived: orderDraft.manualFlags(),
    dailyTrendSizeOptions: buildDailyTrendSizeOptions(secondary.sizeRows),
  }
}
