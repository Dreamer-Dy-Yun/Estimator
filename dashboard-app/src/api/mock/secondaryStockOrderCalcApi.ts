import type { SecondaryStockOrderCalcParams, SecondaryStockOrderCalcResult } from '../types'
import { productPrimaryBySkuGroupKey } from './productCatalog'
import { scopeMockProductPrimary } from './mockCompanyScope'
import { dailyMeanSigma, forecastDailyMeanFromModel, zFromServiceLevelPct } from './secondaryDailyTrend'
import { sleep } from './utils'

function requireProductPrimary(skuGroupKey: string) {
  const primary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!primary) throw new Error(`Unknown mock product primary: ${skuGroupKey}`)
  return primary
}

export async function getSecondaryStockOrderCalc({
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastPeriodEnd,
  serviceLevelPct,
  leadTimeDays,
  safetyStockMode,
  manualSafetyStock,
  dailyMean: dailyMeanParam,
  companyUuid,
}: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> {
  await sleep(70)
  const primary = scopeMockProductPrimary(requireProductPrimary(skuGroupKey), { companyUuid })
  const fromTrend = dailyMeanSigma(primary.monthlySalesTrend ?? [], periodStart, periodEnd)
  const trendMuRaw = fromTrend.dailyMean
  const trendDailyMean = Math.round(trendMuRaw * 10) / 10

  const forecastMuRaw =
    dailyMeanParam !== undefined && Number.isFinite(dailyMeanParam)
      ? Math.max(0, dailyMeanParam)
      : forecastDailyMeanFromModel(primary.monthlySalesTrend ?? [], periodStart, forecastPeriodEnd ?? periodEnd)
  const dailyMeanRounded = Math.round(forecastMuRaw * 10) / 10

  const sigma = fromTrend.sigma
  const safeLead = Math.max(0, Math.round(leadTimeDays))
  const z = zFromServiceLevelPct(serviceLevelPct)
  const formulaSafetyStock = Math.max(0, Math.round(z * sigma * Math.sqrt(safeLead) + trendMuRaw * safeLead))
  const safetyStock =
    safetyStockMode === 'manual'
      ? Math.max(0, Math.round(manualSafetyStock))
      : formulaSafetyStock
  const safetyRecQty = Math.max(0, Math.round(safetyStock - primary.availableStock + trendMuRaw * safeLead))
  const forecastRecQty = Math.max(0, Math.round(forecastMuRaw * safeLead * 1.05))

  const avgCost = Math.round(primary.price * 0.78)
  const opMarginPerUnit = primary.price - avgCost - Math.round(primary.price * 0.13)
  const toAmounts = (qty: number) => ({
    expectedOrderAmount: qty * avgCost,
    expectedSalesAmount: qty * primary.price,
    expectedOpProfit: qty * opMarginPerUnit,
  })

  return {
    trendDailyMean,
    dailyMean: dailyMeanRounded,
    sigma,
    display: {
      currentStockQtyTotal: 1330,
      totalOrderBalanceTotal: 520,
      expectedInboundOrderBalanceTotal: 230,
      currentStockQtyBySize: [95, 110, 120, 130, 125, 140, 160, 155, 150, 145],
      totalOrderBalanceBySize: [28, 36, 42, 48, 52, 58, 66, 64, 63, 63],
      expectedInboundOrderBalanceBySize: [10, 14, 18, 21, 23, 26, 31, 29, 29, 29],
    },
    safetyStockCalc: {
      safetyStock,
      recommendedOrderQty: safetyRecQty,
      ...toAmounts(safetyRecQty),
    },
    forecastQtyCalc: {
      safetyStock: null,
      recommendedOrderQty: forecastRecQty,
      ...toAmounts(forecastRecQty),
    },
  }
}
