import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { SecondaryCompetitorChannel } from '../../../../api'
import { useAppToast } from '../../../../components/AppToastContext'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import {
  daysInclusiveBetween,
  formatIsoDateLocal,
} from '../../../../utils/date'
import { usePortalHelpPopover } from '../../usePortalHelpPopover'
import type { SecondaryHelpId } from './secondaryDrawerTypes'
import type { OrderSnapshotDocumentV1 } from '../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from './candidateActionCards'
import { useSecondaryAiComment } from './hooks/useSecondaryAiComment'
import { useSecondaryForecastModel } from './hooks/useSecondaryForecastModel'
import { ProductSecondaryDrawerContent } from './ProductSecondaryDrawerContent'

export type { CandidateItemPanelContext }

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

function buildDefaultLeadTimeDates() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(startDate.getMonth() + 6)
  const start = formatIsoDateLocal(startDate)
  const endDate = new Date(today)
  endDate.setFullYear(endDate.getFullYear() + 1)
  const end = formatIsoDateLocal(endDate)
  return { start, end }
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
  const defaultLeadTime = useMemo(() => buildDefaultLeadTimeDates(), [])
  const {
    channelId,
    competitorChannels,
    onChannelChange,
  } = channelState
  const confirmOrderHelpId = useId()
  const forecastQtyCalcHelpId = useId()
  const expectedOpProfitRateHelpId = useId()
  const totalOrderBalanceHelpId = useId()
  const expectedInboundOrderBalanceHelpId = useId()
  const sizeRecQtyHelpId = useId()
  const salesForecastSizeOrderHelpId = useId()
  const portalHelp = usePortalHelpPopover<SecondaryHelpId>()
  const { showToast } = useAppToast()
  const safetyStockMode: 'manual' | 'formula' = 'formula'
  const manualSafetyStock = 0
  /** null: 예측 수량연산용 μ는 클라이언트 가중모형값. 숫자면 해당 값으로 덮어씀. */
  const [dailyMeanClient, setDailyMeanClient] = useState<number | null>(null)
  const serviceLevelPct = 95
  const [leadTimeStartDate, setLeadTimeStartDate] = useState(defaultLeadTime.start)
  const [leadTimeEndDate, setLeadTimeEndDate] = useState(defaultLeadTime.end)
  const [bufferStock, setBufferStock] = useState(0)
  const [unitCostInput, setUnitCostInput] = useState(Math.max(0, Math.round(primary.price * 0.78)))
  const [unitPriceInput, setUnitPriceInput] = useState(Math.max(0, Math.round(primary.price)))
  const [expectedFeeRatePct, setExpectedFeeRatePct] = useState(13)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiComment, setAiComment] = useState('')
  const [selfWeightPct, setSelfWeightPct] = useState(50)
  /** 사용자가 직접 덮어쓴 확정 수량만. live/snapshot baseline은 SecondaryOrderDraft가 정한다. */
  const [confirmBySize, setConfirmBySize] = useState<Record<string, number>>({})
  const [snapshotConfirmBaselineActive, setSnapshotConfirmBaselineActive] = useState(false)
  const [appliedPrefillKey, setAppliedPrefillKey] = useState<string | null>(null)

  const minOrderDate = formatIsoDateLocal(new Date())
  const hasSavedSnapshot = Boolean(candidateItemContext?.isDetailConfirmed)
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

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) setLeadTimeStartDate((s) => (s < minOrderDate ? minOrderDate : s))
    })
    return () => {
      alive = false
    }
  }, [minOrderDate, primary.skuGroupKey])

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) setLeadTimeEndDate((e) => (e < leadTimeStartDate ? leadTimeStartDate : e))
    })
    return () => {
      alive = false
    }
  }, [leadTimeStartDate])

  const leadTimeDays = useMemo(
    () => daysInclusiveBetween(leadTimeStartDate, leadTimeEndDate),
    [leadTimeEndDate, leadTimeStartDate],
  )

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
      setSnapshotConfirmBaselineActive(true)
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
    defaultLeadTime.end,
    defaultLeadTime.start,
    minOrderDate,
    onChannelChange,
    prefillFromSnapshot,
    prefillKey,
    primary.skuGroupKey,
  ])

  const viewChannel = useMemo<SecondaryCompetitorChannel>(() => {
    return channel
  }, [channel])

  const aiCommentParams = useMemo(() => ({
    skuGroupKey: primary.skuGroupKey,
    periodStart: viewPeriodStart,
    periodEnd: viewPeriodEnd,
    forecastMonths,
    competitorChannelId: viewChannel.id,
    candidateItemUuid: candidateItemContext?.itemUuid ?? null,
  }), [
    candidateItemContext?.itemUuid,
    forecastMonths,
    primary.skuGroupKey,
    viewChannel.id,
    viewPeriodEnd,
    viewPeriodStart,
  ])
  const handleAiCommentLoaded = useCallback((result: { llmPrompt: string; llmAnswer: string }) => {
    setAiPrompt(result.llmPrompt)
    setAiComment(result.llmAnswer)
  }, [])
  const { aiCommentLoading, aiCommentError } = useSecondaryAiComment({
    enabled: candidateItemContext == null || prefillFromSnapshot == null,
    pageName,
    params: aiCommentParams,
    onLoaded: handleAiCommentLoaded,
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
    channel: viewChannel,
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
    safetyStockMode,
    manualSafetyStock,
    serviceLevelPct,
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
  const handleCurrentOrderDateChange = (next: string) => {
    const v = next < minOrderDate ? minOrderDate : next
    setLeadTimeStartDate(v)
    setLeadTimeEndDate((e) => (e < v ? v : e))
  }
  const handleNextOrderDateChange = (next: string) => {
    let v = next < minOrderDate ? minOrderDate : next
    if (v < leadTimeStartDate) v = leadTimeStartDate
    setLeadTimeEndDate(v)
  }

  const handleResetToLive = useCallback(() => {
    const nextStart = defaultLeadTime.start < minOrderDate ? minOrderDate : defaultLeadTime.start
    const nextEnd = defaultLeadTime.end < nextStart ? nextStart : defaultLeadTime.end
    setDailyMeanClient(null)
    setLeadTimeStartDate(nextStart)
    setLeadTimeEndDate(nextEnd)
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
    defaultLeadTime.end,
    defaultLeadTime.start,
    minOrderDate,
    selfCol.avgCost,
    selfCol.avgPrice,
    selfCol.feeRatePct,
  ])

  useEffect(() => {
    if (candidateItemContext == null) return
    if (prefillKey != null && appliedPrefillKey !== prefillKey) return
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      candidateItemContext.onDraftChange?.(buildCurrentSnapshot())
    })
    return () => {
      alive = false
    }
  }, [
    appliedPrefillKey,
    candidateItemContext,
    buildCurrentSnapshot,
    prefillKey,
  ])

  return (
    <ProductSecondaryDrawerContent
      pageName={pageName}
      primary={primary}
      channel={viewChannel}
      candidateItemContext={candidateItemContext}
      hasSavedSnapshot={hasSavedSnapshot}
      onResetToLive={handleResetToLive}
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
      helpIds={{
        confirmOrder: confirmOrderHelpId,
        forecastQtyCalc: forecastQtyCalcHelpId,
        expectedOpProfitRate: expectedOpProfitRateHelpId,
        totalOrderBalance: totalOrderBalanceHelpId,
        expectedInboundOrderBalance: expectedInboundOrderBalanceHelpId,
        sizeRecQty: sizeRecQtyHelpId,
        salesForecastSizeOrder: salesForecastSizeOrderHelpId,
      }}
    />
  )
}
