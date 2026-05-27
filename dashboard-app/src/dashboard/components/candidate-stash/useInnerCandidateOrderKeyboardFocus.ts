import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { isDialogOrInteractiveControlTarget } from '../../interaction/interactionTarget'
import type { InnerCandidateRow } from './candidateStashDetailTypes'

function nextFocusableInnerCandidateUuid(orderIds: readonly string[], currentUuid: string | null, direction: AdjacentDirection) {
  if (!orderIds.length) return null
  if (!currentUuid) return direction === 'next' ? orderIds[0] : orderIds[orderIds.length - 1]
  return adjacentIdInOrder(orderIds, currentUuid, direction)
}

export function useInnerCandidateOrderKeyboardFocus({
  rows,
  drawerOpen,
  drawerClosing,
  openedItemUuid,
  disabled = false,
  onOpenItemDrawer,
}: {
  rows: InnerCandidateRow[]
  drawerOpen: boolean
  drawerClosing: boolean
  openedItemUuid: string | null
  disabled?: boolean
  onOpenItemDrawer: (row: InnerCandidateRow) => void
}) {
  const [focusedItemUuid, setFocusedItemUuid] = useState<string | null>(null)
  const orderedUuids = useMemo(() => rows.map((row) => row.uuid), [rows])
  const focusedVisibleItemUuid = useMemo(
    () => (focusedItemUuid && orderedUuids.includes(focusedItemUuid) ? focusedItemUuid : null),
    [focusedItemUuid, orderedUuids],
  )
  const activeItemUuid = drawerOpen ? openedItemUuid : focusedVisibleItemUuid

  useEffect(() => {
    if (openedItemUuid) queueMicrotask(() => setFocusedItemUuid(openedItemUuid))
  }, [openedItemUuid])

  useEffect(() => {
    if (focusedItemUuid && !orderedUuids.includes(focusedItemUuid)) queueMicrotask(() => setFocusedItemUuid(null))
  }, [focusedItemUuid, orderedUuids])

  const focusAdjacent = useCallback((currentUuid: string | null, direction: AdjacentDirection) => {
    const nextUuid = nextFocusableInnerCandidateUuid(orderedUuids, currentUuid, direction)
    if (nextUuid) setFocusedItemUuid(nextUuid)
  }, [orderedUuids])

  useEffect(() => {
    if (disabled || drawerOpen || drawerClosing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isDialogOrInteractiveControlTarget(event.target)) return

      if (event.key === 'ArrowLeft') {
        const row = rows.find((candidate) => candidate.uuid === focusedVisibleItemUuid)
        if (!row) return
        event.preventDefault()
        event.stopPropagation()
        onOpenItemDrawer(row)
        return
      }

      const nextUuid = nextFocusableInnerCandidateUuid(orderedUuids, focusedVisibleItemUuid, event.key === 'ArrowDown' ? 'next' : 'prev')
      if (!nextUuid) return
      event.preventDefault()
      event.stopPropagation()
      setFocusedItemUuid(nextUuid)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disabled, drawerClosing, drawerOpen, focusedVisibleItemUuid, onOpenItemDrawer, orderedUuids, rows])

  return { activeItemUuid, focusAdjacent }
}
