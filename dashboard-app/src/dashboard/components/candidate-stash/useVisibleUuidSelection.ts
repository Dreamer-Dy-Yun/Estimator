import { useEffect, useMemo, useRef, useState } from 'react'

export function useVisibleUuidSelection(visibleUuids: string[]) : { selectedUuids: Set<string>; selectedVisibleUuids: string[]; selectedVisibleUuidSet: Set<string>; selectedVisibleCount: number; allVisibleSelected: boolean; partiallyVisibleSelected: boolean; selectAllRef: React.RefObject<HTMLInputElement | null>; toggleSelectedUuid: (uuid: string) => void; toggleAllVisibleUuids: () => void; replaceSelection: (uuids: string[]) => void; clearSelection: () => void; } {
  const [selectedUuids, setSelectedUuids]: [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] = useState<Set<string>>(() : Set<string> => new Set())
  const selectAllRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement | null>(null)

  const selectedVisibleUuids: string[] = useMemo(
    () : string[] => visibleUuids.filter((uuid: string) : boolean => selectedUuids.has(uuid)),
    [selectedUuids, visibleUuids],
  )
  const selectedVisibleUuidSet: Set<string> = useMemo(
    () : Set<string> => new Set(selectedVisibleUuids),
    [selectedVisibleUuids],
  )
  const selectedVisibleCount: number = selectedVisibleUuids.length
  const allVisibleSelected: boolean = visibleUuids.length > 0 && selectedVisibleCount === visibleUuids.length
  const partiallyVisibleSelected: boolean = selectedVisibleCount > 0 && selectedVisibleCount < visibleUuids.length

  useEffect(() : void => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = partiallyVisibleSelected
  }, [partiallyVisibleSelected])

  const toggleSelectedUuid: (uuid: string) => void = (uuid: string) : void => {
    setSelectedUuids((prev: Set<string>) : Set<string> => {
      const next: Set<string> = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  const toggleAllVisibleUuids: () => void = () : void => {
    setSelectedUuids((prev: Set<string>) : Set<string> => {
      const next: Set<string> = new Set(prev)
      if (allVisibleSelected) {
        for (const uuid of visibleUuids) next.delete(uuid)
      } else {
        for (const uuid of visibleUuids) next.add(uuid)
      }
      return next
    })
  }

  const replaceSelection: (uuids: string[]) => void = (uuids: string[]) : void => {
    setSelectedUuids(new Set(uuids))
  }

  const clearSelection: () => void = () : void => {
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
