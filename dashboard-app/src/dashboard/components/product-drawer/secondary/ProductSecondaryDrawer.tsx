import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../api'
import { useAppToast } from '../../../../components/AppToastContext'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import type { OrderSnapshotDocumentV1 } from '../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from './candidateActionCards'
import { useSecondaryAiCommentState } from './hooks/useSecondaryAiCommentState'
import { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'
import { useSecondaryHelpController } from './hooks/useSecondaryHelpController'
import { useSecondaryLeadTimeDates } from './hooks/useSecondaryLeadTimeDates'
import { useSecondarySnapshotPrefill } from './hooks/useSecondarySnapshotPrefill'
import { ProductSecondaryDrawerContent } from './ProductSecondaryDrawerContent'

export type { CandidateItemPanelContext }

const SAFETY_STOCK_MODE: 'manual' | 'formula' = 'formula'
const MANUAL_SAFETY_STOCK = 0
const SERVICE_LEVEL_PCT = 95

type Props = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  /** 오더 스냅샷용: 월간 포캐스트 개월 수 */
  forecastMonths: number
  pageName?: string
  /** 후보군 등에서 불러온 저장 스냅샷으로 폼·확정 수량 복원 */
  prefillFromSnapshot?: OrderSnapshotDocumentV1 | null
  candidateItemContext?: CandidateItemPanelContext | null
  channelState: {
    channelId: string
    competitorChannels: SecondaryCompetitorChannel[]
    onChannelChange: (next: string) => void
  }
}

