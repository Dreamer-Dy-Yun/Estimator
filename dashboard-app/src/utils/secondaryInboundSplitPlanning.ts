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

function buildIntervals(rows: readonly SecondaryPlanningIntervalInput[], dateEnd: string): SplitInterval[] {
  return rows.map((row: SecondaryPlanningIntervalInput, index: number): SplitInterval => ({
    salesStartDate: row.inboundDate,
    salesEndDate: rows[index + 1]?.inboundDate ?? dateEnd,
    expectedInboundStartDate: rows[index - 1]?.inboundDate ?? row.inboundDate,
    expectedInboundEndDate: row.inboundDate,
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

function allocateIntegerTotal(total: number, weights: readonly number[]): number[] {
  const normalizedTotal = normalizeQuantity(total)
  if (!weights.length) return []

  const normalizedWeights = weights.map((weight: number): number => Number.isFinite(weight) ? Math.max(0, weight) : 0)
  const weightSum = normalizedWeights.reduce((sum: number, weight: number): number => sum + weight, 0)
  const effectiveWeights = weightSum > 0 ? normalizedWeights : normalizedWeights.map((): number => 1)
  const effectiveWeightSum = weightSum > 0 ? weightSum : effectiveWeights.length
  const exactValues = effectiveWeights.map((weight: number): number => (normalizedTotal * weight) / effectiveWeightSum)
  const values = exactValues.map((value: number): number => Math.floor(value))
  let remainder = normalizedTotal - values.reduce((sum: number, value: number): number => sum + value, 0)

  exactValues
    .map((value: number, index: number): { index: number; fraction: number } => ({ index, fraction: value - Math.floor(value) }))
    .sort((a: { index: number; fraction: number }, b: { index: number; fraction: number }): number => (b.fraction - a.fraction) || (a.index - b.index))
    .forEach(({ index }: { index: number; fraction: number }): void => {
      if (remainder <= 0) return
      values[index] += 1
      remainder -= 1
    })

  return values
}

function getWholeProductSalesForecast(source: SecondaryInboundSplitSource, date: string): number {
  return requireFiniteQuantity(source.total.sales[date], `total.sales.${date}`)
}

function getSizeSalesRate(source: SecondaryInboundSplitSource, size: string): number {
  return requireFiniteQuantity(source.sizeInfo[size]?.salesRate, `sizeInfo.${size}.salesRate`)
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

function distributeIntervalTotalBySize(
  source: SecondaryInboundSplitSource,
  columns: readonly SecondaryPlanningSizeColumn[],
  intervalTotal: number,
): Record<string, number> {
  const allocated = allocateIntegerTotal(intervalTotal, columns.map((column: SecondaryPlanningSizeColumn): number => getSizeSalesRate(source, column.size)))
  const result: Record<string, number> = {}
  columns.forEach((column: SecondaryPlanningSizeColumn, index: number): void => {
    result[column.size] = allocated[index] ?? 0
  })
  return result
}

function getOpeningStock(source: SecondaryInboundSplitSource, column: SecondaryPlanningSizeColumn): number {
  return Math.round(requireFiniteQuantity(source.sizeInfo[column.size]?.baseStock, `sizeInfo.${column.size}.baseStock`))
    + normalizeQuantity(column.expectedInboundBeforeCurrentOrderQty ?? 0)
}

function getTargetEndingStock(column: SecondaryPlanningSizeColumn): number {
  return normalizeQuantity(column.targetEndingStockQty ?? 0)
}

function sumExpectedInboundInInterval(
  source: SecondaryInboundSplitSource,
  size: string,
  interval: SplitInterval,
): number {
  const expectationPoints: SecondaryInboundSplitSource['expectation'][string] = getExpectationPoints(source, size)
  if (interval.ignoreExistingOrderInbound) return 0
  return expectationPoints.reduce((sum: number, point: SecondaryInboundSplitSource['expectation'][string][number]): number => {
    if (point.date < interval.expectedInboundStartDate || point.date >= interval.expectedInboundEndDate) return sum
    return sum + normalizeQuantity(requireFiniteQuantity(point.inbound, `expectation.${size}.${point.date}`))
  }, 0)
}

export function sumSecondaryPlanningSalesForecastBySize(
  source: SecondaryInboundSplitSource,
  columns: readonly SecondaryPlanningSizeColumn[],
  startDate: string,
  endDate: string,
): Record<string, number> {
  const wholeProductSales = sumWholeProductSalesForecast(source, startDate, endDate)
  const result: Record<string, number> = {}
  columns.forEach((column: SecondaryPlanningSizeColumn): void => {
    result[column.size] = wholeProductSales * getSizeSalesRate(source, column.size)
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
    const intervalSalesTotal: number = sumWholeProductSalesForecast(source, interval.salesStartDate, interval.salesEndDate)
    const intervalDemandBySize: Record<string, number> = distributeIntervalTotalBySize(source, columns, intervalSalesTotal)
    const suggestedBySize: Record<string, number> = {}
    const suggestionBasisBySize: Record<string, SecondaryPlanningSuggestionBasis> = {}

    columns.forEach((column: SecondaryPlanningSizeColumn): void => {
      const size: string = column.size
      const openingStock: number = stockBySize[size] ?? 0
      const expectedInbound: number = sumExpectedInboundInInterval(source, size, interval)
      const availableStock: number = openingStock + expectedInbound
      const demandQty: number = normalizeQuantity(intervalDemandBySize[size] ?? 0)
      const targetEndingStock: number = getTargetEndingStock(column)
      const suggestedQty: number = normalizeQuantity(Math.max(0, demandQty + targetEndingStock - availableStock))
      const endingStockQty: number = Math.max(0, availableStock + suggestedQty - demandQty)

      suggestedBySize[size] = suggestedQty
      suggestionBasisBySize[size] = {
        intervalStartDate: interval.salesStartDate,
        intervalEndDate: interval.salesEndDate,
        expectedInboundStartDate: interval.expectedInboundStartDate,
        expectedInboundEndDate: interval.expectedInboundEndDate,
        ignoreExistingOrderInbound: interval.ignoreExistingOrderInbound,
        salesForecastQty: demandQty,
        expectedInboundQty: expectedInbound,
        carriedStockQty: openingStock,
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
