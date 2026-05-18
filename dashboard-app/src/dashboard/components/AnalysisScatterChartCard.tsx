import { useCallback, useMemo, type MouseEventHandler, type ReactNode, type RefObject } from 'react'
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import styles from './common.module.css'
import { ChartCard } from './ChartCard'
import type { AnalysisScatterGridPointBase } from '../model/analysisScatterGridPoint'

type AxisConfig = {
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
  chartBodyRef: RefObject<HTMLDivElement | null>
  chartReady: boolean
  width: number
  height: number
  loading?: boolean
  pointRadius: number
  activeCellKey: string | null
  onCellClick: (cellKey: string) => void
  onClearSelection: () => void
  renderTooltip: (props: { active?: boolean; payload?: ReadonlyArray<{ payload?: TPoint }> }) => ReactNode
  xAxis: AxisConfig
  yAxis: AxisConfig
  fill?: string
}

const SCATTER_CHART_MARGIN = { top: 8, right: 8, bottom: 22, left: 8 }
const AXIS_TICK_STYLE = { fontSize: 10 }
const POINT_CURSOR_STYLE = { cursor: 'pointer' }
const DEFAULT_AXIS_LABEL_COLOR = '#475569'

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
}: Props<TPoint>) {
  const xAxisLabel = useMemo(
    () => ({
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
  const yAxisLabel = useMemo(
    () => ({
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
  const handlePointClick = useCallback<MouseEventHandler<SVGCircleElement>>(
    (event) => {
      const cellKey = event.currentTarget.dataset.cellKey
      if (!cellKey) return
      event.stopPropagation()
      onCellClick(cellKey)
    },
    [onCellClick],
  )
  const scatterShape = useCallback(
    (props: { cx?: number; cy?: number; payload?: TPoint }) => {
      const { cx, cy, payload } = props
      if (cx == null || cy == null || !payload) return null
      const isActive = payload.cellKey === activeCellKey
      return (
        <circle
          cx={cx}
          cy={cy}
          r={pointRadius}
          data-cell-key={payload.cellKey}
          fill={payload.color}
          stroke={isActive ? '#0f172a' : '#ffffff'}
          strokeWidth={isActive ? 1.75 : 0.75}
          style={POINT_CURSOR_STYLE}
          onClick={handlePointClick}
        />
      )
    },
    [activeCellKey, handlePointClick, pointRadius],
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
