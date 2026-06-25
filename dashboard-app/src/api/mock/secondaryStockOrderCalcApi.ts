import type { ProductSecondaryDetail } from '..'
import type { ProductSecondarySizeRow } from '../../types'
import type { MonthlySalesPoint, ProductPrimarySummary } from '../types'
import type { SecondaryExistingOrderInboundSupplyBySize, SecondaryInboundSplitExpectationPoint, SecondaryInboundSplitSource, SecondaryExistingOrderInboundPoint, SecondaryStockOrderCalcParams, SecondaryStockOrderCalcResult } from '../types'
import { getCompanyUuidForOptionalScope } from '../types'
import { buildSecondaryPlanningSuggestedQuantitiesByRow, type SecondaryPlanningSizeColumn } from '../../utils/secondaryInboundSplitPlanning'
import { buildSecondarySizeShares, type SecondarySizeShare } from '../../utils/secondaryOrderProjection'
import { scopeMockProductPrimary } from './mockCompanyScope'
import { requireMockProductPrimary } from './mockProductLookup'
import { buildMockProductSecondaryDetail } from './mockProductSecondaryDetailApi'
import { dailyMeanSigma, forecastDailyMeanFromModel } from './secondaryDailyTrend'
import { sleep } from './utils'

const DEFAULT_SIZE_COUNT = 10 as const
const DAY_MS = 86_400_000 as const
const INBOUND_SPLIT_VERIFICATION_SKU_GROUP_KEY = 'TEST-SHOE__210' as const
const EXISTING_ORDER_INBOUND_POINT_SPACING_DAYS = 14 as const
const EXISTING_ORDER_INBOUND_MIN_POST_CURRENT_SHARE = 0.35 as const
const EXISTING_ORDER_INBOUND_AFTER_NEXT_DAYS = 45 as const
const EXISTING_ORDER_INBOUND_AFTER_NEXT_SHARE = 0.15 as const
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
  nextOrderInboundDueDate: string,
): SecondaryExistingOrderInboundSupplyBySize {
  return Object.fromEntries(sizeLabels.map((size: string, index: number): [string, SecondaryExistingOrderInboundPoint[]] => {
    const totalOrderBalance: number = Math.max(0, Math.round(totalOrderBalanceValues[index] ?? 0))
    const requestedExpectedInboundBeforeCurrentOrder: number = Math.max(0, Math.min(totalOrderBalance, Math.round(expectedInboundOrderBalanceValues[index] ?? 0)))
    const minPostCurrentInboundQty: number = totalOrderBalance >= 3
      ? Math.min(totalOrderBalance, Math.max(1, Math.round(totalOrderBalance * EXISTING_ORDER_INBOUND_MIN_POST_CURRENT_SHARE)))
      : 0
    const expectedInboundBeforeCurrentOrder: number = Math.max(0, Math.min(requestedExpectedInboundBeforeCurrentOrder, totalOrderBalance - minPostCurrentInboundQty))
    const remainingInboundFromCurrentOrder: number = Math.max(0, totalOrderBalance - expectedInboundBeforeCurrentOrder)
    const afterNextInboundQty: number = remainingInboundFromCurrentOrder >= 6
      ? Math.min(remainingInboundFromCurrentOrder, Math.max(1, Math.round(remainingInboundFromCurrentOrder * EXISTING_ORDER_INBOUND_AFTER_NEXT_SHARE)))
      : 0
    const currentToNextInboundQty: number = Math.max(0, remainingInboundFromCurrentOrder - afterNextInboundQty)
    return [size, [
      ...buildExistingOrderInboundPointsInWindow(
        expectedInboundBeforeCurrentOrder,
        calculationBaseDate,
        currentOrderInboundDueDate,
        getExistingOrderInboundDateCount(calculationBaseDate, currentOrderInboundDueDate),
        index,
      ),
      ...buildExistingOrderInboundPointsInWindow(
        currentToNextInboundQty,
        currentOrderInboundDueDate,
        nextOrderInboundDueDate,
        getExistingOrderInboundDateCount(currentOrderInboundDueDate, nextOrderInboundDueDate),
        index,
      ),
      ...buildExistingOrderInboundPointsInWindow(
        afterNextInboundQty,
        nextOrderInboundDueDate,
        addIsoDays(nextOrderInboundDueDate, EXISTING_ORDER_INBOUND_AFTER_NEXT_DAYS),
        getExistingOrderInboundDateCount(nextOrderInboundDueDate, addIsoDays(nextOrderInboundDueDate, EXISTING_ORDER_INBOUND_AFTER_NEXT_DAYS)),
        index,
      ),
    ]]
  }))
}

