import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dashboardApi, type SecondaryCompetitorChannel } from '../../../api'
import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../types'
import { c, pct, pct2n, won } from '../../../utils/format'
import { PortalHelpMark, PortalHelpPopoverLayer } from '../PortalHelpPopover'
import { SalesTrendChart } from '../SalesTrendChart'
import commonStyles from '../common.module.css'
import { buildShadeRanges, normalizeMonthKey } from '../trendRangeUtils'
import { usePortalHelpPopover } from '../usePortalHelpPopover'
import { KO } from './ko'
import {
  buildSalesKpiColumn,
  dailyMeanAndSigmaFromTrend,
  mergePrimarySecondarySizeMix,
  zFromServiceLevelPct,
} from './secondaryPanelCalc'
import styles from './productSecondaryPanel.module.css'
import type { SecondaryOrderSnapshot } from './secondaryPanelTypes'

type Props = {
  primary: ProductPrimarySummary
  secondary: ProductSecondaryDetail
  periodStart: string
  periodEnd: string
}

type SecondaryHelpId = 'serviceLevel' | 'leadTime' | 'confirmOrder' | 'safetyStockCalc' | 'forecastQtyCalc'

function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hslToHex(hDeg: number, s: number, l: number): string {
  const h = (((hDeg % 360) + 360) % 360) / 360
  const hue2rgb = (p: number, q: number, t: number) => {
    let u = t
    if (u < 0) u += 1
    if (u > 1) u -= 1
    if (u < 1 / 6) return p + (q - p) * 6 * u
    if (u < 1 / 2) return q
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6
    return p
  }
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x * 255)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Hue wheel split into n equal segments (center hue each); Fisher–Yates shuffle seeded for stable mapping per product. */
function buildSizeMixBarColors(n: number, seed: string): string[] {
  if (n <= 0) return []
  const centers = Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * 360)
  const rng = mulberry32(hashString(seed))
  const hues = [...centers]
  for (let i = hues.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const t = hues[i]!
    hues[i] = hues[j]!
    hues[j] = t
  }
  const sat = 0.68
  const light = 0.52
  return hues.map((hue) => hslToHex(hue, sat, light))
}

function clampWeightPct(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100))
}

