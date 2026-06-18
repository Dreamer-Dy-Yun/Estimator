import type { ProductSecondaryDetail } from '..'
import type { ProductSecondarySizeRow } from '../../types'
import type { MonthlySalesPoint, ProductPrimarySummary } from '../types'
import type { SecondaryExistingOrderInboundSupplyBySize, SecondaryInboundSplitSource, SecondaryInboundSplitSupplyPoint, SecondaryStockOrderCalcParams, SecondaryStockOrderCalcResult } from '../types'
import { getCompanyUuidForOptionalScope } from '../types'
import { buildSecondarySizeShares, type SecondarySizeShare } from '../../utils/secondaryOrderProjection'
import { scopeMockProductPrimary } from './mockCompanyScope'
import { requireMockProductPrimary } from './mockProductLookup'
import { buildMockProductSecondaryDetail } from './mockProductSecondaryDetailApi'
import { dailyMeanSigma, forecastDailyMeanFromModel } from './secondaryDailyTrend'
import { sleep } from './utils'

const DEFAULT_SIZE_COUNT = 10 as const
const DAY_MS = 86_400_000 as const
const INBOUND_SPLIT_VERIFICATION_SKU_GROUP_KEY = 'TEST-SHOE__210' as const
const INBOUND_SPLIT_VERIFICATION_CURRENT_STOCK_BY_SIZE: Record<string, number> = {
  '230': 87,
  '240': 29,
  '250': 0,
  '260': 11,
}

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

