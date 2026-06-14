import type { OrderSnapshotComparisonSubject, OrderSnapshotConfirmedRound, OrderSnapshotDrawer2, OrderSnapshotStockOrderRequest } from '../../../../../snapshot/orderSnapshotTypes'
import { useEffect } from 'react'
import type { OrderSnapshotAiComment, OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { InboundDueDateDefaults } from './useSecondaryInboundDueDates'

export type Args = {
  prefillFromSnapshot: OrderSnapshotDocument | null
  candidateItemContext: CandidateItemPanelContext | null
  defaultInboundDueDates: InboundDueDateDefaults
  minOrderDate: string
  prefillKey: string | null
  appliedPrefillKey: string | null
  onComparisonSubjectChange: (next: OrderSnapshotComparisonSubject) => void
  setDailyMeanClient: (value: number | null) => void
  setCurrentOrderInboundDueDate: (value: string) => void
  setNextOrderInboundDueDate: (value: string) => void
  setBufferStock: (value: number) => void
  setSelfWeightPct: (value: number) => void
  setAiComment: (value: OrderSnapshotAiComment) => void
  setConfirmBySize: (value: Record<string, number>) => void
  setConfirmedRounds: (value: OrderSnapshotConfirmedRound[]) => void
  setSnapshotConfirmBaselineActive: (value: boolean) => void
  setAppliedPrefillKey: (value: string | null) => void
  setUnitCostInput: (value: number) => void
  setUnitPriceInput: (value: number) => void
  setExpectedFeeRatePct: (value: number) => void
}

export function useSecondarySnapshotPrefill({
  prefillFromSnapshot,
  candidateItemContext,
  defaultInboundDueDates,
  minOrderDate,
  prefillKey,
  appliedPrefillKey,
  onComparisonSubjectChange,
  setDailyMeanClient,
  setCurrentOrderInboundDueDate,
  setNextOrderInboundDueDate,
  setBufferStock,
  setSelfWeightPct,
  setAiComment,
  setConfirmBySize,
  setConfirmedRounds,
  setSnapshotConfirmBaselineActive,
  setAppliedPrefillKey,
  setUnitCostInput,
  setUnitPriceInput,
  setExpectedFeeRatePct,
}: Args) : void {
  useEffect(() : () => void => {
    let alive: boolean = true
    queueMicrotask(() : void => {
      if (!alive) return
      if (prefillFromSnapshot == null) {
        const nextStart: string = defaultInboundDueDates.start < minOrderDate ? minOrderDate : defaultInboundDueDates.start
        const nextEnd: string = defaultInboundDueDates.end < nextStart ? nextStart : defaultInboundDueDates.end
        setDailyMeanClient(null)
        setCurrentOrderInboundDueDate(nextStart)
        setNextOrderInboundDueDate(nextEnd)
        setBufferStock(0)
        setSelfWeightPct(50)
        setAiComment({ prompt: '', answer: '', generatedAt: null })
        setConfirmBySize({})
        setConfirmedRounds([])
        setSnapshotConfirmBaselineActive(false)
        setAppliedPrefillKey(null)
        return
      }
      if (prefillKey != null && appliedPrefillKey === prefillKey) return
      const d2: OrderSnapshotDrawer2 = prefillFromSnapshot.drawer2
      const stockOrderRequest: OrderSnapshotStockOrderRequest = d2.stockOrderRequest
      onComparisonSubjectChange(d2.comparisonSubject)
      setBufferStock(d2.bufferStock)
      setSelfWeightPct(d2.selfWeightPct)
      setAiComment(d2.aiComment)
      setCurrentOrderInboundDueDate(stockOrderRequest.currentOrderInboundDueDate)
      setNextOrderInboundDueDate(stockOrderRequest.nextOrderInboundDueDate)
      setDailyMeanClient(stockOrderRequest.dailyMeanOverride ?? d2.stockOrderResult?.dailyMean ?? null)
      setConfirmBySize({})
      setConfirmedRounds(d2.confirmed.rounds)
      setSnapshotConfirmBaselineActive(candidateItemContext?.hydrateSnapshotSource === 'confirmed')
      setAppliedPrefillKey(prefillKey)
      if (d2.unitEconomics != null) {
        setUnitCostInput(d2.unitEconomics.unitCost)
        setUnitPriceInput(d2.unitEconomics.unitPrice)
        setExpectedFeeRatePct(d2.unitEconomics.expectedFeeRatePct)
      }
    })
    return () : void => {
      alive = false
    }
  }, [
    candidateItemContext?.hydrateSnapshotSource,
    defaultInboundDueDates.end,
    defaultInboundDueDates.start,
    minOrderDate,
    onComparisonSubjectChange,
    appliedPrefillKey,
    prefillFromSnapshot,
    prefillKey,
    setAiComment,
    setAppliedPrefillKey,
    setBufferStock,
    setConfirmBySize,
    setConfirmedRounds,
    setDailyMeanClient,
    setExpectedFeeRatePct,
    setNextOrderInboundDueDate,
    setCurrentOrderInboundDueDate,
    setSelfWeightPct,
    setSnapshotConfirmBaselineActive,
    setUnitCostInput,
    setUnitPriceInput,
  ])
}
