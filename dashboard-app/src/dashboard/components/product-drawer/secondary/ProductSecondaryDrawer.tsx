import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { BlockMath } from 'react-katex'
import type { SecondaryCompetitorChannel } from '../../../../api'
import { ComponentErrorBoundary } from '../../../../components/ComponentErrorBoundary'
import { useAppToast } from '../../../../components/AppToastContext'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../../types'
import {
  daysInclusiveBetween,
  formatIsoDateLocal,
  formatDateTimeMinute,
} from '../../../../utils/date'
import { PortalHelpPopoverLayer } from '../../PortalHelpPopover'
import commonStyles from '../../common.module.css'
import { normalizeMonthKey } from '../../trend/trendRangeUtils'
import { usePortalHelpPopover } from '../../usePortalHelpPopover'
import { AiCommentCard } from './cards/AiCommentCard'
import { ProductMetaCard } from './cards/ProductMetaCard'
import { SalesForecastCard } from './cards/SalesForecastCard'
import { SalesTrendDailyCard } from './cards/SalesTrendDailyCard'
import { SizeOrderCard } from './cards/SizeOrderCard'
import { computeClientStockOrder } from './model/clientStockOrderCompute'
import { KO } from '../ko'
import { SecondaryOrderDraft } from './model/SecondaryOrderDraft'
import {
  buildDailyTrendSizeOptions,
  buildSecondarySizeOrderRows,
  buildSecondarySizeShares,
} from './model/secondarySizeOrderRows'
import styles from './secondaryDrawer.module.css'
import type {
  SecondaryForecastDerived,
  SecondaryForecastInputs,
  SecondaryHelpId,
} from './secondaryDrawerTypes'
import { useSecondaryDailyTrend } from './hooks/useSecondaryDailyTrend'
import { useSecondaryStockOrderCalc } from './hooks/useSecondaryStockOrderCalc'
import { useSecondarySalesInsight } from './hooks/useSecondarySalesInsight'
import type { OrderSnapshotDocumentV1 } from '../../../../snapshot/orderSnapshotTypes'
import {
  CandidateStashOrderActionCard,
  InnerCandidateActionCard,
  type CandidateItemPanelContext,
} from './candidateActionCards'
import { buildSecondaryOrderSnapshot } from './secondarySnapshot'
import { CandidateStashPickerModal } from './CandidateStashPickerModal'
import { useSecondaryCandidateActions } from './hooks/useSecondaryCandidateActions'

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

  const makeApiErrorInfo = useCallback((request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: new Date().toISOString(),
    page: pageName,
    request,
    error: err instanceof Error ? err.message : String(err),
  }), [pageName])

  const minOrderDate = formatIsoDateLocal(new Date())
  const hasSavedSnapshot = candidateItemContext != null && prefillFromSnapshot != null
  const snapshotInfoMode = hasSavedSnapshot && showSnapshotInfo
  const viewPeriodStart = snapshotInfoMode ? prefillFromSnapshot!.context.periodStart : periodStart
  const viewPeriodEnd = snapshotInfoMode ? prefillFromSnapshot!.context.periodEnd : periodEnd
  const selectedStart = normalizeMonthKey(viewPeriodStart)
  const selectedEnd = normalizeMonthKey(viewPeriodEnd)
  const monthlySalesTrend = useMemo(() => primary.monthlySalesTrend ?? [], [primary.monthlySalesTrend])

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
  const { selfCol, compCol, salesInsightError } = useSecondarySalesInsight({
    primary,
    secondary,
    channel,
    selectedStart,
    selectedEnd,
    makeApiErrorInfo,
  })

  useEffect(() => {
    if (prefillFromSnapshot != null) return
    let alive = true
    queueMicrotask(() => {
      if (alive) setDailyMeanClient(null)
    })
    return () => {
      alive = false
    }
  }, [primary.skuGroupKey, selectedEnd, selectedStart, prefillFromSnapshot])

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

  /** 기대 일평균은 선택 시작월부터 차기 오더 입고월까지의 예측 구간 평균으로 산출. */
  const forecastMeanPeriodEnd = leadTimeEndDate.slice(0, 7)
  /** 사이즈별 판매예측(EA) 구간 일수: 금번 오더 입고일~차기 오더 입고일(양끝 포함). */
  const forecastSalesHorizonDays = leadTimeDays

  const clientStock = useMemo(
    () =>
      computeClientStockOrder({
        monthlySalesTrend,
        periodStart: selectedStart,
        periodEnd: selectedEnd,
        forecastPeriodEnd: forecastMeanPeriodEnd,
        serviceLevelPct,
        leadTimeDays,
        safetyStockMode,
        manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
        dailyMeanClient,
        availableStock: primary.availableStock,
        price: primary.price,
      }),
    [
      monthlySalesTrend,
      primary.availableStock,
      primary.price,
      selectedStart,
      selectedEnd,
      forecastMeanPeriodEnd,
      serviceLevelPct,
      leadTimeDays,
      safetyStockMode,
      manualSafetyStock,
      dailyMeanClient,
    ],
  )

  const { forecastCalc, forecastCalcError } = useSecondaryStockOrderCalc({
    skuGroupKey: primary.skuGroupKey,
    selectedStart,
    selectedEnd,
    forecastMeanPeriodEnd,
    serviceLevelPct,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock,
    dailyMeanClient,
    makeApiErrorInfo,
  })

  const forecastInputs: SecondaryForecastInputs = useMemo(() => ({
    trendDailyMean: forecastCalc?.trendDailyMean ?? clientStock.trendDailyMean,
    dailyMean: dailyMeanClient ?? forecastCalc?.dailyMean ?? clientStock.forecastDailyMean,
    sigma: forecastCalc?.sigma ?? clientStock.sigma,
    serviceLevelPct,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
  }), [
    forecastCalc?.dailyMean,
    forecastCalc?.sigma,
    forecastCalc?.trendDailyMean,
    clientStock.forecastDailyMean,
    clientStock.sigma,
    clientStock.trendDailyMean,
    dailyMeanClient,
    leadTimeDays,
    leadTimeEndDate,
    leadTimeStartDate,
    manualSafetyStock,
    safetyStockMode,
    serviceLevelPct,
  ])
  const forecastDerived: SecondaryForecastDerived = useMemo(() => ({
    safetyStock: forecastCalc?.safetyStockCalc.safetyStock ?? clientStock.safetyStock,
    recommendedOrderQty: forecastCalc?.safetyStockCalc.recommendedOrderQty ?? clientStock.safetyRecQty,
    expectedOrderAmount: forecastCalc?.safetyStockCalc.expectedOrderAmount ?? clientStock.safetyExpectedOrderAmount,
    expectedSalesAmount: forecastCalc?.safetyStockCalc.expectedSalesAmount ?? clientStock.safetyExpectedSalesAmount,
    expectedOpProfit: forecastCalc?.safetyStockCalc.expectedOpProfit ?? clientStock.safetyExpectedOpProfit,
  }), [
    forecastCalc?.safetyStockCalc.expectedOpProfit,
    forecastCalc?.safetyStockCalc.expectedOrderAmount,
    forecastCalc?.safetyStockCalc.expectedSalesAmount,
    forecastCalc?.safetyStockCalc.recommendedOrderQty,
    forecastCalc?.safetyStockCalc.safetyStock,
    clientStock.safetyExpectedOpProfit,
    clientStock.safetyExpectedOrderAmount,
    clientStock.safetyExpectedSalesAmount,
    clientStock.safetyRecQty,
    clientStock.safetyStock,
  ])

  const currentStockBySize = useMemo(
    () => forecastCalc?.display.currentStockQtyBySize ?? [],
    [forecastCalc],
  )
  const expectedInboundBySize = useMemo(
    () => forecastCalc?.display.expectedInboundOrderBalanceBySize ?? [],
    [forecastCalc],
  )

  const stockDisplayKey = useMemo(() => {
    const d = forecastCalc?.display
    if (!d) return ''
    return [
      d.currentStockQtyTotal,
      d.totalOrderBalanceTotal,
      d.expectedInboundOrderBalanceTotal,
      ...d.currentStockQtyBySize,
      ...d.totalOrderBalanceBySize,
      ...d.expectedInboundOrderBalanceBySize,
    ].join('|')
  }, [forecastCalc])

  /** 스냅샷에 저장된 사이즈별 확정 수량. live 모드에서는 baseline으로 쓰지 않는다. */
  const savedSnapshotConfirmBySize = useMemo((): Record<string, number> => {
    if (prefillFromSnapshot == null) return {}
    return Object.fromEntries(
      prefillFromSnapshot.drawer2.sizeRows.map((row) => [row.size, row.confirmQty]),
    )
  }, [prefillFromSnapshot])

  const orderDraft = useMemo(
    () => new SecondaryOrderDraft({
      mode: snapshotInfoMode ? 'snapshot' : 'live',
      manualConfirmBySize: confirmBySize,
      snapshotConfirmBySize: savedSnapshotConfirmBySize,
    }),
    [confirmBySize, savedSnapshotConfirmBySize, snapshotInfoMode],
  )

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) setConfirmBySize({})
    })
    return () => {
      alive = false
    }
  }, [primary.skuGroupKey, prefillFromSnapshot])

  useEffect(() => {
    if (snapshotInfoMode) return
    let alive = true
    queueMicrotask(() => {
      if (alive) setConfirmBySize({})
    })
    return () => {
      alive = false
    }
  }, [
    snapshotInfoMode,
    bufferStock,
    dailyMeanClient,
    leadTimeEndDate,
    leadTimeStartDate,
    manualSafetyStock,
    safetyStockMode,
    selectedEnd,
    selectedStart,
    selfWeightPct,
    serviceLevelPct,
    stockDisplayKey,
  ])

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

  const sizeAgg = useMemo(
    () => buildSecondarySizeShares(primary, secondary, selfWeightPct),
    [primary, secondary, selfWeightPct],
  )

  const sizeRows = useMemo(() => {
    const dailyMeanEa = dailyMeanClient ?? forecastCalc?.dailyMean ?? clientStock.forecastMuRaw
    return buildSecondarySizeOrderRows({
      shares: sizeAgg,
      dailyMeanEa,
      forecastSalesHorizonDays,
      currentStockBySize,
      expectedInboundBySize,
      bufferStock,
      orderDraft,
    })
  }, [
    sizeAgg,
    clientStock.forecastMuRaw,
    dailyMeanClient,
    forecastCalc?.dailyMean,
    forecastSalesHorizonDays,
    currentStockBySize,
    expectedInboundBySize,
    bufferStock,
    orderDraft,
  ])

  /** 사용자가 덮어쓴 사이즈만 확정 셀 강조 */
  const manualConfirmDerived = useMemo(() => orderDraft.manualFlags(), [orderDraft])

  const {
    dailyTrendSeries,
    dailyTrendError,
    dailyPeriodShade,
    dailyForecastShade,
    dailyTickIndices,
  } = useSecondaryDailyTrend({
    skuGroupKey: primary.skuGroupKey,
    selectedStart,
    selectedEnd,
    leadTimeDays,
    competitorChannelId: channel.id,
    makeApiErrorInfo,
  })

  /** 일간 판매추이 사이즈 선택 — API는 상품 합계만 주고, 비중으로 스케일 */
  const dailyTrendSizeOptions = useMemo(() => buildDailyTrendSizeOptions(primary.sizeMix), [primary.sizeMix])

  const buildSnapshot = useCallback((): OrderSnapshotDocumentV1 => buildSecondaryOrderSnapshot({
    primary,
    secondary,
    periodStart: viewPeriodStart,
    periodEnd: viewPeriodEnd,
    forecastMonths,
    selectedStart,
    leadTimeDays,
    competitorChannelId: channel.id,
    competitorChannelLabel: channel.label,
    selfCol,
    compCol,
    forecastInputs,
    forecastDerived,
    selfWeightPct,
    bufferStock,
    aiPrompt,
    aiComment,
    unitPrice: unitPriceInput,
    unitCost: unitCostInput,
    expectedFeeRatePct,
    sizeRows,
  }), [
    primary,
    viewPeriodStart,
    viewPeriodEnd,
    forecastMonths,
    secondary,
    channel.id,
    channel.label,
    selfCol,
    compCol,
    forecastInputs,
    forecastDerived,
    aiPrompt,
    aiComment,
    selfWeightPct,
    bufferStock,
    unitPriceInput,
    unitCostInput,
    expectedFeeRatePct,
    sizeRows,
    selectedStart,
    leadTimeDays,
  ])

  const candidateActions = useSecondaryCandidateActions({
    skuGroupKey: primary.skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
    hasSavedSnapshot,
    candidateItemContext,
    buildSnapshot,
    showToast,
  })
  const handleConfirmQtyChange = useCallback((size: string, next: number, recommendedQty: number) => {
    setConfirmBySize((prev) => new SecondaryOrderDraft({
      mode: snapshotInfoMode ? 'snapshot' : 'live',
      manualConfirmBySize: prev,
      snapshotConfirmBySize: savedSnapshotConfirmBySize,
    }).nextManualConfirmBySize(size, next, recommendedQty))
  }, [savedSnapshotConfirmBySize, snapshotInfoMode])

  const recommendedQtyTotal = useMemo(
    () => sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.recommendedQty)), 0),
    [sizeRows],
  )
  const confirmedQtyTotal = useMemo(
    () => sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.confirmQty)), 0),
    [sizeRows],
  )
  const perUnitFee = Math.round((unitPriceInput * expectedFeeRatePct) / 100)
  const perUnitOpMargin = unitPriceInput - unitCostInput - perUnitFee
  /** 예상 열 금액·이익은 추천 수량 합 × 카드 입력 단가·원가·수수료와 동일 규칙 */
  const forecastExpectedSalesFromRec = recommendedQtyTotal * unitPriceInput
  const forecastOpProfitFromRec = recommendedQtyTotal * perUnitOpMargin
  const confirmedExpectedSales = confirmedQtyTotal * unitPriceInput
  const confirmedExpectedOpProfit = confirmedQtyTotal * perUnitOpMargin

  const getHelpTooltipId = (id: SecondaryHelpId) => {
    switch (id) {
      case 'confirmOrder':
        return confirmOrderHelpId
      case 'forecastQtyCalc':
        return forecastQtyCalcHelpId
      case 'expectedOpProfitRate':
        return expectedOpProfitRateHelpId
      case 'totalOrderBalance':
        return totalOrderBalanceHelpId
      case 'expectedInboundOrderBalance':
        return expectedInboundOrderBalanceHelpId
      case 'sizeRecQty':
        return sizeRecQtyHelpId
      case 'salesForecastSizeOrder':
        return salesForecastSizeOrderHelpId
    }
  }

  const aiCommentCard = (
    <ComponentErrorBoundary page={pageName} unit="AiCommentCard">
      <AiCommentCard comment={aiComment} />
    </ComponentErrorBoundary>
  )
  const sizeOrderCard = (
    <ComponentErrorBoundary page={pageName} unit="SizeOrderCard">
      <SizeOrderCard
        sizeOrder={{
          channelLabel: channel.label,
          selfWeightPct,
          sizeRows,
          totalOrderBalanceHelpId,
          expectedInboundOrderBalanceHelpId,
          sizeRecQtyHelpId,
          salesForecastHelpId: salesForecastSizeOrderHelpId,
          currentStockQty: forecastCalc?.display.currentStockQtyTotal ?? 0,
          totalOrderBalanceQty: forecastCalc?.display.totalOrderBalanceTotal ?? 0,
          expectedInboundOrderBalanceQty: forecastCalc?.display.expectedInboundOrderBalanceTotal ?? 0,
          currentStockQtyBySize: forecastCalc?.display.currentStockQtyBySize ?? [],
          totalOrderBalanceBySize: forecastCalc?.display.totalOrderBalanceBySize ?? [],
          expectedInboundOrderBalanceBySize: forecastCalc?.display.expectedInboundOrderBalanceBySize ?? [],
          manualConfirmBySize: manualConfirmDerived,
        }}
        actions={{
          onSelfWeightPctChange: setSelfWeightPct,
          onConfirmQtyChange: handleConfirmQtyChange,
        }}
        help={portalHelp}
      />
    </ComponentErrorBoundary>
  )
  const liveCandidateCompactMode = candidateItemContext != null && !snapshotInfoMode

  return (
    <div className={styles.panel}>
      <div className={styles.metaFilterRow}>
        <div className={styles.metaFilterMetaBlock}>
          <ComponentErrorBoundary page={pageName} unit="ProductMetaCard">
            <ProductMetaCard primary={primary} />
          </ComponentErrorBoundary>
        </div>
        <div className={styles.metaFilterActionBlock}>
          <div className={`${styles.card} ${styles.metaFilterActionCard}`}>
            <div className={styles.metaFilterActionGrid}>
              {candidateItemContext != null ? (
                <InnerCandidateActionCard
                  context={candidateItemContext}
                  loading={candidateActions.loading}
                  saveLabel={hasSavedSnapshot ? '수정' : '저장'}
                  hasSnapshot={hasSavedSnapshot}
                  showSnapshotInfo={showSnapshotInfo}
                  onShowSnapshotInfoChange={setShowSnapshotInfo}
                  onSave={candidateActions.saveCandidateItemChanges}
                />
              ) : (
                <CandidateStashOrderActionCard
                  selectedTitle={candidateActions.selectedCandidate?.name ?? '-'}
                  selectedSub={
                    candidateActions.selectedCandidate?.dbCreatedAt
                      ? formatDateTimeMinute(candidateActions.selectedCandidate.dbCreatedAt)
                      : '-'
                  }
                  loading={candidateActions.loading}
                  confirmDisabled={candidateActions.selectedCandidate == null}
                  onOpenStashPicker={candidateActions.openPicker}
                  onConfirmOrder={candidateActions.confirmOrder}
                  portalHelp={portalHelp}
                  confirmOrderHelpId={confirmOrderHelpId}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {liveCandidateCompactMode ? (
        <div className={styles.salesStockAiRow}>
          {aiCommentCard}
          {sizeOrderCard}
        </div>
      ) : (
        <>
          <div className={styles.salesStockAiRow}>
            <ComponentErrorBoundary page={pageName} unit="SalesForecastCard">
              <SalesForecastCard
                forecast={{
                  inputs: forecastInputs,
                  error: salesInsightError ?? forecastCalcError,
                  computed: {
                    recommendedOrderQtyTotal: recommendedQtyTotal,
                    confirmedOrderQtyTotal: confirmedQtyTotal,
                    forecastExpectedSales: forecastExpectedSalesFromRec,
                    forecastOpProfit: forecastOpProfitFromRec,
                    confirmedExpectedSales,
                    confirmedOpProfit: confirmedExpectedOpProfit,
                  },
                }}
                orderSettings={{
                  currentOrderDate: leadTimeStartDate,
                  nextOrderDate: leadTimeEndDate,
                  minOrderDate,
                  bufferStock,
                  unitCost: unitCostInput,
                  unitPrice: unitPriceInput,
                  expectedFeeRatePct,
                }}
                actions={{
                  onCurrentOrderDateChange: (next) => {
                    const v = next < minOrderDate ? minOrderDate : next
                    setLeadTimeStartDate(v)
                    setLeadTimeEndDate((e) => (e < v ? v : e))
                  },
                  onNextOrderDateChange: (next) => {
                    let v = next < minOrderDate ? minOrderDate : next
                    if (v < leadTimeStartDate) v = leadTimeStartDate
                    setLeadTimeEndDate(v)
                  },
                  onBufferStockChange: setBufferStock,
                  onUnitCostChange: setUnitCostInput,
                  onUnitPriceChange: setUnitPriceInput,
                  onExpectedFeeRatePctChange: setExpectedFeeRatePct,
                }}
                help={{
                  labelIds: {
                    forecastQtyCalc: forecastQtyCalcHelpId,
                    expectedOpProfitRate: expectedOpProfitRateHelpId,
                  },
                  portal: portalHelp,
                }}
              />
            </ComponentErrorBoundary>
            {aiCommentCard}
          </div>

          <ComponentErrorBoundary page={pageName} unit="SalesTrendDailyCard">
            <SalesTrendDailyCard
              skuGroupKey={primary.skuGroupKey}
              competitorChannelLabel={channel.label}
              sizeOptions={dailyTrendSizeOptions}
              trend={{
                series: dailyTrendSeries,
                tickIndices: dailyTickIndices,
                periodShade: dailyPeriodShade,
                forecastShade: dailyForecastShade,
                error: dailyTrendError,
              }}
            />
          </ComponentErrorBoundary>

          {sizeOrderCard}
        </>
      )}
      <PortalHelpPopoverLayer
        help={portalHelp}
        popoverClassName={commonStyles.helpPopoverPortal}
        getTooltipId={getHelpTooltipId}
      >
        {(hid) => (
          <>
            {hid === 'confirmOrder' && (
              <p>{KO.hintSnapshot}</p>
            )}
            {hid === 'forecastQtyCalc' && (
              <p>{KO.helpForecastQtyCalc}</p>
            )}
            {hid === 'expectedOpProfitRate' && (
              <BlockMath math={KO.helpExpectedOpProfitRateLatex} />
            )}
            {hid === 'totalOrderBalance' && (
              <p>{KO.helpTotalOrderBalance}</p>
            )}
            {hid === 'expectedInboundOrderBalance' && (
              <p>{KO.helpExpectedInboundOrderBalance}</p>
            )}
            {hid === 'sizeRecQty' && (
              <p>{KO.helpSizeRecQty}</p>
            )}
            {hid === 'salesForecastSizeOrder' && (
              <p>{KO.helpSalesForecastSizeOrder}</p>
            )}
          </>
        )}
      </PortalHelpPopoverLayer>
      {candidateActions.listOpen && (
        <CandidateStashPickerModal
          options={candidateActions.stashes}
          selectedUuid={candidateActions.selectedCandidate?.uuid ?? null}
          nameInput={candidateActions.nameInput}
          noteInput={candidateActions.noteInput}
          loading={candidateActions.loading}
          onNameInputChange={candidateActions.setNameInput}
          onNoteInputChange={candidateActions.setNoteInput}
          onCreate={candidateActions.createCandidate}
          onClose={() => candidateActions.setListOpen(false)}
          onSelect={candidateActions.selectCandidate}
        />
      )}
    </div>
  )
}
