import { allocateInboundSplitIntegerTotal, type InboundSplitScheduleRow, type InboundSplitSizeColumn } from './inboundSplitScheduleModel'

export function toInboundSplitDraftInteger(value: string): number {
  return Math.max(0, Math.round(Number(value) || 0))
}

export function redistributeInboundSplitRowTotalBySuggestedTotals(
  rows: readonly InboundSplitScheduleRow[],
  columns: readonly InboundSplitSizeColumn[],
  rowIndex: number,
  value: string,
): InboundSplitScheduleRow[] {
  const currentRow: InboundSplitScheduleRow | undefined = rows[rowIndex]
  if (currentRow == null) return [...rows]

  const distributed: number[] = allocateInboundSplitIntegerTotal({
    total: toInboundSplitDraftInteger(value),
    weights: columns.map((column: InboundSplitSizeColumn): number => rows.reduce((sum: number, row: InboundSplitScheduleRow): number => (
      sum + Math.max(0, Math.round(row.suggestedQuantitiesBySize[column.size] ?? 0))
    ), 0)),
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
