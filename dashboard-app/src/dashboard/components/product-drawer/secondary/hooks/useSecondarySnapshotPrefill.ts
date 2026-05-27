import { useEffect } from 'react'
import type { OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { InboundDueDateDefaults } from './useSecondaryInboundDueDates'

type Args = {
  prefillFromSnapshot: OrderSnapshotDocumentV2 | null
  candidateItemContext: CandidateItemPanelContext | null
  primarySkuGroupKey: string
  defaultInboundDueDates: InboundDueDateDefaults
  minOrderDate: string
  prefillKey: string | null
  onChannelChange: (next: string) => void
  setDailyMeanClient: (value: number | null) => void
  setCurrentOrderInboundDueDate: (value: string) => void
  setNextOrderInboundDueDate: (value: string) => void
  setBufferStock: (value: number) => void
  setSelfWeightPct: (value: number) => void
  setAiPrompt: (value: string) => void
  setAiComment: (value: string) => void
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
  primarySkuGroupKey,
  defaultInboundDueDates,
  minOrderDate,
  prefillKey,
  onChannelChange,
  setDailyMeanClient,
  setCurrentOrderInboundDueDate,
  setNextOrderInboundDueDate,
  setBufferStock,
  setSelfWeightPct,
  setAiPrompt,
  setAiComment,
  setConfirmBySize,
  setSnapshotConfirmBaselineActive,
  setAppliedPrefillKey,
  setUnitCostInput,
  setUnitPriceInput,
  setExpectedFeeRatePct,
}: Args) {
  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      if (prefillFromSnapshot == null) {
        const nextStart = defaultInboundDueDates.start < minOrderDate ? minOrderDate : defaultInboundDueDates.start
        const nextEnd = defaultInboundDueDates.end < nextStart ? nextStart : defaultInboundDueDates.end
        setDailyMeanClient(null)
        setCurrentOrderInboundDueDate(nextStart)
        setNextOrderInboundDueDate(nextEnd)
        setBufferStock(0)
        setSelfWeightPct(50)
        setAiPrompt('')
        setAiComment('')
        setConfirmBySize({})
        setSnapshotConfirmBaselineActive(false)
        setAppliedPrefillKey(null)
        return
      }
      const d2 = prefillFromSnapshot.drawer2
      const stockOrderRequest = d2.stockOrderRequest
      onChannelChange(d2.competitorChannelId)
      setBufferStock(d2.bufferStock)
      setSelfWeightPct(d2.selfWeightPct)
      setAiPrompt(d2.aiComment.prompt)
      setAiComment(d2.aiComment.answer)
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
    return () => {
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
    primarySkuGroupKey,
    setAiComment,
    setAiPrompt,
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
