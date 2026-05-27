import type { SecondaryStockOrderCalcParams, SecondaryStockOrderCalcResult } from '../types'
import { scopeMockProductPrimary } from './mockCompanyScope'
import { requireMockProductPrimary } from './mockProductLookup'
import { dailyMeanSigma, forecastDailyMeanFromModel, zFromSafetyStockConfidencePct } from './secondaryDailyTrend'
import { sleep } from './utils'

const DEFAULT_SAFETY_STOCK_CONFIDENCE_PCT = 95
const DEFAULT_SIZE_COUNT = 10

const splitTotal = (total: number) => Array.from({ length: DEFAULT_SIZE_COUNT }, (_, index) => Math.max(0, Math.round(total * (0.07 + index * 0.006))))

export async function getSecondaryStockOrderCalc({
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastPeriodEnd,
  leadTimeDays,
  dailyMean: dailyMeanParam,
  companyUuid,
}: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> {
  await sleep(70)
  const primary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), { companyUuid })
  const trend = primary.monthlySalesTrend ?? []
  const { dailyMean: trendMuRaw, sigma } = dailyMeanSigma(trend, periodStart, periodEnd)
  const forecastMuRaw = dailyMeanParam !== undefined && Number.isFinite(dailyMeanParam)
    ? Math.max(0, dailyMeanParam)
    : forecastDailyMeanFromModel(trend, periodStart, forecastPeriodEnd ?? periodEnd)
  const leadDays = Math.max(0, Math.round(leadTimeDays))
  const safetyStock = Math.max(0, Math.round(zFromSafetyStockConfidencePct(DEFAULT_SAFETY_STOCK_CONFIDENCE_PCT) * sigma * Math.sqrt(leadDays) + trendMuRaw * leadDays))
  const safetyRecQty = Math.max(0, Math.round(safetyStock - primary.availableStock + trendMuRaw * leadDays))
  const forecastRecQty = Math.max(0, Math.round(forecastMuRaw * leadDays * 1.05))
  const avgCost = Math.round(primary.price * 0.78)
  const opMarginPerUnit = primary.price - avgCost - Math.round(primary.price * 0.13)
  const amounts = (qty: number) => ({
    expectedOrderAmount: qty * avgCost,
    expectedSalesAmount: qty * primary.price,
    expectedOpProfit: qty * opMarginPerUnit,
  })

  return {
    trendDailyMean: Math.round(trendMuRaw * 10) / 10,
    dailyMean: Math.round(forecastMuRaw * 10) / 10,
    sigma,
    display: {
      currentStockQtyTotal: primary.availableStock,
      totalOrderBalanceTotal: Math.round(primary.availableStock * 0.39),
      expectedInboundOrderBalanceTotal: Math.round(primary.availableStock * 0.17),
      currentStockQtyBySize: splitTotal(primary.availableStock),
      totalOrderBalanceBySize: splitTotal(Math.round(primary.availableStock * 0.39)),
      expectedInboundOrderBalanceBySize: splitTotal(Math.round(primary.availableStock * 0.17)),
    },
    safetyStockCalc: { safetyStock, recommendedOrderQty: safetyRecQty, ...amounts(safetyRecQty) },
    forecastQtyCalc: { safetyStock: null, recommendedOrderQty: forecastRecQty, ...amounts(forecastRecQty) },
  }
}
