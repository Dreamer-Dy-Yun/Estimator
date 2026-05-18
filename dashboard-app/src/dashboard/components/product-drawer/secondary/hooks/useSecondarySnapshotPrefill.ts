import { useEffect } from 'react'
import type { OrderSnapshotDocumentV1 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../candidateActionCards'

type DateRange = {
  start: string
  end: string
}

type Args = {
  prefillFromSnapshot: OrderSnapshotDocumentV1 | null
  candidateItemContext: CandidateItemPanelContext | null
  primarySkuGroupKey: string
  defaultLeadTime: DateRange
  minOrderDate: string
  prefillKey: string | null
  onChannelChange: (next: string) => void
  setDailyMeanClient: (value: number | null) => void
  setLeadTimeStartDate: (value: string) => void
  setLeadTimeEndDate: (value: string) => void
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
  defaultLeadTime,
  minOrderDate,
  prefillKey,
  onChannelChange,
  setDailyMeanClient,
  setLeadTimeStartDate,
  setLeadTimeEndDate,
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
        const nextStart = defaultLeadTime.start < minOrderDate ? minOrderDate : defaultLeadTime.start
        const nextEnd = defaultLeadTime.end < nextStart ? nextStart : defaultLeadTime.end
        setDailyMeanClient(null)
        setLeadTimeStartDate(nextStart)
        setLeadTimeEndDate(nextEnd)
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
      const si = d2.stockInputs
      onChannelChange(d2.competitorChannelId)
      setBufferStock(d2.bufferStock)
      setSelfWeightPct(d2.selfWeightPct)
      setAiPrompt(d2.llmPrompt)
      setAiComment(d2.llmAnswer)
      setLeadTimeStartDate(si.leadTimeStartDate)
      setLeadTimeEndDate(si.leadTimeEndDate)
      setDailyMeanClient(si.dailyMean)
      setConfirmBySize({})
      setSnapshotConfirmBaselineActive(candidateItemContext?.hydrateSnapshotSource === 'confirmed')
      setAppliedPrefillKey(prefillKey)
      if (d2.orderUnitInputs != null) {
        setUnitCostInput(d2.orderUnitInputs.unitCost)
        setUnitPriceInput(d2.orderUnitInputs.unitPrice)
        setExpectedFeeRatePct(d2.orderUnitInputs.expectedFeeRatePct)
      }
    })
    return () => {
      alive = false
    }
  }, [
    candidateItemContext?.hydrateSnapshotSource,
    defaultLeadTime.end,
    defaultLeadTime.start,
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
    setLeadTimeEndDate,
    setLeadTimeStartDate,
    setSelfWeightPct,
    setSnapshotConfirmBaselineActive,
    setUnitCostInput,
    setUnitPriceInput,
  ])
}
