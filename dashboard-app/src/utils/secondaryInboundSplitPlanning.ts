import type { SecondaryInboundSplitSource, SecondaryInboundSplitSupplyPoint } from '../api/types/secondary'
import { formatSecondaryIsoDate, parseSecondaryIsoDateMs, requireFiniteSecondaryQuantity } from '../api/types/secondaryContractGuards'

const DAY_MS: number = 86_400_000
const INBOUND_SPLIT_DATE_ERROR = 'Invalid inbound split source date'
const INBOUND_SPLIT_QUANTITY_ERROR = 'Missing inbound split source field'

export interface SecondaryPlanningSizeColumn {
  readonly size: string
  readonly targetEndingStockQty?: number
}

export interface SecondaryPlanningIntervalInput {
  readonly inboundDate: string
  readonly ignoreExistingOrderInbound: boolean
}

interface SplitInterval {
  readonly startDate: string
  readonly endDate: string
  readonly ignoreExistingOrderInbound: boolean
}

function requireFiniteQuantity(value: number | undefined, field: string): number {
  return requireFiniteSecondaryQuantity(value, field, INBOUND_SPLIT_QUANTITY_ERROR)
}

function normalizeSuggestedQuantity(value: number): number {
  return Math.max(0, Math.ceil(value))
}

function buildIntervals(rows: readonly SecondaryPlanningIntervalInput[], dateEnd: string): SplitInterval[] {
  return rows.map((row: SecondaryPlanningIntervalInput, index: number): SplitInterval => ({
    startDate: row.inboundDate,
    endDate: rows[index + 1]?.inboundDate ?? dateEnd,
    ignoreExistingOrderInbound: row.ignoreExistingOrderInbound,
  }))
}

function getSalesForecast(source: SecondaryInboundSplitSource, date: string, size: string): number {
  return requireFiniteQuantity(source.salesForecastByDate[date]?.[size], `salesForecastByDate.${date}.${size}`)
}

function shouldIgnoreSupplyPoint(source: SecondaryInboundSplitSource, interval: SplitInterval | null, pointDate: string): boolean {
  if (interval == null || !interval.ignoreExistingOrderInbound) return false
  if (pointDate === source.calculationBaseDate) return false
  return pointDate >= interval.startDate && pointDate < interval.endDate
}

function getSupplyForDate(
  source: SecondaryInboundSplitSource,
  size: string,
  date: string,
  interval: SplitInterval | null,
): number {
  const points: SecondaryInboundSplitSupplyPoint[] | undefined = source.supplyBySize[size]
  if (points == null) throw new Error(`Missing inbound split source supplyBySize.${size}`)
  return points.reduce((sum: number, point: SecondaryInboundSplitSupplyPoint): number => {
    if (point.date !== date) return sum
    if (shouldIgnoreSupplyPoint(source, interval, point.date)) return sum
    return sum + requireFiniteQuantity(point.qty, `supplyBySize.${size}.${date}.qty`)
  }, 0)
}

function cloneProjectedStockBySize(columns: readonly SecondaryPlanningSizeColumn[], projectedStockBySize: Record<string, number>): Record<string, number> {
  const clone: Record<string, number> = {}
  columns.forEach((column: SecondaryPlanningSizeColumn): void => {
    clone[column.size] = projectedStockBySize[column.size] ?? 0
  })
  return clone
}

function iterateDates(startDate: string, endDate: string, onDate: (date: string) => void): void {
  const startMs: number = parseSecondaryIsoDateMs(startDate, 'interval.startDate', INBOUND_SPLIT_DATE_ERROR)
  const endMs: number = parseSecondaryIsoDateMs(endDate, 'interval.endDate', INBOUND_SPLIT_DATE_ERROR)
  if (endMs <= startMs) return

  for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    onDate(formatSecondaryIsoDate(cursorMs))
  }
}

function advanceStockThroughInterval(
  source: SecondaryInboundSplitSource,
  columns: readonly SecondaryPlanningSizeColumn[],
  projectedStockBySize: Record<string, number>,
  startDate: string,
  endDate: string,
  interval: SplitInterval | null,
): Record<string, number> {
  const nextStockBySize: Record<string, number> = cloneProjectedStockBySize(columns, projectedStockBySize)
  iterateDates(startDate, endDate, (date: string): void => {
    columns.forEach((column: SecondaryPlanningSizeColumn): void => {
      const size: string = column.size
      nextStockBySize[size] = (nextStockBySize[size] ?? 0) +
        getSupplyForDate(source, size, date, interval) -
        getSalesForecast(source, date, size)
    })
  })
  return nextStockBySize
}

