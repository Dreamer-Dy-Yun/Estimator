import { Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type TrendShade = {
  x1: number
  x2: number
}

export type TrendLineSeries = {
  dataKey: string
  stroke: string
  strokeDasharray?: string
  connectNulls?: boolean
  yAxisId?: 'primary' | 'secondary'
}

export type TrendBarSeries = {
  dataKey: string
  name: string
  fill: string
  fillOpacity?: number
  stackId?: string
  barSize?: number
}

type TrendChartPoint = {
  idx: number
  date: string
  [key: string]: unknown
}

type Props = {
  data: TrendChartPoint[]
  height: number
  yScale?: 'linear' | 'log'
  yMax?: number
  secondaryYMax?: number
  periodShade: TrendShade
  forecastShade: TrendShade | null
  lines: TrendLineSeries[]
  bars?: TrendBarSeries[]
  barsUseSecondaryAxis?: boolean
  xTicks?: number[]
  tickFormatter?: (row: TrendChartPoint) => string
  tickAngle?: number
  tickHeight?: number
  minTickGap?: number
  interval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd' | 'equidistantPreserveStart'
  allowEscapeViewBox?: { x: boolean; y: boolean }
  tooltipValueFormatter: (value: number, name: string) => [string, string]
  tooltipLabelFormatter: (row: TrendChartPoint) => string
}

export function SalesTrendChart({
  data,
  height,
  yScale = 'linear',
  yMax,
  secondaryYMax,
  periodShade,
  forecastShade,
  lines,
  bars = [],
  barsUseSecondaryAxis = false,
  xTicks,
  tickFormatter,
  tickAngle = 0,
  tickHeight,
  minTickGap = 8,
  interval = 'preserveStartEnd',
  allowEscapeViewBox = { x: true, y: true },
  tooltipValueFormatter,
  tooltipLabelFormatter,
}: Props) {
  const hasSecondaryLine = lines.some((line) => line.yAxisId === 'secondary')
  const needsSecondaryAxis = barsUseSecondaryAxis || hasSecondaryLine
  const resolvedSecondaryYMax = (() => {
    if (typeof secondaryYMax === 'number') return secondaryYMax
    if (!needsSecondaryAxis) return undefined
    const maxFromBars = bars.reduce((acc, bar) => {
      const m = data.reduce((rowMax, row) => {
        const v = Number(row[bar.dataKey])
        return Number.isFinite(v) ? Math.max(rowMax, v) : rowMax
      }, 0)
      return Math.max(acc, m)
    }, 0)
    const maxFromSecondaryLines = lines
      .filter((line) => line.yAxisId === 'secondary')
      .reduce((acc, line) => {
        const m = data.reduce((rowMax, row) => {
          const v = Number(row[line.dataKey])
          return Number.isFinite(v) ? Math.max(rowMax, v) : rowMax
        }, 0)
        return Math.max(acc, m)
      }, 0)
    const maxFromSecondary = Math.max(maxFromBars, maxFromSecondaryLines)
    return maxFromSecondary <= 0 ? 10 : Math.ceil(maxFromSecondary * 1.08)
  })()
  const hasSecondaryAxis = needsSecondaryAxis && typeof resolvedSecondaryYMax === 'number'
  const resolvedPrimaryYMax = (() => {
    if (typeof yMax === 'number') return yMax
    const maxFromLines = lines.reduce((acc, line) => {
      const m = data.reduce((rowMax, row) => {
        const v = Number(row[line.dataKey])
        return Number.isFinite(v) ? Math.max(rowMax, v) : rowMax
      }, 0)
      return Math.max(acc, m)
    }, 0)
    return maxFromLines <= 0 ? 10 : Math.ceil(maxFromLines * 1.12)
  })()
  const primaryYDomain: [number | 'auto', number | 'auto'] =
    yScale === 'log' ? ['auto', 'auto'] : [0, resolvedPrimaryYMax]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: hasSecondaryAxis ? 18 : 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <ReferenceArea
          xAxisId={0}
          yAxisId="primary"
          x1={periodShade.x1}
          x2={periodShade.x2}
          fill="#16a34a"
          fillOpacity={0.18}
          ifOverflow="hidden"
        />
        {forecastShade && (
          <ReferenceArea
            xAxisId={0}
            yAxisId="primary"
            x1={forecastShade.x1}
            x2={forecastShade.x2}
            fill="#ef4444"
            fillOpacity={0.1}
            ifOverflow="hidden"
          />
        )}
        <XAxis
          type="number"
          dataKey="idx"
          domain={[-0.5, Math.max(0, data.length - 0.5)]}
          ticks={xTicks}
          tickFormatter={(value) => {
            const row = data[Math.round(Number(value))]
            if (!row) return ''
            return tickFormatter ? tickFormatter(row) : row.date
          }}
          tick={{ fontSize: 9, angle: tickAngle, textAnchor: tickAngle === 0 ? 'middle' : 'end' }}
          height={tickHeight}
          interval={interval}
          minTickGap={minTickGap}
          allowDataOverflow
        />
        <YAxis
          yAxisId="primary"
          domain={primaryYDomain}
          scale={yScale}
          tick={{ fontSize: 9 }}
          width={40}
          tickMargin={4}
          allowDataOverflow={yScale === 'log'}
        />
        {hasSecondaryAxis && (
          <YAxis
            yAxisId="secondary"
            orientation="right"
            domain={[0, resolvedSecondaryYMax]}
            tick={{ fontSize: 9 }}
            width={40}
            tickMargin={4}
          />
        )}
        <Tooltip
          allowEscapeViewBox={allowEscapeViewBox}
          offset={6}
          wrapperStyle={{ outline: 'none', zIndex: 20 }}
          contentStyle={{
            whiteSpace: 'normal',
            fontSize: 11,
            lineHeight: 1.3,
            padding: '6px 8px',
            maxWidth: 220,
          }}
          labelStyle={{ fontSize: 11, marginBottom: 4 }}
          itemStyle={{ fontSize: 11, lineHeight: 1.3 }}
          formatter={(value, name) => tooltipValueFormatter(Number(value), String(name))}
          labelFormatter={(label) => {
            const row = data[Math.round(Number(label))]
            if (!row) return ''
            return tooltipLabelFormatter(row)
          }}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            yAxisId={hasSecondaryAxis ? 'secondary' : 'primary'}
            dataKey={bar.dataKey}
            name={bar.name}
            stackId={bar.stackId}
            fill={bar.fill}
            fillOpacity={bar.fillOpacity ?? 0.55}
            barSize={bar.barSize ?? 10}
          />
        ))}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            yAxisId={line.yAxisId ?? 'primary'}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.stroke}
            strokeDasharray={line.strokeDasharray}
            strokeWidth={1.5}
            dot={false}
            connectNulls={line.connectNulls ?? false}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