export function ProductSecondaryDrawer({
  primary,
  secondary,
  periodStart,
  periodEnd,
  forecastMonths,
  pageName = 'ProductSecondaryDrawer',
  prefillFromSnapshot = null,
  candidateItemContext = null,
  channelState,
}: Props) {
  const { channelId, competitorChannels, onChannelChange } = channelState
  const { portalHelp, helpIds } = useSecondaryHelpController()
  const { showToast } = useAppToast()
  /** null: 예측 수량연산용 μ는 클라이언트 가중모형값. 숫자면 해당 값으로 덮어씀. */
  const [dailyMeanClient, setDailyMeanClient] = useState<number | null>(null)
  const {
    defaultLeadTime,
    minOrderDate,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    setLeadTimeStartDate,
    setLeadTimeEndDate,
    handleCurrentOrderDateChange,
    handleNextOrderDateChange,
    resetLeadTimeToLive,
  } = useSecondaryLeadTimeDates()
  const [bufferStock, setBufferStock] = useState(0)
  const [unitCostInput, setUnitCostInput] = useState(Math.max(0, Math.round(primary.price * 0.78)))
  const [unitPriceInput, setUnitPriceInput] = useState(Math.max(0, Math.round(primary.price)))
  const [expectedFeeRatePct, setExpectedFeeRatePct] = useState(13)
  const [selfWeightPct, setSelfWeightPct] = useState(50)
  /** 사용자가 직접 덮어쓴 확정 수량만. live/snapshot baseline은 SecondaryOrderDraft가 정한다. */
  const [confirmBySize, setConfirmBySize] = useState<Record<string, number>>({})
  const [snapshotConfirmBaselineActive, setSnapshotConfirmBaselineActive] = useState(
    () => prefillFromSnapshot != null && candidateItemContext?.hydrateSnapshotSource === 'confirmed',
  )
  const [appliedPrefillKey, setAppliedPrefillKey] = useState<string | null>(null)

  const hasSavedSnapshot = Boolean(candidateItemContext?.confirmedSnapshot)
  const viewPeriodStart = periodStart
  const viewPeriodEnd = periodEnd
  const prefillKey = useMemo(
    () => (prefillFromSnapshot == null
      ? null
      : [
          candidateItemContext?.itemUuid ?? primary.skuGroupKey,
          prefillFromSnapshot.savedAt,
          prefillFromSnapshot.context.periodStart,
          prefillFromSnapshot.context.periodEnd,
        ].join('|')),
    [candidateItemContext?.itemUuid, prefillFromSnapshot, primary.skuGroupKey],
  )
  const snapshotConfirmBySize = useMemo(
    () => (prefillFromSnapshot == null
      ? {}
      : Object.fromEntries(prefillFromSnapshot.drawer2.sizeRows.map((row) => [row.size, row.confirmQty]))),
    [prefillFromSnapshot],
  )

  const channel = useMemo<SecondaryCompetitorChannel>(
    () => competitorChannels.find((ch) => ch.id === channelId)!,
    [channelId, competitorChannels],
  )

  const {
    aiPrompt,
    aiComment,
    aiCommentLoading,
    aiCommentError,
    setAiPrompt,
    setAiComment,
  } = useSecondaryAiCommentState({
    pageName,
    skuGroupKey: primary.skuGroupKey,
    periodStart: viewPeriodStart,
    periodEnd: viewPeriodEnd,
    forecastMonths,
    channel,
    candidateItemContext,
    prefillFromSnapshot,
  })

  useSecondarySnapshotPrefill({
    prefillFromSnapshot,
    candidateItemContext,
    primarySkuGroupKey: primary.skuGroupKey,
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

  const model = useSecondaryForecastModel({
    primary,
    secondary,
    pageName,
    periodStart,
    periodEnd,
    forecastMonths,
    prefillFromSnapshot,
    candidateItemContext,
    channel,
    viewPeriodStart,
    viewPeriodEnd,
    snapshotConfirmBySize,
    useSnapshotConfirmBaseline: snapshotConfirmBaselineActive,
    dailyMeanClient,
    setDailyMeanClient,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    selfWeightPct,
    bufferStock,
    confirmBySize,
    setConfirmBySize,
    unitPriceInput,
    unitCostInput,
    expectedFeeRatePct,
    aiPrompt,
    aiComment,
    safetyStockMode: SAFETY_STOCK_MODE,
    manualSafetyStock: MANUAL_SAFETY_STOCK,
    serviceLevelPct: SERVICE_LEVEL_PCT,
    hasSavedSnapshot,
    showToast,
  })
  const { selfCol } = model
  const buildCurrentSnapshot = model.buildSnapshot

  useEffect(() => {
    if (prefillFromSnapshot != null) return
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      setUnitCostInput(Math.max(0, Math.round(selfCol.avgCost ?? 0)))
      setUnitPriceInput(Math.max(0, Math.round(selfCol.avgPrice)))
      setExpectedFeeRatePct(Math.max(0, Math.round((selfCol.feeRatePct ?? 0) * 10) / 10))
    })
    return () => {
      alive = false
    }
  }, [prefillFromSnapshot, primary.skuGroupKey, selfCol.avgCost, selfCol.avgPrice, selfCol.feeRatePct])
  const handleResetToLive = useCallback(() => {
    setDailyMeanClient(null)
    resetLeadTimeToLive()
    setBufferStock(0)
    setUnitCostInput(Math.max(0, Math.round(selfCol.avgCost ?? 0)))
    setUnitPriceInput(Math.max(0, Math.round(selfCol.avgPrice)))
    setExpectedFeeRatePct(Math.max(0, Math.round((selfCol.feeRatePct ?? 0) * 10) / 10))
    setAiPrompt('')
    setAiComment('')
    setSelfWeightPct(50)
    setConfirmBySize({})
    setSnapshotConfirmBaselineActive(false)
    setAppliedPrefillKey(null)
    candidateItemContext?.onResetDraft?.()
  }, [
    candidateItemContext,
    resetLeadTimeToLive,
    selfCol.avgCost,
    selfCol.avgPrice,
    selfCol.feeRatePct,
    setAiComment,
    setAiPrompt,
  ])

  const handleRestoreConfirmed = useCallback(() => {
    if (!candidateItemContext?.confirmedSnapshot) return
    setSnapshotConfirmBaselineActive(true)
    candidateItemContext.onRestoreConfirmed?.()
  }, [candidateItemContext])

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

  return (
    <ProductSecondaryDrawerContent
      pageName={pageName}
      primary={primary}
      channel={channel}
      candidateItemContext={candidateItemContext}
      hasSavedSnapshot={hasSavedSnapshot}
      showingConfirmedValues={snapshotConfirmBaselineActive}
      onResetToLive={handleResetToLive}
      onRestoreConfirmed={handleRestoreConfirmed}
      model={model}
      aiComment={aiComment}
      aiCommentLoading={aiCommentLoading}
      aiCommentError={aiCommentError}
      selfWeightPct={selfWeightPct}
      onSelfWeightPctChange={setSelfWeightPct}
      minOrderDate={minOrderDate}
      leadTimeStartDate={leadTimeStartDate}
      leadTimeEndDate={leadTimeEndDate}
      bufferStock={bufferStock}
      unitCostInput={unitCostInput}
      unitPriceInput={unitPriceInput}
      expectedFeeRatePct={expectedFeeRatePct}
      onCurrentOrderDateChange={handleCurrentOrderDateChange}
      onNextOrderDateChange={handleNextOrderDateChange}
      onBufferStockChange={setBufferStock}
      onUnitCostChange={setUnitCostInput}
      onUnitPriceChange={setUnitPriceInput}
      onExpectedFeeRatePctChange={setExpectedFeeRatePct}
      portalHelp={portalHelp}
      helpIds={helpIds}
    />
  )
}
