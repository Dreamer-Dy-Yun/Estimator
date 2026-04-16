import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { BlockMath } from 'react-katex'
import { dashboardApi, type SecondaryCompetitorChannel } from '../../../api'
import { ComponentErrorBoundary } from '../../../components/ComponentErrorBoundary'
import type { ApiUnitErrorInfo, ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import { pct } from '../../../utils/format'
import { PortalHelpPopoverLayer } from '../PortalHelpPopover'
import commonStyles from '../common.module.css'
import { buildShadeRanges, normalizeMonthKey } from '../trendRangeUtils'
import { usePortalHelpPopover } from '../usePortalHelpPopover'
import { AiMockCard } from './cards/AiMockCard'
import { ProductFilterCard } from './cards/ProductFilterCard'
import { ProductMetaCard } from './cards/ProductMetaCard'
import { SalesMetricsCard } from './cards/SalesMetricsCard'
import { SalesTrendDailyCard } from './cards/SalesTrendDailyCard'
import { SizeOrderCard } from './cards/SizeOrderCard'
import { StockOrderCard } from './cards/StockOrderCard'
import { KO } from './ko'
import {
  buildSalesKpiColumn,
  dailyMeanAndSigmaFromTrend,
  mergePrimarySecondarySizeMix,
  zFromServiceLevelPct,
} from './secondaryPanelCalc'
import styles from './productSecondaryPanel.module.css'
import type {
  SecondaryHelpId,
  SecondaryOrderSnapshot,
  SecondaryStockCalc,
  SecondaryStockDerived,
  SecondaryStockInputs,
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

function daysInclusiveBetween(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1
  const diffDays = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  return Math.max(1, diffDays)
}

export function ProductSecondaryPanel({ primary, secondary, periodStart, periodEnd, pageName = 'ProductSecondaryPanel' }: Props) {
  const defaultLeadTime = useMemo(() => buildDefaultLeadTimeDates(), [])
  const serviceLevelHelpId = useId()
  const leadTimeHelpId = useId()
  const confirmOrderHelpId = useId()
  const safetyStockCalcHelpId = useId()
  const forecastQtyCalcHelpId = useId()
  const recOrderQtyHelpId = useId()
  const portalHelp = usePortalHelpPopover<SecondaryHelpId>()
  const [competitorChannels, setCompetitorChannels] = useState<SecondaryCompetitorChannel[]>([])
  const [channelId, setChannelId] = useState('')
  const [minOpMarginPct, setMinOpMarginPct] = useState(0)
  const [safetyStockMode, setSafetyStockMode] = useState<'manual' | 'formula'>('formula')
  const [manualSafetyStock, setManualSafetyStock] = useState(0)
  const [dailyMeanInput, setDailyMeanInput] = useState(0)
  const [serviceLevelPct, setServiceLevelPct] = useState(95)
  const [leadTimeStartDate, setLeadTimeStartDate] = useState(defaultLeadTime.start)
  const [leadTimeEndDate, setLeadTimeEndDate] = useState(defaultLeadTime.end)
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmAnswer, setLlmAnswer] = useState('')
  const [llmLoading, setLlmLoading] = useState(false)
  const [selfWeightPct, setSelfWeightPct] = useState(50)
  const [confirmBySize, setConfirmBySize] = useState<Record<string, number>>({})
  const dailyTrendReqSeqRef = useRef(0)
  const [stockCalc, setStockCalc] = useState<SecondaryStockCalc | null>(null)
  const [channelsError, setChannelsError] = useState<ApiUnitErrorInfo | null>(null)
  const [stockCalcError, setStockCalcError] = useState<ApiUnitErrorInfo | null>(null)
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

  const trendSlice = useMemo(() => {
    const a = selectedStart
    const b = selectedEnd
    const w = primary.monthlySalesTrend.filter((p) => {
      const m = p.date
      return m >= a && m <= b
    })
    return w.length ? w : primary.monthlySalesTrend.slice(-6)
  }, [selectedEnd, selectedStart, primary.monthlySalesTrend])

  const { dailyMean, sigma } = useMemo(
    () => dailyMeanAndSigmaFromTrend(trendSlice, selectedStart, selectedEnd),
    [selectedEnd, selectedStart, trendSlice],
  )
  useEffect(() => {
    setDailyMeanInput(Math.round(dailyMean * 10) / 10)
  }, [dailyMean, primary.id, selectedEnd, selectedStart])
  const leadTimeDays = useMemo(
    () => daysInclusiveBetween(leadTimeStartDate, leadTimeEndDate),
    [leadTimeEndDate, leadTimeStartDate],
  )

  const z = zFromServiceLevelPct(serviceLevelPct)
  const formulaSafetyStock = Math.max(0, Math.round(z * sigma * Math.sqrt(leadTimeDays)))
  const safetyStock = safetyStockMode === 'formula' ? formulaSafetyStock : Math.max(0, Math.round(manualSafetyStock))
  const recommendedOrderQty = Math.max(
    0,
    Math.round(safetyStock - primary.availableStock + dailyMeanInput * leadTimeDays),
  )
  const expectedOrderAmount = recommendedOrderQty * selfCol.avgCost
  const expectedSalesAmount = recommendedOrderQty * selfCol.avgPrice
  const expectedOpProfit = recommendedOrderQty * selfCol.opMarginPerUnit
  const stockInputs: SecondaryStockInputs = {
    dailyMean: dailyMeanInput,
    sigma,
    serviceLevelPct,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock: Math.max(0, Math.round(manualSafetyStock)),
  }
  const stockDerived: SecondaryStockDerived = {
    safetyStock,
    recommendedOrderQty,
    expectedOrderAmount,
    expectedSalesAmount,
    expectedOpProfit,
  }

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
        }
        const result = await dashboardApi.getSecondaryStockOrderCalc(params)
        if (!alive) return
        setStockCalc(result)
        setStockCalcError(null)
      } catch (err) {
        if (!alive) return
        setStockCalc(null)
        setStockCalcError(
          makeApiErrorInfo(
            `getSecondaryStockOrderCalc(${JSON.stringify({ productId: primary.id, periodStart: selectedStart, periodEnd: selectedEnd, serviceLevelPct, leadTimeDays })})`,
            err,
          ),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [leadTimeDays, makeApiErrorInfo, primary.id, selectedEnd, selectedStart, serviceLevelPct])

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
    return sizeAgg.map((row) => {
      const recommendedQty = Math.round((recommendedOrderQty * row.blendedSharePct) / 100)
      const confirmQty = confirmBySize[row.size] ?? recommendedQty
      return { ...row, recommendedQty, confirmQty }
    })
  }, [sizeAgg, recommendedOrderQty, confirmBySize])

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
      stockInputs,
      stockDerived,
      llmPrompt,
      llmAnswer,
      selfWeightPct,
      sizeRows: sizeRows.map((r) => ({
        size: r.size,
        selfSharePct: r.selfSharePct,
        competitorSharePct: r.competitorSharePct,
        blendedSharePct: r.blendedSharePct,
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
    stockInputs,
    stockDerived,
    llmPrompt,
    llmAnswer,
    selfWeightPct,
    sizeRows,
  ])

  const warnMsg =
    `${KO.warnSelfMarginPrefix} ${pct(selfCol.opMarginRatePct)}${KO.warnSelfMarginMid}${pct(minOpMarginPct)}${KO.warnSelfMarginSuffix}`

  const getHelpTooltipId = (id: SecondaryHelpId) =>
    id === 'serviceLevel'
      ? serviceLevelHelpId
      : id === 'leadTime'
        ? leadTimeHelpId
        : id === 'confirmOrder'
          ? confirmOrderHelpId
          : id === 'safetyStockCalc'
            ? safetyStockCalcHelpId
            : id === 'forecastQtyCalc'
              ? forecastQtyCalcHelpId
              : recOrderQtyHelpId

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
        <ComponentErrorBoundary page={pageName} unit="StockOrderCard">
          <StockOrderCard
            stock={{
              inputs: stockInputs,
              derived: stockDerived,
              calc: stockCalc,
              error: stockCalcError,
            }}
            help={{
              labelIds: {
                serviceLevel: serviceLevelHelpId,
                leadTime: leadTimeHelpId,
                safetyStockCalc: safetyStockCalcHelpId,
                forecastQtyCalc: forecastQtyCalcHelpId,
                recOrderQty: recOrderQtyHelpId,
              },
              portal: portalHelp,
            }}
            actions={{
              onDailyMeanChange: setDailyMeanInput,
              onSafetyStockModeChange: (next) => {
                setSafetyStockMode(next)
                if (next === 'manual') setManualSafetyStock(formulaSafetyStock)
              },
              onManualSafetyStockChange: setManualSafetyStock,
              onLeadTimeStartDateChange: setLeadTimeStartDate,
              onLeadTimeEndDateChange: setLeadTimeEndDate,
              onServiceLevelPctChange: setServiceLevelPct,
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
            sizeRows,
            confirmOrderHelpId,
            filterOk,
          }}
          actions={{
            onSelfWeightPctChange: setSelfWeightPct,
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
            {hid === 'serviceLevel' && (
              <>
                <p>{KO.helpServiceLevel}</p>
                <BlockMath math={KO.helpServiceLevelInverseFormulaLatex} />
                <BlockMath math={KO.helpServiceLevelFormulaLatex} />
                <p>{KO.helpServiceLevelVars}</p>
              </>
            )}
            {hid === 'leadTime' && (
              <p>{KO.helpLeadTime}</p>
            )}
            {hid === 'confirmOrder' && (
              <p>{KO.hintSnapshot}</p>
            )}
            {hid === 'safetyStockCalc' && (
              <>
                <BlockMath math={KO.helpSafetyStockCalcFormulaLatex} />
                <p>{KO.helpSafetyStockCalc}</p>
              </>
            )}
            {hid === 'forecastQtyCalc' && (
              <p>{KO.helpForecastQtyCalc}</p>
            )}
            {hid === 'recOrderQty' && (
              <p>{KO.helpRecOrderQty}</p>
            )}
          </>
        )}
      </PortalHelpPopoverLayer>
    </div>
  )
}
