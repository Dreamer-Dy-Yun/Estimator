import { useCallback, useEffect, useReducer, useRef, type MutableRefObject } from 'react'
import type { CandidateItemSummary, CandidateStashSummary } from '../../../api'
import { buildDefaultPeriodRange } from '../../hooks/usePeriodRangeFilter'
import {
  candidateDataReferencePeriodReducer,
  getCandidateDataReferencePeriodQueryDirty,
  initialCandidateDataReferencePeriodState,
  normalizeCandidateDataReferenceAppliedPeriod,
} from './candidateDataReferencePeriodModel'

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
  const [periodState, dispatchPeriodState] = useReducer(
    candidateDataReferencePeriodReducer,
    initialCandidateDataReferencePeriodState,
  )
  const {
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    draftDataReferencePeriodStart,
    draftDataReferencePeriodEnd,
  } = periodState
  const initializedDetailTargetUuidRef = useRef<string | null>(null)
  const dataReferencePeriodQueryDirty = getCandidateDataReferencePeriodQueryDirty(periodState)

  const applyReferencePeriod = useCallback((periodStart: string, periodEnd: string) => {
    const normalized = normalizeCandidateDataReferenceAppliedPeriod(periodStart, periodEnd)
    if (!normalized) return
    appliedPeriodRef.current = { start: normalized.start, end: normalized.end }
    dispatchPeriodState({ type: 'periodApplied', start: normalized.start, end: normalized.end })
    void loadItems(normalized.start, normalized.end)
  }, [appliedPeriodRef, loadItems])

  useEffect(() => {
    const nextUuid = detailTarget?.uuid ?? null
    if (initializedDetailTargetUuidRef.current === nextUuid) return
    initializedDetailTargetUuidRef.current = nextUuid

    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      if (!detailTarget) {
        appliedPeriodRef.current = { start: '', end: '' }
        dispatchPeriodState({ type: 'reset' })
        setItems([])
        clearRecommendationItems()
        closeMetricSubscription()
        return
      }
      const initialPeriod = buildDefaultPeriodRange()
      applyReferencePeriod(initialPeriod.startDate, initialPeriod.endDate)
    })
    return () => {
      alive = false
    }
  }, [
    appliedPeriodRef,
    applyReferencePeriod,
    clearRecommendationItems,
    closeMetricSubscription,
    detailTarget,
    setItems,
  ])

  const onDataReferencePeriodStartChange = useCallback((value: string) => {
    dispatchPeriodState({ type: 'draftStartChanged', value })
  }, [])

  const onDataReferencePeriodEndChange = useCallback((value: string) => {
    dispatchPeriodState({ type: 'draftEndChanged', value })
  }, [])

  const applyDataReferencePeriod = useCallback(() => {
    applyReferencePeriod(draftDataReferencePeriodStart, draftDataReferencePeriodEnd)
  }, [applyReferencePeriod, draftDataReferencePeriodEnd, draftDataReferencePeriodStart])

  return {
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    draftDataReferencePeriodStart,
    draftDataReferencePeriodEnd,
    dataReferencePeriodQueryDirty,
    onDataReferencePeriodStartChange,
    onDataReferencePeriodEndChange,
    applyDataReferencePeriod,
  }
}
