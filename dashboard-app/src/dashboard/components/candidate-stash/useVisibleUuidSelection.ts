import { useEffect, useMemo, useRef, useState } from 'react'

export function useVisibleUuidSelection(visibleUuids: string[]) {
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(() => new Set())
  const selectAllRef = useRef<HTMLInputElement | null>(null)

  const selectedVisibleUuids = useMemo(
    () => visibleUuids.filter((uuid) => selectedUuids.has(uuid)),
    [selectedUuids, visibleUuids],
  )
  const selectedVisibleUuidSet = useMemo(
    () => new Set(selectedVisibleUuids),
    [selectedVisibleUuids],
  )
  const selectedVisibleCount = selectedVisibleUuids.length
  const allVisibleSelected = visibleUuids.length > 0 && selectedVisibleCount === visibleUuids.length
  const partiallyVisibleSelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleUuids.length

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = partiallyVisibleSelected
  }, [partiallyVisibleSelected])

  const toggleSelectedUuid = (uuid: string) => {
    setSelectedUuids((prev) => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  const toggleAllVisibleUuids = () => {
    setSelectedUuids((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const uuid of visibleUuids) next.delete(uuid)
      } else {
        for (const uuid of visibleUuids) next.add(uuid)
      }
      return next
    })
  }

  const replaceSelection = (uuids: string[]) => {
    setSelectedUuids(new Set(uuids))
  }

  const clearSelection = () => {
    setSelectedUuids(new Set())
  }

  return {
    selectedUuids,
    selectedVisibleUuids,
    selectedVisibleUuidSet,
    selectedVisibleCount,
    allVisibleSelected,
    partiallyVisibleSelected,
    selectAllRef,
    toggleSelectedUuid,
    toggleAllVisibleUuids,
    replaceSelection,
    clearSelection,
  }
}
