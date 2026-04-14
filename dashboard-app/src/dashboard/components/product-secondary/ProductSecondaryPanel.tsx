import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ProductSummary } from '../../../types'
import { c, pct, pct2n, won } from '../../../utils/format'
import { KO } from './ko'
import {
  buildSalesKpiColumn,
  COMPETITOR_CHANNELS,
  dailyMeanAndSigmaFromTrend,
  mockLlmAnswer,
  saveOrderSnapshot,
  zFromServiceLevelPct,
} from './mockSecondaryData'
import styles from './productSecondaryPanel.module.css'
import type { SecondaryOrderSnapshot } from './secondaryPanelTypes'

type Props = {
  summary: ProductSummary
  periodStart: string
  periodEnd: string
}

function monthKey(d: string) {
  return d.slice(0, 7)
}

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

export function ProductSecondaryPanel({ summary, periodStart, periodEnd }: Props) {
  const [channelId, setChannelId] = useState(COMPETITOR_CHANNELS[0]!.id)
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

  const channel = useMemo(
    () => COMPETITOR_CHANNELS.find((ch) => ch.id === channelId) ?? COMPETITOR_CHANNELS[0]!,
    [channelId],
  )

  const selfCol = useMemo(() => buildSalesKpiColumn('self', summary, channel), [summary, channel])
  const compCol = useMemo(() => buildSalesKpiColumn('competitor', summary, channel), [summary, channel])

  const filterOk = selfCol.opMarginRatePct >= minOpMarginPct

  const trendSlice = useMemo(() => {
    const a = monthKey(periodStart)
    const b = monthKey(periodEnd)
    const w = summary.salesTrend.filter((p) => {
      const m = monthKey(p.date)
      return m >= a && m <= b
    })
    return w.length ? w : summary.salesTrend.slice(-6)
  }, [summary.salesTrend, periodStart, periodEnd])

  const { dailyMean, sigma } = useMemo(
    () => dailyMeanAndSigmaFromTrend(trendSlice, monthKey(periodStart), monthKey(periodEnd)),
    [trendSlice, periodStart, periodEnd],
  )

  const z = zFromServiceLevelPct(serviceLevelPct)
  const safetyStock = Math.max(0, Math.round(z * sigma * Math.sqrt(leadTimeDays) + dailyMean * leadTimeDays))
  const recommendedOrderQty = Math.max(
    0,
    Math.round(safetyStock - summary.availableStock + dailyMean * leadTimeDays),
  )

  const expectedOrderAmount = recommendedOrderQty * selfCol.avgCost
  const expectedSalesAmount = recommendedOrderQty * selfCol.avgPrice
  const expectedOpProfit = recommendedOrderQty * selfCol.opMarginPerUnit

  const sizeAgg = useMemo(() => {
    const mix = summary.sizeMix
    const sSum = mix.reduce((a, r) => a + r.selfRatio, 0)
    const cSum = mix.reduce((a, r) => a + r.competitorRatio, 0)
    const wSelf = selfWeightPct / 100
    const wComp = 1 - wSelf
    const raw = mix.map((r) => {
      const selfShare = sSum > 0 ? (r.selfRatio / sSum) * 100 : 0
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
  }, [summary.sizeMix, selfWeightPct])

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
    return buildSizeMixBarColors(n, `${summary.id}\0${orderKey}`)
  }, [summary.id, sizeRows])

  const applyRecommended = useCallback(() => {
    const next: Record<string, number> = {}
    for (const r of sizeRows) next[r.size] = r.recommendedQty
    setConfirmBySize(next)
  }, [sizeRows])

  const sendLlm = useCallback(async () => {
    setLlmLoading(true)
    try {
      const ans = await mockLlmAnswer(llmPrompt)
      setLlmAnswer(ans)
    } finally {
      setLlmLoading(false)
    }
  }, [llmPrompt])

  const confirmOrder = useCallback(() => {
    if (!filterOk) return
    const snap: SecondaryOrderSnapshot = {
      snapshotId: crypto.randomUUID(),
      productId: summary.id,
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
    saveOrderSnapshot(snap)
  }, [
    filterOk,
    summary.id,
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
              <span className={styles.metaValue}>{summary.brand}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{KO.labelCategory}</span>
              <span className={styles.metaValue}>{summary.category}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{KO.labelStyleCode}</span>
              <span className={styles.metaValue}>{summary.styleCode}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{KO.labelProductName}</span>
              <span className={styles.metaValue}>{summary.name}</span>
            </div>
          </div>
        </div>
        <div className={`${styles.card} ${styles.filterCard}`}>
          <div className={styles.controlsRow}>
            <label className={styles.control}>
              {KO.labelCompetitorChannel}
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                {COMPETITOR_CHANNELS.map((ch) => (
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
          <p className={styles.hint}>{KO.hintAvgPriceIdentity}</p>
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
            <div className={styles.inlineFieldRow}>
              <span className={styles.inlineLabel}>{KO.labelServiceLevel}</span>
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
              <span className={styles.inlineLabel}>{KO.labelLeadTime}</span>
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
          <p className={styles.hint}>{KO.hintStockFormula}</p>
          <div className={styles.cardTableScroll}>
          <table className={styles.table}>
            <tbody>
              <tr><td>{KO.rowSafetyStock}</td><td className={styles.num}>{c(safetyStock)}</td></tr>
              <tr><td>{KO.rowRecOrderQty}</td><td className={styles.num}>{c(recommendedOrderQty)}</td></tr>
              <tr><td>{KO.rowExpectedOrderAmt}</td><td className={styles.num}>{won(expectedOrderAmount)}</td></tr>
              <tr><td>{KO.rowExpectedSales}</td><td className={styles.num}>{won(expectedSalesAmount)}</td></tr>
              <tr><td>{KO.rowExpectedOpProfit}</td><td className={styles.num}>{won(expectedOpProfit)}</td></tr>
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
        <div className={styles.sizeMixStackBlock}>
          <p className={styles.sizeMixStackTitle}>{KO.selfSizeMixBarTitle}</p>
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
        <div className={styles.sizeMixStackBlock}>
          <p className={styles.sizeMixStackTitle}>
            {channel.label}
            {KO.compSizeMixBarTitleSuffix}
          </p>
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
          <button type="button" className={styles.btn} onClick={confirmOrder} disabled={!filterOk}>
            {KO.btnConfirmOrder}
          </button>
        </div>
        <p className={styles.hint}>{KO.hintSnapshot}</p>
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
    </div>
  )
}
