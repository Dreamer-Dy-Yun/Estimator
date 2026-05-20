import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { OrderSnapshotDocumentV1 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../candidateActionCards'
import { useSecondarySnapshotPrefill } from './useSecondarySnapshotPrefill'

type LiveOrderUnitSource = {
  avgCost?: number | null
  avgPrice: number
  feeRatePct?: number | null
}

type DateRange = {
  start: string
  end: string
}

type SnapshotControllerArgs = {
  prefillFromSnapshot: OrderSnapshotDocumentV1 | null
  candidateItemContext: CandidateItemPanelContext | null
  primarySkuGroupKey: string
  primaryPrice: number
  defaultLeadTime: DateRange
  minOrderDate: string
  onChannelChange: (next: string) => void
  setLeadTimeStartDate: (value: string) => void
  setLeadTimeEndDate: (value: string) => void
  setAiPrompt: (value: string) => void
  setAiComment: (value: string) => void
  resetLeadTimeToLive: () => void
}

type DraftEmissionArgs = {
  candidateItemContext: CandidateItemPanelContext | null
  buildCurrentSnapshot: () => OrderSnapshotDocumentV1
  prefillKey: string | null
  appliedPrefillKey: string | null
  snapshotConfirmBaselineActive: boolean
}

type LiveUnitDefaultsArgs = {
  prefillFromSnapshot: OrderSnapshotDocumentV1 | null
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
  defaultLeadTime,
  minOrderDate,
  onChannelChange,
  setLeadTimeStartDate,
  setLeadTimeEndDate,
  setAiPrompt,
  setAiComment,
  resetLeadTimeToLive,
}: SnapshotControllerArgs) {
  /** null: 예측 수량연산용 μ는 클라이언트 가중모형값. 숫자면 해당 값으로 덮어씀. */
  const [dailyMeanClient, setDailyMeanClient] = useState<number | null>(null)
  const [bufferStock, setBufferStock] = useState(DEFAULT_BUFFER_STOCK)
  const [unitCostInput, setUnitCostInput] = useState(roundNonNegative(primaryPrice * DEFAULT_UNIT_COST_PRICE_RATIO))
  const [unitPriceInput, setUnitPriceInput] = useState(roundNonNegative(primaryPrice))
  const [expectedFeeRatePct, setExpectedFeeRatePct] = useState(DEFAULT_EXPECTED_FEE_RATE_PCT)
  const [selfWeightPct, setSelfWeightPct] = useState(DEFAULT_SELF_WEIGHT_PCT)
  /** 사용자가 직접 덮어쓴 확정 수량만. live/snapshot baseline은 SecondaryOrderDraft가 정한다. */
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
      : Object.fromEntries(prefillFromSnapshot.drawer2.sizeRows.map((row) => [row.size, row.confirmQty]))),
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
  })

  const handleResetToLive = useCallback((liveOrderUnitSource: LiveOrderUnitSource) => {
    setDailyMeanClient(null)
    resetLeadTimeToLive()
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
    resetLeadTimeToLive,
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
    setConfirmBySize: setConfirmBySize as Dispatch<SetStateAction<Record<string, number>>>,
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
  useEffect(() => {
    if (prefillFromSnapshot != null) return
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      applyLiveOrderUnitInputs(liveOrderUnitSource)
    })
    return () => {
      alive = false
    }
  }, [
    applyLiveOrderUnitInputs,
    liveOrderUnitSource.avgCost,
    liveOrderUnitSource.avgPrice,
    liveOrderUnitSource.feeRatePct,
    prefillFromSnapshot,
    primarySkuGroupKey,
  ])
}

export function useSecondaryDrawerDraftEmission({
  candidateItemContext,
  buildCurrentSnapshot,
  prefillKey,
  appliedPrefillKey,
  snapshotConfirmBaselineActive,
}: DraftEmissionArgs) {
  useEffect(() => {
    if (candidateItemContext == null) return
    if (prefillKey != null && appliedPrefillKey !== prefillKey) return
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      candidateItemContext.onDraftChange?.(
        buildCurrentSnapshot(),
        snapshotConfirmBaselineActive ? 'confirmed' : 'live',
      )
    })
    return () => {
      alive = false
    }
  }, [
    appliedPrefillKey,
    candidateItemContext,
    buildCurrentSnapshot,
    prefillKey,
    snapshotConfirmBaselineActive,
  ])
}
