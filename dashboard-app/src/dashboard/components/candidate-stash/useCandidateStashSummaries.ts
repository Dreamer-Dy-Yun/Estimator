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

function getStashListLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return '후보군 목록을 불러오지 못했습니다.'
}

export function useCandidateStashSummaries({
  stashUuid,
  stashSummary: stashSummaryProp,
  mountedRef,
  onStashesInvalidate,
}: Args) {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [stashListLoadError, setStashListLoadError] = useState<string | null>(null)
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
        setStashListLoadError(null)
        return
      }
      try {
        const list = await getCandidateStashes()
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes(list)
        setStashListLoadError(null)
      } catch (error) {
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashListLoadError(getStashListLoadErrorMessage(error))
      }
    })()
  }, [mountedRef, stashUuid, stashSummaryProp])

  const refreshStashes = useCallback(async () => {
    const seq = stashLoadSeqRef.current + 1
    stashLoadSeqRef.current = seq
    try {
      const list = await getCandidateStashes()
      if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
      setStashes(list)
      setStashListLoadError(null)
      onStashesInvalidate?.()
    } catch (error) {
      if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
      setStashListLoadError(getStashListLoadErrorMessage(error))
      throw error
    }
  }, [mountedRef, onStashesInvalidate])

  const detailTarget = useMemo(
    () => (stashUuid ? stashes.find((s) => s.uuid === stashUuid) ?? null : null),
    [stashUuid, stashes],
  )

  return {
    detailTarget,
    refreshStashes,
    stashListLoadError,
  }
}
