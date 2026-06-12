import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'

export const MIN_INBOUND_SPLIT_COUNT = 1 as const
export const MAX_INBOUND_SPLIT_COUNT = 10 as const

export interface InboundSplitSizeColumn {
  size: string
  confirmedQty: number
}

export interface InboundSplitScheduleRow {
  id: string
  round: number
  inboundDate: string
  quantitiesBySize: Record<string, number>
}

type ParsedIsoDate = {
  year: number
  monthIndex: number
  day: number
}

export function clampInboundSplitCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_INBOUND_SPLIT_COUNT
  return Math.min(MAX_INBOUND_SPLIT_COUNT, Math.max(MIN_INBOUND_SPLIT_COUNT, Math.round(value)))
}

export function getInboundSplitSizeColumns(sizeRows: SecondarySizeOrderDisplayRow[]): InboundSplitSizeColumn[] {
  return sizeRows.map((row: SecondarySizeOrderDisplayRow): InboundSplitSizeColumn => ({
    size: row.size,
    confirmedQty: Math.max(0, Math.round(row.confirmQty)),
  }))
}

export function getInboundSplitTotalQty(row: InboundSplitScheduleRow, columns: InboundSplitSizeColumn[]): number {
  return columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + Math.max(0, Math.round(row.quantitiesBySize[column.size] ?? 0)), 0)
}

function parseIsoDate(value: string): ParsedIsoDate | null {
  const match: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year: number = Number(match[1])
  const monthIndex: number = Number(match[2]) - 1
  const day: number = Number(match[3])
  const parsed: Date = new Date(Date.UTC(year, monthIndex, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== day) return null
  return { year, monthIndex, day }
}

function lastDayOfUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const safeDay: number = Math.min(day, lastDayOfUtcMonth(year, monthIndex))
  return new Date(Date.UTC(year, monthIndex, safeDay)).toISOString().slice(0, 10)
}

function addUtcMonths(date: ParsedIsoDate, monthOffset: number): string {
  const rawMonthIndex: number = date.monthIndex + monthOffset
  const year: number = date.year + Math.floor(rawMonthIndex / 12)
  const monthIndex: number = ((rawMonthIndex % 12) + 12) % 12
  return toIsoDate(year, monthIndex, date.day)
}

function buildInboundSplitDates(count: number, startDate: string, nextDate: string): string[] {
  const safeCount: number = clampInboundSplitCount(count)
  const start: ParsedIsoDate | null = parseIsoDate(startDate)
  const next: ParsedIsoDate | null = parseIsoDate(nextDate)
  if (!start || !next) return Array.from({ length: safeCount }, (): string => startDate)

  const startMs: number = Date.UTC(start.year, start.monthIndex, start.day)
  const nextMs: number = Date.UTC(next.year, next.monthIndex, next.day)
  if (nextMs <= startMs) return Array.from({ length: safeCount }, (): string => startDate)

  const monthDiff: number = (next.year - start.year) * 12 + (next.monthIndex - start.monthIndex)
  if (start.day === next.day && monthDiff >= safeCount && monthDiff % safeCount === 0) {
    const monthStep: number = monthDiff / safeCount
    return Array.from({ length: safeCount }, (_: unknown, index: number): string => addUtcMonths(start, index * monthStep))
  }

  const intervalMs: number = nextMs - startMs
  return Array.from({ length: safeCount }, (_: unknown, index: number): string => {
    const splitDateMs: number = startMs + Math.round((intervalMs * index) / safeCount)
    return new Date(splitDateMs).toISOString().slice(0, 10)
  })
}

export function buildInboundSplitScheduleRows(
  columns: InboundSplitSizeColumn[],
  count: number,
  inboundDate: string,
  nextInboundDate: string,
): InboundSplitScheduleRow[] {
  const safeCount: number = clampInboundSplitCount(count)
  const inboundDates: string[] = buildInboundSplitDates(safeCount, inboundDate, nextInboundDate)
  return Array.from({ length: safeCount }, (_: unknown, rowIndex: number): InboundSplitScheduleRow => {
    const round: number = rowIndex + 1
    const quantitiesBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      const baseQty: number = Math.floor(column.confirmedQty / safeCount)
      const remainder: number = column.confirmedQty % safeCount
      quantitiesBySize[column.size] = baseQty + (rowIndex < remainder ? 1 : 0)
    })
    return {
      id: `inbound-split-${round}`,
      round,
      inboundDate: inboundDates[rowIndex] ?? inboundDate,
      quantitiesBySize,
    }
  })
}

export function reconcileInboundSplitScheduleRows(
  currentRows: InboundSplitScheduleRow[],
  columns: InboundSplitSizeColumn[],
  count: number,
  inboundDate: string,
  nextInboundDate: string,
): InboundSplitScheduleRow[] {
  const fallbackRows: InboundSplitScheduleRow[] = buildInboundSplitScheduleRows(columns, count, inboundDate, nextInboundDate)
  if (!currentRows.length) return fallbackRows

  const preserveCurrentValues: boolean = currentRows.length === fallbackRows.length
  return fallbackRows.map((fallbackRow: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => {
    const currentRow: InboundSplitScheduleRow | undefined = currentRows[index]
    if (!currentRow || !preserveCurrentValues) return fallbackRow

    const quantitiesBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      quantitiesBySize[column.size] = Math.max(0, Math.round(currentRow.quantitiesBySize[column.size] ?? fallbackRow.quantitiesBySize[column.size] ?? 0))
    })

    return {
      id: fallbackRow.id,
      round: fallbackRow.round,
      inboundDate: currentRow.inboundDate || fallbackRow.inboundDate,
      quantitiesBySize,
    }
  })
}
