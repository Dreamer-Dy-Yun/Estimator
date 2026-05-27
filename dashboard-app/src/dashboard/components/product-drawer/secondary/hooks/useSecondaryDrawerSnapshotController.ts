import { useCallback, useEffect, useMemo, useState } from 'react'
import type { OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { InboundDueDateDefaults } from './useSecondaryInboundDueDates'
import { useSecondarySnapshotPrefill } from './useSecondarySnapshotPrefill'

type LiveOrderUnitSource = {
  avgCost?: number | null
  avgPrice: number
  feeRatePct?: number | null
}

type SnapshotControllerArgs = {
  prefillFromSnapshot: OrderSnapshotDocumentV2 | null
  candidateItemContext: CandidateItemPanelContext | null
  primarySkuGroupKey: string
  primaryPrice: number
  defaultInboundDueDates: InboundDueDateDefaults
  minOrderDate: string
  onChannelChange: (next: string) => void
  setCurrentOrderInboundDueDate: (value: string) => void
  setNextOrderInboundDueDate: (value: string) => void
  setAiPrompt: (value: string) => void
  setAiComment: (value: string) => void
  resetInboundDueDatesToLive: () => void
}

type DraftEmissionArgs = {
  candidateItemContext: CandidateItemPanelContext | null
  buildSnapshot: () => OrderSnapshotDocumentV2
  prefillKey: string | null
  appliedPrefillKey: string | null
  snapshotConfirmBaselineActive: boolean
}

type LiveUnitDefaultsArgs = {
  prefillFromSnapshot: OrderSnapshotDocumentV2 | null
  primarySkuGroupKey: string
  liveOrderUnitSource: LiveOrderUnitSource
  applyLiveOrderUnitInputs: (source: LiveOrderUnitSource) => void
}

const DEFAULT_BUFFER_STOCK = 0
const DEFAULT_SELF_WEIGHT_PCT = 50
const DEFAULT_EXPECTED_FEE_RATE_PCT = 13
const DEFAULT_UNIT_COST_PRICE_RATIO = 0.78

const roundNonNegative = (value: number) => Math.max(0, Math.round(value))
const roundFeeRatePct = (value: number) => Math.max(0, Math.round(value * 10) / 10)

export function useSecondaryDrawerSnapshotController({
  prefillFromSnapshot,
  candidateItemContext,
  primarySkuGroupKey,
  primaryPrice,
  defaultInboundDueDates,
  minOrderDate,
  onChannelChange,
  setCurrentOrderInboundDueDate,
  setNextOrderInboundDueDate,
  setAiPrompt,
  setAiComment,
  resetInboundDueDatesToLive,
}: SnapshotControllerArgs) {
  const [dailyMeanClient, setDailyMeanClient] = useState<number | null>(null)
  const [bufferStock, setBufferStock] = useState(DEFAULT_BUFFER_STOCK)
  const [unitCostInput, setUnitCostInput] = useState(roundNonNegative(primaryPrice * DEFAULT_UNIT_COST_PRICE_RATIO))
  const [unitPriceInput, setUnitPriceInput] = useState(roundNonNegative(primaryPrice))
  const [expectedFeeRatePct, setExpectedFeeRatePct] = useState(DEFAULT_EXPECTED_FEE_RATE_PCT)
  const [selfWeightPct, setSelfWeightPct] = useState(DEFAULT_SELF_WEIGHT_PCT)
  const [confirmBySize, setConfirmBySize] = useState<Record<string, number>>({})
  const [snapshotConfirmBaselineActive, setSnapshotConfirmBaselineActive] = useState(
    () => prefillFromSnapshot != null && candidateItemContext?.hydrateSnapshotSource === 'confirmed',
  )
  const [appliedPrefillKey, setAppliedPrefillKey] = useState<string | null>(null)

  const hasSavedSnapshot = Boolean(candidateItemContext?.confirmedSnapshot)
  const prefillKey = useMemo(
    () => (prefillFromSnapshot == null
      ? null
      : [
          candidateItemContext?.itemUuid ?? primarySkuGroupKey,
          prefillFromSnapshot.savedAt,
          prefillFromSnapshot.context.periodStart,
          prefillFromSnapshot.context.periodEnd,
        ].join('|')),
    [candidateItemContext?.itemUuid, prefillFromSnapshot, primarySkuGroupKey],
  )
  const snapshotConfirmBySize = useMemo(
    () => (prefillFromSnapshot == null
      ? {}
      : Object.fromEntries(prefillFromSnapshot.drawer2.sizeOrders.map((row) => [row.size, row.confirmQty]))),
    [prefillFromSnapshot],
  )
  const applyLiveOrderUnitInputs = useCallback((source: LiveOrderUnitSource) => {
    setUnitPriceInput(roundNonNegative(source.avgPrice))
    if (source.avgCost != null) setUnitCostInput(roundNonNegative(source.avgCost))
    if (source.feeRatePct != null) setExpectedFeeRatePct(roundFeeRatePct(source.feeRatePct))
  }, [])

  useSecondarySnapshotPrefill({
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
  })

  const handleResetToLive = useCallback((liveOrderUnitSource: LiveOrderUnitSource) => {
    setDailyMeanClient(null)
    resetInboundDueDatesToLive()
    setBufferStock(DEFAULT_BUFFER_STOCK)
    setUnitCostInput(roundNonNegative(primaryPrice * DEFAULT_UNIT_COST_PRICE_RATIO))
    setUnitPriceInput(roundNonNegative(primaryPrice))
    setExpectedFeeRatePct(DEFAULT_EXPECTED_FEE_RATE_PCT)
    applyLiveOrderUnitInputs(liveOrderUnitSource)
    setAiPrompt('')
    setAiComment('')
    setSelfWeightPct(DEFAULT_SELF_WEIGHT_PCT)
    setConfirmBySize({})
    setSnapshotConfirmBaselineActive(false)
    setAppliedPrefillKey(null)
    candidateItemContext?.onResetDraft?.()
  }, [
    applyLiveOrderUnitInputs,
    candidateItemContext,
    primaryPrice,
    resetInboundDueDatesToLive,
    setAiComment,
    setAiPrompt,
  ])

  const handleRestoreConfirmed = useCallback(() => {
    if (!candidateItemContext?.confirmedSnapshot) return
    setConfirmBySize({})
    setSnapshotConfirmBaselineActive(true)
    candidateItemContext.onRestoreConfirmed?.()
  }, [candidateItemContext])

  return {
    dailyMeanClient,
    setDailyMeanClient,
    bufferStock,
    setBufferStock,
    unitCostInput,
    setUnitCostInput,
    unitPriceInput,
    setUnitPriceInput,
    expectedFeeRatePct,
    setExpectedFeeRatePct,
    selfWeightPct,
    setSelfWeightPct,
    confirmBySize,
    setConfirmBySize,
    hasSavedSnapshot,
    prefillKey,
    appliedPrefillKey,
    snapshotConfirmBySize,
    snapshotConfirmBaselineActive,
    applyLiveOrderUnitInputs,
    handleResetToLive,
    handleRestoreConfirmed,
  }
}

export function useSecondaryDrawerLiveUnitDefaults({
  prefillFromSnapshot,
  primarySkuGroupKey,
  liveOrderUnitSource,
  applyLiveOrderUnitInputs,
}: LiveUnitDefaultsArgs) {
  const { avgCost, avgPrice, feeRatePct } = liveOrderUnitSource
  useEffect(() => {
    if (prefillFromSnapshot != null) return
    applyLiveOrderUnitInputs({ avgCost, avgPrice, feeRatePct })
  }, [
    applyLiveOrderUnitInputs,
    avgCost,
    avgPrice,
    feeRatePct,
    prefillFromSnapshot,
    primarySkuGroupKey,
  ])
}

export function useSecondaryDrawerDraftEmission({
  candidateItemContext,
  buildSnapshot,
  prefillKey,
  appliedPrefillKey,
  snapshotConfirmBaselineActive,
}: DraftEmissionArgs) {
  useEffect(() => {
    if (candidateItemContext == null) return
    if (prefillKey != null && appliedPrefillKey !== prefillKey) return
    candidateItemContext.onDraftChange?.(
      buildSnapshot(),
      snapshotConfirmBaselineActive ? 'confirmed' : 'live',
    )
  }, [
    appliedPrefillKey,
    candidateItemContext,
    buildSnapshot,
    prefillKey,
    snapshotConfirmBaselineActive,
  ])
}
