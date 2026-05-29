import { useMemo } from 'react'
import type { SecondaryStockOrderCalcResult } from '../../../../../api/types'
import type { OrderSnapshotSizeOrderV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { ProductSecondaryDetail } from '../../../../../types'
import { SecondaryOrderDraft } from '../model/SecondaryOrderDraft'
import {
  buildDailyTrendSizeOptions,
  buildSecondarySizeOrderRows,
  buildSecondarySizeShares,
  type SecondarySizeOrderDisplayRow,
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
  snapshotSizeOrders?: OrderSnapshotSizeOrderV2[] | null
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
    if (useSnapshotConfirmBaseline && snapshotSizeOrders != null) {
      return snapshotSizeOrders.map<SecondarySizeOrderDisplayRow>((row) => ({
        size: row.size,
        selfSharePct: row.selfSharePct,
        competitorSharePct: row.competitorSharePct,
        blendedSharePct: row.blendedSharePct,
        forecastQty: row.forecastQty,
        recommendedQty: row.recommendedQty,
        confirmQty: orderDraft.confirmQty(row.size, row.recommendedQty),
      }))
    }
    const readyForecastCalc = calculationReady ? forecastCalc : null
    if (readyForecastCalc == null) {
      return sizeShares.map<SecondarySizeOrderDisplayRow>((row) => ({
        size: row.size,
        selfSharePct: row.selfSharePct,
        competitorSharePct: row.competitorSharePct,
        blendedSharePct: row.blendedSharePct,
        forecastQty: 0,
        recommendedQty: 0,
        confirmQty: 0,
      }))
    }
    const display = readyForecastCalc?.display ?? null
    const dailyMeanEa = dailyMeanClient ?? readyForecastCalc.dailyMean
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