function getExistingOrderInboundDateCount(startDateInclusive: string, endDateExclusive: string): number {
  const sourceDays: number = Math.max(0, Math.floor((parseIsoDateMs(endDateExclusive) - parseIsoDateMs(startDateInclusive)) / DAY_MS))
  return Math.min(sourceDays, Math.max(1, Math.ceil(sourceDays / EXISTING_ORDER_INBOUND_POINT_SPACING_DAYS)))
}

function buildExistingOrderInboundPointsInWindow(
  total: number,
  startDateInclusive: string,
  endDateExclusive: string,
  maxDateCount: number,
  dateOffsetSeed = 0,
): SecondaryExistingOrderInboundPoint[] {
  const sourceStartMs: number = parseIsoDateMs(startDateInclusive)
  const sourceEndMs: number = parseIsoDateMs(endDateExclusive)
  const sourceDays: number = Math.max(0, Math.floor((sourceEndMs - sourceStartMs) / DAY_MS))
  const dateCount: number = Math.min(Math.max(0, maxDateCount), sourceDays)
  if (dateCount <= 0 || total <= 0) return []

  const dates: string[] = Array.from({ length: dateCount }, (_: unknown, index: number): string => (
    addIsoDays(startDateInclusive, (Math.floor((sourceDays * index) / dateCount) + dateOffsetSeed) % sourceDays)
  ))
  const quantities: number[] = splitEvenTotal(Math.max(0, Math.round(total)), dateCount)
  return quantities
    .map((qty: number, pointIndex: number): SecondaryExistingOrderInboundPoint | null => {
      const date: string | undefined = dates[pointIndex]
      if (date == null || qty <= 0) return null
      return { date, qty }
    })
    .filter((point: SecondaryExistingOrderInboundPoint | null): point is SecondaryExistingOrderInboundPoint => point != null)
}

function sumExistingOrderInbound(points: readonly SecondaryExistingOrderInboundPoint[], beforeDate?: string): number {
  return points.reduce((sum: number, point: SecondaryExistingOrderInboundPoint): number => {
    if (beforeDate != null && point.date >= beforeDate) return sum
    return sum + point.qty
  }, 0)
}

function displayTotalBySize(
  sizeLabels: string[],
  existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize,
  beforeDate?: string,
): number[] {
  return sizeLabels.map((size: string): number => Math.round(sumExistingOrderInbound(existingOrderInboundSupplyBySize[size] ?? [], beforeDate)))
}

