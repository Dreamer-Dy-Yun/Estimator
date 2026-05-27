import { useMemo } from 'react'
import type { SecondaryStockOrderCalcResult } from '../../../../../api/types'
import type { ProductSecondaryDetail } from '../../../../../types'
import { SecondaryOrderDraft } from '../model/SecondaryOrderDraft'
import {
  buildDailyTrendSizeOptions,
  buildSecondarySizeOrderRows,
  buildSecondarySizeShares,
} from '../model/secondarySizeOrderRows'

type Args = {
  secondary: ProductSecondaryDetail
  forecastSalesHorizonDays: number
  dailyMeanClient: number | null
  forecastCalc: SecondaryStockOrderCalcResult | null
  selfWeightPct: number
  bufferStock: number
  confirmBySize: Record<string, number>
  snapshotConfirmBySize: Record<string, number>
  useSnapshotConfirmBaseline: boolean
}

export function useSecondaryOrderCalculations({
  secondary,
  forecastSalesHorizonDays,
  dailyMeanClient,
  forecastCalc,
  selfWeightPct,
  bufferStock,
  confirmBySize,
  snapshotConfirmBySize,
  useSnapshotConfirmBaseline,
}: Args) {
  const stockOrderDisplayInputs = useMemo(() => ({
    trendDailyMean: forecastCalc?.trendDailyMean ?? 0,
    dailyMean: dailyMeanClient ?? forecastCalc?.dailyMean ?? 0,
    sigma: forecastCalc?.sigma ?? 0,
  }), [
    dailyMeanClient,
    forecastCalc?.dailyMean,
    forecastCalc?.sigma,
    forecastCalc?.trendDailyMean,
  ])

  const orderDraft = useMemo(
    () => new SecondaryOrderDraft({
      mode: useSnapshotConfirmBaseline ? 'snapshot' : 'live',
      manualConfirmBySize: confirmBySize,
      snapshotConfirmBySize,
    }),
    [confirmBySize, snapshotConfirmBySize, useSnapshotConfirmBaseline],
  )

  const sizeShares = useMemo(
    () => buildSecondarySizeShares(secondary, selfWeightPct),
    [secondary, selfWeightPct],
  )

  const sizeRows = useMemo(() => {
    const dailyMeanEa = dailyMeanClient ?? forecastCalc?.dailyMean ?? 0
    return buildSecondarySizeOrderRows({
      shares: sizeShares,
      dailyMeanEa,
      forecastSalesHorizonDays,
      currentStockBySize: forecastCalc?.display.currentStockQtyBySize ?? [],
      expectedInboundBySize: forecastCalc?.display.expectedInboundOrderBalanceBySize ?? [],
      bufferStock,
      orderDraft,
    })
  }, [
    bufferStock,
    dailyMeanClient,
    forecastCalc,
    forecastSalesHorizonDays,
    orderDraft,
    sizeShares,
  ])

  return {
    stockOrderDisplayInputs,
    sizeRows,
    manualConfirmDerived: orderDraft.manualFlags(),
    dailyTrendSizeOptions: buildDailyTrendSizeOptions(secondary.sizeRows),
  }
}
