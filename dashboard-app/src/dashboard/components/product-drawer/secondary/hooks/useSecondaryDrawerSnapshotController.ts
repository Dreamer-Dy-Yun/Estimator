import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
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
  canBuildSnapshot?: boolean
  prefillKey: string | null
  appliedPrefillKey: string | null
  snapshotConfirmBaselineActive: boolean
  confirmedBaselineDraftDirty: boolean
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
  const [confirmedBaselineDraftDirty, setConfirmedBaselineDraftDirty] = useState(false)
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
  const markConfirmedBaselineDraftDirty = useCallback(() => {
    setConfirmedBaselineDraftDirty(true)
  }, [])
  const setDraftDailyMeanClient = useCallback((value: SetStateAction<number | null>) => {
    markConfirmedBaselineDraftDirty()
    setDailyMeanClient(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftBufferStock = useCallback((value: SetStateAction<number>) => {
    markConfirmedBaselineDraftDirty()
    setBufferStock(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftUnitCostInput = useCallback((value: SetStateAction<number>) => {
    markConfirmedBaselineDraftDirty()
    setUnitCostInput(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftUnitPriceInput = useCallback((value: SetStateAction<number>) => {
    markConfirmedBaselineDraftDirty()
    setUnitPriceInput(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftExpectedFeeRatePct = useCallback((value: SetStateAction<number>) => {
    markConfirmedBaselineDraftDirty()
    setExpectedFeeRatePct(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftSelfWeightPct = useCallback((value: SetStateAction<number>) => {
    markConfirmedBaselineDraftDirty()
    setSelfWeightPct(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftConfirmBySize = useCallback<Dispatch<SetStateAction<Record<string, number>>>>((value) => {
    markConfirmedBaselineDraftDirty()
    setConfirmBySize(value)
  }, [markConfirmedBaselineDraftDirty])

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) setConfirmedBaselineDraftDirty(false)
    })
    return () => {
      alive = false
    }
  }, [appliedPrefillKey, prefillKey])

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
    setConfirmedBaselineDraftDirty(false)
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
    setConfirmedBaselineDraftDirty(false)
    candidateItemContext.onRestoreConfirmed?.()
  }, [candidateItemContext])

  return {
    dailyMeanClient,
    setDailyMeanClient: setDraftDailyMeanClient,
    bufferStock,
    setBufferStock: setDraftBufferStock,
    unitCostInput,
    setUnitCostInput: setDraftUnitCostInput,
    unitPriceInput,
    setUnitPriceInput: setDraftUnitPriceInput,
    expectedFeeRatePct,
    setExpectedFeeRatePct: setDraftExpectedFeeRatePct,
    selfWeightPct,
    setSelfWeightPct: setDraftSelfWeightPct,
    confirmBySize,
    setConfirmBySize: setDraftConfirmBySize,
    hasSavedSnapshot,
    prefillKey,
    appliedPrefillKey,
    snapshotConfirmBySize,
    snapshotConfirmBaselineActive,
    confirmedBaselineDraftDirty,
    markConfirmedBaselineDraftDirty,
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
  canBuildSnapshot = true,
  prefillKey,
  appliedPrefillKey,
  snapshotConfirmBaselineActive,
  confirmedBaselineDraftDirty,
}: DraftEmissionArgs) {
  useEffect(() => {
    if (candidateItemContext == null) return
    if (!canBuildSnapshot) return
    if (prefillKey != null && appliedPrefillKey !== prefillKey) return
    candidateItemContext.onDraftChange?.(
      buildSnapshot(),
      snapshotConfirmBaselineActive && !confirmedBaselineDraftDirty ? 'confirmed' : 'live',
    )
  }, [
    appliedPrefillKey,
    canBuildSnapshot,
    candidateItemContext,
    confirmedBaselineDraftDirty,
    buildSnapshot,
    prefillKey,
    snapshotConfirmBaselineActive,
  ])
}
