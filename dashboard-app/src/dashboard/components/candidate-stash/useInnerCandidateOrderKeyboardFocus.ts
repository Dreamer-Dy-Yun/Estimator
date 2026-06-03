import type { CandidateItemSummary } from '../../../api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { isDialogOrInteractiveControlTarget } from '../../interaction/interactionTarget'
import type { InnerCandidateRow } from './candidateStashDetailTypes'

function nextFocusableInnerCandidateUuid(orderIds: readonly string[], currentUuid: string | null, direction: AdjacentDirection) : string | null {
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
}) : { activeItemUuid: string | null; focusAdjacent: (currentUuid: string | null, direction: AdjacentDirection) => void; } {
  const [focusedItemUuid, setFocusedItemUuid]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const orderedUuids: string[] = useMemo(() : string[] => rows.map((row: CandidateItemSummary) : string => row.uuid), [rows])
  const focusedVisibleItemUuid: string | null = useMemo(
    () : string | null => (focusedItemUuid && orderedUuids.includes(focusedItemUuid) ? focusedItemUuid : null),
    [focusedItemUuid, orderedUuids],
  )
  const activeItemUuid: string | null = drawerOpen ? openedItemUuid : focusedVisibleItemUuid

  useEffect(() : void => {
    if (openedItemUuid) queueMicrotask(() : void => setFocusedItemUuid(openedItemUuid))
  }, [openedItemUuid])

  useEffect(() : void => {
    if (focusedItemUuid && !orderedUuids.includes(focusedItemUuid)) queueMicrotask(() : void => setFocusedItemUuid(null))
  }, [focusedItemUuid, orderedUuids])

  const focusAdjacent: (currentUuid: string | null, direction: AdjacentDirection) => void = useCallback((currentUuid: string | null, direction: AdjacentDirection) : void => {
    const nextUuid: string | null = nextFocusableInnerCandidateUuid(orderedUuids, currentUuid, direction)
    if (nextUuid) setFocusedItemUuid(nextUuid)
  }, [orderedUuids])

  useEffect(() : (() => void) | undefined => {
    if (disabled || drawerOpen || drawerClosing) return
    const onKeyDown: (event: KeyboardEvent) => void = (event: KeyboardEvent) : void => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isDialogOrInteractiveControlTarget(event.target)) return

      if (event.key === 'ArrowLeft') {
        const row: CandidateItemSummary | undefined = rows.find((candidate: CandidateItemSummary) : boolean => candidate.uuid === focusedVisibleItemUuid)
        if (!row) return
        event.preventDefault()
        event.stopPropagation()
        onOpenItemDrawer(row)
        return
      }

      const nextUuid: string | null = nextFocusableInnerCandidateUuid(orderedUuids, focusedVisibleItemUuid, event.key === 'ArrowDown' ? 'next' : 'prev')
      if (!nextUuid) return
      event.preventDefault()
      event.stopPropagation()
      setFocusedItemUuid(nextUuid)
    }

    window.addEventListener('keydown', onKeyDown)
    return () : void => window.removeEventListener('keydown', onKeyDown)
  }, [disabled, drawerClosing, drawerOpen, focusedVisibleItemUuid, onOpenItemDrawer, orderedUuids, rows])

  return { activeItemUuid, focusAdjacent }
}
