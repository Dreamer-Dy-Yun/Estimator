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
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  dailyMeanClient: number | null
  stockOrderCalc: SecondaryStockOrderCalcResult | null
  stockOrderCalculationReady?: boolean
  selfWeightPct: number
  bufferStock: number
  confirmBySize: Record<string, number>
  snapshotConfirmBySize: Record<string, number>
  useSnapshotDataBaseline: boolean
  snapshotSizeOrders?: SecondarySizeOrderRestoreRow[] | null
}

export function useSecondaryOrderCalculations({
  secondary,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  dailyMeanClient,
  stockOrderCalc,
  stockOrderCalculationReady,
  selfWeightPct,
  bufferStock,
  confirmBySize,
  snapshotConfirmBySize,
  useSnapshotDataBaseline,
  snapshotSizeOrders,
}: Args) : { stockOrderCalculationReady: boolean; stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; }; sizeRows: SecondarySizeOrderDisplayRow[]; manualConfirmDerived: Record<string, true>; dailyTrendSizeOptions: { id: string; label: string; share: number; }[]; } {
  const calculationReady: boolean = stockOrderCalculationReady == null
    ? stockOrderCalc != null
    : stockOrderCalculationReady && stockOrderCalc != null
  const stockOrderDisplayInputs: { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; } = useMemo(() : { trendDailyMean: null; dailyMean: null; sigma: null; } | { trendDailyMean: number; dailyMean: number; sigma: number; } => {
    if (!calculationReady || stockOrderCalc == null) {
      return {
        trendDailyMean: null,
        dailyMean: null,
        sigma: null,
      }
    }
    return {
      trendDailyMean: stockOrderCalc.trendDailyMean,
      dailyMean: dailyMeanClient ?? stockOrderCalc.dailyMean,
      sigma: stockOrderCalc.sigma,
    }
  }, [
    calculationReady,
    dailyMeanClient,
    stockOrderCalc,
  ])

  const orderDraft: SecondaryOrderDraft = useMemo(
    () : SecondaryOrderDraft => new SecondaryOrderDraft({
      mode: useSnapshotDataBaseline ? 'snapshot' : 'live',
      manualConfirmBySize: confirmBySize,
      snapshotConfirmBySize,
    }),
    [confirmBySize, snapshotConfirmBySize, useSnapshotDataBaseline],
  )

  const sizeShares: SecondarySizeShare[] = useMemo(
    () : SecondarySizeShare[] => buildSecondarySizeShares(secondary, selfWeightPct),
    [secondary, selfWeightPct],
  )

  const sizeRows: SecondarySizeOrderDisplayRow[] = useMemo(() : SecondarySizeOrderDisplayRow[] => {
    if (useSnapshotDataBaseline && snapshotSizeOrders != null) {
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
    const readyStockOrderCalc: SecondaryStockOrderCalcResult | null = calculationReady ? stockOrderCalc : null
    if (readyStockOrderCalc == null) {
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
    const display: { currentStockQtyTotal: number; totalOrderBalanceTotal: number; expectedInboundOrderBalanceTotal: number; sizeRows: SecondaryStockOrderDisplaySizeRow[]; } = readyStockOrderCalc?.display ?? null
    const dailyMeanEa: number = dailyMeanClient ?? readyStockOrderCalc.dailyMean
    return buildSecondarySizeOrderRows({
      shares: sizeShares,
      dailyMeanEa,
      currentOrderInboundDueDate,
      nextOrderInboundDueDate,
      inboundSplitSource: readyStockOrderCalc.inboundSplitSource,
      stockOrderSizeRows: display?.sizeRows ?? [],
      bufferStock,
      orderDraft,
    })
  }, [
    bufferStock,
    calculationReady,
    currentOrderInboundDueDate,
    dailyMeanClient,
    stockOrderCalc,
    nextOrderInboundDueDate,
    orderDraft,
    snapshotSizeOrders,
    sizeShares,
    useSnapshotDataBaseline,
  ])

  return {
    stockOrderCalculationReady: calculationReady,
    stockOrderDisplayInputs,
    sizeRows,
    manualConfirmDerived: orderDraft.manualFlags(),
    dailyTrendSizeOptions: buildDailyTrendSizeOptions(secondary.sizeRows),
  }
}
