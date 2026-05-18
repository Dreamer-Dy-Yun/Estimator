import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCandidateStashes,
  type CandidateStashSummary,
} from '../../../api'

type MountedRef = {
  current: boolean
}

type Args = {
  stashUuid: string
  stashSummary?: CandidateStashSummary | null
  mountedRef: MountedRef
  onStashesInvalidate?: () => void
}

export function useCandidateStashSummaries({
  stashUuid,
  stashSummary: stashSummaryProp,
  mountedRef,
  onStashesInvalidate,
}: Args) {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const stashLoadSeqRef = useRef(0)

  useEffect(() => () => {
    stashLoadSeqRef.current += 1
  }, [])

  useEffect(() => {
    const seq = stashLoadSeqRef.current + 1
    stashLoadSeqRef.current = seq
    void (async () => {
      if (stashSummaryProp && stashSummaryProp.uuid === stashUuid) {
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes([stashSummaryProp])
        return
      }
      try {
        const list = await getCandidateStashes()
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes(list)
      } catch {
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes([])
      }
    })()
  }, [mountedRef, stashUuid, stashSummaryProp])

  const refreshStashes = useCallback(async () => {
    const list = await getCandidateStashes()
    if (!mountedRef.current) return
    setStashes(list)
    onStashesInvalidate?.()
  }, [mountedRef, onStashesInvalidate])

  const detailTarget = useMemo(
    () => (stashUuid ? stashes.find((s) => s.uuid === stashUuid) ?? null : null),
    [stashUuid, stashes],
  )

  return {
    detailTarget,
    refreshStashes,
  }
}
