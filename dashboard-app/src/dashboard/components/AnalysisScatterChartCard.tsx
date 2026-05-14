import { useCallback, type ReactNode, type RefObject } from 'react'
import { CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import styles from './common.module.css'
import { ChartCard } from './ChartCard'

export type AnalysisScatterGridPointBase = {
  cellKey: string
  color: string
}

export type AnalysisScatterGridPoint = AnalysisScatterGridPointBase & {
  x: number
  y: number
  count: number
  xStart: number
  xEnd: number
  yStart: number
  yEnd: number
  hasMoreSkuIds: boolean
}

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
  pointRadius: number
  activeCellKey: string | null
  onCellClick: (cellKey: string) => void
  onClearSelection: () => void
  renderTooltip: (props: { active?: boolean; payload?: ReadonlyArray<{ payload?: TPoint }> }) => ReactNode
  xAxis: AxisConfig
  yAxis: AxisConfig
  fill?: string
}

export function AnalysisScatterChartCard<TPoint extends AnalysisScatterGridPointBase>({
  title,
  data,
  chartBodyRef,
  chartReady,
  width,
  height,
  pointRadius,
  activeCellKey,
  onCellClick,
  onClearSelection,
  renderTooltip,
  xAxis,
  yAxis,
  fill = '#f59e0b',
}: Props<TPoint>) {
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
          fill={payload.color}
          stroke={isActive ? '#0f172a' : '#ffffff'}
          strokeWidth={isActive ? 1.75 : 0.75}
          style={{ cursor: 'pointer' }}
          onClick={(event) => {
            event.stopPropagation()
            onCellClick(payload.cellKey)
          }}
        />
      )
    },
    [activeCellKey, onCellClick, pointRadius],
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
        {chartReady ? (
          <ScatterChart
            width={width}
            height={height}
            data={data}
            margin={{ top: 8, right: 8, bottom: 22, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xAxis.name}
              unit={xAxis.unit}
              tickFormatter={xAxis.tickFormatter}
              tick={{ fontSize: 10 }}
              label={{
                value: xAxis.label,
                position: 'insideBottom',
                offset: -10,
                style: { fill: xAxis.labelColor ?? '#475569', fontSize: 11, fontWeight: 600 },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yAxis.name}
              unit={yAxis.unit}
              tick={{ fontSize: 10 }}
              width={yAxis.width ?? 38}
              tickMargin={yAxis.tickMargin ?? 4}
              label={{
                value: yAxis.label,
                angle: -90,
                position: 'insideLeft',
                offset: 0,
                style: { fill: yAxis.labelColor ?? '#475569', fontSize: 11, fontWeight: 600 },
              }}
            />
            <Tooltip content={renderTooltip} />
            <Scatter fill={fill} shape={scatterShape} />
          </ScatterChart>
        ) : null}
      </div>
    </ChartCard>
  )
}
