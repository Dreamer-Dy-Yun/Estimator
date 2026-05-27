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
  stockOrderCalculationReady?: boolean
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
  stockOrderCalculationReady,
  selfWeightPct,
  bufferStock,
  confirmBySize,
  snapshotConfirmBySize,
  useSnapshotConfirmBaseline,
}: Args) {
  const calculationReady = stockOrderCalculationReady == null
    ? forecastCalc != null
    : stockOrderCalculationReady && forecastCalc != null
  const stockOrderDisplayInputs = useMemo(() => {
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
    const readyForecastCalc = calculationReady ? forecastCalc : null
    const display = readyForecastCalc?.display ?? null
    const dailyMeanEa = readyForecastCalc == null
      ? 0
      : dailyMeanClient ?? readyForecastCalc.dailyMean
    return buildSecondarySizeOrderRows({
      shares: sizeShares,
      dailyMeanEa,
      forecastSalesHorizonDays,
      currentStockBySize: display?.currentStockQtyBySize ?? [],
      expectedInboundBySize: display?.expectedInboundOrderBalanceBySize ?? [],
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
    sizeShares,
  ])

  return {
    stockOrderCalculationReady: calculationReady,
    stockOrderDisplayInputs,
    sizeRows,
    manualConfirmDerived: orderDraft.manualFlags(),
    dailyTrendSizeOptions: buildDailyTrendSizeOptions(secondary.sizeRows),
  }
}
