import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PortalHelpMark } from '../../PortalHelpPopover'
import { c, pct2n } from '../../../../utils/format'
import commonStyles from '../../common.module.css'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'
import type { SecondaryHelpId } from '../secondaryPanelTypes'
import { usePortalHelpPopover } from '../../usePortalHelpPopover'

type SizeRow = {
  size: string
  selfSharePct: number
  competitorSharePct: number
  blendedSharePct: number
  forecastQty: number
  recommendedQty: number
  confirmQty: number
}

type Props = {
  sizeOrder: {
    channelLabel: string
    selfWeightPct: number
    sizeRows: SizeRow[]
    confirmOrderHelpId: string
    totalOrderBalanceHelpId: string
    expectedInboundOrderBalanceHelpId: string
    sizeRecQtyHelpId: string
    salesForecastHelpId: string
    currentStockQty: number
    totalOrderBalanceQty: number
    expectedInboundOrderBalanceQty: number
    currentStockQtyBySize: number[]
    totalOrderBalanceBySize: number[]
    expectedInboundOrderBalanceBySize: number[]
  }
  actions: {
    onSelfWeightPctChange: (next: number) => void
    onConfirmQtyChange: (size: string, next: number) => void
    /** 사이즈별 추천 수량을 확정 수량에 그대로 반영할 때 전달 */
    onApplyRecommended: (recommendedBySize: Record<string, number>) => void
    onConfirmOrder: () => void
  }
  help: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
}

function clampWeightPct(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100))
}

