import type { SecondaryInboundSplitSource } from '../api/types/secondary'
import { formatSecondaryIsoDate, parseSecondaryIsoDateMs, requireFiniteSecondaryQuantity } from '../api/types/secondaryContractGuards'

const DAY_MS = 86_400_000 as const
const INBOUND_SPLIT_DATE_ERROR = 'Invalid inbound split source date'
const INBOUND_SPLIT_QUANTITY_ERROR = 'Missing inbound split source field'

export interface SecondaryPlanningSizeColumn {
  readonly size: string
  readonly expectedInboundBeforeCurrentOrderQty?: number
  readonly targetEndingStockQty?: number
}

export interface SecondaryPlanningIntervalInput {
  readonly inboundDate: string
  readonly ignoreExistingOrderInbound: boolean
}

export interface SecondaryPlanningSuggestionBasis {
  readonly intervalStartDate: string
  readonly intervalEndDate: string
  readonly expectedInboundStartDate: string
  readonly expectedInboundEndDate: string
  readonly ignoreExistingOrderInbound: boolean
  readonly salesForecastQty: number
  readonly expectedInboundQty: number
  readonly carriedStockQty: number
  readonly minimumStockQty: number
  readonly targetEndingStockQty: number
  readonly suggestedQty: number
  readonly endingStockQty: number
}

export interface SecondaryPlanningSuggestionRow {
  readonly suggestedQuantitiesBySize: Record<string, number>
  readonly suggestionBasisBySize: Record<string, SecondaryPlanningSuggestionBasis>
}

interface SplitInterval {
  readonly salesStartDate: string
  readonly salesEndDate: string
  readonly expectedInboundStartDate: string
  readonly expectedInboundEndDate: string
  readonly ignoreExistingOrderInbound: boolean
}

function requireFiniteQuantity(value: number | undefined, field: string): number {
  return requireFiniteSecondaryQuantity(value, field, INBOUND_SPLIT_QUANTITY_ERROR)
}

function normalizeQuantity(value: number): number {
  return Math.max(0, Math.round(value))
}

function normalizeRequiredQuantity(value: number): number {
  return Math.max(0, Math.ceil(value - 1e-9))
}

function buildIntervals(rows: readonly SecondaryPlanningIntervalInput[], dateEnd: string): SplitInterval[] {
  return rows.map((row: SecondaryPlanningIntervalInput, index: number): SplitInterval => ({
    salesStartDate: row.inboundDate,
    salesEndDate: rows[index + 1]?.inboundDate ?? dateEnd,
    expectedInboundStartDate: row.inboundDate,
    expectedInboundEndDate: rows[index + 1]?.inboundDate ?? dateEnd,
    ignoreExistingOrderInbound: row.ignoreExistingOrderInbound,
  }))
}

function iterateDates(startDate: string, endDate: string, onDate: (date: string) => void): void {
  const startMs = parseSecondaryIsoDateMs(startDate, 'interval.startDate', INBOUND_SPLIT_DATE_ERROR)
  const endMs = parseSecondaryIsoDateMs(endDate, 'interval.endDate', INBOUND_SPLIT_DATE_ERROR)
  if (endMs <= startMs) return

  for (let cursorMs = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    onDate(formatSecondaryIsoDate(cursorMs))
  }
}

function getWholeProductSalesForecast(source: SecondaryInboundSplitSource, date: string): number {
  return requireFiniteQuantity(source.total.sales[date], `total.sales.${date}`)
}

function getSizeSalesRate(source: SecondaryInboundSplitSource, size: string): number {
  return requireFiniteQuantity(source.sizeInfo[size]?.salesRate, `sizeInfo.${size}.salesRate`)
}

function getNormalizedSizeSalesRates(
  source: SecondaryInboundSplitSource,
  columns: readonly SecondaryPlanningSizeColumn[],
): number[] {
  const rawRates: number[] = columns.map((column: SecondaryPlanningSizeColumn): number => Math.max(0, getSizeSalesRate(source, column.size)))
  const sum: number = rawRates.reduce((total: number, rate: number): number => total + rate, 0)
  if (sum > 0) return rawRates.map((rate: number): number => rate / sum)
  return columns.map((): number => 1 / columns.length)
}

