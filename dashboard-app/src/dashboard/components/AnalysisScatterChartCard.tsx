import { useCallback, useMemo, type KeyboardEventHandler, type MouseEventHandler,} from 'react'
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import styles from './common.module.css'
import { ChartCard } from './ChartCard'
import type { AnalysisScatterGridPointBase } from '../model/analysisScatterGridPoint'

export type AxisConfig = {
  name: string
  label: string
  unit?: string
  width?: number
  tickMargin?: number
  labelColor?: string
  tickFormatter?: (value: number) => string
}

type Props<TPoint extends AnalysisScatterGridPointBase> = {
  title: string
  data: TPoint[]
  chartBodyRef: React.RefObject<HTMLDivElement | null>
  chartReady: boolean
  width: number
  height: number
  loading?: boolean
  pointRadius: number
  activeCellKey: string | null
  onCellClick: (cellKey: string) => void
  onClearSelection: () => void
  renderTooltip: (props: { active?: boolean; payload?: ReadonlyArray<{ payload?: TPoint }> }) => React.ReactNode
  xAxis: AxisConfig
  yAxis: AxisConfig
  fill?: string
}

const SCATTER_CHART_MARGIN: { top: number; right: number; bottom: number; left: number; } = { top: 8, right: 8, bottom: 22, left: 8 }
const AXIS_TICK_STYLE: { fontSize: number; } = { fontSize: 10 }
const DEFAULT_AXIS_LABEL_COLOR = '#475569' as const

export type ScatterPointAccessibleMetadata = AnalysisScatterGridPointBase & Partial<{
  count: number
  xStart: number
  xEnd: number
  yStart: number
  yEnd: number
}>

function isScatterPointActivationKey(key: string) : boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar'
}

function appendPointRangeLabel(labels: string[], axisLabel: string, start?: number, end?: number) : void {
  if (typeof start !== 'number' || typeof end !== 'number') return
  labels.push(`${axisLabel} ${start} to ${end}`)
}

function createScatterPointAccessibleName(
  point: ScatterPointAccessibleMetadata,
  xAxisLabel: string,
  yAxisLabel: string,
) : string {
  const labels: string[] = [`Select scatter point ${point.cellKey}`]
  appendPointRangeLabel(labels, xAxisLabel, point.xStart, point.xEnd)
  appendPointRangeLabel(labels, yAxisLabel, point.yStart, point.yEnd)
  if (typeof point.count === 'number') labels.push(`count ${point.count}`)
  return labels.join(', ')
}

