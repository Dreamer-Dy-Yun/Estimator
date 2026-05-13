import { useCallback, useMemo, useState } from 'react'
import type { ScatterSalesGridResponse } from '../../api/types'

type AnalysisSelectableRow = {
  skuGroupKey: string
}

export function useAnalysisVisibleSelection<Row extends AnalysisSelectableRow>(
  rows: Row[],
  scatterGrid: ScatterSalesGridResponse | null,
) {
  const [selectedSkuGroupKeyState, setSelectedSkuGroupKey] = useState<string | null>(null)
  const [activeGridCellKeyState, setActiveGridCellKey] = useState<string | null>(null)
  const [bulkSelectedSkuGroupKeys, setBulkSelectedSkuGroupKeys] = useState<Set<string>>(() => new Set())

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
    if (!target) return null
    return new Set(target.skuIds)
  }, [activeGridCellKey, scatterGrid])

  const visibleRows = useMemo(
    () => (activeGridCellSkuIds == null
      ? rows
      : rows.filter((row) => activeGridCellSkuIds.has(row.skuGroupKey))),
    [activeGridCellSkuIds, rows],
  )

  const selectedSkuGroupKey = useMemo(
    () => (
      selectedSkuGroupKeyState && visibleRows.some((row) => row.skuGroupKey === selectedSkuGroupKeyState)
        ? selectedSkuGroupKeyState
        : null
    ),
    [selectedSkuGroupKeyState, visibleRows],
  )

  const navigationOrderIds = useMemo(() => visibleRows.map((row) => row.skuGroupKey), [visibleRows])
  const visibleBulkSelectedSkuGroupKeys = useMemo(
    () => navigationOrderIds.filter((skuGroupKey) => bulkSelectedSkuGroupKeys.has(skuGroupKey)),
    [bulkSelectedSkuGroupKeys, navigationOrderIds],
  )
  const bulkSelectedCount = visibleBulkSelectedSkuGroupKeys.length
  const allVisibleRowsSelected = visibleRows.length > 0 && bulkSelectedCount === visibleRows.length

  const onScatterCellClick = useCallback((cellKey: string) => {
    setActiveGridCellKey((prev) => (prev === cellKey ? null : cellKey))
  }, [])

  const clearActiveGridCell = useCallback(() => {
    setActiveGridCellKey(null)
  }, [])

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
      if (allVisibleRowsSelected) {
        for (const id of navigationOrderIds) next.delete(id)
      } else {
        for (const id of navigationOrderIds) next.add(id)
      }
      return next
    })
  }, [allVisibleRowsSelected, navigationOrderIds])

  const clearBulkSelection = useCallback(() => {
    setBulkSelectedSkuGroupKeys(new Set())
  }, [])

  return {
    activeGridCellKey,
    selectedSkuGroupKey,
    bulkSelectedSkuGroupKeys,
    visibleRows,
    navigationOrderIds,
    bulkSelectedCount,
    allVisibleRowsSelected,
    selectedSkuGroupKeys: visibleBulkSelectedSkuGroupKeys,
    setSelectedSkuGroupKey,
    onScatterCellClick,
    clearActiveGridCell,
    toggleBulkRow,
    toggleAllVisibleRows,
    clearBulkSelection,
  }
}