function getExpectationPoints(source: SecondaryInboundSplitSource, size: string): SecondaryInboundSplitSource['expectation'][string] {
  const points: SecondaryInboundSplitSource['expectation'][string] | undefined = source.expectation?.[size]
  if (!Array.isArray(points)) throw new Error(`Missing inbound split source field: expectation.${size}`)
  return points
}

function sumWholeProductSalesForecast(source: SecondaryInboundSplitSource, startDate: string, endDate: string): number {
  let total = 0
  iterateDates(startDate, endDate, (date: string): void => {
    total += getWholeProductSalesForecast(source, date)
  })
  return total
}

function getOpeningStock(source: SecondaryInboundSplitSource, column: SecondaryPlanningSizeColumn): number {
  return Math.round(requireFiniteQuantity(source.sizeInfo[column.size]?.baseStock, `sizeInfo.${column.size}.baseStock`))
    + normalizeQuantity(column.expectedInboundBeforeCurrentOrderQty ?? 0)
}

function getTargetEndingStock(column: SecondaryPlanningSizeColumn): number {
  return normalizeQuantity(column.targetEndingStockQty ?? 0)
}

interface SalesForecastFlow {
  readonly totalBySize: Record<string, number>
  readonly byDate: Record<string, Record<string, number>>
}

interface ExpectedInboundFlow {
  readonly totalQty: number
  readonly byDate: ReadonlyMap<string, number>
}

function buildSalesForecastFlow(
  source: SecondaryInboundSplitSource,
  columns: readonly SecondaryPlanningSizeColumn[],
  startDate: string,
  endDate: string,
): SalesForecastFlow {
  const salesRates: number[] = getNormalizedSizeSalesRates(source, columns)
  const totalBySize: Record<string, number> = Object.fromEntries(columns.map((column: SecondaryPlanningSizeColumn): [string, number] => [column.size, 0]))
  const byDate: Record<string, Record<string, number>> = {}

  iterateDates(startDate, endDate, (date: string): void => {
    const dailyTotal: number = getWholeProductSalesForecast(source, date)
    const dailyBySize: Record<string, number> = {}
    columns.forEach((column: SecondaryPlanningSizeColumn, index: number): void => {
      const qty: number = dailyTotal * (salesRates[index] ?? 0)
      dailyBySize[column.size] = qty
      totalBySize[column.size] = (totalBySize[column.size] ?? 0) + qty
    })
    byDate[date] = dailyBySize
  })

  return { totalBySize, byDate }
}

function buildExpectedInboundFlow(
  source: SecondaryInboundSplitSource,
  size: string,
  interval: SplitInterval,
): ExpectedInboundFlow {
  const expectationPoints: SecondaryInboundSplitSource['expectation'][string] = getExpectationPoints(source, size)
  const byDate: Map<string, number> = new Map()
  let totalQty = 0
  if (interval.ignoreExistingOrderInbound) return { totalQty, byDate }

  expectationPoints.forEach((point: SecondaryInboundSplitSource['expectation'][string][number]): void => {
    if (point.date < interval.expectedInboundStartDate || point.date >= interval.expectedInboundEndDate) return
    const qty: number = normalizeQuantity(requireFiniteQuantity(point.inbound, `expectation.${size}.${point.date}`))
    totalQty += qty
    byDate.set(point.date, (byDate.get(point.date) ?? 0) + qty)
  })

  return { totalQty, byDate }
}