function sumIntervalSalesForecast(
  source: SecondaryInboundSplitSource,
  size: string,
  startDate: string,
  endDate: string,
): number {
  let total: number = 0
  iterateDates(startDate, endDate, (date: string): void => {
    total += getSalesForecast(source, date, size)
  })
  return total
}

function sumIntervalSupply(
  source: SecondaryInboundSplitSource,
  size: string,
  startDate: string,
  endDate: string,
  interval: SplitInterval,
): number {
  let total: number = 0
  iterateDates(startDate, endDate, (date: string): void => {
    total += getSupplyForDate(source, size, date, interval)
  })
  return total
}

function calculateIntervalSuggestedBySize(
  source: SecondaryInboundSplitSource,
  columns: readonly SecondaryPlanningSizeColumn[],
  projectedStockBySize: Record<string, number>,
  interval: SplitInterval,
  isFinalInterval: boolean,
): Record<string, number> {
  const suggestedBySize: Record<string, number> = {}
  const startMs: number = parseSecondaryIsoDateMs(interval.startDate, 'interval.startDate', INBOUND_SPLIT_DATE_ERROR)
  const endMs: number = parseSecondaryIsoDateMs(interval.endDate, 'interval.endDate', INBOUND_SPLIT_DATE_ERROR)
  if (endMs <= startMs) {
    columns.forEach((column: SecondaryPlanningSizeColumn): void => {
      suggestedBySize[column.size] = 0
    })
    return suggestedBySize
  }

  columns.forEach((column: SecondaryPlanningSizeColumn): void => {
    const size: string = column.size
    const openingStock: number = projectedStockBySize[size] ?? 0
    const salesForecast: number = sumIntervalSalesForecast(source, size, interval.startDate, interval.endDate)
    const existingOrderInbound: number = sumIntervalSupply(source, size, interval.startDate, interval.endDate, interval)
    const targetEndingStock: number = isFinalInterval ? Math.max(0, column.targetEndingStockQty ?? 0) : 0
    suggestedBySize[size] = normalizeSuggestedQuantity(salesForecast + targetEndingStock - openingStock - existingOrderInbound)
  })
  return suggestedBySize
}

function addSuggestedInbound(
  columns: readonly SecondaryPlanningSizeColumn[],
  projectedStockBySize: Record<string, number>,
  suggestedBySize: Record<string, number>,
): Record<string, number> {
  const nextStockBySize: Record<string, number> = cloneProjectedStockBySize(columns, projectedStockBySize)
  columns.forEach((column: SecondaryPlanningSizeColumn): void => {
    nextStockBySize[column.size] = (nextStockBySize[column.size] ?? 0) + (suggestedBySize[column.size] ?? 0)
  })
  return nextStockBySize
}

export function sumSecondaryPlanningSalesForecastBySize(
  source: SecondaryInboundSplitSource,
  columns: readonly SecondaryPlanningSizeColumn[],
  startDate: string,
  endDate: string,
): Record<string, number> {
  const result: Record<string, number> = {}
  columns.forEach((column: SecondaryPlanningSizeColumn): void => {
    result[column.size] = sumIntervalSalesForecast(source, column.size, startDate, endDate)
  })
  return result
}

export function buildSecondaryPlanningSuggestedQuantitiesByRow(
  columns: readonly SecondaryPlanningSizeColumn[],
  rows: readonly SecondaryPlanningIntervalInput[],
  dateEnd: string,
  source: SecondaryInboundSplitSource,
): Record<string, number>[] {
  if (rows.length === 0) return []
  if (columns.length === 0) return rows.map((): Record<string, number> => ({}))

  const intervals: SplitInterval[] = buildIntervals(rows, dateEnd)
  let projectedStockBySize: Record<string, number> = {}
  columns.forEach((column: SecondaryPlanningSizeColumn): void => {
    projectedStockBySize[column.size] = 0
  })
  projectedStockBySize = advanceStockThroughInterval(
    source,
    columns,
    projectedStockBySize,
    source.calculationBaseDate,
    intervals[0]?.startDate ?? source.coverageStartDate,
    null,
  )

  return intervals.map((interval: SplitInterval, index: number): Record<string, number> => {
    const suggestedBySize: Record<string, number> = calculateIntervalSuggestedBySize(
      source,
      columns,
      projectedStockBySize,
      interval,
      index === intervals.length - 1,
    )
    projectedStockBySize = addSuggestedInbound(columns, projectedStockBySize, suggestedBySize)
    projectedStockBySize = advanceStockThroughInterval(
      source,
      columns,
      projectedStockBySize,
      interval.startDate,
      interval.endDate,
      interval,
    )
    return suggestedBySize
  })
}
