import type { SecondaryInboundSplitSource, SecondaryStockOrderCalcResult } from '../../../../../api/types/secondary'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SecondaryConfirmedRound } from '../model/secondaryConfirmedRoundModel'
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
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'
import { assertInboundSplitDatePolicy } from './inboundSplitScheduleDatePolicy'
import { sumInboundSplitConfirmedBySize } from './inboundSplitScheduleTotals'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'

interface InboundSplitRowsBuildResult {
  rows: InboundSplitScheduleRow[]
  error: ApiUnitErrorInfo | null
}

export interface UseInboundSplitScheduleControllerArgs {
  sizeRows: SecondarySizeOrderDisplayRow[]
  stockOrderDisplay: SecondaryStockOrderCalcResult['display'] | null
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  calculationBaseDate: string
  inboundSplitSource: SecondaryInboundSplitSource | null
  inboundSplitSourceLoading: boolean
  inboundSplitSourceError: ApiUnitErrorInfo | null
  calculationReady: boolean
  confirmedRounds: SecondaryConfirmedRound[]
  onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
  onConfirmedRoundsChange: (next: SecondaryConfirmedRound[]) => void
}

export interface UseInboundSplitScheduleControllerResult {
  columns: InboundSplitSizeColumn[]
  scheduleReady: boolean
  sourceErrorTitle: string | undefined
  displayCount: number
  splitRoundsControlDirectConfirm: boolean
  splitRoundRows: InboundSplitScheduleRow[]
  splitRoundConfirmBySize: Record<string, number>
  splitRoundConfirmTotal: number
  visibleError: ApiUnitErrorInfo | null
  openDialog: () => void
  clearConfirmedRounds: () => void
  dialogKey: number
  dialogProps: InboundSplitScheduleDialogBinding
  dialogOpen: boolean
}

