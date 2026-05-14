import { useMemo } from 'react'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import { computeClientStockOrder } from '../model/clientStockOrderCompute'
import { SecondaryOrderDraft } from '../model/SecondaryOrderDraft'
import {
  buildDailyTrendSizeOptions,
  buildSecondarySizeOrderRows,
  buildSecondarySizeShares,
} from '../model/secondarySizeOrderRows'
import type { SecondaryForecastCalc } from '../secondaryDrawerTypes'

type Args = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  selectedStart: string
  selectedEnd: string
  forecastMeanPeriodEnd: string
  leadTimeStartDate: string
  leadTimeEndDate: string
  leadTimeDays: number
  forecastSalesHorizonDays: number
  serviceLevelPct: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  dailyMeanClient: number | null
  forecastCalc: SecondaryForecastCalc | null
  selfWeightPct: number
  bufferStock: number
  confirmBySize: Record<string, number>
  snapshotConfirmBySize: Record<string, number>
  snapshotInfoMode: boolean
}

export function useSecondaryOrderCalculations({
  primary,
  secondary,
  selectedStart,
  selectedEnd,
  forecastMeanPeriodEnd,
  leadTimeStartDate,
  leadTimeEndDate,
  leadTimeDays,
  forecastSalesHorizonDays,
  serviceLevelPct,
  safetyStockMode,
  manualSafetyStock,
  dailyMeanClient,
  forecastCalc,
  selfWeightPct,
  bufferStock,
  confirmBySize,
  snapshotConfirmBySize,
  snapshotInfoMode,
}: Args) {
  const monthlySalesTrend = useMemo(() => primary.monthlySalesTrend ?? [], [primary.monthlySalesTrend])
  const clientStock = useMemo(
    () =>
      computeClientStockOrder({
        monthlySalesTrend,
        periodStart: selectedStart,
        periodEnd: selectedEnd,
        forecastPeriodEnd: forecastMeanPeriodEnd,
        serviceLevelPct,
        leadTimeDays,
        safetyStockMode,
        manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
        dailyMeanClient,
        availableStock: primary.availableStock,
        price: primary.price,
      }),
    [
      monthlySalesTrend,
      primary.availableStock,
      primary.price,
      selectedStart,
      selectedEnd,
      forecastMeanPeriodEnd,
      serviceLevelPct,
      leadTimeDays,
      safetyStockMode,
      manualSafetyStock,
      dailyMeanClient,
    ],
  )
  const forecastInputs = useMemo(() => ({
    trendDailyMean: forecastCalc?.trendDailyMean ?? clientStock.trendDailyMean,
    dailyMean: dailyMeanClient ?? forecastCalc?.dailyMean ?? clientStock.forecastDailyMean,
    sigma: forecastCalc?.sigma ?? clientStock.sigma,
    serviceLevelPct,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
  }), [
    forecastCalc?.dailyMean,
    forecastCalc?.sigma,
    forecastCalc?.trendDailyMean,
    clientStock.forecastDailyMean,
    clientStock.sigma,
    clientStock.trendDailyMean,
    dailyMeanClient,
    leadTimeDays,
    leadTimeEndDate,
    leadTimeStartDate,
    manualSafetyStock,
    safetyStockMode,
    serviceLevelPct,
  ])
  const forecastDerived = useMemo(() => ({
    safetyStock: forecastCalc?.safetyStockCalc.safetyStock ?? clientStock.safetyStock,
    recommendedOrderQty: forecastCalc?.safetyStockCalc.recommendedOrderQty ?? clientStock.safetyRecQty,
    expectedOrderAmount: forecastCalc?.safetyStockCalc.expectedOrderAmount ?? clientStock.safetyExpectedOrderAmount,
    expectedSalesAmount: forecastCalc?.safetyStockCalc.expectedSalesAmount ?? clientStock.safetyExpectedSalesAmount,
    expectedOpProfit: forecastCalc?.safetyStockCalc.expectedOpProfit ?? clientStock.safetyExpectedOpProfit,
  }), [
    forecastCalc?.safetyStockCalc.expectedOpProfit,
    forecastCalc?.safetyStockCalc.expectedOrderAmount,
    forecastCalc?.safetyStockCalc.expectedSalesAmount,
    forecastCalc?.safetyStockCalc.recommendedOrderQty,
    forecastCalc?.safetyStockCalc.safetyStock,
    clientStock.safetyExpectedOpProfit,
    clientStock.safetyExpectedOrderAmount,
    clientStock.safetyExpectedSalesAmount,
    clientStock.safetyRecQty,
    clientStock.safetyStock,
  ])
  const orderDraft = useMemo(
    () => new SecondaryOrderDraft({
      mode: snapshotInfoMode ? 'snapshot' : 'live',
      manualConfirmBySize: confirmBySize,
      snapshotConfirmBySize,
    }),
    [confirmBySize, snapshotConfirmBySize, snapshotInfoMode],
  )
  const sizeAgg = useMemo(() => buildSecondarySizeShares(primary, secondary, selfWeightPct), [primary, secondary, selfWeightPct])
  const sizeRows = useMemo(() => {
    const dailyMeanEa = dailyMeanClient ?? forecastCalc?.dailyMean ?? clientStock.forecastMuRaw
    return buildSecondarySizeOrderRows({
      shares: sizeAgg,
      dailyMeanEa,
      forecastSalesHorizonDays,
      currentStockBySize: forecastCalc?.display.currentStockQtyBySize ?? [],
      expectedInboundBySize: forecastCalc?.display.expectedInboundOrderBalanceBySize ?? [],
      bufferStock,
      orderDraft,
    })
  }, [
    bufferStock,
    clientStock.forecastMuRaw,
    dailyMeanClient,
    forecastCalc,
    forecastSalesHorizonDays,
    orderDraft,
    sizeAgg,
  ])

  return {
    forecastInputs,
    forecastDerived,
    sizeRows,
    manualConfirmDerived: orderDraft.manualFlags(),
    dailyTrendSizeOptions: buildDailyTrendSizeOptions(primary.sizeMix),
  }
}
