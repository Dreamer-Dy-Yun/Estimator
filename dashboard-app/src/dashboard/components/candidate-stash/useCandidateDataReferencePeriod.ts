import type { DateRange } from '../../hooks/usePeriodRangeFilter'
import type { CandidateDataReferencePeriodAction, CandidateDataReferencePeriodState } from './candidateDataReferencePeriodModel'
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

export interface UseCandidateDataReferencePeriodParams {
  detailTarget: CandidateStashSummary | null
  appliedPeriodRef: MutableRefObject<AppliedCandidateDataReferencePeriod>
  setItems: (items: CandidateItemSummary[]) => void
  clearRecommendationItems: () => void
  closeMetricSubscription: () => void
  loadItems: (periodStart?: string, periodEnd?: string) => Promise<void>
  onDataReferencePeriodApplied?: () => void
}

export function useCandidateDataReferencePeriod({
  detailTarget,
  appliedPeriodRef,
  setItems,
  clearRecommendationItems,
  closeMetricSubscription,
  loadItems,
  onDataReferencePeriodApplied,
}: UseCandidateDataReferencePeriodParams) : { dataReferencePeriodStart: string; dataReferencePeriodEnd: string; draftDataReferencePeriodStart: string; draftDataReferencePeriodEnd: string; dataReferencePeriodQueryDirty: boolean; onDataReferencePeriodStartChange: (value: string) => void; onDataReferencePeriodEndChange: (value: string) => void; applyDataReferencePeriod: () => void; } {
  const [periodState, dispatchPeriodState]: [CandidateDataReferencePeriodState, React.ActionDispatch<[action: CandidateDataReferencePeriodAction]>] = useReducer(
    candidateDataReferencePeriodReducer,
    initialCandidateDataReferencePeriodState,
  )
  const {
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    draftDataReferencePeriodStart,
    draftDataReferencePeriodEnd,
  }: CandidateDataReferencePeriodState = periodState
  const initializedDetailTargetUuidRef: React.RefObject<string | null> = useRef<string | null>(null)
  const dataReferencePeriodQueryDirty: boolean = getCandidateDataReferencePeriodQueryDirty(periodState)

  const applyReferencePeriod: (periodStart: string, periodEnd: string) => void = useCallback((periodStart: string, periodEnd: string) : void => {
    const normalized: { start: string; end: string; } | null = normalizeCandidateDataReferenceAppliedPeriod(periodStart, periodEnd)
    if (!normalized) return
    appliedPeriodRef.current = { start: normalized.start, end: normalized.end }
    dispatchPeriodState({ type: 'periodApplied', start: normalized.start, end: normalized.end })
    onDataReferencePeriodApplied?.()
    void loadItems(normalized.start, normalized.end)
  }, [appliedPeriodRef, loadItems, onDataReferencePeriodApplied])

  useEffect(() : (() => void) | undefined => {
    const nextUuid: string | null = detailTarget?.uuid ?? null
    if (initializedDetailTargetUuidRef.current === nextUuid) return
    initializedDetailTargetUuidRef.current = nextUuid

    let alive: boolean = true
    queueMicrotask(() : void => {
      if (!alive) return
      if (!detailTarget) {
        appliedPeriodRef.current = { start: '', end: '' }
        dispatchPeriodState({ type: 'reset' })
        setItems([])
        clearRecommendationItems()
        closeMetricSubscription()
        return
      }
      const initialPeriod: DateRange = buildDefaultPeriodRange()
      applyReferencePeriod(initialPeriod.startDate, initialPeriod.endDate)
    })
    return () : void => {
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

  const onDataReferencePeriodStartChange: (value: string) => void = useCallback((value: string) : void => {
    dispatchPeriodState({ type: 'draftStartChanged', value })
  }, [])

  const onDataReferencePeriodEndChange: (value: string) => void = useCallback((value: string) : void => {
    dispatchPeriodState({ type: 'draftEndChanged', value })
  }, [])

  const applyDataReferencePeriod: () => void = useCallback(() : void => {
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