function buildInboundSplitVerificationExistingOrderInboundBySize(
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
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
  orderCoverageDays: number,
  shares: SecondarySizeShare[],
): SecondaryStockOrderCalcResult {
  const displaySizeLabels: string[] = Object.keys(INBOUND_SPLIT_VERIFICATION_CURRENT_STOCK_BY_SIZE)
  const currentStockQtyValues: number[] = displaySizeLabels.map((size: string): number => INBOUND_SPLIT_VERIFICATION_CURRENT_STOCK_BY_SIZE[size] ?? 0)
  const existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize = buildInboundSplitVerificationExistingOrderInboundBySize(
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
  const dailyMean = 18.5 as const

  return {
    productIdentity,
    inboundSplitSource: buildStockOrderInboundSplitSource({
      calculationBaseDate: currentOrderInboundDueDate,
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

function buildSalesByDate(
  sourceStartMs: number,
  sourceEndMs: number,
  dailyMean: number,
  profileWeight?: (date: string, index: number, totalDays: number) => number,
): SecondaryInboundSplitSource['total']['sales'] {
  const dates: string[] = []
  for (let cursorMs: number = sourceStartMs; cursorMs < sourceEndMs; cursorMs += DAY_MS) {
    dates.push(formatIsoDateMs(cursorMs))
  }
  if (profileWeight == null) {
    return Object.fromEntries(dates.map((date: string): [string, number] => [date, Math.max(0, dailyMean)]))
  }

  const weights: number[] = dates.map((date: string, index: number): number => Math.max(0.2, profileWeight(date, index, dates.length)))
  const weightSum: number = weights.reduce((sum: number, weight: number): number => sum + weight, 0) || 1
  const targetTotal: number = Math.max(0, dailyMean) * dates.length
  return Object.fromEntries(dates.map((date: string, index: number): [string, number] => {
    const value: number = (targetTotal * (weights[index] ?? 0)) / weightSum
    return [date, Math.round(value * 10) / 10]
  }))
}

function testShoeSalesProfileWeight(date: string, index: number, totalDays: number): number {
  const progress: number = totalDays <= 1 ? 0 : index / (totalDays - 1)
  const dayOfWeek: number = new Date(`${date}T00:00:00.000Z`).getUTCDay()
  const weekendFactor: number = dayOfWeek === 0 || dayOfWeek === 6 ? 0.78 : 1
  const openingPulse: number = progress < 0.18 ? 1.38 : 1
  const middleDip: number = progress >= 0.36 && progress < 0.58 ? 0.72 : 1
  const latePulse: number = progress >= 0.72 ? 1.24 : 1
  const wave: number = 1 + Math.sin((index + 2) * 0.85) * 0.12
  return weekendFactor * openingPulse * middleDip * latePulse * wave
}

function buildSuggestionFromPlanning(
  currentOrderInboundDueDate: string,
  nextOrderInboundDueDate: string,
  source: SecondaryInboundSplitSource,
  displaySizeRows: { size: string; expectedInboundOrderBalance: number }[],
): number {
  const columns: SecondaryPlanningSizeColumn[] = displaySizeRows.map((row: { size: string; expectedInboundOrderBalance: number }): SecondaryPlanningSizeColumn => ({
    size: row.size,
    existingOrderInboundBeforeCurrentOrderQty: row.expectedInboundOrderBalance,
    targetEndingStockQty: 0,
  }))
  const suggestedRows: Record<string, number>[] = buildSecondaryPlanningSuggestedQuantitiesByRow(
    columns,
    [{ inboundDate: currentOrderInboundDueDate, excludeSegmentExistingOrderInbound: false }],
    nextOrderInboundDueDate,
    source,
  )
  const suggestedBySize: Record<string, number> | undefined = suggestedRows[0]
  if (suggestedBySize == null) throw new Error('Mock stock-order planning did not return a suggestion row.')
  return Object.values(suggestedBySize).reduce((sum: number, qty: number): number => sum + Math.max(0, Math.round(qty)), 0)
}

function buildStockOrderInboundSplitSource({
  calculationBaseDate,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  dailyMean,
  displaySizeRows,
  existingOrderInboundSupplyBySize,
  shares,
  salesProfileWeight,
}: {
  calculationBaseDate: string
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  dailyMean: number
  displaySizeRows: { size: string; currentStockQty: number; totalOrderBalance: number; expectedInboundOrderBalance: number; }[]
  existingOrderInboundSupplyBySize: SecondaryExistingOrderInboundSupplyBySize
  shares: SecondarySizeShare[]
  salesProfileWeight?: (date: string, index: number, totalDays: number) => number
}): SecondaryInboundSplitSource {
  const sourceStartMs: number = parseIsoDateMs(currentOrderInboundDueDate)
  const sourceEndMs: number = parseIsoDateMs(nextOrderInboundDueDate)
  const shareBySize: Map<string, number> = new Map(shares.map((row: SecondarySizeShare): [string, number] => [row.size, Math.max(0, row.blendedSharePct)]))
  const expectation: SecondaryInboundSplitSource['expectation'] = Object.fromEntries(displaySizeRows.map((row: { size: string; currentStockQty: number }): [string, SecondaryInboundSplitExpectationPoint[]] => {
    const existingPoints: SecondaryInboundSplitExpectationPoint[] = (existingOrderInboundSupplyBySize[row.size] ?? [])
      .filter((point: SecondaryExistingOrderInboundPoint): boolean => point.date >= calculationBaseDate && point.date < nextOrderInboundDueDate)
      .map((point: SecondaryExistingOrderInboundPoint): SecondaryInboundSplitExpectationPoint => ({ date: point.date, inbound: point.qty }))
    return [row.size, existingPoints]
  }))
  const sizeInfo: SecondaryInboundSplitSource['sizeInfo'] = Object.fromEntries(displaySizeRows.map((row: { size: string; currentStockQty: number }): [string, SecondaryInboundSplitSource['sizeInfo'][string]] => {
    const sharePct: number | undefined = shareBySize.get(row.size)
    if (sharePct == null) throw new Error(`Missing mock stock-order share for size ${row.size}.`)
    return [row.size, { salesRate: sharePct / 100, baseStock: row.currentStockQty }]
  }))
  const sales: SecondaryInboundSplitSource['total']['sales'] = buildSalesByDate(sourceStartMs, sourceEndMs, dailyMean, salesProfileWeight)
  const sourceWithoutSuggestion: SecondaryInboundSplitSource = {
    total: {
      suggestion: 0,
      sales,
    },
    sizeInfo,
    expectation,
    confirmed: {
      total_phase: 0,
      data: [],
    },
  }
  return {
    ...sourceWithoutSuggestion,
    total: {
      ...sourceWithoutSuggestion.total,
      suggestion: buildSuggestionFromPlanning(currentOrderInboundDueDate, nextOrderInboundDueDate, sourceWithoutSuggestion, displaySizeRows),
    },
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
    return buildInboundSplitVerificationStockOrderCalcResult(productIdentity, currentOrderInboundDueDate, nextOrderInboundDueDate, orderCoverageDays, shares)
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
    nextOrderInboundDueDate,
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
      calculationBaseDate,
      currentOrderInboundDueDate,
      nextOrderInboundDueDate,
      dailyMean,
      displaySizeRows,
      existingOrderInboundSupplyBySize,
      shares,
      salesProfileWeight: testShoeSalesProfileWeight,
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
