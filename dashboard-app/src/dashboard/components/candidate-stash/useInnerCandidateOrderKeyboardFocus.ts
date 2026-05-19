import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { isDialogOrInteractiveControlTarget } from '../../interaction/interactionTarget'
import type { InnerCandidateRow } from './candidateStashDetailTypes'

function nextFocusableInnerCandidateUuid(
  orderIds: readonly string[],
  currentUuid: string | null,
  direction: AdjacentDirection,
) {
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
    if (!openedItemUuid) return
    let alive = true
    queueMicrotask(() => {
      if (alive) setFocusedItemUuid(openedItemUuid)
    })
    return () => {
      alive = false
    }
  }, [openedItemUuid])

  useEffect(() => {
    if (!focusedItemUuid || orderedUuids.includes(focusedItemUuid)) return
    let alive = true
    queueMicrotask(() => {
      if (alive) setFocusedItemUuid(null)
    })
    return () => {
      alive = false
    }
  }, [focusedItemUuid, orderedUuids])

  const focusAdjacent = useCallback((currentUuid: string | null, direction: AdjacentDirection) => {
    const nextUuid = nextFocusableInnerCandidateUuid(orderedUuids, currentUuid, direction)
    if (nextUuid) setFocusedItemUuid(nextUuid)
  }, [orderedUuids])

  const openFocusedItem = useCallback((uuid: string | null) => {
    if (!uuid) return false
    const row = rows.find((candidate) => candidate.uuid === uuid)
    if (!row) return false
    onOpenItemDrawer(row)
    return true
  }, [onOpenItemDrawer, rows])

  useEffect(() => {
    if (disabled || drawerOpen || drawerClosing) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isDialogOrInteractiveControlTarget(event.target)) return

      if (event.key === 'ArrowLeft') {
        if (!openFocusedItem(focusedVisibleItemUuid)) return
        event.preventDefault()
        event.stopPropagation()
        return
      }

      const direction: AdjacentDirection = event.key === 'ArrowDown' ? 'next' : 'prev'
      const nextUuid = nextFocusableInnerCandidateUuid(orderedUuids, focusedVisibleItemUuid, direction)
      if (!nextUuid) return
      event.preventDefault()
      event.stopPropagation()
      setFocusedItemUuid(nextUuid)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    disabled,
    drawerClosing,
    drawerOpen,
    focusedVisibleItemUuid,
    openFocusedItem,
    orderedUuids,
  ])

  return {
    activeItemUuid,
    focusAdjacent,
  }
}
