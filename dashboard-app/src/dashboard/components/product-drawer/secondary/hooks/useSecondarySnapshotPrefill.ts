import type { OrderSnapshotDrawer2V2, OrderSnapshotStockOrderRequestV2 } from '../../../../../snapshot/orderSnapshotTypes'
import { useEffect } from 'react'
import type { OrderSnapshotAiCommentV2, OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { InboundDueDateDefaults } from './useSecondaryInboundDueDates'

export type Args = {
  prefillFromSnapshot: OrderSnapshotDocumentV2 | null
  candidateItemContext: CandidateItemPanelContext | null
  defaultInboundDueDates: InboundDueDateDefaults
  minOrderDate: string
  prefillKey: string | null
  onChannelChange: (next: string) => void
  setDailyMeanClient: (value: number | null) => void
  setCurrentOrderInboundDueDate: (value: string) => void
  setNextOrderInboundDueDate: (value: string) => void
  setBufferStock: (value: number) => void
  setSelfWeightPct: (value: number) => void
  setAiComment: (value: OrderSnapshotAiCommentV2) => void
  setConfirmBySize: (value: Record<string, number>) => void
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
  onChannelChange,
  setDailyMeanClient,
  setCurrentOrderInboundDueDate,
  setNextOrderInboundDueDate,
  setBufferStock,
  setSelfWeightPct,
  setAiComment,
  setConfirmBySize,
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
        setSnapshotConfirmBaselineActive(false)
        setAppliedPrefillKey(null)
        return
      }
      const d2: OrderSnapshotDrawer2V2 = prefillFromSnapshot.drawer2
      const stockOrderRequest: OrderSnapshotStockOrderRequestV2 = d2.stockOrderRequest
      onChannelChange(d2.competitorChannelId)
      setBufferStock(d2.bufferStock)
      setSelfWeightPct(d2.selfWeightPct)
      setAiComment(d2.aiComment)
      setCurrentOrderInboundDueDate(stockOrderRequest.currentOrderInboundDueDate)
      setNextOrderInboundDueDate(stockOrderRequest.nextOrderInboundDueDate)
      setDailyMeanClient(stockOrderRequest.dailyMeanOverride ?? d2.stockOrderResult?.dailyMean ?? null)
      setConfirmBySize({})
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
    onChannelChange,
    prefillFromSnapshot,
    prefillKey,
    setAiComment,
    setAppliedPrefillKey,
    setBufferStock,
    setConfirmBySize,
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
