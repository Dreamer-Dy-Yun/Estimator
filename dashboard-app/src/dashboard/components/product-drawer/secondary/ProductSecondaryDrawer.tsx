import { useEffect, useId, useMemo, useState } from 'react'
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
  const [showSnapshotInfo, setShowSnapshotInfo] = useState(false)

  const minOrderDate = formatIsoDateLocal(new Date())
  const hasSavedSnapshot = candidateItemContext != null && prefillFromSnapshot != null
  const snapshotInfoMode = hasSavedSnapshot && showSnapshotInfo
  const viewPeriodStart = snapshotInfoMode ? prefillFromSnapshot!.context.periodStart : periodStart
  const viewPeriodEnd = snapshotInfoMode ? prefillFromSnapshot!.context.periodEnd : periodEnd

  useEffect(() => {
    if (hasSavedSnapshot) return
    let alive = true
    queueMicrotask(() => {
      if (alive) setShowSnapshotInfo(false)
    })
    return () => {
      alive = false
    }
  }, [hasSavedSnapshot, primary.skuGroupKey])

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
    if (prefillFromSnapshot == null) return
    const d2 = prefillFromSnapshot.drawer2
    const si = d2.stockInputs
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      onChannelChange(d2.competitorChannelId)
      setBufferStock(d2.bufferStock)
      setSelfWeightPct(d2.selfWeightPct)
      setAiPrompt(d2.llmPrompt)
      setAiComment(d2.llmAnswer)
      setLeadTimeStartDate(si.leadTimeStartDate)
      setLeadTimeEndDate(si.leadTimeEndDate)
      setDailyMeanClient(si.dailyMean)
    })
    return () => {
      alive = false
    }
  }, [prefillFromSnapshot, primary.skuGroupKey, onChannelChange])

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
    snapshotInfoMode,
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

  useEffect(() => {
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
  }, [primary.skuGroupKey, selfCol.avgCost, selfCol.avgPrice, selfCol.feeRatePct])
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

  return (
    <ProductSecondaryDrawerContent
      pageName={pageName}
      primary={primary}
      channel={channel}
      candidateItemContext={candidateItemContext}
      hasSavedSnapshot={hasSavedSnapshot}
      showSnapshotInfo={showSnapshotInfo}
      onShowSnapshotInfoChange={setShowSnapshotInfo}
      model={model}
      aiComment={aiComment}
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
