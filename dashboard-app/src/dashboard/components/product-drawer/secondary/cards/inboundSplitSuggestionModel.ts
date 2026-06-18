import type {
  SecondaryInboundSplitExpectationCell,
  SecondaryInboundSplitSource,
} from '../../../../../api/types/secondary'
import { allocateInboundSplitIntegerTotal } from './inboundSplitScheduleModel'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'

const DAY_MS: number = 86_400_000

interface SplitInterval {
  readonly startDate: string
  readonly endDate: string
}

function parseIsoDateMs(value: string, field: string): number {
  const match: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error(`Invalid inbound split source date: ${field}`)
  }

  const year: number = Number(match[1])
  const monthIndex: number = Number(match[2]) - 1
  const day: number = Number(match[3])
  const parsed: Date = new Date(Date.UTC(year, monthIndex, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== day) {
    throw new Error(`Invalid inbound split source date: ${field}`)
  }
  return parsed.getTime()
}

function formatIsoDate(dateMs: number): string {
  return new Date(dateMs).toISOString().slice(0, 10)
}

function normalizeOrderQuantity(value: number): number {
  return Math.max(0, Math.round(value))
}

function requireFiniteQuantity(value: number | undefined, field: string): number {
  if (value == null || !Number.isFinite(value)) {
    throw new Error(`Missing inbound split source field: ${field}`)
  }
  return value
}

function buildIntervals(inboundDates: readonly string[], dateEnd: string): SplitInterval[] {
  return inboundDates.map((startDate: string, index: number): SplitInterval => ({
    startDate,
    endDate: inboundDates[index + 1] ?? dateEnd,
  }))
}

function getExpectationCell(
  source: SecondaryInboundSplitSource,
  date: string,
  size: string,
): SecondaryInboundSplitExpectationCell {
  const cell: SecondaryInboundSplitExpectationCell | undefined = source.expectationByDate[date]?.[size]
  if (cell == null) {
    throw new Error(`Missing inbound split source cell: ${date}/${size}`)
  }
  requireFiniteQuantity(cell.sale, `${date}/${size}.sale`)
  requireFiniteQuantity(cell.inbound, `${date}/${size}.inbound`)
  return cell
}

function sumIntervalTotalNetDemand(source: SecondaryInboundSplitSource, interval: SplitInterval): number {
  const startMs: number = Math.max(parseIsoDateMs(interval.startDate, 'interval.startDate'), parseIsoDateMs(source.dateStart, 'source.dateStart'))
  const endMs: number = Math.min(parseIsoDateMs(interval.endDate, 'interval.endDate'), parseIsoDateMs(source.dateEnd, 'source.dateEnd'))
  if (endMs <= startMs) {
    return 0
  }

  let totalDemand: number = 0
  for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    const date: string = formatIsoDate(cursorMs)
    const row: SecondaryInboundSplitSource['expectationByDate'][string] | undefined = source.expectationByDate[date]
    if (row == null) {
      throw new Error(`Missing inbound split source cell: ${date}`)
    }
    for (const size of Object.keys(source.stockBySize)) {
      const cell: SecondaryInboundSplitExpectationCell = getExpectationCell(source, date, size)
      totalDemand += cell.sale - cell.inbound
    }
  }

  return totalDemand
}

function suggestRoundSplit(
  source: SecondaryInboundSplitSource,
  totalQty: number,
  intervals: readonly SplitInterval[],
  columns: readonly InboundSplitSizeColumn[],
): number[] {
  const normalizedTotal: number = normalizeOrderQuantity(totalQty)
  if (normalizedTotal <= 0 || intervals.length === 0 || columns.length === 0) {
    return intervals.map((): number => 0)
  }

  let remainingOrderQty: number = normalizedTotal
  let projectedStock: number = Object.keys(source.stockBySize).reduce((sum: number, size: string): number => (
    sum + requireFiniteQuantity(source.stockBySize[size], `stockBySize.${size}`)
  ), 0)
  return intervals.map((interval: SplitInterval): number => {
    const intervalNetDemand: number = sumIntervalTotalNetDemand(source, interval)
    const requiredQty: number = Math.max(0, Math.ceil(intervalNetDemand - projectedStock))
    const qty: number = Math.min(remainingOrderQty, requiredQty)
    projectedStock += qty - intervalNetDemand
    remainingOrderQty -= qty
    return qty
  })
}

export function buildInboundSplitSuggestedQuantitiesByRow(
  columns: readonly InboundSplitSizeColumn[],
  inboundDates: readonly string[],
  dateEnd: string,
  source: SecondaryInboundSplitSource,
): Record<string, number>[] {
  if (inboundDates.length === 0) {
    return []
  }

  const intervals: SplitInterval[] = buildIntervals(inboundDates, dateEnd)
  const totalRecommendedQty: number = columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + normalizeOrderQuantity(column.recommendedQty), 0)
  const roundTotals: number[] = suggestRoundSplit(source, totalRecommendedQty, intervals, columns)
  const columnWeights: number[] = columns.map((column: InboundSplitSizeColumn): number => column.recommendedQty)
  const rows: Record<string, number>[] = inboundDates.map((): Record<string, number> => ({}))

  for (let rowIndex: number = 0; rowIndex < roundTotals.length; rowIndex += 1) {
    const roundQty: number = roundTotals[rowIndex] ?? 0
    const split: number[] = allocateInboundSplitIntegerTotal({
      total: roundQty,
      weights: columnWeights,
    }).values
    columns.forEach((column: InboundSplitSizeColumn, columnIndex: number): void => {
      rows[rowIndex][column.size] = split[columnIndex] ?? 0
    })
  }

  return rows
}
