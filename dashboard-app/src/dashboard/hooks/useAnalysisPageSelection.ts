import type { ScatterGridCell } from '../../api/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ScatterSalesGridResponse } from '../../api/types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { isDialogOrInteractiveControlTarget } from '../interaction/interactionTarget'

export type AnalysisSelectableRow = {
  skuGroupKey: string
}

type AnalysisPageSelectionOptions<Row extends AnalysisSelectableRow> = {
  rows: Row[]
  scatterGrid: ScatterSalesGridResponse | null
  bulkAddOpen: boolean
  resetKey?: string
}

type ActiveGridCellSelection = {
  cellKey: string
  resetKey?: string
}

function nextFocusableRowId(
  orderIds: readonly string[],
  currentId: string | null,
  direction: AdjacentDirection,
) : string | null {
  if (!orderIds.length) return null
  if (!currentId) return direction === 'next' ? orderIds[0] : orderIds[orderIds.length - 1]
  return adjacentIdInOrder(orderIds, currentId, direction)
}

export function useAnalysisPageSelection<Row extends AnalysisSelectableRow>({
  rows,
  scatterGrid,
  bulkAddOpen,
  resetKey,
}: AnalysisPageSelectionOptions<Row>) : { activeGridCell: ScatterGridCell | null; activeGridCellKey: string | null; selectedSkuGroupKey: string | null; activeSkuGroupKey: string | null; bulkSelectedSkuGroupKeys: Set<string>; visibleRows: Row[]; bulkSelectedCount: number; allVisibleRowsSelected: boolean; selectedSkuGroupKeys: string[]; setSelectedSkuGroupKey: (skuGroupKey: string | null) => void; onScatterCellClick: (cellKey: string) => void; clearActiveGridCell: () => void; toggleBulkRow: (id: string) => void; toggleAllVisibleRows: () => void; clearBulkSelection: () => void; onRequestNavigateAdjacent: (direction: AdjacentDirection) => void; onRequestFocusAdjacent: (currentSkuGroupKey: string | null, direction: AdjacentDirection) => void; onOrderedSkuGroupKeysChange: React.Dispatch<React.SetStateAction<string[]>>; } {
  const [selectedSkuGroupKeyState, setSelectedSkuGroupKey]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [focusedSkuGroupKeyState, setFocusedSkuGroupKey]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [activeGridCellSelection, setActiveGridCellSelection]: [ActiveGridCellSelection | null, React.Dispatch<React.SetStateAction<ActiveGridCellSelection | null>>] = useState<ActiveGridCellSelection | null>(null)
  const [bulkSelectedSkuGroupKeys, setBulkSelectedSkuGroupKeys]: [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] = useState<Set<string>>(() : Set<string> => new Set())
  const [orderedSkuGroupKeys, setOrderedSkuGroupKeys]: [string[], React.Dispatch<React.SetStateAction<string[]>>] = useState<string[]>([])

  const activeGridCellKey: string | null = useMemo(
    () : string | null => (
      activeGridCellSelection && activeGridCellSelection.resetKey === resetKey && scatterGrid?.cells.some((cell: ScatterGridCell) : boolean => cell.cellKey === activeGridCellSelection.cellKey)
        ? activeGridCellSelection.cellKey
        : null
    ),
    [activeGridCellSelection, resetKey, scatterGrid],
  )

  const activeGridCell: ScatterGridCell | null = useMemo(() : ScatterGridCell | null => {
    if (!activeGridCellKey || !scatterGrid) return null
    return scatterGrid.cells.find((cell: ScatterGridCell) : boolean => cell.cellKey === activeGridCellKey) ?? null
  }, [activeGridCellKey, scatterGrid])

  const activeGridCellSkuIds: Set<string> | null = useMemo(() : Set<string> | null => {
    return activeGridCell ? new Set(activeGridCell.skuIds) : null
  }, [activeGridCell])

  const visibleRows: Row[] = useMemo(
    () : Row[] => (activeGridCellSkuIds == null
      ? rows
      : rows.filter((row: Row) : boolean => activeGridCellSkuIds.has(row.skuGroupKey))),
    [activeGridCellSkuIds, rows],
  )
  const visibleRowIds: string[] = useMemo(() : string[] => visibleRows.map((row: Row) : string => row.skuGroupKey), [visibleRows])
  const navigationOrderIds: string[] = orderedSkuGroupKeys.length ? orderedSkuGroupKeys : visibleRowIds
  const selectedSkuGroupKey: string | null = selectedSkuGroupKeyState && visibleRowIds.includes(selectedSkuGroupKeyState)
    ? selectedSkuGroupKeyState
    : null
  const focusedSkuGroupKey: string | null = focusedSkuGroupKeyState && visibleRowIds.includes(focusedSkuGroupKeyState)
    ? focusedSkuGroupKeyState
    : null
  const activeSkuGroupKey: string | null = selectedSkuGroupKey ?? focusedSkuGroupKey
  const selectedSkuGroupKeys: string[] = useMemo(
    () : string[] => visibleRowIds.filter((skuGroupKey: string) : boolean => bulkSelectedSkuGroupKeys.has(skuGroupKey)),
    [bulkSelectedSkuGroupKeys, visibleRowIds],
  )
  const bulkSelectedCount: number = selectedSkuGroupKeys.length
  const allVisibleRowsSelected: boolean = visibleRows.length > 0 && bulkSelectedCount === visibleRows.length

  const openSkuGroupKey: (skuGroupKey: string | null) => void = useCallback((skuGroupKey: string | null) : void => {
    setSelectedSkuGroupKey(skuGroupKey)
    if (skuGroupKey) setFocusedSkuGroupKey(skuGroupKey)
  }, [])
  const focusSkuGroupKey: (skuGroupKey: string | null) => void = useCallback((skuGroupKey: string | null) : void => {
    setFocusedSkuGroupKey(skuGroupKey)
  }, [])
  const onScatterCellClick: (cellKey: string) => void = useCallback((cellKey: string) : void => {
    setActiveGridCellSelection((prev: ActiveGridCellSelection | null) : ActiveGridCellSelection | null => (
      prev?.cellKey === cellKey && prev.resetKey === resetKey ? null : { cellKey, resetKey }
    ))
  }, [resetKey])
  const clearActiveGridCell: () => void = useCallback(() : void => setActiveGridCellSelection(null), [])
  const clearBulkSelection: () => void = useCallback(() : void => setBulkSelectedSkuGroupKeys(new Set()), [])
  const toggleBulkRow: (id: string) => void = useCallback((id: string) : void => {
    setBulkSelectedSkuGroupKeys((prev: Set<string>) : Set<string> => {
      const next: Set<string> = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const toggleAllVisibleRows: () => void = useCallback(() : void => {
    setBulkSelectedSkuGroupKeys((prev: Set<string>) : Set<string> => {
      const next: Set<string> = new Set(prev)
      for (const id of visibleRowIds) {
        if (allVisibleRowsSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }, [allVisibleRowsSelected, visibleRowIds])
  const onRequestNavigateAdjacent: (direction: AdjacentDirection) => void = useCallback((direction: AdjacentDirection) : void => {
    if (!selectedSkuGroupKey) return
    const nextId: string | null = adjacentIdInOrder(navigationOrderIds, selectedSkuGroupKey, direction)
    if (nextId != null && nextId !== selectedSkuGroupKey) openSkuGroupKey(nextId)
  }, [navigationOrderIds, openSkuGroupKey, selectedSkuGroupKey])
  const onRequestFocusAdjacent: (currentSkuGroupKey: string | null, direction: AdjacentDirection) => void = useCallback((currentSkuGroupKey: string | null, direction: AdjacentDirection) : void => {
    const nextId: string | null = nextFocusableRowId(navigationOrderIds, currentSkuGroupKey, direction)
    if (nextId) focusSkuGroupKey(nextId)
  }, [focusSkuGroupKey, navigationOrderIds])

  useEffect(() : (() => void) | undefined => {
    if (bulkAddOpen || selectedSkuGroupKey) return
    const onKeyDown: (event: KeyboardEvent) => void = (event: KeyboardEvent) : void => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isDialogOrInteractiveControlTarget(event.target)) return
      if (event.key === 'ArrowLeft') {
        if (!activeSkuGroupKey) return
        event.preventDefault()
        openSkuGroupKey(activeSkuGroupKey)
        return
      }
      const nextId: string | null = nextFocusableRowId(navigationOrderIds, activeSkuGroupKey, event.key === 'ArrowDown' ? 'next' : 'prev')
      if (!nextId) return
      event.preventDefault()
      focusSkuGroupKey(nextId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () : void => window.removeEventListener('keydown', onKeyDown)
  }, [activeSkuGroupKey, bulkAddOpen, focusSkuGroupKey, navigationOrderIds, openSkuGroupKey, selectedSkuGroupKey])

  return {
    activeGridCell,
    activeGridCellKey,
    selectedSkuGroupKey,
    activeSkuGroupKey,
    bulkSelectedSkuGroupKeys,
    visibleRows,
    bulkSelectedCount,
    allVisibleRowsSelected,
    selectedSkuGroupKeys,
    setSelectedSkuGroupKey: openSkuGroupKey,
    onScatterCellClick,
    clearActiveGridCell,
    toggleBulkRow,
    toggleAllVisibleRows,
    clearBulkSelection,
    onRequestNavigateAdjacent,
    onRequestFocusAdjacent,
    onOrderedSkuGroupKeysChange: setOrderedSkuGroupKeys,
  }
}
