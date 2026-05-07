import { useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PortalHelpMark } from '../../../PortalHelpPopover'
import { formatGroupedNumber, formatRatioDecimalKo } from '../../../../../utils/format'
import commonStyles from '../../../common.module.css'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondaryHelpId } from '../secondaryDrawerTypes'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'

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
    /** 직접 수정한 확정 수량 셀(강조 표시용) */
    manualConfirmBySize: Readonly<Record<string, true>>
  }
  actions: {
    onSelfWeightPctChange: (next: number) => void
    /** recommendedQty: 추천과 같게 맞추면 수동 표시가 해제됨 */
    onConfirmQtyChange: (size: string, next: number, recommendedQty: number) => void
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
    manualConfirmBySize,
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
      weightedPct: r.blendedSharePct,
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
      mx = Math.max(mx, r.selfSharePct, r.competitorSharePct, r.blendedSharePct)
    }
    if (mx <= 0) return [0, 10]
    const withHeadroom = mx * 1.12
    const capped = Math.min(100, withHeadroom)
    const yMax = Math.ceil(capped * 10) / 10
    return [0, Math.max(yMax, 0.1)]
  }, [sizeRows])

  const columnTotals = useMemo(() => {
    let weightedPct = 0
    let forecast = 0
    let rec = 0
    let confirm = 0
    for (const r of sizeRows) {
      weightedPct += r.blendedSharePct
      forecast += r.forecastQty
      rec += r.recommendedQty
      confirm += r.confirmQty
    }
    return { weightedPct, forecast, rec, confirm }
  }, [sizeRows])

  const renderShareTooltip = useMemo((): ComponentProps<typeof Tooltip>['content'] => {
    const Body: NonNullable<ComponentProps<typeof Tooltip>['content']> = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        const byKey = new Map(payload.map((p) => [String(p.dataKey ?? ''), p]))
        const ordered = ['selfPct', 'compPct', 'weightedPct']
          .map((k) => byKey.get(k))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
        const sizeLabel = String(payload[0]?.payload?.size ?? '-')
        return (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 12,
              color: '#0f172a',
            }}
          >
            <div style={{ marginBottom: 4, color: '#475569' }}>{KO.thSize}: {sizeLabel}</div>
            {ordered.map((item) => {
              const n = typeof item.value === 'number' ? item.value : Number(item.value)
              return (
                <div key={String(item.dataKey)} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: item.color ?? '#64748b',
                      flexShrink: 0,
                    }}
                  />
                  <span>{item.name}: {formatRatioDecimalKo(Number.isFinite(n) ? n : 0)}%</span>
                </div>
              )
            })}
          </div>
        )
    }
    return Body
  }, [])

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
        <table ref={tableRef} className={`${styles.table} ${styles.sizeOrderTable} ${styles.sizeOrderLargeTable}`}>
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
                    <span className={styles.sizeOrderShareLegendSwatch} style={{ background: '#e11d48' }} aria-hidden />
                    <span>{channelLabel}</span>
                  </div>
                  <div className={styles.sizeOrderShareLegendRow} role="listitem">
                    <span
                      className={styles.sizeOrderShareLegendSwatch}
                      style={{ background: '#a78bfa' }}
                      aria-hidden
                    />
                    <span>{KO.rowChartAdjustReflectedSharePct}</span>
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
                        content={renderShareTooltip}
                      />
                      <Line
                        type="monotone"
                        dataKey="selfPct"
                        name={`${KO.thSelf} ${KO.thSharePctUnit}`}
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="compPct"
                        name={`${channelLabel} ${KO.thSharePctUnit}`}
                        stroke="#e11d48"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="weightedPct"
                        name={KO.rowChartAdjustReflectedSharePct}
                        stroke="#a78bfa"
                        strokeDasharray="6 4"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </td>
            </tr>
            <tr data-chart-align-row="">
              <td>{KO.rowMetricAdjustReflectedSizeSharePct}</td>
              <td className={styles.num}>{formatRatioDecimalKo(columnTotals.weightedPct)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num} data-chart-x="">
                  {formatRatioDecimalKo(r.blendedSharePct)}
                </td>
              ))}
            </tr>
            <tr>
              <td>{KO.rowCurrentStockQty}</td>
              <td className={styles.num}>{formatGroupedNumber(currentStockQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>{formatGroupedNumber(currentStockQtyBySize[i] ?? 0)}</td>
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
              <td className={styles.num}>{formatGroupedNumber(totalOrderBalanceQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>{formatGroupedNumber(totalOrderBalanceBySize[i] ?? 0)}</td>
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
              <td className={styles.num}>{formatGroupedNumber(expectedInboundOrderBalanceQty)}</td>
              {sizeRows.map((r, i) => (
                <td key={r.size} className={styles.num}>{formatGroupedNumber(expectedInboundOrderBalanceBySize[i] ?? 0)}</td>
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
              <td className={styles.num}>{formatGroupedNumber(columnTotals.forecast)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num}>{formatGroupedNumber(r.forecastQty)}</td>
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
              <td className={styles.num}>{formatGroupedNumber(columnTotals.rec)}</td>
              {sizeRows.map((r) => (
                <td key={r.size} className={styles.num}>{formatGroupedNumber(r.recommendedQty)}</td>
              ))}
            </tr>
            <tr>
              <td>{KO.thConfirmQty}</td>
              <td className={styles.num}>{formatGroupedNumber(columnTotals.confirm)}</td>
              {sizeRows.map((r) => {
                const manual = Boolean(manualConfirmBySize[r.size])
                return (
                  <td
                    key={r.size}
                    className={`${styles.num} ${styles.confirmQtyCell} ${manual ? styles.confirmQtyCellManual : ''}`}
                  >
                    <span className={styles.confirmQtyInputWrap}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className={styles.stockNumberInput}
                        value={r.confirmQty}
                        onChange={(e) =>
                          actions.onConfirmQtyChange(
                            r.size,
                            Math.max(0, Number(e.target.value) || 0),
                            r.recommendedQty,
                          )}
                        aria-label={`${r.size} ${KO.thConfirmQty}`}
                      />
                    </span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
