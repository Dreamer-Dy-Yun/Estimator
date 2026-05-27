import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ScatterSalesGridResponse } from '../../api/types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { isDialogOrInteractiveControlTarget } from '../interaction/interactionTarget'

type AnalysisSelectableRow = {
  skuGroupKey: string
}

type AnalysisPageSelectionOptions<Row extends AnalysisSelectableRow> = {
  rows: Row[]
  scatterGrid: ScatterSalesGridResponse | null
  bulkAddOpen: boolean
}

function nextFocusableRowId(
  orderIds: readonly string[],
  currentId: string | null,
  direction: AdjacentDirection,
) {
  if (!orderIds.length) return null
  if (!currentId) return direction === 'next' ? orderIds[0] : orderIds[orderIds.length - 1]
  return adjacentIdInOrder(orderIds, currentId, direction)
}

export function useAnalysisPageSelection<Row extends AnalysisSelectableRow>({
  rows,
  scatterGrid,
  bulkAddOpen,
}: AnalysisPageSelectionOptions<Row>) {
  const [selectedSkuGroupKeyState, setSelectedSkuGroupKey] = useState<string | null>(null)
  const [focusedSkuGroupKeyState, setFocusedSkuGroupKey] = useState<string | null>(null)
  const [activeGridCellKeyState, setActiveGridCellKey] = useState<string | null>(null)
  const [bulkSelectedSkuGroupKeys, setBulkSelectedSkuGroupKeys] = useState<Set<string>>(() => new Set())
  const [orderedSkuGroupKeys, setOrderedSkuGroupKeys] = useState<string[]>([])

  const activeGridCellKey = useMemo(
    () => (
      activeGridCellKeyState && scatterGrid?.cells.some((cell) => cell.cellKey === activeGridCellKeyState)
        ? activeGridCellKeyState
        : null
    ),
    [activeGridCellKeyState, scatterGrid],
  )

  const activeGridCellSkuIds = useMemo(() => {
    if (!activeGridCellKey || !scatterGrid) return null
    const target = scatterGrid.cells.find((cell) => cell.cellKey === activeGridCellKey)
    return target ? new Set(target.skuIds) : null
  }, [activeGridCellKey, scatterGrid])

  const visibleRows = useMemo(
    () => (activeGridCellSkuIds == null
      ? rows
      : rows.filter((row) => activeGridCellSkuIds.has(row.skuGroupKey))),
    [activeGridCellSkuIds, rows],
  )
  const visibleRowIds = useMemo(() => visibleRows.map((row) => row.skuGroupKey), [visibleRows])
  const navigationOrderIds = orderedSkuGroupKeys.length ? orderedSkuGroupKeys : visibleRowIds
  const selectedSkuGroupKey = selectedSkuGroupKeyState && visibleRowIds.includes(selectedSkuGroupKeyState)
    ? selectedSkuGroupKeyState
    : null
  const focusedSkuGroupKey = focusedSkuGroupKeyState && visibleRowIds.includes(focusedSkuGroupKeyState)
    ? focusedSkuGroupKeyState
    : null
  const activeSkuGroupKey = selectedSkuGroupKey ?? focusedSkuGroupKey
  const selectedSkuGroupKeys = useMemo(
    () => visibleRowIds.filter((skuGroupKey) => bulkSelectedSkuGroupKeys.has(skuGroupKey)),
    [bulkSelectedSkuGroupKeys, visibleRowIds],
  )
  const bulkSelectedCount = selectedSkuGroupKeys.length
  const allVisibleRowsSelected = visibleRows.length > 0 && bulkSelectedCount === visibleRows.length

  const openSkuGroupKey = useCallback((skuGroupKey: string | null) => {
    setSelectedSkuGroupKey(skuGroupKey)
    if (skuGroupKey) setFocusedSkuGroupKey(skuGroupKey)
  }, [])
  const focusSkuGroupKey = useCallback((skuGroupKey: string | null) => {
    setFocusedSkuGroupKey(skuGroupKey)
  }, [])
  const onScatterCellClick = useCallback((cellKey: string) => {
    setActiveGridCellKey((prev) => (prev === cellKey ? null : cellKey))
  }, [])
  const clearActiveGridCell = useCallback(() => setActiveGridCellKey(null), [])
  const clearBulkSelection = useCallback(() => setBulkSelectedSkuGroupKeys(new Set()), [])
  const toggleBulkRow = useCallback((id: string) => {
    setBulkSelectedSkuGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const toggleAllVisibleRows = useCallback(() => {
    setBulkSelectedSkuGroupKeys((prev) => {
      const next = new Set(prev)
      for (const id of visibleRowIds) {
        if (allVisibleRowsSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }, [allVisibleRowsSelected, visibleRowIds])
  const onRequestNavigateAdjacent = useCallback((direction: AdjacentDirection) => {
    if (!selectedSkuGroupKey) return
    const nextId = adjacentIdInOrder(navigationOrderIds, selectedSkuGroupKey, direction)
    if (nextId != null && nextId !== selectedSkuGroupKey) openSkuGroupKey(nextId)
  }, [navigationOrderIds, openSkuGroupKey, selectedSkuGroupKey])
  const onRequestFocusAdjacent = useCallback((currentSkuGroupKey: string | null, direction: AdjacentDirection) => {
    const nextId = nextFocusableRowId(navigationOrderIds, currentSkuGroupKey, direction)
    if (nextId) focusSkuGroupKey(nextId)
  }, [focusSkuGroupKey, navigationOrderIds])

  useEffect(() => {
    if (bulkAddOpen || selectedSkuGroupKey) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isDialogOrInteractiveControlTarget(event.target)) return
      if (event.key === 'ArrowLeft') {
        if (!activeSkuGroupKey) return
        event.preventDefault()
        openSkuGroupKey(activeSkuGroupKey)
        return
      }
      const nextId = nextFocusableRowId(navigationOrderIds, activeSkuGroupKey, event.key === 'ArrowDown' ? 'next' : 'prev')
      if (!nextId) return
      event.preventDefault()
      focusSkuGroupKey(nextId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeSkuGroupKey, bulkAddOpen, focusSkuGroupKey, navigationOrderIds, openSkuGroupKey, selectedSkuGroupKey])

  return {
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
