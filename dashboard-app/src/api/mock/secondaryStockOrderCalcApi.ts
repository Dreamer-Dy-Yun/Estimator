import type { ProductSecondaryDetail } from '..'
import type { ProductSecondarySizeRow } from '../../types'
import type { MonthlySalesPoint, ProductPrimarySummary } from '../types'
import type { SecondaryStockOrderCalcParams, SecondaryStockOrderCalcResult } from '../types'
import { getCompanyUuidForOptionalScope } from '../types'
import { scopeMockProductPrimary, scopeMockProductSecondary } from './mockCompanyScope'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { dailyMeanSigma, forecastDailyMeanFromModel } from './secondaryDailyTrend'
import { sleep } from './utils'

const DEFAULT_SIZE_COUNT = 10 as const

const distributeTotal: (total: number, weights: number[]) => number[] = (total: number, weights: number[]) : number[] => {
  const target: number = Math.max(0, Math.round(total))
  const safeWeights: number[] = weights.length > 0 ? weights.map((value: number) : number => Math.max(0, value)) : [1]
  const weightSum: number = safeWeights.reduce((sum: number, value: number) : number => sum + value, 0) || safeWeights.length
  const raw: number[] = safeWeights.map((weight: number) : number => (target * (weight || 1)) / weightSum)
  const floors: number[] = raw.map(Math.floor)
  let remainder: number = target - floors.reduce((sum: number, value: number) : number => sum + value, 0)
  const order: { index: number; fraction: number; }[] = raw
    .map((value: number, index: number) : { index: number; fraction: number; } => ({ index, fraction: value - Math.floor(value) }))
    .sort((a: { index: number; fraction: number; }, b: { index: number; fraction: number; }) : number => b.fraction - a.fraction)
  for (const { index } of order) {
    if (remainder <= 0) break
    floors[index] += 1
    remainder -= 1
  }
  return floors
}

const splitTotal: (total: number, count: number) => number[] = (total: number, count: number) : number[] => distributeTotal(
  total,
  Array.from({ length: Math.max(1, count) }, (_: unknown, index: number) : number => 0.07 + index * 0.006),
)

const splitEvenTotal: (total: number, count: number) => number[] = (total: number, count: number) : number[] => distributeTotal(total, Array.from({ length: Math.max(1, count) }, () : number => 1))

const splitDisplayTotal: (total: number, count: number, even: boolean) => number[] = (total: number, count: number, even: boolean) : number[] => (
  even ? splitEvenTotal(total, count) : splitTotal(total, count)
)

const buildDisplaySizeRows: (sizeLabels: string[], currentStockQtyValues: number[], totalOrderBalanceValues: number[], expectedInboundOrderBalanceValues: number[]) => { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }[] = (
  sizeLabels: string[],
  currentStockQtyValues: number[],
  totalOrderBalanceValues: number[],
  expectedInboundOrderBalanceValues: number[],
) : { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }[] => sizeLabels.map((size: string, index: number) : { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; } => ({
  size,
  currentStockQty: currentStockQtyValues[index] ?? 0,
  totalOrderBalance: totalOrderBalanceValues[index] ?? 0,
  expectedInboundOrderBalance: expectedInboundOrderBalanceValues[index] ?? 0,
}))

export function buildMockSecondaryStockOrderCalcResult({
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastPeriodEndMonth,
  orderCoverageDays,
  dailyMean: dailyMeanParam,
  base,
}: SecondaryStockOrderCalcParams): SecondaryStockOrderCalcResult {
  if (!Number.isFinite(orderCoverageDays) || orderCoverageDays < 0) throw new Error('orderCoverageDays must be a non-negative finite number')
  const companyUuid: string | undefined = getCompanyUuidForOptionalScope(base.sourceId)
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), { companyUuid })
  const secondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), { companyUuid })
  const trend: MonthlySalesPoint[] = primary.monthlySalesTrend ?? []
  const { dailyMean: trendMuRaw, sigma }: { dailyMean: number; sigma: number; } = dailyMeanSigma(trend, periodStart, periodEnd)
  const forecastMuRaw: number = dailyMeanParam !== undefined && Number.isFinite(dailyMeanParam)
    ? Math.max(0, dailyMeanParam)
    : forecastDailyMeanFromModel(trend, periodStart, forecastPeriodEndMonth ?? periodEnd)
  const isSimpleCalcSku: boolean = primary.code === 'TEST-TOP'
  const sizeLabels: string[] = secondary.sizeRows.map((row: ProductSecondarySizeRow) : string => row.size)
  const sizeCount: number = isSimpleCalcSku ? sizeLabels.length : Math.max(sizeLabels.length, DEFAULT_SIZE_COUNT)
  const totalOrderBalanceTotal: number = isSimpleCalcSku ? 200 : Math.round(primary.availableStock * 0.39)
  const coverageScale: number = orderCoverageDays / 30
  const expectedInboundOrderBalanceTotal: number = isSimpleCalcSku ? Math.round(100 * coverageScale) : Math.round(primary.availableStock * 0.17 * coverageScale)
  const displaySizeLabels: string[] = sizeLabels.length > 0
    ? sizeLabels
    : Array.from({ length: sizeCount }, (_: unknown, index: number) : string => String(index + 1))
  const currentStockQtyValues: number[] = splitDisplayTotal(primary.availableStock, displaySizeLabels.length, isSimpleCalcSku)
  const totalOrderBalanceValues: number[] = splitDisplayTotal(totalOrderBalanceTotal, displaySizeLabels.length, isSimpleCalcSku)
  const expectedInboundOrderBalanceValues: number[] = splitDisplayTotal(expectedInboundOrderBalanceTotal, displaySizeLabels.length, isSimpleCalcSku)

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
  }
}

export async function getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> {
  await sleep(70)
  return buildMockSecondaryStockOrderCalcResult(params)
}
