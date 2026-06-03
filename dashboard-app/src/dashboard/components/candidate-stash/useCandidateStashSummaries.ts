import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCandidateStashes,
  type CandidateStashSummary,
} from '../../../api'
import type { CandidateMountedRef } from './candidateStashDetailTypes'

export type Args = {
  stashUuid: string
  companyUuid?: string
  stashSummary?: CandidateStashSummary | null
  mountedRef: CandidateMountedRef
  onStashesInvalidate?: () => void
}

function getStashListLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return '후보군 목록을 불러오지 못했습니다.'
}

export function useCandidateStashSummaries({
  stashUuid,
  companyUuid,
  stashSummary: stashSummaryProp,
  mountedRef,
  onStashesInvalidate,
}: Args) : { detailTarget: CandidateStashSummary | null; refreshStashes: () => Promise<void>; stashListLoadError: string | null; } {
  const initialCompanyUuidRef: React.RefObject<string | undefined> = useRef(companyUuid)
  const [stashes, setStashes]: [CandidateStashSummary[], React.Dispatch<React.SetStateAction<CandidateStashSummary[]>>] = useState<CandidateStashSummary[]>([])
  const [stashListLoadError, setStashListLoadError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const stashLoadSeqRef: React.RefObject<number> = useRef(0)

  useEffect(() : () => void => () : void => {
    stashLoadSeqRef.current += 1
  }, [])

  useEffect(() : void => {
    const seq: number = stashLoadSeqRef.current + 1
    stashLoadSeqRef.current = seq
    void (async () : Promise<void> => {
      if (initialCompanyUuidRef.current === companyUuid && stashSummaryProp && stashSummaryProp.uuid === stashUuid) {
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes([stashSummaryProp])
        setStashListLoadError(null)
        return
      }
      try {
        const list: CandidateStashSummary[] = await getCandidateStashes({ companyUuid })
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes(list)
        setStashListLoadError(null)
      } catch (error) {
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashListLoadError(getStashListLoadErrorMessage(error))
      }
    })()
  }, [companyUuid, mountedRef, stashUuid, stashSummaryProp])

  const refreshStashes: () => Promise<void> = useCallback(async () : Promise<void> => {
    const seq: number = stashLoadSeqRef.current + 1
    stashLoadSeqRef.current = seq
    try {
      const list: CandidateStashSummary[] = await getCandidateStashes({ companyUuid })
      if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
      setStashes(list)
      setStashListLoadError(null)
      onStashesInvalidate?.()
    } catch (error) {
      if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
      setStashListLoadError(getStashListLoadErrorMessage(error))
      throw error
    }
  }, [companyUuid, mountedRef, onStashesInvalidate])

  const detailTarget: CandidateStashSummary | null = useMemo(
    () : CandidateStashSummary | null => (stashUuid ? stashes.find((s: CandidateStashSummary) : boolean => s.uuid === stashUuid) ?? null : null),
    [stashUuid, stashes],
  )

  return {
    detailTarget,
    refreshStashes,
    stashListLoadError,
  }
}
