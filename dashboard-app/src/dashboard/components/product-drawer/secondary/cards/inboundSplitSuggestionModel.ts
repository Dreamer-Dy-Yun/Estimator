import type {
  SecondaryInboundSplitExpectationCell,
  SecondaryInboundSplitSource,
} from '../../../../../api/types/secondary'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'

const DAY_MS: number = 86_400_000

interface SplitInterval {
  readonly startDate: string
  readonly endDate: string
}

function parseIsoDateMs(value: string): number {
  const parsed: number = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatIsoDate(dateMs: number): string {
  return new Date(dateMs).toISOString().slice(0, 10)
}

function normalizeQuantity(value: number): number {
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

function sumIntervalNetDemand(source: SecondaryInboundSplitSource, size: string, interval: SplitInterval): number {
  const startMs: number = Math.max(parseIsoDateMs(interval.startDate), parseIsoDateMs(source.dateStart))
  const endMs: number = Math.min(parseIsoDateMs(interval.endDate), parseIsoDateMs(source.dateEnd))
  if (endMs <= startMs) {
    return 0
  }

  let totalDemand: number = 0
  for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    const cell: SecondaryInboundSplitExpectationCell = getExpectationCell(source, formatIsoDate(cursorMs), size)
    totalDemand += Math.max(0, cell.sale) - Math.max(0, cell.inbound)
  }

  return totalDemand
}

function suggestSizeSplit(
  source: SecondaryInboundSplitSource,
  size: string,
  totalQty: number,
  intervals: readonly SplitInterval[],
): number[] {
  const normalizedTotal: number = normalizeQuantity(totalQty)
  if (normalizedTotal <= 0 || intervals.length === 0) {
    return intervals.map((): number => 0)
  }

  let remainingOrderQty: number = normalizedTotal
  let projectedStock: number = normalizeQuantity(requireFiniteQuantity(source.stockBySize[size], `stockBySize.${size}`))
  const allocated: number[] = intervals.map((interval: SplitInterval, index: number): number => {
    const netDemand: number = sumIntervalNetDemand(source, size, interval)
    const requiredQty: number = Math.max(0, Math.ceil(netDemand - projectedStock))
    const qty: number = index === intervals.length - 1 ? remainingOrderQty : Math.min(remainingOrderQty, requiredQty)
    remainingOrderQty -= qty
    projectedStock += qty - netDemand
    return qty
  })
  const allocatedTotal: number = allocated.reduce((sum: number, value: number): number => sum + value, 0)

  if (allocatedTotal !== normalizedTotal && allocated.length > 0) {
    allocated[allocated.length - 1] += normalizedTotal - allocatedTotal
  }

  return allocated
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
  const rows: Record<string, number>[] = inboundDates.map((): Record<string, number> => ({}))

  for (const column of columns) {
    const split: number[] = suggestSizeSplit(source, column.size, column.confirmedQty, intervals)
    split.forEach((qty: number, rowIndex: number): void => {
      rows[rowIndex][column.size] = qty
    })
  }

  return rows
}
