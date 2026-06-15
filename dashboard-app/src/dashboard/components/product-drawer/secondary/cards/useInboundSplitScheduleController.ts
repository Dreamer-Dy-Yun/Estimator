import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import type { OrderSnapshotConfirmedRound } from '../../../../../snapshot/orderSnapshotTypes'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import {
  MIN_INBOUND_SPLIT_COUNT,
  buildInboundSplitScheduleRows,
  clampInboundSplitCount,
  cloneInboundSplitRows,
  confirmedRoundsToInboundSplitRows,
  getInboundSplitSizeColumns,
  inboundSplitRowsToConfirmedRounds,
  recalculateInboundSplitScheduleRows,
  reconcileInboundSplitScheduleRows,
  sumInboundSplitConfirmedBySize,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'

interface InboundSplitRowsBuildResult {
  rows: InboundSplitScheduleRow[]
  error: ApiUnitErrorInfo | null
}

export interface UseInboundSplitScheduleControllerArgs {
  sizeRows: SecondarySizeOrderDisplayRow[]
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  inboundSplitSource: SecondaryInboundSplitSource | null
  inboundSplitSourceLoading: boolean
  inboundSplitSourceError: ApiUnitErrorInfo | null
  calculationReady: boolean
  confirmedRounds: OrderSnapshotConfirmedRound[]
  onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
  onConfirmedRoundsChange: (next: OrderSnapshotConfirmedRound[]) => void
}

export interface UseInboundSplitScheduleControllerResult {
  columns: InboundSplitSizeColumn[]
  sourceReady: boolean
  scheduleReady: boolean
  sourceErrorTitle: string | undefined
  displayCount: number
  confirmedRoundsLocked: boolean
  appliedRows: InboundSplitScheduleRow[]
  appliedConfirmBySize: Record<string, number>
  appliedConfirmTotal: number
  visibleError: ApiUnitErrorInfo | null
  openDialog: () => void
  clearConfirmedRounds: () => void
  dialogKey: number
  dialogProps: InboundSplitScheduleDialogBinding
  dialogOpen: boolean
}

export interface InboundSplitScheduleDialogBinding {
  initialCount: number
  initialRows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  buildRowsForCount: (next: number) => InboundSplitScheduleRow[]
  recalculateRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[]
  draftError: ApiUnitErrorInfo | null
  onDraftError: (err: unknown | null, request: InboundSplitDraftRequest) => void
  onApply: (rows: InboundSplitScheduleRow[]) => void
  onClose: () => void
}

function makeInboundSplitDraftErrorInfo(request: InboundSplitDraftRequest, err: unknown): ApiUnitErrorInfo {
  return {
    checkedAt: new Date().toISOString(),
    page: 'ProductSecondaryDrawer',
    request,
    error: err instanceof Error ? err.message : String(err),
  }
}

export function useInboundSplitScheduleController({
  sizeRows,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  inboundSplitSource,
  inboundSplitSourceLoading,
  inboundSplitSourceError,
  calculationReady,
  confirmedRounds,
  onConfirmQtyChange,
  onConfirmedRoundsChange,
}: UseInboundSplitScheduleControllerArgs): UseInboundSplitScheduleControllerResult {
  const columns: InboundSplitSizeColumn[] = useMemo((): InboundSplitSizeColumn[] => getInboundSplitSizeColumns(sizeRows), [sizeRows])
  const sourceReady: boolean = inboundSplitSource != null && !inboundSplitSourceLoading && inboundSplitSourceError == null
  const scheduleReady: boolean = calculationReady && sourceReady
  const [splitCount, setSplitCount]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(MIN_INBOUND_SPLIT_COUNT)
  const [dialogOpen, setDialogOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(false)
  const [dialogKey, setDialogKey]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(0)
  const [draftError, setDraftError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const appliedRows: InboundSplitScheduleRow[] = useMemo(
    (): InboundSplitScheduleRow[] => confirmedRounds.length > 1 ? confirmedRoundsToInboundSplitRows(confirmedRounds, columns) : [],
    [columns, confirmedRounds],
  )
  const confirmedRoundsLocked: boolean = calculationReady && appliedRows.length > 1
  const displayCount: number = confirmedRoundsLocked ? appliedRows.length : splitCount
  const initialCount: number = confirmedRoundsLocked ? appliedRows.length : splitCount

  const buildRowsForCount: (next: number) => InboundSplitScheduleRow[] = useCallback((next: number): InboundSplitScheduleRow[] => {
    if (inboundSplitSource == null) return []
    return buildInboundSplitScheduleRows(columns, clampInboundSplitCount(next), currentOrderInboundDueDate, nextOrderInboundDueDate, inboundSplitSource)
  }, [columns, currentOrderInboundDueDate, inboundSplitSource, nextOrderInboundDueDate])

  const recalculateRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[] = useCallback((rows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
    if (inboundSplitSource == null) return rows
    return recalculateInboundSplitScheduleRows(rows, columns, nextOrderInboundDueDate, inboundSplitSource)
  }, [columns, inboundSplitSource, nextOrderInboundDueDate])

  const dialogBuildResult: InboundSplitRowsBuildResult = useMemo((): InboundSplitRowsBuildResult => {
    if (!dialogOpen || !scheduleReady || inboundSplitSource == null) return { rows: [], error: null }
    try {
      if (confirmedRoundsLocked) {
        return {
          rows: reconcileInboundSplitScheduleRows(appliedRows, columns, initialCount, currentOrderInboundDueDate, nextOrderInboundDueDate, inboundSplitSource),
          error: null,
        }
      }
      return { rows: buildRowsForCount(initialCount), error: null }
    } catch (err: unknown) {
      return { rows: [], error: makeInboundSplitDraftErrorInfo('buildInboundSplitScheduleRows', err) }
    }
  }, [appliedRows, buildRowsForCount, columns, confirmedRoundsLocked, currentOrderInboundDueDate, dialogOpen, inboundSplitSource, initialCount, nextOrderInboundDueDate, scheduleReady])

  const closeDialog: () => void = useCallback((): void => {
    setDraftError(null)
    setDialogOpen(false)
  }, [])

  const clearConfirmedRounds: () => void = useCallback((): void => {
    onConfirmedRoundsChange([])
  }, [onConfirmedRoundsChange])

  const applyDialogRows: (rows: InboundSplitScheduleRow[]) => void = useCallback((rows: InboundSplitScheduleRow[]): void => {
    if (!scheduleReady) return
    if (rows.length === 0) return

    const nextRows: InboundSplitScheduleRow[] = cloneInboundSplitRows(rows)
    const nextConfirmBySize: Record<string, number> = sumInboundSplitConfirmedBySize(nextRows, columns)
    setSplitCount(clampInboundSplitCount(nextRows.length))

    if (nextRows.length <= 1) {
      clearConfirmedRounds()
      sizeRows.forEach((row: SecondarySizeOrderDisplayRow): void => {
        onConfirmQtyChange(row.size, nextConfirmBySize[row.size] ?? 0, row.recommendedQty)
      })
      setDialogOpen(false)
      return
    }

    onConfirmedRoundsChange(inboundSplitRowsToConfirmedRounds(nextRows, columns))
    sizeRows.forEach((row: SecondarySizeOrderDisplayRow): void => {
      onConfirmQtyChange(row.size, nextConfirmBySize[row.size] ?? 0, row.recommendedQty)
    })
    setDialogOpen(false)
  }, [clearConfirmedRounds, columns, onConfirmQtyChange, onConfirmedRoundsChange, scheduleReady, sizeRows])

  const handleDraftError: (err: unknown | null, request: InboundSplitDraftRequest) => void = useCallback((err: unknown | null, request: InboundSplitDraftRequest): void => {
    setDraftError(err == null ? null : makeInboundSplitDraftErrorInfo(request, err))
  }, [])

  const openDialog: () => void = useCallback((): void => {
    if (!scheduleReady) return
    setDraftError(null)
    setDialogKey((currentId: number): number => currentId + 1)
    setDialogOpen(true)
  }, [scheduleReady])

  useEffect((): (() => void) | undefined => {
    if (scheduleReady || !dialogOpen) return
    const closeTimer: number = window.setTimeout((): void => {
      setDraftError(null)
      setDialogOpen(false)
      setDialogKey((currentId: number): number => currentId + 1)
    }, 0)
    return (): void => window.clearTimeout(closeTimer)
  }, [dialogOpen, scheduleReady])

  const appliedConfirmBySize: Record<string, number> = useMemo(
    (): Record<string, number> => sumInboundSplitConfirmedBySize(appliedRows, columns),
    [appliedRows, columns],
  )
  const appliedConfirmTotal: number = useMemo(
    (): number => columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (appliedConfirmBySize[column.size] ?? 0), 0),
    [appliedConfirmBySize, columns],
  )
  const dialogError: ApiUnitErrorInfo | null = draftError ?? dialogBuildResult.error

  return {
    columns,
    sourceReady,
    scheduleReady,
    sourceErrorTitle: calculationReady ? inboundSplitSourceError?.error : undefined,
    displayCount,
    confirmedRoundsLocked,
    appliedRows,
    appliedConfirmBySize,
    appliedConfirmTotal,
    visibleError: inboundSplitSourceError ?? dialogError,
    openDialog,
    clearConfirmedRounds,
    dialogKey,
    dialogOpen: dialogOpen && scheduleReady,
    dialogProps: {
      initialCount,
      initialRows: dialogBuildResult.rows,
      columns,
      buildRowsForCount,
      recalculateRows,
      draftError: dialogError,
      onDraftError: handleDraftError,
      onApply: applyDialogRows,
      onClose: closeDialog,
    },
  }
}
