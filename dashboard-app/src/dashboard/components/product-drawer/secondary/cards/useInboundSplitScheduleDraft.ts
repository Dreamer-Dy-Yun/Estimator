import { useCallback, useMemo, useState } from 'react'
import {
  MAX_INBOUND_SPLIT_COUNT,
  MIN_INBOUND_SPLIT_COUNT,
  allocateInboundSplitIntegerTotal,
  clampInboundSplitCount,
  cloneInboundSplitRows,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'

function toNonNegativeInteger(value: string): number { return Math.max(0, Math.round(Number(value) || 0)) }
function getSuggestedSizeTotals(rows: readonly InboundSplitScheduleRow[], columns: readonly InboundSplitSizeColumn[]): Record<string, number> {
  const totals: Record<string, number> = {}
  columns.forEach((column: InboundSplitSizeColumn): void => {
    totals[column.size] = rows.reduce((sum: number, row: InboundSplitScheduleRow): number => sum + Math.max(0, Math.round(row.suggestedQuantitiesBySize[column.size] ?? 0)), 0)
  })
  return totals
}

export interface UseInboundSplitScheduleDraftArgs {
  initialCount: number
  initialRows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  buildRowsForCount: (next: number) => InboundSplitScheduleRow[]
  recalculateRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[]
  onDraftError?: (err: unknown | null, request: InboundSplitDraftRequest) => void
}

export interface UseInboundSplitScheduleDraftResult {
  count: number
  rows: InboundSplitScheduleRow[]
  countOptions: number[]
  suggestedSizeTotals: Record<string, number>
  confirmedSizeTotals: Record<string, number>
  suggestedGrandTotal: number
  confirmedGrandTotal: number
  changeCount: (value: string) => void
  changeDate: (rowIndex: number, value: string) => void
  changeRowTotal: (rowIndex: number, value: string) => void
  changeQty: (rowIndex: number, size: string, value: string) => void
}

export function useInboundSplitScheduleDraft({
  initialCount,
  initialRows = [],
  columns,
  buildRowsForCount,
  recalculateRows,
  onDraftError,
}: UseInboundSplitScheduleDraftArgs): UseInboundSplitScheduleDraftResult {
  const [count, setCount]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(initialCount)
  const [rows, setRows]: [InboundSplitScheduleRow[], React.Dispatch<React.SetStateAction<InboundSplitScheduleRow[]>>] = useState<InboundSplitScheduleRow[]>((): InboundSplitScheduleRow[] => cloneInboundSplitRows(initialRows))
  const countOptions: number[] = useMemo((): number[] => Array.from({ length: MAX_INBOUND_SPLIT_COUNT - MIN_INBOUND_SPLIT_COUNT + 1 }, (_: unknown, index: number): number => MIN_INBOUND_SPLIT_COUNT + index), [])

  const changeDate: (rowIndex: number, value: string) => void = useCallback((rowIndex: number, value: string): void => {
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const nextRows: InboundSplitScheduleRow[] = currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
        index === rowIndex ? { ...row, inboundDate: value } : row
      ))
      try {
        const recalculatedRows: InboundSplitScheduleRow[] = recalculateRows(nextRows)
        onDraftError?.(null, 'recalculateInboundSplitScheduleRows')
        return recalculatedRows
      } catch (err: unknown) {
        onDraftError?.(err, 'recalculateInboundSplitScheduleRows')
        return currentRows
      }
    })
  }, [onDraftError, recalculateRows])

  const changeCount: (value: string) => void = useCallback((value: string): void => {
    const nextCount: number = clampInboundSplitCount(Number(value))
    try {
      const nextRows: InboundSplitScheduleRow[] = buildRowsForCount(nextCount)
      setCount(nextCount)
      setRows(nextRows)
      onDraftError?.(null, 'buildInboundSplitScheduleRows')
    } catch (err: unknown) {
      onDraftError?.(err, 'buildInboundSplitScheduleRows')
    }
  }, [buildRowsForCount, onDraftError])

  const changeRowTotal: (rowIndex: number, value: string) => void = useCallback((rowIndex: number, value: string): void => {
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const currentRow: InboundSplitScheduleRow | undefined = currentRows[rowIndex]
      if (!currentRow) return currentRows

      const suggestedTotals: Record<string, number> = getSuggestedSizeTotals(currentRows, columns)
      const distributed: number[] = allocateInboundSplitIntegerTotal({
        total: toNonNegativeInteger(value),
        weights: columns.map((column: InboundSplitSizeColumn): number => suggestedTotals[column.size] ?? 0),
      }).values
      return currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => {
        if (index !== rowIndex) return row
        const quantitiesBySize: Record<string, number> = { ...row.quantitiesBySize }
        columns.forEach((column: InboundSplitSizeColumn, columnIndex: number): void => {
          quantitiesBySize[column.size] = distributed[columnIndex] ?? 0
        })
        return { ...row, quantitiesBySize }
      })
    })
  }, [columns])

  const changeQty: (rowIndex: number, size: string, value: string) => void = useCallback((rowIndex: number, size: string, value: string): void => {
    const nextQty: number = toNonNegativeInteger(value)
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
      index === rowIndex
        ? { ...row, quantitiesBySize: { ...row.quantitiesBySize, [size]: nextQty } }
        : row
    )))
  }, [])

  const suggestedSizeTotals: Record<string, number> = useMemo((): Record<string, number> => {
    const totals: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      totals[column.size] = rows.reduce((sum: number, row: InboundSplitScheduleRow): number => sum + Math.max(0, Math.round(row.suggestedQuantitiesBySize[column.size] ?? 0)), 0)
    })
    return totals
  }, [columns, rows])

  const confirmedSizeTotals: Record<string, number> = useMemo((): Record<string, number> => {
    const totals: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      totals[column.size] = rows.reduce((sum: number, row: InboundSplitScheduleRow): number => sum + Math.max(0, Math.round(row.quantitiesBySize[column.size] ?? 0)), 0)
    })
    return totals
  }, [columns, rows])

  const suggestedGrandTotal: number = useMemo(
    (): number => columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (suggestedSizeTotals[column.size] ?? 0), 0),
    [columns, suggestedSizeTotals],
  )
  const confirmedGrandTotal: number = useMemo(
    (): number => columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (confirmedSizeTotals[column.size] ?? 0), 0),
    [columns, confirmedSizeTotals],
  )

  return {
    count,
    rows,
    countOptions,
    suggestedSizeTotals,
    confirmedSizeTotals,
    suggestedGrandTotal,
    confirmedGrandTotal,
    changeCount,
    changeDate,
    changeRowTotal,
    changeQty,
  }
}
