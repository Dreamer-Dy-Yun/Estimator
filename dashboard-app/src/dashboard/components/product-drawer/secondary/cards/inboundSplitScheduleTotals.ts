import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'

type InboundSplitQuantityField = 'suggestedQuantitiesBySize' | 'quantitiesBySize'

function normalizeQuantity(value: number | undefined): number {
  return Math.max(0, Math.round(value ?? 0))
}

function sumInboundSplitBySize(
  rows: readonly InboundSplitScheduleRow[],
  columns: readonly InboundSplitSizeColumn[],
  field: InboundSplitQuantityField,
): Record<string, number> {
  const totals: Record<string, number> = {}
  columns.forEach((column: InboundSplitSizeColumn): void => {
    totals[column.size] = rows.reduce((sum: number, row: InboundSplitScheduleRow): number => (
      sum + normalizeQuantity(row[field][column.size])
    ), 0)
  })
  return totals
}

export function sumInboundSplitSuggestedBySize(rows: readonly InboundSplitScheduleRow[], columns: readonly InboundSplitSizeColumn[]): Record<string, number> {
  return sumInboundSplitBySize(rows, columns, 'suggestedQuantitiesBySize')
}

export function sumInboundSplitConfirmedBySize(rows: readonly InboundSplitScheduleRow[], columns: readonly InboundSplitSizeColumn[]): Record<string, number> {
  return sumInboundSplitBySize(rows, columns, 'quantitiesBySize')
}

export function sumInboundSplitColumnTotals(columns: readonly InboundSplitSizeColumn[], totalsBySize: Record<string, number>): number {
  return columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + normalizeQuantity(totalsBySize[column.size]), 0)
}
