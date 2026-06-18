import type {
  SecondaryInboundSplitSource,
  SecondaryInboundSplitSupplyPoint,
} from '../../../../../api/types/secondary'
import { formatSecondaryIsoDate, parseSecondaryIsoDateMs, requireFiniteSecondaryQuantity } from '../../../../../api/types/secondaryContractGuards'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'

const DAY_MS: number = 86_400_000
const INBOUND_SPLIT_DATE_ERROR = 'Invalid inbound split source date'
const INBOUND_SPLIT_QUANTITY_ERROR = 'Missing inbound split source field'

interface SplitInterval {
  readonly startDate: string
  readonly endDate: string
  readonly ignoreExistingOrderInbound: boolean
}

export interface InboundSplitSuggestionRowInput {
  readonly inboundDate: string
  readonly ignoreExistingOrderInbound: boolean
}

function requireFiniteQuantity(value: number | undefined, field: string): number {
  return requireFiniteSecondaryQuantity(value, field, INBOUND_SPLIT_QUANTITY_ERROR)
}

function normalizeSuggestedQuantity(value: number): number {
  return Math.max(0, Math.ceil(value))
}

function buildIntervals(rows: readonly InboundSplitSuggestionRowInput[], dateEnd: string): SplitInterval[] {
  return rows.map((row: InboundSplitSuggestionRowInput, index: number): SplitInterval => ({
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

function cloneProjectedStockBySize(columns: readonly InboundSplitSizeColumn[], projectedStockBySize: Record<string, number>): Record<string, number> {
  const clone: Record<string, number> = {}
  columns.forEach((column: InboundSplitSizeColumn): void => {
    clone[column.size] = projectedStockBySize[column.size] ?? 0
  })
  return clone
}

function advanceStockThroughInterval(
  source: SecondaryInboundSplitSource,
  columns: readonly InboundSplitSizeColumn[],
  projectedStockBySize: Record<string, number>,
  startDate: string,
  endDate: string,
  interval: SplitInterval | null,
): Record<string, number> {
  const nextStockBySize: Record<string, number> = cloneProjectedStockBySize(columns, projectedStockBySize)
  const startMs: number = parseSecondaryIsoDateMs(startDate, 'interval.startDate', INBOUND_SPLIT_DATE_ERROR)
  const endMs: number = parseSecondaryIsoDateMs(endDate, 'interval.endDate', INBOUND_SPLIT_DATE_ERROR)
  if (endMs <= startMs) return nextStockBySize

  for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    const date: string = formatSecondaryIsoDate(cursorMs)
    columns.forEach((column: InboundSplitSizeColumn): void => {
      const size: string = column.size
      nextStockBySize[size] = (nextStockBySize[size] ?? 0) +
        getSupplyForDate(source, size, date, interval) -
        getSalesForecast(source, date, size)
    })
  }
  return nextStockBySize
}

function calculateIntervalSuggestedBySize(
  source: SecondaryInboundSplitSource,
  columns: readonly InboundSplitSizeColumn[],
  projectedStockBySize: Record<string, number>,
  interval: SplitInterval,
): Record<string, number> {
  const suggestedBySize: Record<string, number> = {}
  const startMs: number = parseSecondaryIsoDateMs(interval.startDate, 'interval.startDate', INBOUND_SPLIT_DATE_ERROR)
  const endMs: number = parseSecondaryIsoDateMs(interval.endDate, 'interval.endDate', INBOUND_SPLIT_DATE_ERROR)
  if (endMs <= startMs) {
    columns.forEach((column: InboundSplitSizeColumn): void => {
      suggestedBySize[column.size] = 0
    })
    return suggestedBySize
  }

  columns.forEach((column: InboundSplitSizeColumn): void => {
    const size: string = column.size
    let projectedStock: number = projectedStockBySize[size] ?? 0
    let maxShortage: number = 0
    for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
      const date: string = formatSecondaryIsoDate(cursorMs)
      projectedStock += getSupplyForDate(source, size, date, interval)
      projectedStock -= getSalesForecast(source, date, size)
      if (projectedStock < 0) maxShortage = Math.max(maxShortage, -projectedStock)
    }
    suggestedBySize[size] = normalizeSuggestedQuantity(maxShortage)
  })
  return suggestedBySize
}

function addSuggestedInbound(
  columns: readonly InboundSplitSizeColumn[],
  projectedStockBySize: Record<string, number>,
  suggestedBySize: Record<string, number>,
): Record<string, number> {
  const nextStockBySize: Record<string, number> = cloneProjectedStockBySize(columns, projectedStockBySize)
  columns.forEach((column: InboundSplitSizeColumn): void => {
    nextStockBySize[column.size] = (nextStockBySize[column.size] ?? 0) + (suggestedBySize[column.size] ?? 0)
  })
  return nextStockBySize
}

export function buildInboundSplitSuggestedQuantitiesByRow(
  columns: readonly InboundSplitSizeColumn[],
  rows: readonly InboundSplitSuggestionRowInput[],
  dateEnd: string,
  source: SecondaryInboundSplitSource,
): Record<string, number>[] {
  if (rows.length === 0) return []
  if (columns.length === 0) return rows.map((): Record<string, number> => ({}))

  const intervals: SplitInterval[] = buildIntervals(rows, dateEnd)
  let projectedStockBySize: Record<string, number> = {}
  columns.forEach((column: InboundSplitSizeColumn): void => {
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

  return intervals.map((interval: SplitInterval): Record<string, number> => {
    const suggestedBySize: Record<string, number> = calculateIntervalSuggestedBySize(source, columns, projectedStockBySize, interval)
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
