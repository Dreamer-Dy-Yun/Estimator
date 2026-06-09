import { useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { ContentType, TooltipContentProps } from 'recharts/types/component/Tooltip'
import type { TooltipPayloadEntry } from 'recharts/types/state/tooltipSlice'
import { formatRatioDecimalKo } from '../../../../../utils/format'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'

export type Props = {
  tableRef: React.RefObject<HTMLTableElement | null>
  comparisonLabel: string
  selfCompanyLabel: string
  sizeRows: SecondarySizeOrderDisplayRow[]
}

export function SizeOrderShareChartRow({ tableRef, comparisonLabel, selfCompanyLabel, sizeRows }: Props) : React.JSX.Element {
  const chartCellRef: React.RefObject<HTMLTableCellElement | null> = useRef<HTMLTableCellElement | null>(null)
  const chartInnerRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const [xCenters, setXCenters]: [number[], React.Dispatch<React.SetStateAction<number[]>>] = useState<number[]>([])
  const [chartWidth, setChartWidth]: [number, React.Dispatch<React.SetStateAction<number>>] = useState(0)

  useLayoutEffect(() : (() => void) | undefined => {
    const table: HTMLTableElement | null = tableRef.current
    const chartCell: HTMLTableCellElement | null = chartCellRef.current
    const chartInner: HTMLDivElement | null = chartInnerRef.current
    if (!table || !chartCell || !chartInner) return

    const recalc: () => void = () : void => {
      const chartRect: DOMRect = chartInner.getBoundingClientRect()
      setChartWidth(chartRect.width)
      const alignRow: Element | null = table.querySelector('[data-chart-align-row]')
      const cells: NodeListOf<Element> | undefined = alignRow?.querySelectorAll('td[data-chart-x]')
      const list: Element[] = cells?.length
        ? Array.from(cells)
        : Array.from(table.querySelectorAll('thead tr th')).slice(2)
      setXCenters(list.map((cell: Element) : number => {
        const rect: DOMRect = cell.getBoundingClientRect()
        return rect.left + (rect.width / 2) - chartRect.left
      }))
    }

    recalc()
    const ro: ResizeObserver = new ResizeObserver(recalc)
    ro.observe(table)
    ro.observe(chartCell)
    ro.observe(chartInner)
    window.addEventListener('resize', recalc)
    return () : void => {
      ro.disconnect()
      window.removeEventListener('resize', recalc)
    }
  }, [sizeRows.length, tableRef])

  const shareLineData: { x: number; size: string; selfPct: number; comparisonPct: number; weightedPct: number; }[] = useMemo(
    () : { x: number; size: string; selfPct: number; comparisonPct: number; weightedPct: number; }[] => {
      const columnWidth: number = chartWidth > 0 && sizeRows.length > 0 ? chartWidth / sizeRows.length : 1
      return sizeRows.map((r: SecondarySizeOrderDisplayRow, i: number) : { x: number; size: string; selfPct: number; comparisonPct: number; weightedPct: number; } => ({
        x: xCenters[i] ?? ((i + 0.5) * columnWidth),
        size: r.size,
        selfPct: r.baseSharePct,
        comparisonPct: r.comparisonSharePct,
        weightedPct: r.blendedSharePct,
      }))
    },
    [chartWidth, sizeRows, xCenters],
  )
  const xDomain: [number, number] = useMemo<[number, number]>(() : [number, number] => {
    if (chartWidth <= 0) return [0, Math.max(1, sizeRows.length)]
    return [0, chartWidth]
  }, [chartWidth, sizeRows.length])
  const yDomain: [number, number] = useMemo<[number, number]>(() : [number, number] => {
    let mx: number = 0
    for (const r of sizeRows) mx = Math.max(mx, r.baseSharePct, r.comparisonSharePct, r.blendedSharePct)
    if (mx <= 0) return [0, 10]
    return [0, Math.max(Math.ceil(Math.min(100, mx * 1.12) * 10) / 10, 0.1)]
  }, [sizeRows])
  const renderShareTooltip: ContentType<ValueType, NameType> | undefined = useMemo((): ComponentProps<typeof Tooltip>['content'] => {
    const Body: NonNullable<ComponentProps<typeof Tooltip>['content']> = ({ active, payload }: TooltipContentProps<ValueType, NameType>) : React.JSX.Element | null => {
      if (!active || !payload?.length) return null
      const byKey: Map<string, TooltipPayloadEntry> = new Map(payload.map((p: TooltipPayloadEntry) : [string, TooltipPayloadEntry] => [String(p.dataKey ?? ''), p]))
      const ordered: TooltipPayloadEntry[] = ['selfPct', 'comparisonPct', 'weightedPct']
        .map((k: string) : TooltipPayloadEntry | undefined => byKey.get(k))
        .filter((p: TooltipPayloadEntry | undefined): p is NonNullable<typeof p> => Boolean(p))
      const sizeLabel: string = String(payload[0]?.payload?.size ?? '-')
      return (
        <div className={styles.sizeOrderTooltip}>
          <div className={styles.sizeOrderTooltipTitle}>{KO.thSize}: {sizeLabel}</div>
          {ordered.map((item: TooltipPayloadEntry) : React.JSX.Element => {
            const n: number = typeof item.value === 'number' ? item.value : Number(item.value)
            const valueText: string = Number.isFinite(n) ? `${formatRatioDecimalKo(n)}%` : String(item.value ?? '-')
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
          <LegendItem color="#e11d48" label={comparisonLabel} />
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
              <Line type="monotone" dataKey="comparisonPct" name={`${comparisonLabel} ${KO.thSharePctUnit}`} stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="weightedPct" name={KO.rowChartAdjustReflectedSharePct} stroke="#a78bfa" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </td>
    </tr>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) : React.JSX.Element {
  return (
    <div className={styles.sizeOrderShareLegendRow} role="listitem">
      <span className={styles.sizeOrderShareLegendSwatch} style={{ background: color }} aria-hidden />
      <span>{label}</span>
    </div>
  )
}
