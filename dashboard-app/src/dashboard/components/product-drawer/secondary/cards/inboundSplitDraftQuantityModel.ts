import { allocateInboundSplitIntegerTotal, type InboundSplitScheduleRow, type InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { sumInboundSplitSuggestedBySize } from './inboundSplitScheduleTotals'

export function toInboundSplitDraftInteger(value: string): number {
  return Math.max(0, Math.round(Number(value) || 0))
}

export function redistributeInboundSplitRowTotalByScheduleSuggestion(
  rows: readonly InboundSplitScheduleRow[],
  columns: readonly InboundSplitSizeColumn[],
  rowIndex: number,
  value: string,
): InboundSplitScheduleRow[] {
  const currentRow: InboundSplitScheduleRow | undefined = rows[rowIndex]
  if (currentRow == null) return [...rows]

  const suggestedTotals: Record<string, number> = sumInboundSplitSuggestedBySize(rows, columns)
  const distributed: number[] = allocateInboundSplitIntegerTotal({
    total: toInboundSplitDraftInteger(value),
    weights: columns.map((column: InboundSplitSizeColumn): number => suggestedTotals[column.size] ?? 0),
  }).values

  return rows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => {
    if (index !== rowIndex) return row
    const quantitiesBySize: Record<string, number> = { ...row.quantitiesBySize }
    columns.forEach((column: InboundSplitSizeColumn, columnIndex: number): void => {
      quantitiesBySize[column.size] = distributed[columnIndex] ?? 0
    })
    return { ...row, quantitiesBySize }
  })
}
