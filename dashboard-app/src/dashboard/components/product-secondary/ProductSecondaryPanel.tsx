import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dashboardApi, type ProductStockTrendPoint, type SecondaryCompetitorChannel } from '../../../api'
import { ComponentErrorBoundary } from '../../../components/ComponentErrorBoundary'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import { daysFromTodayThroughInclusive, daysInclusiveBetween } from '../../../utils/date'
import { PortalHelpPopoverLayer } from '../PortalHelpPopover'
import commonStyles from '../common.module.css'
import { buildShadeRanges, normalizeMonthKey } from '../trend/trendRangeUtils'
import { usePortalHelpPopover } from '../usePortalHelpPopover'
import { AiMockCard } from './cards/AiMockCard'
import { ProductFilterCard } from './cards/ProductFilterCard'
import { ProductMetaCard } from './cards/ProductMetaCard'
import { SalesForecastCard } from './cards/SalesForecastCard'
import { SalesMetricsCard } from './cards/SalesMetricsCard'
import { SalesTrendDailyCard } from './cards/SalesTrendDailyCard'
import { SizeOrderCard } from './cards/SizeOrderCard'
import { computeClientStockOrder } from './model/clientStockOrderCompute'
import { KO } from './ko'
import { buildSalesKpiColumn, mergePrimarySecondarySizeMix } from './model/secondaryPanelCalc'
import styles from './productSecondaryPanel.module.css'
import type {
  SecondaryForecastCalc,
  SecondaryForecastDerived,
  SecondaryForecastInputs,
  SecondaryHelpId,
} from './secondaryPanelTypes'
import { ORDER_SNAPSHOT_SCHEMA_VERSION, type OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'

type Props = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
  /** 오더 스냅샷용: 1차 드로워 재고 시계열 */
  stockTrend: ProductStockTrendPoint[]
  /** 오더 스냅샷용: 월간 포캐스트 개월 수 */
  forecastMonths: number
  pageName?: string
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildDefaultLeadTimeDates() {
  const today = new Date()
  const start = toIsoDateLocal(today)
  const endDate = new Date(today)
  endDate.setMonth(endDate.getMonth() + 3)
  const end = toIsoDateLocal(endDate)
  return { start, end }
}

export function ProductSecondaryPanel({
  primary,
  secondary,
  periodStart,
  periodEnd,
  stockTrend,
  forecastMonths,
  pageName = 'ProductSecondaryPanel',
}: Props) {
  const defaultLeadTime = useMemo(() => buildDefaultLeadTimeDates(), [])
  const confirmOrderHelpId = useId()
  const forecastQtyCalcHelpId = useId()
  const totalOrderBalanceHelpId = useId()
  const expectedInboundOrderBalanceHelpId = useId()
  const sizeRecQtyHelpId = useId()
  const salesForecastSizeOrderHelpId = useId()
  const snapshotTestTitleId = useId()
  const portalHelp = usePortalHelpPopover<SecondaryHelpId>()
  const [competitorChannels, setCompetitorChannels] = useState<SecondaryCompetitorChannel[]>([])
  const [channelId, setChannelId] = useState('')
  const [safetyStockMode] = useState<'manual' | 'formula'>('formula')
  const [manualSafetyStock] = useState(0)
  /** null: 예측 수량연산용 μ는 클라이언트 가중모형값. 숫자면 해당 값으로 덮어씀. */
  const [dailyMeanClient, setDailyMeanClient] = useState<number | null>(null)
  const [serviceLevelPct] = useState(95)
  const [leadTimeStartDate, setLeadTimeStartDate] = useState(defaultLeadTime.start)
  const [leadTimeEndDate, setLeadTimeEndDate] = useState(defaultLeadTime.end)
  const [bufferStock, setBufferStock] = useState(0)
  const [unitCostInput, setUnitCostInput] = useState(Math.max(0, Math.round(primary.price * 0.78)))
  const [unitPriceInput, setUnitPriceInput] = useState(Math.max(0, Math.round(primary.price)))
  const [expectedFeeRatePct, setExpectedFeeRatePct] = useState(13)
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmAnswer, setLlmAnswer] = useState('')
  const [llmLoading, setLlmLoading] = useState(false)
  const [selfWeightPct, setSelfWeightPct] = useState(50)
  /** 사이즈별 오더 표의 판매 예측에 사용할 지표(판매 예측 표 헤더 라디오와 동기화). */
  const [sizeForecastSource] = useState<'forecastQty'>('forecastQty')
  const [confirmBySize, setConfirmBySize] = useState<Record<string, number>>({})
  const dailyTrendReqSeqRef = useRef(0)
  const [forecastCalc, setForecastCalc] = useState<SecondaryForecastCalc | null>(null)
  const [channelsError, setChannelsError] = useState<ApiUnitErrorInfo | null>(null)
  const [forecastCalcError, setForecastCalcError] = useState<ApiUnitErrorInfo | null>(null)
  const [dailyTrendError, setDailyTrendError] = useState<ApiUnitErrorInfo | null>(null)
  const [llmError, setLlmError] = useState<ApiUnitErrorInfo | null>(null)
  /** [테스트] 오더 확정 시 저장 페이로드 JSON 미리보기 */
  const [testSnapshotJson, setTestSnapshotJson] = useState<string | null>(null)

  useEffect(() => {
    if (testSnapshotJson == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTestSnapshotJson(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [testSnapshotJson])

  const makeApiErrorInfo = useCallback((request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: new Date().toISOString(),
    page: pageName,
    request,
    error: err instanceof Error ? err.message : String(err),
  }), [pageName])

  const minOrderDate = toIsoDateLocal(new Date())

  const channel = useMemo<SecondaryCompetitorChannel>(
    () =>
      competitorChannels.find((ch) => ch.id === channelId)
      ?? competitorChannels[0]
      ?? { id: '', label: '경쟁사', priceSkew: 1, qtySkew: 1 },
    [channelId, competitorChannels],
  )

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const rows = await dashboardApi.getSecondaryCompetitorChannels()
        if (!alive) return
        if (!rows.length) throw new Error('경쟁사 채널 데이터가 비어 있습니다.')
        setCompetitorChannels(rows)
        setChannelId((prev) => prev || rows[0]?.id || '')
        setChannelsError(null)
      } catch (err) {
        if (!alive) return
        setCompetitorChannels([])
        setChannelsError(makeApiErrorInfo('getSecondaryCompetitorChannels()', err))
      }
    })()
    return () => {
      alive = false
    }
  }, [makeApiErrorInfo])

  const selfCol = useMemo(() => buildSalesKpiColumn('self', primary, secondary, channel), [primary, secondary, channel])
  const compCol = useMemo(() => buildSalesKpiColumn('competitor', primary, secondary, channel), [primary, secondary, channel])

  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)

  useEffect(() => {
    setDailyMeanClient(null)
  }, [primary.id, selectedEnd, selectedStart])

  useEffect(() => {
    setUnitCostInput(Math.max(0, Math.round(selfCol.avgCost)))
    setUnitPriceInput(Math.max(0, Math.round(selfCol.avgPrice)))
    setExpectedFeeRatePct(Math.max(0, Math.round(selfCol.feeRatePct * 10) / 10))
  }, [primary.id, selfCol.avgCost, selfCol.avgPrice, selfCol.feeRatePct])

  useEffect(() => {
    setLeadTimeStartDate((s) => (s < minOrderDate ? minOrderDate : s))
  }, [minOrderDate, primary.id])

  useEffect(() => {
    setLeadTimeEndDate((e) => (e < leadTimeStartDate ? leadTimeStartDate : e))
  }, [leadTimeStartDate])

  const leadTimeDays = useMemo(
    () => daysInclusiveBetween(leadTimeStartDate, leadTimeEndDate),
    [leadTimeEndDate, leadTimeStartDate],
  )

  /** 오늘 ~ 금번 오더 입고일(리드타임 시작일) 양끝 포함 일수(과거 입고일이면 0). */
  const daysUntilCurrentOrderInbound = useMemo(
    () => daysFromTodayThroughInclusive(leadTimeStartDate),
    [leadTimeStartDate],
  )

  /** 사이즈별 판매예측(EA) 구간 일수: 오늘~금번 오더 입고일(양끝 포함). 차기 입고일은 쓰지 않음. */
  const forecastSalesHorizonDays = daysUntilCurrentOrderInbound

  const clientStock = useMemo(
    () =>
      computeClientStockOrder({
        monthlySalesTrend: primary.monthlySalesTrend,
        periodStart: selectedStart,
        periodEnd: selectedEnd,
        serviceLevelPct,
        leadTimeDays,
        safetyStockMode,
        manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
        dailyMeanClient,
        availableStock: primary.availableStock,
        price: primary.price,
      }),
    [
      primary.monthlySalesTrend,
      primary.availableStock,
      primary.price,
      selectedStart,
      selectedEnd,
      serviceLevelPct,
      leadTimeDays,
      safetyStockMode,
      manualSafetyStock,
      dailyMeanClient,
    ],
  )

  const forecastInputs: SecondaryForecastInputs = {
    trendDailyMean: clientStock.trendDailyMean,
    dailyMean: dailyMeanClient ?? clientStock.forecastDailyMean,
    sigma: clientStock.sigma,
    serviceLevelPct,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
  }
  const forecastDerived: SecondaryForecastDerived = {
    safetyStock: clientStock.safetyStock,
    recommendedOrderQty: clientStock.safetyRecQty,
    expectedOrderAmount: clientStock.safetyExpectedOrderAmount,
    expectedSalesAmount: clientStock.safetyExpectedSalesAmount,
    expectedOpProfit: clientStock.safetyExpectedOpProfit,
  }

  const currentStockBySize = forecastCalc?.display.currentStockQtyBySize ?? []
  const expectedInboundBySize = forecastCalc?.display.expectedInboundOrderBalanceBySize ?? []

  /** 재고·오더잔량 등 `display`만 사용. 판매예측·추천수량·표 금액은 `clientStock` 연산. */
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const params = {
          productId: primary.id,
          periodStart: selectedStart,
          periodEnd: selectedEnd,
          serviceLevelPct,
          leadTimeDays,
          safetyStockMode,
          manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
          ...(dailyMeanClient != null ? { dailyMean: dailyMeanClient } : {}),
        }
        const result = await dashboardApi.getSecondaryStockOrderCalc(params)
        if (!alive) return
        setForecastCalc(result)
        setForecastCalcError(null)
      } catch (err) {
        if (!alive) return
        setForecastCalc(null)
        setForecastCalcError(
          makeApiErrorInfo(
            `getSecondaryStockOrderCalc(${JSON.stringify({ productId: primary.id, periodStart: selectedStart, periodEnd: selectedEnd, serviceLevelPct, leadTimeDays, safetyStockMode, manualSafetyStock })})`,
            err,
          ),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [
    dailyMeanClient,
    leadTimeDays,
    makeApiErrorInfo,
    manualSafetyStock,
    primary.id,
    safetyStockMode,
    selectedEnd,
    selectedStart,
    serviceLevelPct,
  ])

  const sizeAgg = useMemo(() => {
    const mix = mergePrimarySecondarySizeMix(primary, secondary)
    const sSum = mix.reduce((a, r) => a + r.ratio, 0)
    const cSum = mix.reduce((a, r) => a + r.competitorRatio, 0)
    const wSelf = selfWeightPct / 100
    const wComp = 1 - wSelf
    const raw = mix.map((r) => {
      const selfShare = sSum > 0 ? (r.ratio / sSum) * 100 : 0
      const compShare = cSum > 0 ? (r.competitorRatio / cSum) * 100 : 0
      const blended = selfShare * wSelf + compShare * wComp
      return {
        size: r.size,
        selfSharePct: selfShare,
        competitorSharePct: compShare,
        blendedRaw: blended,
        avgPrice: r.avgPrice,
      }
    })
    const blendSum = raw.reduce((a, r) => a + r.blendedRaw, 0) || 1
    return raw.map((r) => ({
      size: r.size,
      selfSharePct: r.selfSharePct,
      competitorSharePct: r.competitorSharePct,
      blendedSharePct: (r.blendedRaw / blendSum) * 100,
      avgPrice: r.avgPrice,
    }))
  }, [primary, secondary, selfWeightPct])

  const sizeRows = useMemo(() => {
    const dailyMeanEa = dailyMeanClient ?? clientStock.forecastMuRaw
    const totalQtyWindow = dailyMeanEa * forecastSalesHorizonDays

    return sizeAgg.map((row, i) => {
      const forecastQty = Math.ceil((totalQtyWindow * row.blendedSharePct) / 100)
      /** 여유재고는 일수(일분) — EA로 환산: 일평균 기대 × 일수 × 사이즈비중, 판매예측과 동일하게 ceil */
      const bufferQtyEa = Math.ceil((dailyMeanEa * bufferStock * row.blendedSharePct) / 100)
      const stock = currentStockBySize[i] ?? 0
      const inbound = expectedInboundBySize[i] ?? 0
      const recommendedQty = Math.max(0, Math.round(forecastQty - stock - inbound + bufferQtyEa))
      const confirmQty = confirmBySize[row.size] ?? recommendedQty
      return { ...row, forecastQty, recommendedQty, confirmQty }
    })
  }, [
    sizeAgg,
    clientStock.trendMuRaw,
    clientStock.forecastMuRaw,
    dailyMeanClient,
    forecastSalesHorizonDays,
    currentStockBySize,
    expectedInboundBySize,
    bufferStock,
    confirmBySize,
  ])

  const [dailyTrendSeries, setDailyTrendSeries] = useState<Array<{
    idx: number
    date: string
    month: string
    sales: number
    stockBar: number
    inboundAccumBar: number
    selfSalesNorm: number | null
    competitorSalesNorm: number | null
    isForecast: boolean
  }>>([])

  useEffect(() => {
    const reqSeq = dailyTrendReqSeqRef.current + 1
    dailyTrendReqSeqRef.current = reqSeq
    void (async () => {
      try {
        const params = {
          productId: primary.id,
          startMonth: selectedStart,
          leadTimeDays,
        }
        const series = await dashboardApi.getSecondaryDailyTrend(params)
        if (dailyTrendReqSeqRef.current !== reqSeq) return
        if (!series.length) throw new Error('일별 판매추이 데이터가 비어 있습니다.')
        setDailyTrendSeries(series)
        setDailyTrendError(null)
      } catch (err) {
        if (dailyTrendReqSeqRef.current !== reqSeq) return
        setDailyTrendSeries([])
        setDailyTrendError(
          makeApiErrorInfo(
            `getSecondaryDailyTrend(${JSON.stringify({ productId: primary.id, startMonth: selectedStart, leadTimeDays })})`,
            err,
          ),
        )
      }
    })()
  }, [leadTimeDays, makeApiErrorInfo, selectedStart, primary.id])

  const { periodShade: dailyPeriodShade, forecastShade: dailyForecastShade } = useMemo(
    () => buildShadeRanges(
      dailyTrendSeries.map((p) => ({ date: p.month, isForecast: p.isForecast })),
      selectedStart,
      selectedEnd,
    ),
    [dailyTrendSeries, selectedEnd, selectedStart],
  )

  const dailyTickIndices = useMemo(() => {
    const n = dailyTrendSeries.length
    if (n === 0) return [] as number[]
    const targetTicks = 26
    const step = Math.max(1, Math.ceil(n / targetTicks))
    const ticks: number[] = []
    for (let i = 0; i < n; i += step) ticks.push(dailyTrendSeries[i]!.idx)
    const last = dailyTrendSeries[n - 1]!.idx
    if (ticks[ticks.length - 1] !== last) ticks.push(last)
    return ticks
  }, [dailyTrendSeries])

  /** 일간 판매추이 사이즈 선택 — API는 상품 합계만 주고, 비중으로 스케일 */
  const dailyTrendSizeOptions = useMemo(() => {
    const mix = primary.sizeMix
    if (!mix.length) return []
    const sum = mix.reduce((a, r) => a + r.ratio, 0) || 1
    return mix.map((r) => ({
      id: r.size,
      label: r.size,
      share: r.ratio / sum,
    }))
  }, [primary.sizeMix])

  const sendLlm = useCallback(async () => {
    setLlmLoading(true)
    try {
      const ans = await dashboardApi.getSecondaryLlmAnswer({ productId: primary.id, prompt: llmPrompt })
      setLlmAnswer(ans)
      setLlmError(null)
    } catch (err) {
      setLlmError(
        makeApiErrorInfo(
          `getSecondaryLlmAnswer(${JSON.stringify({ productId: primary.id, prompt: llmPrompt })})`,
          err,
        ),
      )
    } finally {
      setLlmLoading(false)
    }
  }, [llmPrompt, makeApiErrorInfo, primary.id])

  const confirmOrder = useCallback(() => {
    const snap: OrderSnapshotDocumentV1 = {
      schemaVersion: ORDER_SNAPSHOT_SCHEMA_VERSION,
      productId: primary.id,
      savedAt: new Date().toISOString(),
      context: {
        periodStart,
        periodEnd,
        forecastMonths,
      },
      drawer1: {
        summary: primary,
        stockTrend,
      },
      drawer2: {
        secondary,
        competitorChannelId: channelId,
        competitorChannelLabel: channel.label,
        minOpMarginPct: null,
        salesSelf: selfCol,
        salesCompetitor: compCol,
        stockInputs: forecastInputs,
        stockDerived: forecastDerived,
        selfWeightPct,
        sizeForecastSource,
        bufferStock,
        llmPrompt,
        llmAnswer,
        sizeRows: sizeRows.map((r) => ({
          size: r.size,
          selfSharePct: r.selfSharePct,
          competitorSharePct: r.competitorSharePct,
          blendedSharePct: r.blendedSharePct,
          forecastQty: r.forecastQty,
          recommendedQty: r.recommendedQty,
          confirmQty: r.confirmQty,
        })),
      },
      dailyTrend: {
        params: {
          startMonth: selectedStart,
          leadTimeDays,
        },
        series: dailyTrendSeries,
      },
    }
    void dashboardApi.saveSecondaryOrderSnapshot(snap)
    setTestSnapshotJson(JSON.stringify(snap, null, 2))
  }, [
    primary,
    stockTrend,
    periodStart,
    periodEnd,
    forecastMonths,
    secondary,
    channelId,
    channel.label,
    selfCol,
    compCol,
    forecastInputs,
    forecastDerived,
    llmPrompt,
    llmAnswer,
    selfWeightPct,
    sizeForecastSource,
    bufferStock,
    sizeRows,
    selectedStart,
    leadTimeDays,
    dailyTrendSeries,
  ])

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

  return (
    <div className={styles.panel}>
      <div className={styles.metaFilterRow}>
        <ComponentErrorBoundary page={pageName} unit="ProductMetaCard">
          <ProductMetaCard primary={primary} />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="ProductFilterCard">
          <ProductFilterCard
            filter={{
              channelId,
              competitorChannels,
              error: channelsError,
            }}
            actions={{
              onChannelChange: setChannelId,
            }}
          />
        </ComponentErrorBoundary>
      </div>

      <div className={styles.salesStockAiRow}>
        <ComponentErrorBoundary page={pageName} unit="SalesMetricsCard">
          <SalesMetricsCard
            sales={{
              channelLabel: channel.label,
              self: selfCol,
              competitor: compCol,
            }}
          />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="SalesForecastCard">
          <SalesForecastCard
            forecast={{
              inputs: forecastInputs,
              error: forecastCalcError,
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
              },
              portal: portalHelp,
            }}
          />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="AiMockCard">
          <AiMockCard
            ai={{
              prompt: llmPrompt,
              answer: llmAnswer,
              loading: llmLoading,
              error: llmError,
            }}
            actions={{
              onPromptChange: setLlmPrompt,
              onSend: sendLlm,
            }}
          />
        </ComponentErrorBoundary>
      </div>

      <ComponentErrorBoundary page={pageName} unit="SalesTrendDailyCard">
        <SalesTrendDailyCard
          productId={primary.id}
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

      <ComponentErrorBoundary page={pageName} unit="SizeOrderCard">
        <SizeOrderCard
          sizeOrder={{
            channelLabel: channel.label,
            selfWeightPct,
            sizeRows,
            confirmOrderHelpId,
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
          }}
          actions={{
            onSelfWeightPctChange: setSelfWeightPct,
            onConfirmQtyChange: (size, next) => setConfirmBySize((prev) => ({
              ...prev,
              [size]: Math.max(0, Math.round(next || 0)),
            })),
            onApplyRecommended: setConfirmBySize,
            onConfirmOrder: confirmOrder,
          }}
          help={portalHelp}
        />
      </ComponentErrorBoundary>
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
      {testSnapshotJson != null &&
        createPortal(
          <div
            className={styles.snapshotTestBackdrop}
            role="presentation"
            onClick={() => setTestSnapshotJson(null)}
          >
            <div
              className={styles.snapshotTestDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby={snapshotTestTitleId}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.snapshotTestBadgeRow}>
                <span className={styles.snapshotTestBadge}>{KO.snapshotTestBadge}</span>
                <span className={styles.snapshotTestNote}>{KO.snapshotTestNote}</span>
              </div>
              <h4 id={snapshotTestTitleId} className={styles.snapshotTestTitle}>
                {KO.snapshotTestTitle}
              </h4>
              <pre className={styles.snapshotTestPre}>{testSnapshotJson}</pre>
              <div className={styles.snapshotTestActions}>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => setTestSnapshotJson(null)}
                >
                  {KO.btnSnapshotTestOk}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
