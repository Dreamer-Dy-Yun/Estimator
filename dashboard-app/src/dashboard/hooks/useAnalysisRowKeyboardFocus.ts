import { useCallback, useMemo } from 'react'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { nextFocusableAnalysisRowId, useAnalysisListKeyboardNavigation } from './useAnalysisListKeyboardNavigation'

interface UseAnalysisRowKeyboardFocusParams {
  orderedRowIds: readonly string[]
  visibleRowIds: readonly string[]
  activeSkuGroupKey: string | null
  drawerSkuGroupKey: string | null
  disabled?: boolean
  onFocusSkuGroupKey: (skuGroupKey: string) => void
  onOpenSkuGroupKey: (skuGroupKey: string) => void
}

export function useAnalysisRowKeyboardFocus({
  orderedRowIds,
  visibleRowIds,
  activeSkuGroupKey,
  drawerSkuGroupKey,
  disabled = false,
  onFocusSkuGroupKey,
  onOpenSkuGroupKey,
}: UseAnalysisRowKeyboardFocusParams) {
  const navigationOrderIds = useMemo(
    () => (orderedRowIds.length ? orderedRowIds : visibleRowIds),
    [orderedRowIds, visibleRowIds],
  )

  const onRequestNavigateAdjacent = useCallback((direction: AdjacentDirection) => {
    if (!drawerSkuGroupKey) return
    const nextId = adjacentIdInOrder(navigationOrderIds, drawerSkuGroupKey, direction)
    if (nextId != null && nextId !== drawerSkuGroupKey) onOpenSkuGroupKey(nextId)
  }, [drawerSkuGroupKey, navigationOrderIds, onOpenSkuGroupKey])

  const onRequestFocusAdjacent = useCallback((currentSkuGroupKey: string | null, direction: AdjacentDirection) => {
    const nextId = nextFocusableAnalysisRowId(navigationOrderIds, currentSkuGroupKey, direction)
    if (nextId) onFocusSkuGroupKey(nextId)
  }, [navigationOrderIds, onFocusSkuGroupKey])

  useAnalysisListKeyboardNavigation({
    orderIds: navigationOrderIds,
    activeSkuGroupKey,
    drawerSkuGroupKey,
    disabled,
    onFocusSkuGroupKey,
    onOpenSkuGroupKey,
  })

  return {
    onRequestNavigateAdjacent,
    onRequestFocusAdjacent,
  }
}