export function AnalysisScatterChartCard<TPoint extends AnalysisScatterGridPointBase>({
  title,
  data,
  chartBodyRef,
  chartReady,
  width,
  height,
  loading = false,
  pointRadius,
  activeCellKey,
  onCellClick,
  onClearSelection,
  renderTooltip,
  xAxis,
  yAxis,
  fill = '#f59e0b',
}: Props<TPoint>) : React.JSX.Element {
  const xAxisLabel: { value: string; position: 'insideBottom'; offset: number; style: { fill: string; fontSize: number; fontWeight: number; }; } = useMemo(
    () : { value: string; position: 'insideBottom'; offset: number; style: { fill: string; fontSize: number; fontWeight: number; }; } => ({
      value: xAxis.label,
      position: 'insideBottom' as const,
      offset: -10,
      style: {
        fill: xAxis.labelColor ?? DEFAULT_AXIS_LABEL_COLOR,
        fontSize: 11,
        fontWeight: 600,
      },
    }),
    [xAxis.label, xAxis.labelColor],
  )
  const yAxisLabel: { value: string; angle: number; position: 'insideLeft'; offset: number; style: { fill: string; fontSize: number; fontWeight: number; }; } = useMemo(
    () : { value: string; angle: number; position: 'insideLeft'; offset: number; style: { fill: string; fontSize: number; fontWeight: number; }; } => ({
      value: yAxis.label,
      angle: -90,
      position: 'insideLeft' as const,
      offset: 0,
      style: {
        fill: yAxis.labelColor ?? DEFAULT_AXIS_LABEL_COLOR,
        fontSize: 11,
        fontWeight: 600,
      },
    }),
    [yAxis.label, yAxis.labelColor],
  )
  const activatePointCell: (target: SVGCircleElement) => void = useCallback(
    (target: SVGCircleElement) : void => {
      const cellKey: string | undefined = target.dataset.cellKey
      if (!cellKey) return
      onCellClick(cellKey)
    },
    [onCellClick],
  )
  const handlePointClick: MouseEventHandler<SVGCircleElement> = useCallback<MouseEventHandler<SVGCircleElement>>(
    (event: React.MouseEvent<SVGCircleElement, MouseEvent>) : void => {
      activatePointCell(event.currentTarget)
      event.stopPropagation()
    },
    [activatePointCell],
  )
  const handlePointKeyDown: KeyboardEventHandler<SVGCircleElement> = useCallback<KeyboardEventHandler<SVGCircleElement>>(
    (event: React.KeyboardEvent<SVGCircleElement>) : void => {
      if (!isScatterPointActivationKey(event.key)) return
      activatePointCell(event.currentTarget)
      event.preventDefault()
      event.stopPropagation()
    },
    [activatePointCell],
  )
  const scatterShape: (props: { cx?: number; cy?: number; payload?: TPoint; }) => React.JSX.Element | null = useCallback(
    (props: { cx?: number; cy?: number; payload?: TPoint }) : React.JSX.Element | null => {
      const { cx, cy, payload }: { cx?: number; cy?: number; payload?: TPoint; } = props
      if (cx == null || cy == null || !payload) return null
      const isActive: boolean = payload.cellKey === activeCellKey
      return (
        <circle
          cx={cx}
          cy={cy}
          r={pointRadius}
          data-cell-key={payload.cellKey}
          fill={payload.color}
          stroke={isActive ? '#0f172a' : '#ffffff'}
          strokeWidth={isActive ? 1.75 : 0.75}
          role="button"
          tabIndex={0}
          aria-label={createScatterPointAccessibleName(payload, xAxis.label, yAxis.label)}
          aria-pressed={isActive}
          className={styles.scatterClickablePoint}
          onClick={handlePointClick}
          onKeyDown={handlePointKeyDown}
        />
      )
    },
    [activeCellKey, handlePointClick, handlePointKeyDown, pointRadius, xAxis.label, yAxis.label],
  )

  return (
    <ChartCard
      title={title}
      className={styles.selfChartCard}
      titleAction={(
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.btnNeutral} ${styles.chartClearSelectionButton} ${
            activeCellKey ? '' : styles.chartActionHidden
          }`}
          aria-hidden={!activeCellKey}
          aria-label="선택 초기화"
          disabled={!activeCellKey}
          tabIndex={activeCellKey ? 0 : -1}
          title="선택 초기화"
          onClick={onClearSelection}
        >
          선택 초기화
        </button>
      )}
    >
      <div ref={chartBodyRef} className={styles.selfChartBody}>
        {loading ? (
          <LoadingSpinner label="그래프 데이터를 불러오는 중" />
        ) : chartReady ? (
          <ScatterChart
            width={width}
            height={height}
            data={data}
            margin={SCATTER_CHART_MARGIN}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xAxis.name}
              unit={xAxis.unit}
              tickFormatter={xAxis.tickFormatter}
              tick={AXIS_TICK_STYLE}
              label={xAxisLabel}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yAxis.name}
              unit={yAxis.unit}
              tick={AXIS_TICK_STYLE}
              width={yAxis.width ?? 38}
              tickMargin={yAxis.tickMargin ?? 4}
              label={yAxisLabel}
            />
            <Tooltip content={renderTooltip} />
            <Scatter fill={fill} shape={scatterShape} />
          </ScatterChart>
        ) : (
          <LoadingSpinner label="그래프 영역을 준비하는 중" />
        )}
      </div>
    </ChartCard>
  )
}
