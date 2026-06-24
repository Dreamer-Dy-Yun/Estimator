import { useCallback, useMemo, useState } from 'react'
import {
  MAX_INBOUND_SPLIT_COUNT,
  MIN_INBOUND_SPLIT_COUNT,
  clampInboundSplitCount,
  cloneInboundSplitRows,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'
import { redistributeInboundSplitRowTotalBySuggestedTotals, toInboundSplitDraftInteger } from './inboundSplitDraftQuantityModel'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'

export interface UseInboundSplitScheduleDraftArgs {
  initialCount: number
  initialRows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  buildRowsForCount: (next: number) => InboundSplitScheduleRow[]
  recalculateRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[]
  validateRows?: (rows: readonly InboundSplitScheduleRow[]) => string | null
  onDraftError?: (err: unknown | null, request: InboundSplitDraftRequest) => void
}

export interface UseInboundSplitScheduleDraftResult {
  count: number
  rows: InboundSplitScheduleRow[]
  draftWarning: string | null
  datesLocked: boolean
  countOptions: number[]
  ignoreExistingOrderInboundAll: boolean
  toggleDatesLocked: () => void
  resetConfirmedToSuggested: () => void
  changeCount: (value: string) => void
  changeDate: (rowIndex: number, value: string) => void
  changeIgnoreExistingOrderInboundAll: (checked: boolean) => void
  changeRowTotal: (rowIndex: number, value: string) => void
  changeQty: (rowIndex: number, size: string, value: string) => void
}

function syncIgnoreExistingOrderInbound(
  targetRows: readonly InboundSplitScheduleRow[],
  checked: boolean,
): InboundSplitScheduleRow[] {
  const canIgnoreExistingOrderInbound: boolean = targetRows.length > 1
  return targetRows.map((row: InboundSplitScheduleRow): InboundSplitScheduleRow => ({
    ...row,
    ignoreExistingOrderInbound: canIgnoreExistingOrderInbound && checked,
  }))
}

function syncQuantitiesToSuggested(
  targetRows: readonly InboundSplitScheduleRow[],
  columns: readonly InboundSplitSizeColumn[],
): InboundSplitScheduleRow[] {
  return targetRows.map((row: InboundSplitScheduleRow): InboundSplitScheduleRow => {
    const quantitiesBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      quantitiesBySize[column.size] = Math.max(0, Math.round(row.suggestedQuantitiesBySize[column.size] ?? 0))
    })
    return {
      ...row,
      quantitiesBySize,
    }
  })
}

