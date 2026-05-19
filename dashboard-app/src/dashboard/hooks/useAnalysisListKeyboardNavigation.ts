import { useEffect } from 'react'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../utils/adjacentListNavigation'
import { isDialogOrInteractiveControlTarget } from '../interaction/interactionTarget'

export function nextFocusableAnalysisRowId(
  orderIds: readonly string[],
  currentId: string | null,
  direction: AdjacentDirection,
) {
  if (!orderIds.length) return null
  if (!currentId) return direction === 'next' ? orderIds[0] : orderIds[orderIds.length - 1]
  return adjacentIdInOrder(orderIds, currentId, direction)
}

export function useAnalysisListKeyboardNavigation({
  orderIds,
  activeSkuGroupKey,
  drawerSkuGroupKey,
  disabled = false,
  onFocusSkuGroupKey,
  onOpenSkuGroupKey,
}: {
  orderIds: readonly string[]
  activeSkuGroupKey: string | null
  drawerSkuGroupKey: string | null
  disabled?: boolean
  onFocusSkuGroupKey: (skuGroupKey: string) => void
  onOpenSkuGroupKey: (skuGroupKey: string) => void
}) {
  useEffect(() => {
    if (disabled || drawerSkuGroupKey) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isDialogOrInteractiveControlTarget(event.target)) return

      if (event.key === 'ArrowLeft') {
        if (!activeSkuGroupKey) return
        event.preventDefault()
        onOpenSkuGroupKey(activeSkuGroupKey)
        return
      }

      const direction: AdjacentDirection = event.key === 'ArrowDown' ? 'next' : 'prev'
      const nextId = nextFocusableAnalysisRowId(orderIds, activeSkuGroupKey, direction)
      if (!nextId) return
      event.preventDefault()
      onFocusSkuGroupKey(nextId)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    activeSkuGroupKey,
    disabled,
    drawerSkuGroupKey,
    onFocusSkuGroupKey,
    onOpenSkuGroupKey,
    orderIds,
  ])
}
