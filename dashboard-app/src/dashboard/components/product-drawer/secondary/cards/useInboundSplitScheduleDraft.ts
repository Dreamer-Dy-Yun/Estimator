import { useCallback, useMemo, useState } from 'react'
import {
  MAX_INBOUND_SPLIT_COUNT,
  MIN_INBOUND_SPLIT_COUNT,
  clampInboundSplitCount,
  cloneInboundSplitRows,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'
import { redistributeInboundSplitRowTotalBySuggestedSizeMix, toInboundSplitDraftInteger } from './inboundSplitDraftQuantityModel'
import { sumInboundSplitColumnTotals, sumInboundSplitConfirmedBySize, sumInboundSplitSuggestedBySize } from './inboundSplitScheduleTotals'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'

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
  ignoreExistingOrderInboundAll: boolean
  suggestedSizeTotals: Record<string, number>
  confirmedSizeTotals: Record<string, number>
  suggestedGrandTotal: number
  confirmedGrandTotal: number
  changeCount: (value: string) => void
  changeDate: (rowIndex: number, value: string) => void
  changeIgnoreExistingOrderInboundAll: (checked: boolean) => void
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
  const [ignoreExistingOrderInboundAll, setIgnoreExistingOrderInboundAll]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(
    initialRows.every((row: InboundSplitScheduleRow): boolean => row.ignoreExistingOrderInbound),
  )
  const [rows, setRows]: [InboundSplitScheduleRow[], React.Dispatch<React.SetStateAction<InboundSplitScheduleRow[]>>] = useState<InboundSplitScheduleRow[]>((): InboundSplitScheduleRow[] => cloneInboundSplitRows(initialRows))
  const countOptions: number[] = useMemo((): number[] => Array.from({ length: MAX_INBOUND_SPLIT_COUNT - MIN_INBOUND_SPLIT_COUNT + 1 }, (_: unknown, index: number): number => MIN_INBOUND_SPLIT_COUNT + index), [])

  const cloneRowsByIgnoreExistingOrderInboundAll: (targetRows: readonly InboundSplitScheduleRow[], checked: boolean) => InboundSplitScheduleRow[] = (
    targetRows: readonly InboundSplitScheduleRow[],
    checked: boolean,
  ): InboundSplitScheduleRow[] => targetRows.map((row: InboundSplitScheduleRow): InboundSplitScheduleRow => ({
    ...row,
    ignoreExistingOrderInbound: checked,
  }))

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
      const builtRows: InboundSplitScheduleRow[] = cloneRowsByIgnoreExistingOrderInboundAll(
        buildRowsForCount(nextCount),
        ignoreExistingOrderInboundAll,
      )
      try {
        const nextRows: InboundSplitScheduleRow[] = recalculateRows(builtRows)
        setCount(nextCount)
        setRows(nextRows)
        onDraftError?.(null, 'buildInboundSplitScheduleRows')
      } catch (err: unknown) {
        setCount(nextCount)
        setRows(builtRows)
        onDraftError?.(err, 'recalculateInboundSplitScheduleRows')
      }
    } catch (err: unknown) {
      onDraftError?.(err, 'buildInboundSplitScheduleRows')
    }
  }, [buildRowsForCount, ignoreExistingOrderInboundAll, onDraftError, recalculateRows])

  const changeIgnoreExistingOrderInboundAll: (checked: boolean) => void = useCallback((checked: boolean): void => {
    setIgnoreExistingOrderInboundAll(checked)
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const nextRows: InboundSplitScheduleRow[] = cloneRowsByIgnoreExistingOrderInboundAll(currentRows, checked)
      try {
        const recalculatedRows: InboundSplitScheduleRow[] = recalculateRows(nextRows)
        onDraftError?.(null, 'recalculateInboundSplitScheduleRows')
        return recalculatedRows
      } catch (err: unknown) {
        onDraftError?.(err, 'recalculateInboundSplitScheduleRows')
        return nextRows
      }
    })
  }, [onDraftError, recalculateRows])

  const changeRowTotal: (rowIndex: number, value: string) => void = useCallback((rowIndex: number, value: string): void => {
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const nextRows: InboundSplitScheduleRow[] = redistributeInboundSplitRowTotalBySuggestedSizeMix(currentRows, columns, rowIndex, value)
      return nextRows.length === currentRows.length ? nextRows : currentRows
    })
  }, [columns])

  const changeQty: (rowIndex: number, size: string, value: string) => void = useCallback((rowIndex: number, size: string, value: string): void => {
    const nextQty: number = toInboundSplitDraftInteger(value)
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
      index === rowIndex
        ? { ...row, quantitiesBySize: { ...row.quantitiesBySize, [size]: nextQty } }
        : row
    )))
  }, [])

  const suggestedSizeTotals: Record<string, number> = useMemo((): Record<string, number> => sumInboundSplitSuggestedBySize(rows, columns), [columns, rows])
  const confirmedSizeTotals: Record<string, number> = useMemo((): Record<string, number> => sumInboundSplitConfirmedBySize(rows, columns), [columns, rows])

  const suggestedGrandTotal: number = useMemo(
    (): number => sumInboundSplitColumnTotals(columns, suggestedSizeTotals),
    [columns, suggestedSizeTotals],
  )
  const confirmedGrandTotal: number = useMemo(
    (): number => sumInboundSplitColumnTotals(columns, confirmedSizeTotals),
    [columns, confirmedSizeTotals],
  )

  return {
    count,
    rows,
    countOptions,
    ignoreExistingOrderInboundAll,
    suggestedSizeTotals,
    confirmedSizeTotals,
    suggestedGrandTotal,
    confirmedGrandTotal,
    changeCount,
    changeDate,
    changeIgnoreExistingOrderInboundAll,
    changeRowTotal,
    changeQty,
  }
}