export function useInboundSplitScheduleDraft({
  initialCount,
  initialRows = [],
  columns,
  buildRowsForCount,
  recalculateRows,
  validateRows,
  onDraftError,
}: UseInboundSplitScheduleDraftArgs): UseInboundSplitScheduleDraftResult {
  const [count, setCount]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(initialCount)
  const [draftWarning, setDraftWarning]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [datesLocked, setDatesLocked]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(false)
  const [ignoreExistingOrderInboundAll, setIgnoreExistingOrderInboundAll]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(
    initialRows.length > 1 && initialRows.every((row: InboundSplitScheduleRow): boolean => row.ignoreExistingOrderInbound),
  )
  const normalizedInitialRows: InboundSplitScheduleRow[] = initialRows.length > 1
    ? cloneInboundSplitRows(initialRows)
    : cloneInboundSplitRows(initialRows.map((row: InboundSplitScheduleRow): InboundSplitScheduleRow => ({ ...row, ignoreExistingOrderInbound: false })))
  const [rows, setRows]: [InboundSplitScheduleRow[], React.Dispatch<React.SetStateAction<InboundSplitScheduleRow[]>>] = useState<InboundSplitScheduleRow[]>((): InboundSplitScheduleRow[] => (
    cloneInboundSplitRows(normalizedInitialRows)
  ))
  const countOptions: number[] = useMemo((): number[] => Array.from({ length: MAX_INBOUND_SPLIT_COUNT - MIN_INBOUND_SPLIT_COUNT + 1 }, (_: unknown, index: number): number => MIN_INBOUND_SPLIT_COUNT + index), [])

  const getRowsWarning: (targetRows: readonly InboundSplitScheduleRow[]) => string | null = useCallback((targetRows: readonly InboundSplitScheduleRow[]): string | null => (
    validateRows?.(targetRows) ?? null
  ), [validateRows])

  const toggleDatesLocked: () => void = useCallback((): void => {
    setDatesLocked((currentDatesLocked: boolean): boolean => {
      if (currentDatesLocked) {
        setDraftWarning(null)
        return false
      }

      const warning: string | null = getRowsWarning(rows)
      if (warning != null) {
        setDraftWarning(warning)
        onDraftError?.(null, 'validateInboundSplitScheduleRows')
        return false
      }
      setDraftWarning(null)
      onDraftError?.(null, 'validateInboundSplitScheduleRows')
      return true
    })
  }, [getRowsWarning, onDraftError, rows, setDatesLocked, setDraftWarning])

  const resetConfirmedToSuggested: () => void = useCallback((): void => {
    if (!datesLocked) return
    setDraftWarning(null)
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => syncQuantitiesToSuggested(currentRows, columns))
  }, [columns, datesLocked, setDraftWarning, setRows])

  const changeDate: (rowIndex: number, value: string) => void = useCallback((rowIndex: number, value: string): void => {
    if (datesLocked) return
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const nextRows: InboundSplitScheduleRow[] = currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
        index === rowIndex ? { ...row, inboundDate: value } : row
      ))
      const warning: string | null = getRowsWarning(nextRows)
      if (warning != null) {
        setDraftWarning(warning)
        onDraftError?.(null, 'validateInboundSplitScheduleRows')
        return currentRows
      }
      try {
        const recalculatedRows: InboundSplitScheduleRow[] = recalculateRows(nextRows)
        setDraftWarning(null)
        onDraftError?.(null, 'recalculateInboundSplitScheduleRows')
        return syncQuantitiesToSuggested(recalculatedRows, columns)
      } catch (err: unknown) {
        setDraftWarning(null)
        onDraftError?.(err, 'recalculateInboundSplitScheduleRows')
        return currentRows
      }
    })
  }, [columns, datesLocked, getRowsWarning, onDraftError, recalculateRows, setDraftWarning, setRows])

  const changeCount: (value: string) => void = useCallback((value: string): void => {
    if (datesLocked) return
    const nextCount: number = clampInboundSplitCount(Number(value))
    setDraftWarning(null)
    try {
      const builtRows: InboundSplitScheduleRow[] = syncIgnoreExistingOrderInbound(
        buildRowsForCount(nextCount),
        ignoreExistingOrderInboundAll && nextCount > 1,
      )
      try {
        const nextRows: InboundSplitScheduleRow[] = recalculateRows(builtRows)
        setCount(nextCount)
        setRows(syncQuantitiesToSuggested(nextRows, columns))
        onDraftError?.(null, 'buildInboundSplitScheduleRows')
      } catch (err: unknown) {
        setCount(nextCount)
        setRows(syncQuantitiesToSuggested(builtRows, columns))
        onDraftError?.(err, 'recalculateInboundSplitScheduleRows')
      }
    } catch (err: unknown) {
      onDraftError?.(err, 'buildInboundSplitScheduleRows')
    }
  }, [buildRowsForCount, columns, datesLocked, ignoreExistingOrderInboundAll, onDraftError, recalculateRows, setCount, setDraftWarning, setRows])

  const changeIgnoreExistingOrderInboundAll: (checked: boolean) => void = useCallback((checked: boolean): void => {
    setIgnoreExistingOrderInboundAll(checked)
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const nextRows: InboundSplitScheduleRow[] = syncIgnoreExistingOrderInbound(currentRows, checked)
      try {
        const recalculatedRows: InboundSplitScheduleRow[] = recalculateRows(nextRows)
        setDraftWarning(null)
        onDraftError?.(null, 'recalculateInboundSplitScheduleRows')
        return syncQuantitiesToSuggested(recalculatedRows, columns)
      } catch (err: unknown) {
        setDraftWarning(null)
        onDraftError?.(err, 'recalculateInboundSplitScheduleRows')
        return syncQuantitiesToSuggested(nextRows, columns)
      }
    })
  }, [columns, onDraftError, recalculateRows, setDraftWarning, setIgnoreExistingOrderInboundAll, setRows])

  const changeRowTotal: (rowIndex: number, value: string) => void = useCallback((rowIndex: number, value: string): void => {
    if (!datesLocked) return
    setDraftWarning(null)
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
      const nextRows: InboundSplitScheduleRow[] = redistributeInboundSplitRowTotalBySuggestedTotals(currentRows, columns, rowIndex, value)
      return nextRows.length === currentRows.length ? nextRows : currentRows
    })
  }, [columns, datesLocked, setDraftWarning, setRows])

  const changeQty: (rowIndex: number, size: string, value: string) => void = useCallback((rowIndex: number, size: string, value: string): void => {
    if (!datesLocked) return
    const nextQty: number = toInboundSplitDraftInteger(value)
    setDraftWarning(null)
    setRows((currentRows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => currentRows.map((row: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => (
      index === rowIndex
        ? { ...row, quantitiesBySize: { ...row.quantitiesBySize, [size]: nextQty } }
        : row
    )))
  }, [datesLocked, setDraftWarning, setRows])

  return {
    count,
    rows,
    draftWarning,
    datesLocked,
    countOptions,
    ignoreExistingOrderInboundAll,
    toggleDatesLocked,
    resetConfirmedToSuggested,
    changeCount,
    changeDate,
    changeIgnoreExistingOrderInboundAll,
    changeRowTotal,
    changeQty,
  }
}
