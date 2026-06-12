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

export function buildInboundSplitScheduleRows(
  columns: InboundSplitSizeColumn[],
  count: number,
  inboundDate: string,
): InboundSplitScheduleRow[] {
  const safeCount: number = clampInboundSplitCount(count)
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
      inboundDate,
      quantitiesBySize,
    }
  })
}

export function reconcileInboundSplitScheduleRows(
  currentRows: InboundSplitScheduleRow[],
  columns: InboundSplitSizeColumn[],
  count: number,
  inboundDate: string,
): InboundSplitScheduleRow[] {
  const fallbackRows: InboundSplitScheduleRow[] = buildInboundSplitScheduleRows(columns, count, inboundDate)
  if (!currentRows.length) return fallbackRows

  return fallbackRows.map((fallbackRow: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => {
    const currentRow: InboundSplitScheduleRow | undefined = currentRows[index]
    if (!currentRow) return fallbackRow

    const quantitiesBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      quantitiesBySize[column.size] = Math.max(0, Math.round(currentRow.quantitiesBySize[column.size] ?? fallbackRow.quantitiesBySize[column.size] ?? 0))
    })

    return {
      id: fallbackRow.id,
      round: fallbackRow.round,
      inboundDate: currentRow.inboundDate || inboundDate,
      quantitiesBySize,
    }
  })
}
