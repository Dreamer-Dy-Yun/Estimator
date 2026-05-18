import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { CandidateItemSummary, CandidateStashSummary } from '../../../api'
import { normalizeRangeOnEndInput, normalizeRangeOnStartInput } from '../../hooks/usePeriodRangeFilter'

export interface AppliedCandidateDataReferencePeriod {
  start: string
  end: string
}

interface UseCandidateDataReferencePeriodParams {
  detailTarget: CandidateStashSummary | null
  appliedPeriodRef: MutableRefObject<AppliedCandidateDataReferencePeriod>
  setItems: (items: CandidateItemSummary[]) => void
  clearRecommendationItems: () => void
  closeMetricSubscription: () => void
  loadItems: (periodStart?: string, periodEnd?: string) => Promise<void>
}

export function useCandidateDataReferencePeriod({
  detailTarget,
  appliedPeriodRef,
  setItems,
  clearRecommendationItems,
  closeMetricSubscription,
  loadItems,
}: UseCandidateDataReferencePeriodParams) {
  const [dataReferencePeriodStart, setDataReferencePeriodStart] = useState('')
  const [dataReferencePeriodEnd, setDataReferencePeriodEnd] = useState('')
  const [draftDataReferencePeriodStart, setDraftDataReferencePeriodStart] = useState('')
  const [draftDataReferencePeriodEnd, setDraftDataReferencePeriodEnd] = useState('')
  const initializedDetailTargetUuidRef = useRef<string | null>(null)

  useEffect(() => {
    const nextUuid = detailTarget?.uuid ?? null
    if (initializedDetailTargetUuidRef.current === nextUuid) return
    initializedDetailTargetUuidRef.current = nextUuid

    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      if (!detailTarget) {
        appliedPeriodRef.current = { start: '', end: '' }
        setDataReferencePeriodStart('')
        setDataReferencePeriodEnd('')
        setDraftDataReferencePeriodStart('')
        setDraftDataReferencePeriodEnd('')
        setItems([])
        clearRecommendationItems()
        closeMetricSubscription()
        return
      }
      appliedPeriodRef.current = { start: detailTarget.periodStart, end: detailTarget.periodEnd }
      setDataReferencePeriodStart(detailTarget.periodStart)
      setDataReferencePeriodEnd(detailTarget.periodEnd)
      setDraftDataReferencePeriodStart(detailTarget.periodStart)
      setDraftDataReferencePeriodEnd(detailTarget.periodEnd)
      void loadItems(detailTarget.periodStart, detailTarget.periodEnd)
    })
    return () => {
      alive = false
    }
  }, [appliedPeriodRef, clearRecommendationItems, closeMetricSubscription, detailTarget, loadItems, setItems])

  const onDataReferencePeriodStartChange = useCallback((value: string) => {
    if (!value) return
    setDraftDataReferencePeriodStart(value)
    setDraftDataReferencePeriodEnd((currentEnd) => normalizeRangeOnStartInput(value, currentEnd || value).endDate)
  }, [])

  const onDataReferencePeriodEndChange = useCallback((value: string) => {
    if (!value) return
    setDraftDataReferencePeriodEnd(value)
    setDraftDataReferencePeriodStart((currentStart) => normalizeRangeOnEndInput(value, currentStart || value).startDate)
  }, [])

  const applyDataReferencePeriod = useCallback(() => {
    if (!draftDataReferencePeriodStart || !draftDataReferencePeriodEnd) return
    const normalized = normalizeRangeOnStartInput(draftDataReferencePeriodStart, draftDataReferencePeriodEnd)
    appliedPeriodRef.current = { start: normalized.startDate, end: normalized.endDate }
    setDataReferencePeriodStart(normalized.startDate)
    setDataReferencePeriodEnd(normalized.endDate)
    setDraftDataReferencePeriodStart(normalized.startDate)
    setDraftDataReferencePeriodEnd(normalized.endDate)
    void loadItems(normalized.startDate, normalized.endDate)
  }, [appliedPeriodRef, draftDataReferencePeriodEnd, draftDataReferencePeriodStart, loadItems])

  return {
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    draftDataReferencePeriodStart,
    draftDataReferencePeriodEnd,
    onDataReferencePeriodStartChange,
    onDataReferencePeriodEndChange,
    applyDataReferencePeriod,
  }
}
