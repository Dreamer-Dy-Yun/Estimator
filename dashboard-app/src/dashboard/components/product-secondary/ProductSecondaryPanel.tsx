import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { dashboardApi, type SecondaryCompetitorChannel } from '../../../api'
import { ComponentErrorBoundary } from '../../../components/ComponentErrorBoundary'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import { daysInclusiveBetween } from '../../../utils/date'
import { pct } from '../../../utils/format'
import { PortalHelpPopoverLayer } from '../PortalHelpPopover'
import commonStyles from '../common.module.css'
import { buildShadeRanges, normalizeMonthKey } from '../trendRangeUtils'
import { usePortalHelpPopover } from '../usePortalHelpPopover'
import { AiMockCard } from './cards/AiMockCard'
import { ProductFilterCard } from './cards/ProductFilterCard'
import { ProductMetaCard } from './cards/ProductMetaCard'
import { SalesForecastCard } from './cards/SalesForecastCard'
import { SalesMetricsCard } from './cards/SalesMetricsCard'
import { SalesTrendDailyCard } from './cards/SalesTrendDailyCard'
import { SizeOrderCard } from './cards/SizeOrderCard'
import { KO } from './ko'
import { buildSalesKpiColumn, mergePrimarySecondarySizeMix } from './secondaryPanelCalc'
import styles from './productSecondaryPanel.module.css'
import type {
  SecondaryForecastCalc,
  SecondaryForecastDerived,
  SecondaryForecastInputs,
  SecondaryHelpId,
  SecondaryOrderSnapshot,
} from './secondaryPanelTypes'

type Props = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
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