export function SizeOrderCard({ sizeOrder, actions, help }: Props) {
  const {
    channelLabel,
    selfWeightPct,
    sizeRows,
    confirmOrderHelpId,
    totalOrderBalanceHelpId,
    expectedInboundOrderBalanceHelpId,
    sizeRecQtyHelpId,
    salesForecastHelpId,
    currentStockQty,
    totalOrderBalanceQty,
    expectedInboundOrderBalanceQty,
    currentStockQtyBySize,
    totalOrderBalanceBySize,
    expectedInboundOrderBalanceBySize,
  } = sizeOrder
  const tableRef = useRef<HTMLTableElement | null>(null)
  const chartCellRef = useRef<HTMLTableCellElement | null>(null)
  const chartInnerRef = useRef<HTMLDivElement | null>(null)
  const [xCenters, setXCenters] = useState<number[]>([])
  const [chartWidth, setChartWidth] = useState(0)

  useLayoutEffect(() => {
    const table = tableRef.current
    const chartCell = chartCellRef.current
    const chartInner = chartInnerRef.current
    if (!table || !chartCell || !chartInner) return

    const recalc = () => {
      const chartRect = chartInner.getBoundingClientRect()
      setChartWidth(chartRect.width)
      // thead th가 아니라, 같은 열 그리드를 쓰는 tbody(자사 비중 행)의 사이즈 셀 중심으로 잡아
      // 「지표 | 합계 | 사이즈…」 구조에서도 차트 점이 숫자 열과 맞도록 한다.
      const alignRow = table.querySelector('[data-chart-align-row]')
      const cells = alignRow?.querySelectorAll('td[data-chart-x]')
      const list = cells?.length
        ? Array.from(cells)
        : Array.from(table.querySelectorAll('thead tr th')).slice(2)
      const centers = list.map((cell) => {
        const rect = cell.getBoundingClientRect()
        return rect.left + (rect.width / 2) - chartRect.left
      })
      setXCenters(centers)
    }

    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(table)
    ro.observe(chartCell)
    ro.observe(chartInner)
    window.addEventListener('resize', recalc)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalc)
    }
  }, [sizeRows.length])

  const shareLineData = useMemo(
    () => sizeRows.map((r, i) => ({
      x: xCenters[i] ?? i,
      size: r.size,
      selfPct: r.selfSharePct,
      compPct: r.competitorSharePct,
    })),
    [sizeRows, xCenters],
  )

  const xDomain = useMemo<[number, number]>(() => {
    if (chartWidth <= 0) return [0, Math.max(1, sizeRows.length)]
    return [0, chartWidth]
  }, [chartWidth, sizeRows.length])

  const yDomain = useMemo<[number, number]>(() => {
    let mx = 0
    for (const r of sizeRows) {
      mx = Math.max(mx, r.selfSharePct, r.competitorSharePct)
    }
    if (mx <= 0) return [0, 10]
    const withHeadroom = mx * 1.12
    const capped = Math.min(100, withHeadroom)
    const yMax = Math.ceil(capped * 10) / 10
    return [0, Math.max(yMax, 0.1)]
  }, [sizeRows])

  const columnTotals = useMemo(() => {
    let selfPct = 0
    let compPct = 0
    let forecast = 0
    let rec = 0
    let confirm = 0
    for (const r of sizeRows) {
      selfPct += r.selfSharePct
      compPct += r.competitorSharePct
      forecast += r.forecastQty
      rec += r.recommendedQty
      confirm += r.confirmQty
    }
    return { selfPct, compPct, forecast, rec, confirm }
  }, [sizeRows])

  return (
    <div className={styles.card}>
      <h3 className={styles.sectionTitle}>{KO.sectionSizeOrder}</h3>
      <div className={styles.sliderRow}>
        <div className={styles.sliderSelfGroup}>
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
                  actions.onSelfWeightPctChange(0)
                  return
                }
                const n = Number(t)
                if (!Number.isFinite(n)) return
                actions.onSelfWeightPctChange(clampWeightPct(n))
              }}
              aria-label={KO.selfWeight}
            />
            <span className={styles.sliderPctSuffix}>%</span>
          </div>
        </div>
        <input
          type="range"
          className={`${styles.sliderRowRange} ${styles.sliderWeightRange}`}
          min={0}
          max={100}
          step={0.01}
          value={selfWeightPct}
          onChange={(e) => actions.onSelfWeightPctChange(clampWeightPct(Number(e.target.value)))}
          aria-label={KO.ariaWeightSlider}
        />
        <div className={styles.sliderCompGroup}>
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
                  actions.onSelfWeightPctChange(100)
                  return
                }
                const n = Number(t)
                if (!Number.isFinite(n)) return
                actions.onSelfWeightPctChange(clampWeightPct(100 - clampWeightPct(n)))
              }}
              aria-label={`${channelLabel} ${KO.competitorWeightApprox}`}
            />
            <span className={styles.sliderPctSuffix}>%</span>
          </div>
          <span
            className={styles.sliderRowLabel}
            title={`${channelLabel} ${KO.competitorWeightApprox}`}
          >
            {channelLabel} {KO.competitorWeightApprox}
          </span>
        </div>
      </div>

      <div className={styles.sizeOrderTableWrap}>
        <table ref={tableRef} className={`${styles.table} ${styles.sizeOrderTable}`}>
          <thead>
            <tr>
              <th>{KO.thMetric}</th>
              <th className={styles.num}>{KO.thTotal}</th>
              {sizeRows.map((r) => (
                <th key={r.size} className={styles.num}>{r.size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{KO.rowShareMixLineChart}</td>
              <td className={`${styles.num} ${styles.sizeOrderShareLegendCell}`}>
                <div className={styles.sizeOrderShareLegend} role="list" aria-label={KO.rowShareMixLineChart}>
                  <div className={styles.sizeOrderShareLegendRow} role="listitem">
                    <span className={styles.sizeOrderShareLegendSwatch} style={{ background: '#2563eb' }} aria-hidden />
                    <span>{KO.thSelf}</span>
                  </div>
                  <div className={styles.sizeOrderShareLegendRow} role="listitem">
                    <span className={styles.sizeOrderShareLegendSwatch} style={{ background: '#dc2626' }} aria-hidden />
                    <span>{channelLabel}</span>
                  </div>
                </div>
              </td>
              <td ref={chartCellRef} className={styles.sizeOrderShareChartCell} colSpan={sizeRows.length}>
                <div ref={chartInnerRef} className={styles.sizeOrderShareChartInner}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={shareLineData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <XAxis type="number" dataKey="x" domain={xDomain} hide />
                      <YAxis domain={yDomain} hide />
                      <Tooltip
                        formatter={(value, name) => {
                          const n = typeof value === 'number' ? value : Number(value)
                          return [`${pct2n(Number.isFinite(n) ? n : 0)}%`, String(name)]
                        }}
                        labelFormatter={(_, payload) => `${KO.thSize}: ${payload?.[0]?.payload?.size ?? '-'}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="selfPct"
                        name={KO.thSelfPct}
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="compPct"
                        name={`${channelLabel} ${KO.thSharePctUnit}`}
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </td>
            </tr>
            <tr data-chart-align-row="">
              <td>{KO.thSelfPct}</td>
              <td className={styles.num}>{pct2n(columnTotals.selfPct)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num} data-chart-x="">{pct2n(r.selfSharePct)}</td>
              ))}
            </tr>
            <tr>
              <td>{channelLabel} {KO.thSharePctUnit}</td>
              <td className={styles.num}>{pct2n(columnTotals.compPct)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num}>{pct2n(r.competitorSharePct)}</td>
              ))}
            </tr>
            <tr>
              <td>{KO.rowCurrentStockQty}</td>
              <td className={styles.num}>{c(currentStockQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>{c(currentStockQtyBySize[i] ?? 0)}</td>
              ))}
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.rowTotalOrderBalance}
                  <PortalHelpMark
                    helpId="totalOrderBalance"
                    placement="above"
                    labelId={totalOrderBalanceHelpId}
                    markClassName={commonStyles.helpMark}
                    help={help}
                  />
                </span>
              </td>
              <td className={styles.num}>{c(totalOrderBalanceQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>{c(totalOrderBalanceBySize[i] ?? 0)}</td>
              ))}
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.rowExpectedInboundOrderBalance}
                  <PortalHelpMark
                    helpId="expectedInboundOrderBalance"
                    placement="above"
                    labelId={expectedInboundOrderBalanceHelpId}
                    markClassName={commonStyles.helpMark}
                    help={help}
                  />
                </span>
              </td>
              <td className={styles.num}>{c(expectedInboundOrderBalanceQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>{c(expectedInboundOrderBalanceBySize[i] ?? 0)}</td>
              ))}
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.rowSalesForecast}
                  <PortalHelpMark
                    helpId="salesForecastSizeOrder"
                    placement="above"
                    labelId={salesForecastHelpId}
                    markClassName={commonStyles.helpMark}
                    help={help}
                  />
                </span>
              </td>
              <td className={styles.num}>{c(columnTotals.forecast)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num}>{c(r.forecastQty)}</td>
              ))}
            </tr>
            <tr>
              <td>
                <span className={commonStyles.cardTitleWithHelp}>
                  {KO.thRecQty}
                  <PortalHelpMark
                    helpId="sizeRecQty"
                    placement="above"
                    labelId={sizeRecQtyHelpId}
                    markClassName={commonStyles.helpMark}
                    help={help}
                  />
                </span>
              </td>
              <td className={styles.num}>{c(columnTotals.rec)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num}>{c(r.recommendedQty)}</td>
              ))}
            </tr>
            <tr>
              <td>{KO.thConfirmQty}</td>
              <td className={styles.num}>{c(columnTotals.confirm)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num}>
                  <input
                    type="number"
                    min={0}
                    style={{ width: '64px', textAlign: 'right' }}
                    value={r.confirmQty}
                    onChange={(e) => actions.onConfirmQtyChange(r.size, Number(e.target.value))}
                    aria-label={`${r.size} ${KO.thConfirmQty}`}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => {
            const next: Record<string, number> = {}
            for (const r of sizeRows) {
              next[r.size] = Math.max(0, Math.round(r.recommendedQty))
            }
            actions.onApplyRecommended(next)
          }}
        >
          {KO.btnApplyRec}
        </button>
        <span
          ref={help.setAnchor('confirmOrder')}
          className={styles.confirmOrderHelpAnchor}
          onMouseEnter={() => help.open('confirmOrder', 'above')}
          onMouseLeave={help.scheduleClose}
        >
          <button
            type="button"
            className={styles.btn}
            onClick={actions.onConfirmOrder}
            onFocus={() => help.open('confirmOrder', 'above')}
            onBlur={help.scheduleClose}
            aria-describedby={help.activeId === 'confirmOrder' ? confirmOrderHelpId : undefined}
          >
            {KO.btnConfirmOrder}
          </button>
        </span>
      </div>
    </div>
  )
}
