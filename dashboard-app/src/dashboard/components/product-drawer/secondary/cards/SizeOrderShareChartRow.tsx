import { useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type RefObject } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatRatioDecimalKo } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SizeOrderRow } from './sizeOrderCardTypes'

type Props = {
  tableRef: RefObject<HTMLTableElement | null>
  channelLabel: string
  selfCompanyLabel: string
  sizeRows: SizeOrderRow[]
}

export function SizeOrderShareChartRow({ tableRef, channelLabel, selfCompanyLabel, sizeRows }: Props) {
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
      const alignRow = table.querySelector('[data-chart-align-row]')
      const cells = alignRow?.querySelectorAll('td[data-chart-x]')
      const list = cells?.length
        ? Array.from(cells)
        : Array.from(table.querySelectorAll('thead tr th')).slice(2)
      setXCenters(list.map((cell) => {
        const rect = cell.getBoundingClientRect()
        return rect.left + (rect.width / 2) - chartRect.left
      }))
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
  }, [sizeRows.length, tableRef])

  const shareLineData = useMemo(
    () => {
      const columnWidth = chartWidth > 0 && sizeRows.length > 0 ? chartWidth / sizeRows.length : 1
      return sizeRows.map((r, i) => ({
        x: xCenters[i] ?? ((i + 0.5) * columnWidth),
        size: r.size,
        selfPct: r.selfSharePct,
        compPct: r.competitorSharePct,
        weightedPct: r.blendedSharePct,
      }))
    },
    [chartWidth, sizeRows, xCenters],
  )
  const xDomain = useMemo<[number, number]>(() => {
    if (chartWidth <= 0) return [0, Math.max(1, sizeRows.length)]
    return [0, chartWidth]
  }, [chartWidth, sizeRows.length])
  const yDomain = useMemo<[number, number]>(() => {
    let mx = 0
    for (const r of sizeRows) mx = Math.max(mx, r.selfSharePct, r.competitorSharePct, r.blendedSharePct)
    if (mx <= 0) return [0, 10]
    return [0, Math.max(Math.ceil(Math.min(100, mx * 1.12) * 10) / 10, 0.1)]
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
        <div className={styles.sizeOrderTooltip}>
          <div className={styles.sizeOrderTooltipTitle}>{KO.thSize}: {sizeLabel}</div>
          {ordered.map((item) => {
            const n = typeof item.value === 'number' ? item.value : Number(item.value)
            const valueText = Number.isFinite(n) ? `${formatRatioDecimalKo(n)}%` : String(item.value ?? '-')
            return (
              <div key={String(item.dataKey)} className={styles.sizeOrderTooltipRow}>
                <span
                  aria-hidden
                  className={styles.sizeOrderTooltipSwatch}
                  style={{ background: item.color ?? '#64748b' }}
                />
                <span>{item.name}: {valueText}</span>
              </div>
            )
          })}
        </div>
      )
    }
    return Body
  }, [])

  return (
    <tr>
      <td>{KO.rowShareMixLineChart}</td>
      <td className={`${styles.num} ${styles.sizeOrderShareLegendCell}`}>
        <div className={styles.sizeOrderShareLegend} role="list" aria-label={KO.rowShareMixLineChart}>
          <LegendItem color="#2563eb" label={selfCompanyLabel} />
          <LegendItem color="#e11d48" label={channelLabel} />
          <LegendItem color="#a78bfa" label={KO.rowChartAdjustReflectedSharePct} />
        </div>
      </td>
      <td ref={chartCellRef} className={styles.sizeOrderShareChartCell} colSpan={sizeRows.length}>
        <div ref={chartInnerRef} className={styles.sizeOrderShareChartInner}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shareLineData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis type="number" dataKey="x" domain={xDomain} hide allowDataOverflow />
              <YAxis domain={yDomain} hide />
              <Tooltip content={renderShareTooltip} />
              <Line type="monotone" dataKey="selfPct" name={`${selfCompanyLabel} ${KO.thSharePctUnit}`} stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="compPct" name={`${channelLabel} ${KO.thSharePctUnit}`} stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="weightedPct" name={KO.rowChartAdjustReflectedSharePct} stroke="#a78bfa" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </td>
    </tr>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className={styles.sizeOrderShareLegendRow} role="listitem">
      <span className={styles.sizeOrderShareLegendSwatch} style={{ background: color }} aria-hidden />
      <span>{label}</span>
    </div>
  )
}