export function ProductSecondaryPanel({ primary, secondary, periodStart, periodEnd }: Props) {
  const serviceLevelHelpId = useId()
  const leadTimeHelpId = useId()
  const confirmOrderHelpId = useId()
  const safetyStockCalcHelpId = useId()
  const forecastQtyCalcHelpId = useId()
  const portalHelp = usePortalHelpPopover<SecondaryHelpId>()
  const [competitorChannels, setCompetitorChannels] = useState<SecondaryCompetitorChannel[]>([])
  const [channelId, setChannelId] = useState('')
  const [minOpMarginPct, setMinOpMarginPct] = useState(0)
  const [serviceLevelPct, setServiceLevelPct] = useState(95)
  const [leadTimeDays, setLeadTimeDays] = useState(14)
  const [llmPrompt, setLlmPrompt] = useState('')
  const [llmAnswer, setLlmAnswer] = useState('')
  const [llmLoading, setLlmLoading] = useState(false)
  const [selfWeightPct, setSelfWeightPct] = useState(50)
  const [confirmBySize, setConfirmBySize] = useState<Record<string, number>>({})
  const [sizeMixTooltip, setSizeMixTooltip] = useState<{
    text: string
    left: number
    top: number
  } | null>(null)
  const dailyTrendReqSeqRef = useRef(0)
  const [stockCalc, setStockCalc] = useState<{
    safetyStockCalc: {
      safetyStock: number
      recommendedOrderQty: number
      expectedOrderAmount: number
      expectedSalesAmount: number
      expectedOpProfit: number
    }
    forecastQtyCalc: {
      safetyStock: null
      recommendedOrderQty: number
      expectedOrderAmount: number
      expectedSalesAmount: number
      expectedOpProfit: number
    }
  } | null>(null)

  const channel = useMemo<SecondaryCompetitorChannel>(
    () =>
      competitorChannels.find((ch) => ch.id === channelId)
      ?? competitorChannels[0]
      ?? { id: '', label: '경쟁사', priceSkew: 1, qtySkew: 1 },
    [channelId, competitorChannels],
  )

  useEffect(() => {
    void dashboardApi.getSecondaryCompetitorChannels().then((rows) => {
      setCompetitorChannels(rows)
      setChannelId((prev) => prev || rows[0]?.id || '')
    })
  }, [])

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

  const z = zFromServiceLevelPct(serviceLevelPct)
  const fallbackSafetyStock = Math.max(0, Math.round(z * sigma * Math.sqrt(leadTimeDays) + dailyMean * leadTimeDays))
  const fallbackRecommendedOrderQty = Math.max(
    0,
    Math.round(fallbackSafetyStock - primary.availableStock + dailyMean * leadTimeDays),
  )
  const recommendedOrderQty = stockCalc?.safetyStockCalc.recommendedOrderQty ?? fallbackRecommendedOrderQty
  const safetyStock = stockCalc?.safetyStockCalc.safetyStock ?? fallbackSafetyStock
  const expectedOrderAmount = stockCalc?.safetyStockCalc.expectedOrderAmount ?? (recommendedOrderQty * selfCol.avgCost)
  const expectedSalesAmount = stockCalc?.safetyStockCalc.expectedSalesAmount ?? (recommendedOrderQty * selfCol.avgPrice)
  const expectedOpProfit = stockCalc?.safetyStockCalc.expectedOpProfit ?? (recommendedOrderQty * selfCol.opMarginPerUnit)

  useEffect(() => {
    void dashboardApi.getSecondaryStockOrderCalc({
      productId: primary.id,
      periodStart: selectedStart,
      periodEnd: selectedEnd,
      serviceLevelPct,
      leadTimeDays,
    }).then((result) => {
      setStockCalc(result)
    })
  }, [leadTimeDays, selectedEnd, selectedStart, serviceLevelPct, primary.id])

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

  const sizeMixBarColors = useMemo(() => {
    const n = sizeRows.length
    const orderKey = sizeRows.map((r) => r.size).join(',')
    return buildSizeMixBarColors(n, `${primary.id}\0${orderKey}`)
  }, [primary.id, sizeRows])

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
    void dashboardApi.getSecondaryDailyTrend({
      productId: primary.id,
      startMonth: selectedStart,
      leadTimeDays,
    }).then((series) => {
      if (dailyTrendReqSeqRef.current !== reqSeq) return
      setDailyTrendSeries(series)
    })
  }, [leadTimeDays, selectedStart, primary.id])

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
    } finally {
      setLlmLoading(false)
    }
  }, [llmPrompt, primary.id])

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
      stockInputs: { dailyMean, sigma, serviceLevelPct, leadTimeDays },
      stockDerived: {
        safetyStock,
        recommendedOrderQty,
        expectedOrderAmount,
        expectedSalesAmount,
        expectedOpProfit,
      },
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
    dailyMean,
    sigma,
    serviceLevelPct,
    leadTimeDays,
    safetyStock,
    recommendedOrderQty,
    expectedOrderAmount,
    expectedSalesAmount,
    expectedOpProfit,
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
            : forecastQtyCalcHelpId

  return (
    <div className={styles.panel}>
      {!filterOk && (
        <div className={styles.warn}>{warnMsg}</div>
      )}
      <div className={styles.metaFilterRow}>
        <div className={`${styles.card} ${styles.metaCard}`}>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{KO.labelBrand}</span>
              <span className={styles.metaValue}>{primary.brand}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{KO.labelCategory}</span>
              <span className={styles.metaValue}>{primary.category}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{KO.labelProductCode}</span>
              <span className={styles.metaValue}>{primary.productCode}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{KO.labelProductName}</span>
              <span className={styles.metaValue}>{primary.name}</span>
            </div>
          </div>
        </div>
        <div className={`${styles.card} ${styles.filterCard}`}>
          <div className={styles.controlsRow}>
            <label className={styles.control}>
              {KO.labelCompetitorChannel}
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                {competitorChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.label}</option>
                ))}
              </select>
            </label>
            <label className={styles.control}>
              {KO.labelMinOpMargin}
              <input
                type="number"
                step={0.1}
                value={minOpMarginPct}
                onChange={(e) => setMinOpMarginPct(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>

      <div className={styles.salesStockAiRow}>
        <div className={`${styles.card} ${styles.gridColumnCard}`}>
          <h3 className={styles.sectionTitle}>{KO.sectionSales}</h3>
          <div className={styles.cardTableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{KO.thMetric}</th>
                <th className={styles.num}>{KO.thSelf}</th>
                <th className={styles.num}>{channel.label}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{KO.rowAvgPrice}</td>
                <td className={styles.num}>{won(selfCol.avgPrice)}</td>
                <td className={styles.num}>{won(compCol.avgPrice)}</td>
              </tr>
              <tr>
                <td>{KO.rowQtyRank}</td>
                <td className={styles.num}>{c(selfCol.qty)} ({selfCol.qtyRank}{KO.rankSuffix})</td>
                <td className={styles.num}>{c(compCol.qty)} ({compCol.qtyRank}{KO.rankSuffix})</td>
              </tr>
              <tr>
                <td>{KO.rowAmountRank}</td>
                <td className={styles.num}>{won(selfCol.amount)} ({selfCol.amountRank}{KO.rankSuffix})</td>
                <td className={styles.num}>{won(compCol.amount)} ({compCol.amountRank}{KO.rankSuffix})</td>
              </tr>
              <tr>
                <td>{KO.rowAvgCost}</td>
                <td className={styles.num}>{won(selfCol.avgCost)} ({pct(selfCol.costRatioPct)})</td>
                <td className={styles.num}>{won(compCol.avgCost)} ({pct(compCol.costRatioPct)})</td>
              </tr>
              <tr>
                <td>{KO.rowGrossMarginUnit}</td>
                <td className={styles.num}>{won(selfCol.grossMarginPerUnit)}</td>
                <td className={styles.num}>{won(compCol.grossMarginPerUnit)}</td>
              </tr>
              <tr>
                <td>{KO.rowFee}</td>
                <td className={styles.num}>{won(selfCol.feePerUnit)} ({pct(selfCol.feeRatePct)})</td>
                <td className={styles.num}>{won(compCol.feePerUnit)} ({pct(compCol.feeRatePct)})</td>
              </tr>
              <tr>
                <td>{KO.rowOpMargin}</td>
                <td className={styles.num}>{won(selfCol.opMarginPerUnit)} ({pct(selfCol.opMarginRatePct)})</td>
                <td className={styles.num}>{won(compCol.opMarginPerUnit)} ({pct(compCol.opMarginRatePct)})</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <div className={`${styles.card} ${styles.gridColumnCard}`}>
          <h3 className={styles.sectionTitle}>{KO.sectionStock}</h3>
          <div className={styles.stockInputList}>
            <div className={styles.stockInputCol}>
              <div className={styles.inlineFieldRow}>
                <span className={styles.inlineLabel}>{KO.labelDailyMean}</span>
                <span className={styles.inlineValue}>
                  {c(Math.round(dailyMean * 10) / 10)}
                  <span className={styles.inlineUnit}>EA/일</span>
                </span>
              </div>
              <div className={styles.inlineFieldRow}>
                <span className={styles.inlineLabel}>{KO.labelSigma}</span>
                <span className={styles.inlineValue}>{c(Math.round(sigma * 10) / 10)}</span>
              </div>
            </div>
            <div className={styles.stockInputCol}>
              <div className={styles.inlineFieldRow}>
                <span className={`${styles.inlineLabel} ${commonStyles.cardTitleWithHelp}`}>
                  {KO.labelServiceLevel}
                  <PortalHelpMark
                    helpId="serviceLevel"
                    placement="above"
                    labelId={serviceLevelHelpId}
                    markClassName={commonStyles.helpMark}
                    help={portalHelp}
                  />
                </span>
                <span className={styles.inlineFieldInput}>
                  <input
                    type="number"
                    min={80}
                    max={99.9}
                    step={0.5}
                    value={serviceLevelPct}
                    onChange={(e) => setServiceLevelPct(Number(e.target.value))}
                    aria-label={KO.labelServiceLevel}
                  />
                  <span className={styles.inlineUnit}>%</span>
                </span>
              </div>
              <div className={styles.inlineFieldRow}>
                <span className={`${styles.inlineLabel} ${commonStyles.cardTitleWithHelp}`}>
                  {KO.labelLeadTime}
                  <PortalHelpMark
                    helpId="leadTime"
                    placement="above"
                    labelId={leadTimeHelpId}
                    markClassName={commonStyles.helpMark}
                    help={portalHelp}
                  />
                </span>
                <span className={styles.inlineFieldInput}>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                    aria-label={KO.labelLeadTime}
                  />
                  <span className={styles.inlineUnit}>일</span>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.cardTableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{KO.thMetric}</th>
                <th className={styles.num}>
                  <span className={commonStyles.cardTitleWithHelp}>
                    {KO.thSafetyStockCalc}
                    <PortalHelpMark
                      helpId="safetyStockCalc"
                      placement="above"
                      labelId={safetyStockCalcHelpId}
                      markClassName={commonStyles.helpMark}
                      help={portalHelp}
                    />
                  </span>
                </th>
                <th className={styles.num}>
                  <span className={commonStyles.cardTitleWithHelp}>
                    {KO.thForecastQtyCalc}
                    <PortalHelpMark
                      helpId="forecastQtyCalc"
                      placement="above"
                      labelId={forecastQtyCalcHelpId}
                      markClassName={commonStyles.helpMark}
                      help={portalHelp}
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{KO.rowSafetyStock}</td>
                <td className={styles.num}>{c(safetyStock)}</td>
                <td className={styles.num}>-</td>
              </tr>
              <tr>
                <td>{KO.rowRecOrderQty}</td>
                <td className={styles.num}>{c(recommendedOrderQty)}</td>
                <td className={styles.num}>{c(stockCalc?.forecastQtyCalc.recommendedOrderQty ?? 0)}</td>
              </tr>
              <tr>
                <td>{KO.rowExpectedOrderAmt}</td>
                <td className={styles.num}>{won(expectedOrderAmount)}</td>
                <td className={styles.num}>{won(stockCalc?.forecastQtyCalc.expectedOrderAmount ?? 0)}</td>
              </tr>
              <tr>
                <td>{KO.rowExpectedSales}</td>
                <td className={styles.num}>{won(expectedSalesAmount)}</td>
                <td className={styles.num}>{won(stockCalc?.forecastQtyCalc.expectedSalesAmount ?? 0)}</td>
              </tr>
              <tr>
                <td>{KO.rowExpectedOpProfit}</td>
                <td className={styles.num}>{won(expectedOpProfit)}</td>
                <td className={styles.num}>{won(stockCalc?.forecastQtyCalc.expectedOpProfit ?? 0)}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <div className={`${styles.card} ${styles.gridColumnCard}`}>
          <h3 className={styles.sectionTitle}>{KO.sectionAi}</h3>
          <div className={styles.aiCardBody}>
            <textarea
              value={llmPrompt}
              onChange={(e) => setLlmPrompt(e.target.value)}
              placeholder={KO.placeholderPrompt}
              aria-label={KO.ariaLlmPrompt}
            />
            <button type="button" className={styles.btn} onClick={sendLlm} disabled={llmLoading}>
              {llmLoading ? KO.btnGenerating : KO.btnAnswerGen}
            </button>
            <div className={styles.aiAnswer} aria-live="polite">
              {llmAnswer || KO.answerEmpty}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>{KO.sectionSalesTrendDaily}</h3>
        <div className={`${commonStyles.chartClipWrap} ${styles.dailyTrendClipWrap}`}>
          <SalesTrendChart
            data={dailyTrendSeries}
            height={120}
            allowEscapeViewBox={{ x: false, y: false }}
            periodShade={dailyPeriodShade}
            forecastShade={dailyForecastShade}
            barsUseSecondaryAxis
            bars={[
              { dataKey: 'stockBar', name: '실재고', stackId: 'stockInbound', fill: '#149632', fillOpacity: 0.58, barSize: 7 },
              { dataKey: 'inboundAccumBar', name: '예상 재고', stackId: 'stockInbound', fill: '#ef4444', fillOpacity: 0.42, barSize: 7 },
            ]}
            lines={[{ dataKey: 'sales', stroke: '#0f172a' }]}
            tickFormatter={(row) => String(row.date ?? '')}
            tickAngle={-45}
            tickHeight={46}
            xTicks={dailyTickIndices}
            minTickGap={4}
            interval={0}
            tooltipValueFormatter={(value, name) => {
              if (name === 'stockBar') return [c(value), '실재고']
              if (name === 'inboundAccumBar') return [c(value), '예상 재고']
              return [c(value), '일 판매량']
            }}
            tooltipLabelFormatter={(row) => String(row.date ?? '')}
          />
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>{KO.sectionSizeOrder}</h3>
        <div className={styles.sliderRow}>
          <span className={styles.sliderRowLabel}>{KO.selfWeight}</span>
          <div className={styles.sliderPctBox}>
            <input
              type="number"
              className={styles.sliderPctInput}
              min={0}
              max={100}
              step={0.01}
              value={selfWeightPct}
              onChange={(e) => {
                const t = e.target.value.trim()
                if (t === '') {
                  setSelfWeightPct(0)
                  return
                }
                const n = Number(t)
                if (!Number.isFinite(n)) return
                setSelfWeightPct(clampWeightPct(n))
              }}
              aria-label={KO.selfWeight}
            />
            <span className={styles.sliderPctSuffix}>%</span>
          </div>
          <input
            type="range"
            className={styles.sliderRowRange}
            min={0}
            max={100}
            step={0.01}
            value={selfWeightPct}
            onChange={(e) => setSelfWeightPct(clampWeightPct(Number(e.target.value)))}
            aria-label={KO.ariaWeightSlider}
          />
          <div className={styles.sliderPctBox}>
            <input
              type="number"
              className={styles.sliderPctInput}
              min={0}
              max={100}
              step={0.01}
              value={clampWeightPct(100 - selfWeightPct)}
              onChange={(e) => {
                const t = e.target.value.trim()
                if (t === '') {
                  setSelfWeightPct(100)
                  return
                }
                const n = Number(t)
                if (!Number.isFinite(n)) return
                setSelfWeightPct(clampWeightPct(100 - clampWeightPct(n)))
              }}
              aria-label={`${channel.label} ${KO.competitorWeightApprox}`}
            />
            <span className={styles.sliderPctSuffix}>%</span>
          </div>
          <span
            className={styles.sliderRowLabel}
            title={`${channel.label} ${KO.competitorWeightApprox}`}
          >
            {channel.label} {KO.competitorWeightApprox}
          </span>
        </div>
        <div className={styles.sizeMixStackRow}>
          <span
            className={styles.sizeMixStackTitleFixed}
            title={KO.selfSizeMixBarTitle}
          >
            {KO.selfSizeMixBarTitle}
          </span>
          <div
            className={styles.sizeMixStackTrack}
            role="img"
            aria-label={sizeRows
              .map((r) => `${r.size} ${pct2n(r.selfSharePct)}%`)
              .join(', ')}
            onMouseLeave={() => setSizeMixTooltip(null)}
          >
            {sizeRows.map((r, i) => (
              <div
                key={r.size}
                className={styles.sizeMixStackSeg}
                style={{
                  flexGrow: r.selfSharePct,
                  backgroundColor: sizeMixBarColors[i] ?? '#94a3b8',
                }}
                aria-label={`${r.size} ${pct2n(r.selfSharePct)}%`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setSizeMixTooltip({
                    text: `${r.size} · ${pct2n(r.selfSharePct)}%`,
                    left: rect.left + rect.width / 2,
                    top: rect.top,
                  })
                }}
              />
            ))}
          </div>
        </div>
        <div className={styles.sizeMixStackRow}>
          <span
            className={styles.sizeMixStackTitleFixed}
            title={`${channel.label}${KO.compSizeMixBarTitleSuffix}`}
          >
            {channel.label}
            {KO.compSizeMixBarTitleSuffix}
          </span>
          <div
            className={styles.sizeMixStackTrack}
            role="img"
            aria-label={sizeRows
              .map((r) => `${r.size} ${pct2n(r.competitorSharePct)}%`)
              .join(', ')}
            onMouseLeave={() => setSizeMixTooltip(null)}
          >
            {sizeRows.map((r, i) => (
              <div
                key={`comp-${r.size}`}
                className={styles.sizeMixStackSeg}
                style={{
                  flexGrow: r.competitorSharePct,
                  backgroundColor: sizeMixBarColors[i] ?? '#94a3b8',
                }}
                aria-label={`${r.size} ${pct2n(r.competitorSharePct)}%`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setSizeMixTooltip({
                    text: `${r.size} · ${pct2n(r.competitorSharePct)}%`,
                    left: rect.left + rect.width / 2,
                    top: rect.top,
                  })
                }}
              />
            ))}
          </div>
        </div>
        <div className={styles.sizeOrderTableWrap}>
          <table className={`${styles.table} ${styles.sizeOrderTable}`}>
            <thead>
              <tr>
                <th>{KO.thMetric}</th>
                {sizeRows.map((r) => (
                  <th key={r.size} className={styles.num}>{r.size}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{KO.thSelfPct}</td>
                {sizeRows.map((r) => (
                  <td key={r.size} className={styles.num}>{pct2n(r.selfSharePct)}</td>
                ))}
              </tr>
              <tr>
                <td>
                  {channel.label} {KO.thSharePctUnit}
                </td>
                {sizeRows.map((r) => (
                  <td key={r.size} className={styles.num}>{pct2n(r.competitorSharePct)}</td>
                ))}
              </tr>
              <tr>
                <td>{KO.thBlendedPct}</td>
                {sizeRows.map((r) => (
                  <td key={r.size} className={styles.num}>{pct2n(r.blendedSharePct)}</td>
                ))}
              </tr>
              <tr>
                <td>{KO.thRecQty}</td>
                {sizeRows.map((r) => (
                  <td key={r.size} className={styles.num}>{c(r.recommendedQty)}</td>
                ))}
              </tr>
              <tr>
                <td>{KO.thConfirmQty}</td>
                {sizeRows.map((r) => (
                  <td key={r.size} className={styles.num}>
                    <input
                      type="number"
                      min={0}
                      style={{ width: '64px', textAlign: 'right' }}
                      value={r.confirmQty}
                      onChange={(e) => setConfirmBySize((prev) => ({
                        ...prev,
                        [r.size]: Math.max(0, Math.round(Number(e.target.value) || 0)),
                      }))}
                      aria-label={`${r.size} ${KO.thConfirmQty}`}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={applyRecommended}>
            {KO.btnApplyRec}
          </button>
          <span
            ref={portalHelp.setAnchor('confirmOrder')}
            className={styles.confirmOrderHelpAnchor}
            onMouseEnter={() => portalHelp.open('confirmOrder', 'above')}
            onMouseLeave={portalHelp.scheduleClose}
          >
            <button
              type="button"
              className={styles.btn}
              onClick={confirmOrder}
              disabled={!filterOk}
              onFocus={() => portalHelp.open('confirmOrder', 'above')}
              onBlur={portalHelp.scheduleClose}
              aria-describedby={portalHelp.activeId === 'confirmOrder' ? confirmOrderHelpId : undefined}
            >
              {KO.btnConfirmOrder}
            </button>
          </span>
        </div>
      </div>
      {sizeMixTooltip != null &&
        createPortal(
          <div
            className={styles.sizeMixTooltip}
            style={{ left: sizeMixTooltip.left, top: sizeMixTooltip.top }}
          >
            {sizeMixTooltip.text}
          </div>,
          document.body,
        )}
      <PortalHelpPopoverLayer
        help={portalHelp}
        popoverClassName={commonStyles.helpPopoverPortal}
        getTooltipId={getHelpTooltipId}
      >
        {(hid) => (
          <>
            {hid === 'serviceLevel' && (
              <p>{KO.helpServiceLevel}</p>
            )}
            {hid === 'leadTime' && (
              <p>{KO.helpLeadTime}</p>
            )}
            {hid === 'confirmOrder' && (
              <p>{KO.hintSnapshot}</p>
            )}
            {hid === 'safetyStockCalc' && (
              <p style={{ whiteSpace: 'pre-line' }}>{KO.helpSafetyStockCalc}</p>
            )}
            {hid === 'forecastQtyCalc' && (
              <p>{KO.helpForecastQtyCalc}</p>
            )}
          </>
        )}
      </PortalHelpPopoverLayer>
    </div>
  )
}