export interface InboundSplitScheduleDialogBinding {
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  calculationBaseDate: string
  initialCount: number
  initialRows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  inboundSplitSource: SecondaryInboundSplitSource | null
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

function requireInboundSplitSource(source: SecondaryInboundSplitSource | null): SecondaryInboundSplitSource {
  if (source == null) throw new Error('Inbound split source is required before building split rows.')
  return source
}

export function useInboundSplitScheduleController({
  sizeRows,
  stockOrderDisplay,
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  calculationBaseDate,
  inboundSplitSource,
  inboundSplitSourceLoading,
  inboundSplitSourceError,
  calculationReady,
  confirmedRounds,
  onConfirmQtyChange,
  onConfirmedRoundsChange,
}: UseInboundSplitScheduleControllerArgs): UseInboundSplitScheduleControllerResult {
  const columns: InboundSplitSizeColumn[] = useMemo((): InboundSplitSizeColumn[] => getInboundSplitSizeColumns(sizeRows, stockOrderDisplay), [sizeRows, stockOrderDisplay])
  const sourceReady: boolean = inboundSplitSource != null && !inboundSplitSourceLoading && inboundSplitSourceError == null
  const scheduleReady: boolean = calculationReady && sourceReady
  const [splitCount, setSplitCount]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(MIN_INBOUND_SPLIT_COUNT)
  const [dialogOpen, setDialogOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(false)
  const [dialogKey, setDialogKey]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(0)
  const [draftError, setDraftError]: [ApiUnitErrorInfo | null, React.Dispatch<React.SetStateAction<ApiUnitErrorInfo | null>>] = useState<ApiUnitErrorInfo | null>(null)
  const splitRoundRows: InboundSplitScheduleRow[] = useMemo(
    (): InboundSplitScheduleRow[] => confirmedRounds.length > 1 ? confirmedRoundsToInboundSplitRows(confirmedRounds, columns) : [],
    [columns, confirmedRounds],
  )
  const splitRoundsControlDirectConfirm: boolean = calculationReady && splitRoundRows.length > 1
  const displayCount: number = splitRoundsControlDirectConfirm ? splitRoundRows.length : splitCount
  const initialCount: number = splitRoundsControlDirectConfirm ? splitRoundRows.length : splitCount

  const buildRowsForCount: (next: number) => InboundSplitScheduleRow[] = useCallback((next: number): InboundSplitScheduleRow[] => {
    const source: SecondaryInboundSplitSource = requireInboundSplitSource(inboundSplitSource)
    return buildInboundSplitScheduleRows(columns, clampInboundSplitCount(next), currentOrderInboundDueDate, nextOrderInboundDueDate, source)
  }, [columns, currentOrderInboundDueDate, inboundSplitSource, nextOrderInboundDueDate])

  const recalculateRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[] = useCallback((rows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => {
    const source: SecondaryInboundSplitSource = requireInboundSplitSource(inboundSplitSource)
    return recalculateInboundSplitScheduleRows(rows, columns, nextOrderInboundDueDate, source)
  }, [columns, inboundSplitSource, nextOrderInboundDueDate])

  const dialogBuildResult: InboundSplitRowsBuildResult = useMemo((): InboundSplitRowsBuildResult => {
    if (!dialogOpen || !scheduleReady || inboundSplitSource == null) return { rows: [], error: null }
    try {
      if (splitRoundsControlDirectConfirm) {
        return {
          rows: reconcileInboundSplitScheduleRows(splitRoundRows, columns, initialCount, currentOrderInboundDueDate, nextOrderInboundDueDate, inboundSplitSource),
          error: null,
        }
      }
      return { rows: buildRowsForCount(initialCount), error: null }
    } catch (err: unknown) {
      return { rows: [], error: makeInboundSplitDraftErrorInfo('buildInboundSplitScheduleRows', err) }
    }
  }, [buildRowsForCount, columns, currentOrderInboundDueDate, dialogOpen, inboundSplitSource, initialCount, nextOrderInboundDueDate, scheduleReady, splitRoundRows, splitRoundsControlDirectConfirm])

  const closeDialog: () => void = useCallback((): void => {
    setDraftError(null)
    setDialogOpen(false)
  }, [])

  const applySplitQuantitiesToConfirmState: (rows: readonly InboundSplitScheduleRow[]) => void = useCallback((rows: readonly InboundSplitScheduleRow[]) => {
    const nextConfirmBySize: Record<string, number> = sumInboundSplitConfirmedBySize(rows, columns)
    sizeRows.forEach((row: SecondarySizeOrderDisplayRow): void => {
      onConfirmQtyChange(row.size, nextConfirmBySize[row.size] ?? 0, row.recommendedQty)
    })
  }, [columns, onConfirmQtyChange, sizeRows])

  const clearConfirmedRounds: () => void = useCallback((): void => {
    onConfirmedRoundsChange([])
  }, [onConfirmedRoundsChange])

  const applyDialogRows: (rows: InboundSplitScheduleRow[]) => void = useCallback((rows: InboundSplitScheduleRow[]): void => {
    if (!scheduleReady) return
    if (rows.length === 0) return
    try {
      assertInboundSplitDatePolicy(currentOrderInboundDueDate, nextOrderInboundDueDate, rows)
    } catch (err: unknown) {
      setDraftError(makeInboundSplitDraftErrorInfo('validateInboundSplitScheduleRows', err))
      return
    }

    const nextRows: InboundSplitScheduleRow[] = cloneInboundSplitRows(rows)
    setSplitCount(clampInboundSplitCount(nextRows.length))
    setDraftError(null)

    if (nextRows.length <= 1) {
      clearConfirmedRounds()
      applySplitQuantitiesToConfirmState(nextRows)
      setDialogOpen(false)
      return
    }

    onConfirmedRoundsChange(inboundSplitRowsToConfirmedRounds(nextRows, columns))
    applySplitQuantitiesToConfirmState(nextRows)
    setDialogOpen(false)
  }, [applySplitQuantitiesToConfirmState, clearConfirmedRounds, columns, currentOrderInboundDueDate, nextOrderInboundDueDate, onConfirmedRoundsChange, scheduleReady])

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

  const splitRoundConfirmBySize: Record<string, number> = useMemo(
    (): Record<string, number> => sumInboundSplitConfirmedBySize(splitRoundRows, columns),
    [columns, splitRoundRows],
  )
  const splitRoundConfirmTotal: number = useMemo(
    (): number => columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + (splitRoundConfirmBySize[column.size] ?? 0), 0),
    [columns, splitRoundConfirmBySize],
  )
  const dialogError: ApiUnitErrorInfo | null = draftError ?? dialogBuildResult.error

  return {
    columns,
    scheduleReady,
    sourceErrorTitle: calculationReady ? inboundSplitSourceError?.error : undefined,
    displayCount,
    splitRoundsControlDirectConfirm,
    splitRoundRows,
    splitRoundConfirmBySize,
    splitRoundConfirmTotal,
    visibleError: inboundSplitSourceError ?? dialogError,
    openDialog,
    clearConfirmedRounds,
    dialogKey,
    dialogOpen: dialogOpen && scheduleReady,
    dialogProps: {
      currentOrderInboundDueDate,
      nextOrderInboundDueDate,
      calculationBaseDate,
      initialCount,
      initialRows: dialogBuildResult.rows,
      columns,
      inboundSplitSource,
      buildRowsForCount,
      recalculateRows,
      draftError: dialogError,
      onDraftError: handleDraftError,
      onApply: applyDialogRows,
      onClose: closeDialog,
    },
  }
}
