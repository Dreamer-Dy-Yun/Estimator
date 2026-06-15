import type { OrderSnapshotComparisonSubject, OrderSnapshotConfirmedRound } from '../../../../../snapshot/orderSnapshotTypes'
import { useCallback, useEffect, useMemo, useState,} from 'react'
import type { OrderSnapshotAiComment, OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import { getOrderSnapshotConfirmedQtyBySize } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { InboundDueDateDefaults } from './useSecondaryInboundDueDates'
import { useSecondarySnapshotPrefill } from './useSecondarySnapshotPrefill'

export type LiveOrderUnitSource = {
  avgCost?: number | null
  avgPrice: number
  feeRatePct?: number | null
}

export type SnapshotControllerArgs = {
  prefillFromSnapshot: OrderSnapshotDocument | null
  candidateItemContext: CandidateItemPanelContext | null
  primarySkuGroupKey: string
  primaryPrice: number
  defaultInboundDueDates: InboundDueDateDefaults
  minOrderDate: string
  onComparisonSubjectChange: (next: OrderSnapshotComparisonSubject) => void
  setCurrentOrderInboundDueDate: (value: string) => void
  setNextOrderInboundDueDate: (value: string) => void
  setAiComment: (value: OrderSnapshotAiComment) => void
  resetInboundDueDatesToLive: () => void
}

export type DraftEmissionArgs = {
  candidateItemContext: CandidateItemPanelContext | null
  buildSnapshot: () => OrderSnapshotDocument
  canBuildSnapshot?: boolean
  prefillKey: string | null
  appliedPrefillKey: string | null
  snapshotConfirmBaselineActive: boolean
  confirmedBaselineDraftDirty: boolean
}

export type LiveUnitDefaultsArgs = {
  prefillFromSnapshot: OrderSnapshotDocument | null
  primarySkuGroupKey: string
  liveOrderUnitSource: LiveOrderUnitSource | null
  applyLiveOrderUnitInputs: (source: LiveOrderUnitSource) => void
}

const DEFAULT_BUFFER_STOCK = 0 as const
const DEFAULT_SELF_WEIGHT_PCT = 50 as const

const roundNonNegative: (value: number) => number = (value: number) : number => Math.max(0, Math.round(value))
const roundFeeRatePct: (value: number) => number = (value: number) : number => Math.max(0, Math.round(value * 10) / 10)

export function useSecondaryDrawerSnapshotController({
  prefillFromSnapshot,
  candidateItemContext,
  primarySkuGroupKey,
  primaryPrice,
  defaultInboundDueDates,
  minOrderDate,
  onComparisonSubjectChange,
  setCurrentOrderInboundDueDate,
  setNextOrderInboundDueDate,
  setAiComment,
  resetInboundDueDatesToLive,
}: SnapshotControllerArgs) : { dailyMeanClient: number | null; setDailyMeanClient: (value: React.SetStateAction<number | null>) => void; bufferStock: number; setBufferStock: (value: React.SetStateAction<number>) => void; unitCostInput: number; setUnitCostInput: (value: React.SetStateAction<number>) => void; unitPriceInput: number; setUnitPriceInput: (value: React.SetStateAction<number>) => void; expectedFeeRatePct: number; setExpectedFeeRatePct: (value: React.SetStateAction<number>) => void; selfWeightPct: number; setSelfWeightPct: (value: React.SetStateAction<number>) => void; confirmBySize: Record<string, number>; setConfirmBySize: React.Dispatch<React.SetStateAction<Record<string, number>>>; confirmedRounds: OrderSnapshotConfirmedRound[]; setConfirmedRounds: React.Dispatch<React.SetStateAction<OrderSnapshotConfirmedRound[]>>; hasSavedSnapshot: boolean; prefillKey: string | null; appliedPrefillKey: string | null; snapshotConfirmBySize: { [k: string]: number; }; snapshotConfirmBaselineActive: boolean; confirmedBaselineDraftDirty: boolean; markConfirmedBaselineDraftDirty: () => void; applyLiveOrderUnitInputs: (source: LiveOrderUnitSource) => void; handleResetToLive: (liveOrderUnitSource: LiveOrderUnitSource) => void; handleRestoreConfirmed: () => void; } {
  const [dailyMeanClient, setDailyMeanClient]: [number | null, React.Dispatch<React.SetStateAction<number | null>>] = useState<number | null>(null)
  const [bufferStock, setBufferStock]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(DEFAULT_BUFFER_STOCK)
  const [unitCostInput, setUnitCostInput]: [number, React.Dispatch<React.SetStateAction<number>>] = useState(0)
  const [unitPriceInput, setUnitPriceInput]: [number, React.Dispatch<React.SetStateAction<number>>] = useState(roundNonNegative(primaryPrice))
  const [expectedFeeRatePct, setExpectedFeeRatePct]: [number, React.Dispatch<React.SetStateAction<number>>] = useState(0)
  const [selfWeightPct, setSelfWeightPct]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(DEFAULT_SELF_WEIGHT_PCT)
  const [confirmBySize, setConfirmBySize]: [Record<string, number>, React.Dispatch<React.SetStateAction<Record<string, number>>>] = useState<Record<string, number>>({})
  const [confirmedRounds, setConfirmedRounds]: [OrderSnapshotConfirmedRound[], React.Dispatch<React.SetStateAction<OrderSnapshotConfirmedRound[]>>] = useState<OrderSnapshotConfirmedRound[]>([])
  const [snapshotConfirmBaselineActive, setSnapshotConfirmBaselineActive]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(
    () : boolean => prefillFromSnapshot != null && candidateItemContext?.hydrateSnapshotSource === 'confirmed',
  )
  const [confirmedBaselineDraftDirty, setConfirmedBaselineDraftDirty]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [appliedPrefillKey, setAppliedPrefillKey]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)

  const hasSavedSnapshot: boolean = Boolean(candidateItemContext?.confirmedSnapshot)
  const prefillKey: string | null = useMemo(
    () : string | null => (prefillFromSnapshot == null
      ? null
      : [
          candidateItemContext?.itemUuid ?? primarySkuGroupKey,
          prefillFromSnapshot.savedAt,
          prefillFromSnapshot.context.periodStart,
          prefillFromSnapshot.context.periodEnd,
        ].join('|')),
    [candidateItemContext?.itemUuid, prefillFromSnapshot, primarySkuGroupKey],
  )
  const snapshotConfirmBySize: { [k: string]: number; } = useMemo(
    () : { [k: string]: number; } => (prefillFromSnapshot == null
      ? {}
      : getOrderSnapshotConfirmedQtyBySize(prefillFromSnapshot.drawer2.confirmed)),
    [prefillFromSnapshot],
  )
  const applyLiveOrderUnitInputs: (source: LiveOrderUnitSource) => void = useCallback((source: LiveOrderUnitSource) : void => {
    setUnitPriceInput(roundNonNegative(source.avgPrice))
    if (source.avgCost != null) setUnitCostInput(roundNonNegative(source.avgCost))
    if (source.feeRatePct != null) setExpectedFeeRatePct(roundFeeRatePct(source.feeRatePct))
  }, [])
  const markConfirmedBaselineDraftDirty: () => void = useCallback(() : void => {
    setConfirmedBaselineDraftDirty(true)
  }, [])
  const setDraftDailyMeanClient: (value: React.SetStateAction<number | null>) => void = useCallback((value: React.SetStateAction<number | null>) : void => {
    markConfirmedBaselineDraftDirty()
    setDailyMeanClient(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftBufferStock: (value: React.SetStateAction<number>) => void = useCallback((value: React.SetStateAction<number>) : void => {
    markConfirmedBaselineDraftDirty()
    setBufferStock(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftUnitCostInput: (value: React.SetStateAction<number>) => void = useCallback((value: React.SetStateAction<number>) : void => {
    markConfirmedBaselineDraftDirty()
    setUnitCostInput(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftUnitPriceInput: (value: React.SetStateAction<number>) => void = useCallback((value: React.SetStateAction<number>) : void => {
    markConfirmedBaselineDraftDirty()
    setUnitPriceInput(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftExpectedFeeRatePct: (value: React.SetStateAction<number>) => void = useCallback((value: React.SetStateAction<number>) : void => {
    markConfirmedBaselineDraftDirty()
    setExpectedFeeRatePct(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftSelfWeightPct: (value: React.SetStateAction<number>) => void = useCallback((value: React.SetStateAction<number>) : void => {
    markConfirmedBaselineDraftDirty()
    setSelfWeightPct(value)
  }, [markConfirmedBaselineDraftDirty])
  const setDraftConfirmBySize: React.Dispatch<React.SetStateAction<Record<string, number>>> = useCallback<React.Dispatch<React.SetStateAction<Record<string, number>>>>((value: React.SetStateAction<Record<string, number>>) : void => {
    setConfirmBySize(value)
  }, [])
  const setDraftConfirmedRounds: React.Dispatch<React.SetStateAction<OrderSnapshotConfirmedRound[]>> = useCallback<React.Dispatch<React.SetStateAction<OrderSnapshotConfirmedRound[]>>>((value: React.SetStateAction<OrderSnapshotConfirmedRound[]>) : void => {
    setConfirmedRounds(value)
  }, [])

  useEffect(() : () => void => {
    let alive: boolean = true
    queueMicrotask(() : void => {
      if (alive) setConfirmedBaselineDraftDirty(false)
    })
    return () : void => {
      alive = false
    }
  }, [appliedPrefillKey, prefillKey])

  useSecondarySnapshotPrefill({
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
  })

  const handleResetToLive: (liveOrderUnitSource: LiveOrderUnitSource) => void = useCallback((liveOrderUnitSource: LiveOrderUnitSource) : void => {
    setDailyMeanClient(null)
    resetInboundDueDatesToLive()
    setBufferStock(DEFAULT_BUFFER_STOCK)
    setUnitCostInput(0)
    setUnitPriceInput(roundNonNegative(primaryPrice))
    setExpectedFeeRatePct(0)
    applyLiveOrderUnitInputs(liveOrderUnitSource)
    setAiComment({ prompt: '', answer: '', generatedAt: null })
    setSelfWeightPct(DEFAULT_SELF_WEIGHT_PCT)
    setConfirmBySize({})
    setConfirmedRounds([])
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
  ])

  const handleRestoreConfirmed: () => void = useCallback(() : void => {
    if (!candidateItemContext?.confirmedSnapshot) return
    setConfirmBySize({})
    setConfirmedRounds(candidateItemContext.confirmedSnapshot.drawer2.confirmed.rounds)
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
    confirmedRounds,
    setConfirmedRounds: setDraftConfirmedRounds,
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
}: LiveUnitDefaultsArgs) : void {
  const avgCost: number | null | undefined = liveOrderUnitSource?.avgCost
  const avgPrice: number | undefined = liveOrderUnitSource?.avgPrice
  const feeRatePct: number | null | undefined = liveOrderUnitSource?.feeRatePct
  useEffect(() : void => {
    if (prefillFromSnapshot != null) return
    if (liveOrderUnitSource == null) return
    applyLiveOrderUnitInputs(liveOrderUnitSource)
  }, [
    applyLiveOrderUnitInputs,
    avgCost,
    avgPrice,
    feeRatePct,
    liveOrderUnitSource,
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
}: DraftEmissionArgs) : void {
  useEffect(() : void => {
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