export function sumSecondaryPlanningSalesForecastBySize(
  source: SecondaryInboundSplitSource,
  columns: readonly SecondaryPlanningSizeColumn[],
  startDate: string,
  endDate: string,
): Record<string, number> {
  const wholeProductSales = sumWholeProductSalesForecast(source, startDate, endDate)
  const salesRates: number[] = getNormalizedSizeSalesRates(source, columns)
  const result: Record<string, number> = {}
  columns.forEach((column: SecondaryPlanningSizeColumn, index: number): void => {
    result[column.size] = wholeProductSales * (salesRates[index] ?? 0)
  })
  return result
}

export function buildSecondaryPlanningSuggestionRows(
  columns: readonly SecondaryPlanningSizeColumn[],
  rows: readonly SecondaryPlanningIntervalInput[],
  dateEnd: string,
  source: SecondaryInboundSplitSource,
): SecondaryPlanningSuggestionRow[] {
  if (rows.length === 0) return []
  if (columns.length === 0) {
    return rows.map((): SecondaryPlanningSuggestionRow => ({
      suggestedQuantitiesBySize: {},
      suggestionBasisBySize: {},
    }))
  }

  const intervals = buildIntervals(rows, dateEnd)
  const stockBySize: Record<string, number> = Object.fromEntries(columns.map((column: SecondaryPlanningSizeColumn): [string, number] => [
    column.size,
    getOpeningStock(source, column),
  ]))

  return intervals.map((interval: SplitInterval): SecondaryPlanningSuggestionRow => {
    const salesForecastFlow: SalesForecastFlow = buildSalesForecastFlow(source, columns, interval.salesStartDate, interval.salesEndDate)
    const suggestedBySize: Record<string, number> = {}
    const suggestionBasisBySize: Record<string, SecondaryPlanningSuggestionBasis> = {}

    columns.forEach((column: SecondaryPlanningSizeColumn): void => {
      const size: string = column.size
      const openingStock: number = stockBySize[size] ?? 0
      const expectedInboundFlow: ExpectedInboundFlow = buildExpectedInboundFlow(source, size, interval)
      let projectedStock: number = openingStock
      let minimumStockQty: number = openingStock

      iterateDates(interval.salesStartDate, interval.salesEndDate, (date: string): void => {
        projectedStock += expectedInboundFlow.byDate.get(date) ?? 0
        projectedStock -= salesForecastFlow.byDate[date]?.[size] ?? 0
        minimumStockQty = Math.min(minimumStockQty, projectedStock)
      })

      const demandQty: number = normalizeQuantity(salesForecastFlow.totalBySize[size] ?? 0)
      const targetEndingStock: number = getTargetEndingStock(column)
      const suggestedQty: number = normalizeRequiredQuantity(Math.max(0, targetEndingStock - minimumStockQty))
      const endingStockQty: number = Math.max(0, projectedStock + suggestedQty)

      suggestedBySize[size] = suggestedQty
      suggestionBasisBySize[size] = {
        intervalStartDate: interval.salesStartDate,
        intervalEndDate: interval.salesEndDate,
        expectedInboundStartDate: interval.expectedInboundStartDate,
        expectedInboundEndDate: interval.expectedInboundEndDate,
        ignoreExistingOrderInbound: interval.ignoreExistingOrderInbound,
        salesForecastQty: demandQty,
        expectedInboundQty: expectedInboundFlow.totalQty,
        carriedStockQty: openingStock,
        minimumStockQty,
        targetEndingStockQty: targetEndingStock,
        suggestedQty,
        endingStockQty,
      }
      stockBySize[size] = endingStockQty
    })

    return {
      suggestedQuantitiesBySize: suggestedBySize,
      suggestionBasisBySize,
    }
  })
}

export function buildSecondaryPlanningSuggestedQuantitiesByRow(
  columns: readonly SecondaryPlanningSizeColumn[],
  rows: readonly SecondaryPlanningIntervalInput[],
  dateEnd: string,
  source: SecondaryInboundSplitSource,
): Record<string, number>[] {
  return buildSecondaryPlanningSuggestionRows(columns, rows, dateEnd, source)
    .map((row: SecondaryPlanningSuggestionRow): Record<string, number> => row.suggestedQuantitiesBySize)
}