function addIsoDays(date: string, days: number): string {
  const parsed: Date = new Date(`${date}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function parseIsoDateMs(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getTime()
}

function formatIsoDateMs(dateMs: number): string {
  return new Date(dateMs).toISOString().slice(0, 10)
}

function buildExistingOrderInboundSupplyBySize(
  sizeLabels: string[],
  totalOrderBalanceValues: number[],
  expectedInboundOrderBalanceValues: number[],
  calculationBaseDate: string,
  currentOrderInboundDueDate: string,
): SecondaryExistingOrderInboundSupplyBySize {
  const preCurrentOrderInboundDate: string = addIsoDays(currentOrderInboundDueDate, -1)
  const postCurrentOrderInboundDate: string = currentOrderInboundDueDate
  return Object.fromEntries(sizeLabels.map((size: string, index: number): [string, SecondaryInboundSplitSupplyPoint[]] => {
    const totalOrderBalance: number = Math.max(0, totalOrderBalanceValues[index] ?? 0)
    const requestedPreCurrentOrderQty: number = Math.max(0, Math.min(totalOrderBalance, expectedInboundOrderBalanceValues[index] ?? 0))
    const preCurrentOrderQty: number = preCurrentOrderInboundDate >= calculationBaseDate ? requestedPreCurrentOrderQty : 0
    const postCurrentOrderQty: number = Math.max(0, totalOrderBalance - preCurrentOrderQty)
    const points: SecondaryInboundSplitSupplyPoint[] = []
    if (preCurrentOrderQty > 0) points.push({ date: preCurrentOrderInboundDate, qty: preCurrentOrderQty })
    if (postCurrentOrderQty > 0) points.push({ date: postCurrentOrderInboundDate, qty: postCurrentOrderQty })
    return [size, points]
  }))
}

function sumSupply(points: readonly SecondaryInboundSplitSupplyPoint[], beforeDate?: string): number {
  return points.reduce((sum: number, point: SecondaryInboundSplitSupplyPoint): number => {
    if (beforeDate != null && point.date >= beforeDate) return sum
    return sum + point.qty
  }, 0)
}

function displayTotalBySize(
  sizeLabels: string[],
  supplyBySize: SecondaryExistingOrderInboundSupplyBySize,
  beforeDate?: string,
): number[] {
  return sizeLabels.map((size: string): number => Math.round(sumSupply(supplyBySize[size] ?? [], beforeDate)))
}

function buildInboundSplitVerificationSupplyBySize(
  currentOrderInboundDueDate: string,
  orderCoverageDays: number,
): SecondaryExistingOrderInboundSupplyBySize {
  const earlySupplyDate: string = addIsoDays(currentOrderInboundDueDate, Math.max(1, Math.round(orderCoverageDays * 0.154)))
  const firstSplitBoundarySupplyDate: string = addIsoDays(currentOrderInboundDueDate, Math.max(2, Math.round(orderCoverageDays * 0.341)))
  const splitBoundarySupplyDate: string = addIsoDays(currentOrderInboundDueDate, Math.max(3, Math.round(orderCoverageDays * 0.495)))
  const middleSupplyDate: string = addIsoDays(currentOrderInboundDueDate, Math.max(4, Math.round(orderCoverageDays * 0.648)))
  const lateSupplyDate: string = addIsoDays(currentOrderInboundDueDate, Math.max(5, Math.round(orderCoverageDays * 0.786)))
  return {
    '230': [
      { date: firstSplitBoundarySupplyDate, qty: 31 },
      { date: lateSupplyDate, qty: 19 },
    ],
    '240': [
      { date: earlySupplyDate, qty: 43 },
      { date: splitBoundarySupplyDate, qty: 37 },
    ],
    '250': [
      { date: firstSplitBoundarySupplyDate, qty: 23 },
      { date: middleSupplyDate, qty: 79 },
    ],
    '260': [
      { date: earlySupplyDate, qty: 17 },
      { date: lateSupplyDate, qty: 41 },
    ],
  }
}

function buildInboundSplitVerificationStockOrderCalcResult(
  productIdentity: SecondaryStockOrderCalcParams['productIdentity'],
  calculationBaseDate: string,
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
  orderCoverageDays: number,
  shares: SecondarySizeShare[],
): SecondaryStockOrderCalcResult {
  const displaySizeLabels: string[] = Object.keys(INBOUND_SPLIT_VERIFICATION_CURRENT_STOCK_BY_SIZE)
  const currentStockQtyValues: number[] = displaySizeLabels.map((size: string): number => INBOUND_SPLIT_VERIFICATION_CURRENT_STOCK_BY_SIZE[size] ?? 0)
  const existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize = buildInboundSplitVerificationSupplyBySize(
    currentOrderInboundDueDate,
    orderCoverageDays,
  )
  const totalOrderBalanceValues: number[] = displayTotalBySize(displaySizeLabels, existingOrderInboundSupplyBySize)
  const expectedInboundOrderBalanceValues: number[] = displayTotalBySize(displaySizeLabels, existingOrderInboundSupplyBySize, currentOrderInboundDueDate)
  const displaySizeRows: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }[] = buildDisplaySizeRows(
    displaySizeLabels,
    currentStockQtyValues,
    totalOrderBalanceValues,
    expectedInboundOrderBalanceValues,
  )
  const dailyMean = 6.9 as const

  return {
    productIdentity,
    inboundSplitSource: buildStockOrderInboundSplitSource({
      productIdentity,
      calculationBaseDate,
      currentOrderInboundDueDate,
      nextOrderInboundDueDate,
      dailyMean,
      displaySizeRows,
      existingOrderInboundSupplyBySize,
      shares,
    }),
    existingOrderInboundSupplyBySize,
    trendDailyMean: dailyMean,
    dailyMean,
    sigma: 2.7,
    display: {
      currentStockQtyTotal: currentStockQtyValues.reduce((sum: number, value: number): number => sum + value, 0),
      totalOrderBalanceTotal: totalOrderBalanceValues.reduce((sum: number, value: number): number => sum + value, 0),
      expectedInboundOrderBalanceTotal: expectedInboundOrderBalanceValues.reduce((sum: number, value: number): number => sum + value, 0),
      sizeRows: displaySizeRows,
    },
  }
}

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

function buildStockOrderInboundSplitSource({
  productIdentity,
  calculationBaseDate,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  dailyMean,
  displaySizeRows,
  existingOrderInboundSupplyBySize,
  shares,
}: {
  productIdentity: SecondaryStockOrderCalcParams['productIdentity']
  calculationBaseDate: string
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  dailyMean: number
  displaySizeRows: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }[]
  existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize
  shares: SecondarySizeShare[]
}): SecondaryInboundSplitSource {
  const sourceStartMs: number = parseIsoDateMs(calculationBaseDate)
  const sourceEndMs: number = parseIsoDateMs(nextOrderInboundDueDate)
  const shareBySize: Map<string, number> = new Map(shares.map((row: SecondarySizeShare): [string, number] => [row.size, Math.max(0, row.blendedSharePct)]))
  const fallbackSharePct: number = displaySizeRows.length > 0 ? 100 / displaySizeRows.length : 0
  const supplyBySize: SecondaryInboundSplitSource['supplyBySize'] = Object.fromEntries(displaySizeRows.map((row: { size: string; currentStockQty: number }): [string, SecondaryInboundSplitSupplyPoint[]] => {
    const existingPoints: SecondaryInboundSplitSupplyPoint[] = (existingOrderInboundSupplyBySize[row.size] ?? [])
      .filter((point: SecondaryInboundSplitSupplyPoint): boolean => point.date >= calculationBaseDate && point.date < nextOrderInboundDueDate)
      .map((point: SecondaryInboundSplitSupplyPoint): SecondaryInboundSplitSupplyPoint => ({ ...point }))
    return [row.size, [{ date: calculationBaseDate, qty: row.currentStockQty }, ...existingPoints]]
  }))
  const salesForecastByDate: SecondaryInboundSplitSource['salesForecastByDate'] = {}
  for (let cursorMs: number = sourceStartMs; cursorMs < sourceEndMs; cursorMs += DAY_MS) {
    const date: string = formatIsoDateMs(cursorMs)
    salesForecastByDate[date] = {}
    displaySizeRows.forEach((row: { size: string }): void => {
      const sharePct: number = shareBySize.get(row.size) ?? fallbackSharePct
      salesForecastByDate[date][row.size] = Math.max(0, (dailyMean * sharePct) / 100)
    })
  }
  return {
    productId: productIdentity.skuGroupKey,
    productIdentity,
    calculationBaseDate,
    coverageStartDate: currentOrderInboundDueDate,
    coverageEndDate: nextOrderInboundDueDate,
    supplyBySize,
    salesForecastByDate,
  }
}

export function buildMockSecondaryStockOrderCalcResult({
  skuGroupKey,
  productIdentity,
  periodStart,
  periodEnd,
  calculationBaseDate,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  forecastPeriodEndMonth,
  orderCoverageDays,
  selfWeightPct,
  dailyMean: dailyMeanParam,
  base,
  comparison,
}: SecondaryStockOrderCalcParams): SecondaryStockOrderCalcResult {
  if (!Number.isFinite(orderCoverageDays) || orderCoverageDays < 0) throw new Error('orderCoverageDays must be a non-negative finite number')
  const companyUuid: string | undefined = getCompanyUuidForOptionalScope(base.sourceId)
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), { companyUuid })
  const secondary: ProductSecondaryDetail = buildMockProductSecondaryDetail(skuGroupKey, { base, comparison })
  const shares: SecondarySizeShare[] = buildSecondarySizeShares(secondary, selfWeightPct)
  if (skuGroupKey === INBOUND_SPLIT_VERIFICATION_SKU_GROUP_KEY) {
    return buildInboundSplitVerificationStockOrderCalcResult(productIdentity, calculationBaseDate, currentOrderInboundDueDate, nextOrderInboundDueDate, orderCoverageDays, shares)
  }
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
  const expectedInboundOrderBalanceSeedValues: number[] = splitDisplayTotal(expectedInboundOrderBalanceTotal, displaySizeLabels.length, isSimpleCalcSku)
  const existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize = buildExistingOrderInboundSupplyBySize(
    displaySizeLabels,
    totalOrderBalanceValues,
    expectedInboundOrderBalanceSeedValues,
    calculationBaseDate,
    currentOrderInboundDueDate,
  )
  const expectedInboundOrderBalanceValues: number[] = displayTotalBySize(displaySizeLabels, existingOrderInboundSupplyBySize, currentOrderInboundDueDate)
  const resolvedTotalOrderBalanceValues: number[] = displayTotalBySize(displaySizeLabels, existingOrderInboundSupplyBySize)
  const displaySizeRows: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }[] = buildDisplaySizeRows(
    displaySizeLabels,
    currentStockQtyValues,
    resolvedTotalOrderBalanceValues,
    expectedInboundOrderBalanceValues,
  )
  const dailyMean: number = Math.round(forecastMuRaw * 10) / 10

  return {
    productIdentity,
    inboundSplitSource: buildStockOrderInboundSplitSource({
      productIdentity,
      calculationBaseDate,
      currentOrderInboundDueDate,
      nextOrderInboundDueDate,
      dailyMean,
      displaySizeRows,
      existingOrderInboundSupplyBySize,
      shares,
    }),
    existingOrderInboundSupplyBySize,
    trendDailyMean: Math.round(trendMuRaw * 10) / 10,
    dailyMean,
    sigma,
    display: {
      currentStockQtyTotal: primary.availableStock,
      totalOrderBalanceTotal: resolvedTotalOrderBalanceValues.reduce((sum: number, value: number): number => sum + value, 0),
      expectedInboundOrderBalanceTotal: expectedInboundOrderBalanceValues.reduce((sum: number, value: number): number => sum + value, 0),
      sizeRows: displaySizeRows,
    },
  }
}

export async function getSecondaryStockOrderCalc(params: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> {
  await sleep(70)
  return buildMockSecondaryStockOrderCalcResult(params)
}