export function ProductSecondaryPanel({ primary, secondary, periodStart, periodEnd, pageName = 'ProductSecondaryPanel' }: Props) {
  const defaultLeadTime = useMemo(() => buildDefaultLeadTimeDates(), [])
  const confirmOrderHelpId = useId()
  const forecastQtyCalcHelpId = useId()
  const totalOrderBalanceHelpId = useId()
  const expectedInboundOrderBalanceHelpId = useId()
  const sizeRecQtyHelpId = useId()
  const periodMeanColumnHelpId = useId()
  const portalHelp = usePortalHelpPopover<SecondaryHelpId>()
  const [competitorChannels, setCompetitorChannels] = useState<SecondaryCompetitorChannel[]>([])
  const [channelId, setChannelId] = useState('')
  const [minOpMarginPct, setMinOpMarginPct] = useState(0)
  const [safetyStockMode, setSafetyStockMode] = useState<'manual' | 'formula'>('formula')
  const [manualSafetyStock, setManualSafetyStock] = useState(0)
  /** null: API(목) 트렌드 μ 사용. 숫자: 백업 UI에서 지정한 μ로 재요청 */
  const [dailyMeanClient, setDailyMeanClient] = useState<number | null>(null)
  const [serviceLevelPct, setServiceLevelPct] = useState(95)
  const [leadTimeStartDate, setLeadTimeStartDate] = useState(defaultLeadTime.start)
  const [leadTimeEndDate, setLeadTimeEndDate] = useState(defaultLeadTime.end)
  const [bufferStock, setBufferStock] = useState(0)
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmAnswer, setLlmAnswer] = useState('')
  const [llmLoading, setLlmLoading] = useState(false)
  const [selfWeightPct, setSelfWeightPct] = useState(50)
  const [confirmBySize, setConfirmBySize] = useState<Record<string, number>>({})
  const dailyTrendReqSeqRef = useRef(0)
  const [forecastCalc, setForecastCalc] = useState<SecondaryForecastCalc | null>(null)
  const [channelsError, setChannelsError] = useState<ApiUnitErrorInfo | null>(null)
  const [forecastCalcError, setForecastCalcError] = useState<ApiUnitErrorInfo | null>(null)
  const [dailyTrendError, setDailyTrendError] = useState<ApiUnitErrorInfo | null>(null)
  const [llmError, setLlmError] = useState<ApiUnitErrorInfo | null>(null)

  const makeApiErrorInfo = useCallback((request: string, err: unknown): ApiUnitErrorInfo => ({
    checkedAt: new Date().toISOString(),
    page: pageName,
    request,
    error: err instanceof Error ? err.message : String(err),
  }), [pageName])

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

  const filterOk = selfCol.opMarginRatePct >= minOpMarginPct

  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)

  useEffect(() => {
    setDailyMeanClient(null)
  }, [primary.id, selectedEnd, selectedStart])

  const leadTimeDays = useMemo(
    () => daysInclusiveBetween(leadTimeStartDate, leadTimeEndDate),
    [leadTimeEndDate, leadTimeStartDate],
  )

  const forecastInputs: SecondaryForecastInputs = {
    trendDailyMean: forecastCalc?.trendDailyMean ?? 0,
    dailyMean: dailyMeanClient ?? forecastCalc?.dailyMean ?? 0,
    sigma: forecastCalc?.sigma ?? 0,
    serviceLevelPct,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
  }
  const forecastDerived: SecondaryForecastDerived = forecastCalc
    ? {
        safetyStock: forecastCalc.safetyStockCalc.safetyStock,
        recommendedOrderQty: forecastCalc.safetyStockCalc.recommendedOrderQty,
        expectedOrderAmount: forecastCalc.safetyStockCalc.expectedOrderAmount,
        expectedSalesAmount: forecastCalc.safetyStockCalc.expectedSalesAmount,
        expectedOpProfit: forecastCalc.safetyStockCalc.expectedOpProfit,
      }
    : {
        safetyStock: 0,
        recommendedOrderQty: 0,
        expectedOrderAmount: 0,
        expectedSalesAmount: 0,
        expectedOpProfit: 0,
      }

  const forecastOrderQtyTotal = forecastCalc?.forecastQtyCalc.recommendedOrderQty ?? 0
  const currentStockBySize = forecastCalc?.display.currentStockQtyBySize ?? []
  const expectedInboundBySize = forecastCalc?.display.expectedInboundOrderBalanceBySize ?? []

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
      return { size: r.size, selfSharePct: selfShare, competitorSharePct: compShare, blendedRaw: blended }
    })
    const blendSum = raw.reduce((a, r) => a + r.blendedRaw, 0) || 1
    return raw.map((r) => ({
      size: r.size,
      selfSharePct: r.selfSharePct,
      competitorSharePct: r.competitorSharePct,
      blendedSharePct: (r.blendedRaw / blendSum) * 100,
    }))
  }, [primary, secondary, selfWeightPct])

  const sizeRows = useMemo(() => {
    return sizeAgg.map((row, i) => {
      const forecastQty = Math.round((forecastOrderQtyTotal * row.blendedSharePct) / 100)
      const stock = currentStockBySize[i] ?? 0
      const inbound = expectedInboundBySize[i] ?? 0
      const recommendedQty = Math.max(0, Math.round(forecastQty - stock - inbound + bufferStock))
      const confirmQty = confirmBySize[row.size] ?? recommendedQty
      return { ...row, forecastQty, recommendedQty, confirmQty }
    })
  }, [sizeAgg, forecastOrderQtyTotal, currentStockBySize, expectedInboundBySize, bufferStock, confirmBySize])

  const [dailyTrendSeries, setDailyTrendSeries] = useState<Array<{
    idx: number
    date: string
    month: string
    sales: number
    stockBar: number
    inboundAccumBar: number
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

  const applyRecommended = useCallback(() => {
    const next: Record<string, number> = {}
    for (const r of sizeRows) next[r.size] = r.recommendedQty
    setConfirmBySize(next)
  }, [sizeRows])

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
    if (!filterOk) return
    const snap: SecondaryOrderSnapshot = {
      snapshotId: crypto.randomUUID(),
      productId: primary.id,
      savedAt: new Date().toISOString(),
      periodStart,
      periodEnd,
      competitorChannelId: channelId,
      minOpMarginPct,
      salesSelf: selfCol,
      salesCompetitor: compCol,
      stockInputs: forecastInputs,
      stockDerived: forecastDerived,
      llmPrompt,
      llmAnswer,
      selfWeightPct,
      sizeRows: sizeRows.map((r) => ({
        size: r.size,
        selfSharePct: r.selfSharePct,
        competitorSharePct: r.competitorSharePct,
        blendedSharePct: r.blendedSharePct,
        forecastQty: r.forecastQty,
        recommendedQty: r.recommendedQty,
        confirmQty: r.confirmQty,
      })),
    }
    void dashboardApi.saveSecondaryOrderSnapshot(snap)
  }, [
    filterOk,
    primary.id,
    periodStart,
    periodEnd,
    channelId,
    minOpMarginPct,
    selfCol,
    compCol,
    forecastInputs,
    forecastDerived,
    llmPrompt,
    llmAnswer,
    selfWeightPct,
    sizeRows,
  ])

  const warnMsg =
    `${KO.warnSelfMarginPrefix} ${pct(selfCol.opMarginRatePct)}${KO.warnSelfMarginMid}${pct(minOpMarginPct)}${KO.warnSelfMarginSuffix}`

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
      case 'stockCalcColumn':
        return periodMeanColumnHelpId
    }
  }

  return (
    <div className={styles.panel}>
      {!filterOk && (
        <div className={styles.warn}>{warnMsg}</div>
      )}
      <div className={styles.metaFilterRow}>
        <ComponentErrorBoundary page={pageName} unit="ProductMetaCard">
          <ProductMetaCard primary={primary} />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary page={pageName} unit="ProductFilterCard">
          <ProductFilterCard
            filter={{
              channelId,
              minOpMarginPct,
              competitorChannels,
              error: channelsError,
            }}
            actions={{
              onChannelChange: setChannelId,
              onMinOpMarginPctChange: setMinOpMarginPct,
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
              calc: forecastCalc,
              error: forecastCalcError,
            }}
            help={{
              labelIds: {
                periodMeanColumn: periodMeanColumnHelpId,
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
            currentOrderDate: leadTimeStartDate,
            nextOrderDate: leadTimeEndDate,
            bufferStock,
            sizeRows,
            confirmOrderHelpId,
            totalOrderBalanceHelpId,
            expectedInboundOrderBalanceHelpId,
            sizeRecQtyHelpId,
            currentStockQty: forecastCalc?.display.currentStockQtyTotal ?? 0,
            totalOrderBalanceQty: forecastCalc?.display.totalOrderBalanceTotal ?? 0,
            expectedInboundOrderBalanceQty: forecastCalc?.display.expectedInboundOrderBalanceTotal ?? 0,
            currentStockQtyBySize: forecastCalc?.display.currentStockQtyBySize ?? [],
            totalOrderBalanceBySize: forecastCalc?.display.totalOrderBalanceBySize ?? [],
            expectedInboundOrderBalanceBySize: forecastCalc?.display.expectedInboundOrderBalanceBySize ?? [],
            filterOk,
          }}
          actions={{
            onSelfWeightPctChange: setSelfWeightPct,
            onCurrentOrderDateChange: setLeadTimeStartDate,
            onNextOrderDateChange: setLeadTimeEndDate,
            onBufferStockChange: setBufferStock,
            onConfirmQtyChange: (size, next) => setConfirmBySize((prev) => ({
              ...prev,
              [size]: Math.max(0, Math.round(next || 0)),
            })),
            onApplyRecommended: applyRecommended,
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
            {hid === 'stockCalcColumn' && (
              <p>{KO.helpStockCalcColumn}</p>
            )}
          </>
        )}
      </PortalHelpPopoverLayer>
    </div>
  )
}
