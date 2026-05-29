import type { SecondaryStockOrderCalcParams, SecondaryStockOrderCalcResult } from '../types'
import { scopeMockProductPrimary, scopeMockProductSecondary } from './mockCompanyScope'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { dailyMeanSigma, forecastDailyMeanFromModel, zFromSafetyStockConfidencePct } from './secondaryDailyTrend'
import { sleep } from './utils'

const DEFAULT_SAFETY_STOCK_CONFIDENCE_PCT = 95
const DEFAULT_SIZE_COUNT = 10

const distributeTotal = (total: number, weights: number[]) => {
  const target = Math.max(0, Math.round(total))
  const safeWeights = weights.length > 0 ? weights.map((value) => Math.max(0, value)) : [1]
  const weightSum = safeWeights.reduce((sum, value) => sum + value, 0) || safeWeights.length
  const raw = safeWeights.map((weight) => (target * (weight || 1)) / weightSum)
  const floors = raw.map(Math.floor)
  let remainder = target - floors.reduce((sum, value) => sum + value, 0)
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (const { index } of order) {
    if (remainder <= 0) break
    floors[index] += 1
    remainder -= 1
  }
  return floors
}

const splitTotal = (total: number, count: number) => distributeTotal(
  total,
  Array.from({ length: Math.max(1, count) }, (_, index) => 0.07 + index * 0.006),
)

const splitEvenTotal = (total: number, count: number) => distributeTotal(total, Array.from({ length: Math.max(1, count) }, () => 1))

const splitDisplayTotal = (total: number, count: number, even: boolean) => (
  even ? splitEvenTotal(total, count) : splitTotal(total, count)
)

const buildDisplaySizeRows = (
  sizeLabels: string[],
  currentStockQtyValues: number[],
  totalOrderBalanceValues: number[],
  expectedInboundOrderBalanceValues: number[],
) => sizeLabels.map((size, index) => ({
  size,
  currentStockQty: currentStockQtyValues[index] ?? 0,
  totalOrderBalance: totalOrderBalanceValues[index] ?? 0,
  expectedInboundOrderBalance: expectedInboundOrderBalanceValues[index] ?? 0,
}))

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
  const secondary = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), { companyUuid })
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
  const isSimpleCalcSku = primary.code === 'TEST-TOP'
  const sizeLabels = secondary.sizeRows.map((row) => row.size)
  const sizeCount = isSimpleCalcSku ? sizeLabels.length : Math.max(sizeLabels.length, DEFAULT_SIZE_COUNT)
  const totalOrderBalanceTotal = isSimpleCalcSku ? 200 : Math.round(primary.availableStock * 0.39)
  const expectedInboundOrderBalanceTotal = isSimpleCalcSku ? 100 : Math.round(primary.availableStock * 0.17)
  const displaySizeLabels = sizeLabels.length > 0
    ? sizeLabels
    : Array.from({ length: sizeCount }, (_, index) => String(index + 1))
  const currentStockQtyValues = splitDisplayTotal(primary.availableStock, displaySizeLabels.length, isSimpleCalcSku)
  const totalOrderBalanceValues = splitDisplayTotal(totalOrderBalanceTotal, displaySizeLabels.length, isSimpleCalcSku)
  const expectedInboundOrderBalanceValues = splitDisplayTotal(expectedInboundOrderBalanceTotal, displaySizeLabels.length, isSimpleCalcSku)

  return {
    trendDailyMean: Math.round(trendMuRaw * 10) / 10,
    dailyMean: Math.round(forecastMuRaw * 10) / 10,
    sigma,
    display: {
      currentStockQtyTotal: primary.availableStock,
      totalOrderBalanceTotal,
      expectedInboundOrderBalanceTotal,
      sizeRows: buildDisplaySizeRows(
        displaySizeLabels,
        currentStockQtyValues,
        totalOrderBalanceValues,
        expectedInboundOrderBalanceValues,
      ),
    },
    safetyStockCalc: { safetyStock, recommendedOrderQty: safetyRecQty, ...amounts(safetyRecQty) },
    forecastQtyCalc: { safetyStock: null, recommendedOrderQty: forecastRecQty, ...amounts(forecastRecQty) },
  }
}
