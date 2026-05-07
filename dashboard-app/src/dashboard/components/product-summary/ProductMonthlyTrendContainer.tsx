import { useEffect, useId, useMemo, useRef, useState, type WheelEvent } from 'react'
import { dashboardApi, type ProductMonthlyTrend } from '../../../api'
import { ApiUnitErrorBadge } from '../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo, MonthlySalesPoint } from '../../../types'
import { monthToEndDate, monthToStartDate } from '../../../utils/date'
import { formatGroupedNumber } from '../../../utils/format'
import styles from '../common.module.css'
import { SalesTrendChart } from '../trend/SalesTrendChart'
import { buildShadeRanges, normalizeMonthKey } from '../trend/trendRangeUtils'
import { KO } from '../product-secondary/ko'
import { makeApiErrorInfo } from './apiErrorInfo'

type Props = {
  productId: string
  fallbackTrend: MonthlySalesPoint[]
  periodStart: string
  periodEnd: string
  forecastMonths: number
  onForecastMonthsChange: (months: number) => void
  channelId: string
  fallbackChannelLabel: string
  pageName: string
}

export function ProductMonthlyTrendContainer({
  productId,
  fallbackTrend,
  periodStart,
  periodEnd,
  forecastMonths,
  onForecastMonthsChange,
  channelId,
  fallbackChannelLabel,
  pageName,
}: Props) {
  const forecastMonthsLabelId = useId()
  const forecastComboRef = useRef<HTMLDivElement | null>(null)
  const reqSeqRef = useRef(0)
  const [forecastComboOpen, setForecastComboOpen] = useState(false)
  const [monthlyTrend, setMonthlyTrend] = useState<ProductMonthlyTrend | null>(null)
  const [monthlyTrendError, setMonthlyTrendError] = useState<ApiUnitErrorInfo | null>(null)
  const [salesTrendVisible, setSalesTrendVisible] = useState({ self: true, competitor: true })
  const [chartHovered, setChartHovered] = useState(false)

  useEffect(() => {
    if (!forecastComboOpen) return
    const onDocDown = (e: MouseEvent) => {
      const el = forecastComboRef.current
      if (el && !el.contains(e.target as Node)) setForecastComboOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setForecastComboOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [forecastComboOpen])

  useEffect(() => {
    setForecastComboOpen(false)
  }, [productId])

  useEffect(() => {
    setChartHovered(false)
  }, [productId])

  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)
  const startDate = monthToStartDate(selectedStart)
  const endDate = monthToEndDate(selectedEnd)

  useEffect(() => {
    if (!channelId) {
      setMonthlyTrend(null)
      return
    }
    let alive = true
    const reqSeq = ++reqSeqRef.current
    void (async () => {
      try {
        const data = await dashboardApi.getProductMonthlyTrend(productId, {
          startDate,
          endDate,
          forecastMonths,
          competitorChannelId: channelId,
        })
        if (!alive || reqSeq !== reqSeqRef.current) return
        setMonthlyTrend(data)
        setMonthlyTrendError(null)
      } catch (err) {
        if (!alive || reqSeq !== reqSeqRef.current) return
        setMonthlyTrend(null)
        setMonthlyTrendError(
          makeApiErrorInfo(
            pageName,
            `getProductMonthlyTrend(${JSON.stringify({ productId, startDate, endDate, forecastMonths, competitorChannelId: channelId })})`,
            err,
          ),
        )
      }
    })()
    return () => {
      alive = false
    }
  }, [channelId, endDate, forecastMonths, pageName, productId, startDate])

  const salesSeries = useMemo(() => {
    if (monthlyTrend != null) {
      return monthlyTrend.points.map((point, idx) => ({
        date: point.date,
        isForecast: point.isForecast,
        idx,
        sales: Math.round(point.selfSales),
        competitorSales: point.competitorSales,
      }))
    }
    return fallbackTrend.map((point, idx) => ({
      ...point,
      idx,
      sales: Math.round(point.sales),
      competitorSales: null as number | null,
    }))
  }, [fallbackTrend, monthlyTrend])

  const competitorTrendLabel =
    monthlyTrend?.competitorChannelLabel
    ?? fallbackChannelLabel
    ?? KO.labelCompetitorChannel

  const { periodStartIdx, periodEndIdx, periodShade, forecastShade } = useMemo(
    () => buildShadeRanges(salesSeries, selectedStart, selectedEnd),
    [salesSeries, selectedEnd, selectedStart],
  )

  const periodLen = Math.max(1, periodEndIdx - periodStartIdx + 1)
  const lastSeriesIdx = salesSeries.length - 1
  const requiredSpan =
    periodStartIdx <= lastSeriesIdx ? lastSeriesIdx - periodStartIdx + 1 : salesSeries.length
  const baseWindowSize = Math.min(
    salesSeries.length,
    Math.max(8, periodLen * 2, requiredSpan),
  )
  const [windowSize, setWindowSize] = useState(baseWindowSize)

  useEffect(() => {
    setWindowSize(baseWindowSize)
  }, [baseWindowSize, productId])

  const hasForecastInSeries = salesSeries.some((p) => p.isForecast)

  let viewStart: number
  let viewEnd: number
  if (hasForecastInSeries) {
    viewEnd = lastSeriesIdx
    viewStart = Math.max(0, viewEnd - windowSize + 1)
  } else {
    const center = (periodStartIdx + periodEndIdx) / 2
    const half = Math.floor(windowSize / 2)
    viewStart = Math.max(0, Math.round(center) - half)
    viewEnd = Math.min(lastSeriesIdx, viewStart + windowSize - 1)
    if (viewEnd - viewStart + 1 < windowSize) {
      viewStart = Math.max(0, viewEnd - windowSize + 1)
    }
  }

  const chartData = useMemo(() => {
    const firstForecastIdx = salesSeries.findIndex((point) => point.isForecast)
    const hasForecast = firstForecastIdx !== -1

    const out: Array<typeof salesSeries[number] & {
      actual: number | null
      competitorActual: number | null
      forecastLink: number | null
    }> = []

    for (let idx = 0; idx < salesSeries.length; idx += 1) {
      const point = salesSeries[idx]!
      out.push({
        ...point,
        actual: point.isForecast ? null : point.sales,
        competitorActual: point.isForecast ? null : point.competitorSales,
        forecastLink: hasForecast && (idx === firstForecastIdx - 1 || idx >= firstForecastIdx)
          ? point.sales
          : null,
      })
    }
    return out
  }, [salesSeries])

  const trendWindowData = useMemo(
    () => chartData.slice(viewStart, viewEnd + 1).map((row, i) => ({ ...row, idx: i })),
    [chartData, viewEnd, viewStart],
  )

  const salesTrendChartDense = trendWindowData.length >= 18

  const shiftedPeriodShade = useMemo(() => {
    const min = -0.5
    const max = Math.max(0, viewEnd - viewStart) + 0.5
    const x1 = Math.max(min, periodShade.x1 - viewStart)
    const x2 = Math.min(max, periodShade.x2 - viewStart)
    return { x1, x2: Math.max(x1, x2) }
  }, [periodShade.x1, periodShade.x2, viewEnd, viewStart])

  const shiftedForecastShade = useMemo(() => {
    if (!forecastShade) return null
    const min = -0.5
    const max = Math.max(0, viewEnd - viewStart) + 0.5
    const x1 = Math.max(min, forecastShade.x1 - viewStart)
    const x2 = Math.min(max, forecastShade.x2 - viewStart)
    if (x2 < x1) return null
    return { x1, x2 }
  }, [forecastShade, viewEnd, viewStart])

  const salesTrendYMax = useMemo(() => {
    let m = 0
    const from = Math.max(0, Math.min(viewStart, chartData.length - 1))
    const to = Math.max(from, Math.min(viewEnd, chartData.length - 1))
    for (let i = from; i <= to; i += 1) {
      const row = chartData[i]
      if (!row) continue
      m = Math.max(
        m,
        salesTrendVisible.self ? row.actual ?? 0 : 0,
        salesTrendVisible.self ? row.forecastLink ?? 0 : 0,
        salesTrendVisible.competitor ? row.competitorActual ?? 0 : 0,
      )
    }
    if (m <= 0) return 100
    return Math.ceil(m * 1.06)
  }, [chartData, salesTrendVisible.competitor, salesTrendVisible.self, viewStart, viewEnd])

  const toggleSalesTrendSeries = (series: 'self' | 'competitor') => {
    setSalesTrendVisible((prev) => ({ ...prev, [series]: !prev[series] }))
  }

  const onChartWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!chartHovered) return
    event.preventDefault()
    const next = event.deltaY > 0 ? windowSize + 2 : windowSize - 2
    const minWindow = Math.max(periodLen + 2, 6)
    setWindowSize(Math.max(minWindow, Math.min(salesSeries.length, next)))
  }

  return (
    <div className={`${styles.card} ${styles.drawerSalesTrendCard}`}>
      <div className={styles.salesTrendTitleRow}>
        <div className={styles.cardTitle}>
          판매추이(월간)
          <ApiUnitErrorBadge error={monthlyTrendError} />
        </div>
        <div className={styles.salesTrendControls}>
          <div className={styles.forecastMonthsControl}>
            <span className={styles.forecastMonthsLabel} id={forecastMonthsLabelId}>
              예측 개월
            </span>
            <div className={styles.forecastComboWrap} ref={forecastComboRef}>
              <button
                type="button"
                className={styles.forecastComboTrigger}
                aria-haspopup="listbox"
                aria-expanded={forecastComboOpen}
                aria-labelledby={forecastMonthsLabelId}
                aria-label={`판매추이 포캐스트 개월 수, 현재 ${forecastMonths}`}
                onClick={() => setForecastComboOpen((o) => !o)}
              >
                {forecastMonths}
              </button>
              {forecastComboOpen && (
                <ul
                  className={styles.forecastComboList}
                  role="listbox"
                  aria-labelledby={forecastMonthsLabelId}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <li key={n} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={n === forecastMonths}
                        className={
                          n === forecastMonths
                            ? `${styles.forecastComboOption} ${styles.forecastComboOptionSelected}`
                            : styles.forecastComboOption
                        }
                        onClick={() => {
                          onForecastMonthsChange(n)
                          setForecastComboOpen(false)
                        }}
                      >
                        {n}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={styles.trendSeriesToggle} aria-label="판매추이 표시 항목">
            <button
              type="button"
              aria-pressed={salesTrendVisible.self}
              className={
                salesTrendVisible.self
                  ? `${styles.trendSeriesButton} ${styles.trendSeriesButtonSelected}`
                  : styles.trendSeriesButton
              }
              onClick={() => toggleSalesTrendSeries('self')}
            >
              자사
            </button>
            <button
              type="button"
              aria-pressed={salesTrendVisible.competitor}
              className={
                salesTrendVisible.competitor
                  ? `${styles.trendSeriesButton} ${styles.trendSeriesButtonSelected}`
                  : styles.trendSeriesButton
              }
              onClick={() => toggleSalesTrendSeries('competitor')}
            >
              {competitorTrendLabel}
            </button>
          </div>
        </div>
      </div>
      <div
        onMouseEnter={() => setChartHovered(true)}
        onMouseLeave={() => setChartHovered(false)}
        onWheel={onChartWheel}
      >
        <div className={styles.chartClipWrap}>
          <SalesTrendChart
            data={trendWindowData}
            height={salesTrendChartDense ? 232 : 210}
            yMax={salesTrendYMax}
            allowEscapeViewBox={{ x: false, y: false }}
            periodShade={shiftedPeriodShade}
            forecastShade={shiftedForecastShade}
            minTickGap={salesTrendChartDense ? 0 : 8}
            interval={salesTrendChartDense ? 0 : 'preserveStartEnd'}
            tickAngle={salesTrendChartDense ? -38 : 0}
            tickHeight={salesTrendChartDense ? 42 : undefined}
            lines={[
              ...(salesTrendVisible.self
                ? [
                    { dataKey: 'actual', stroke: '#2563eb' },
                    { dataKey: 'forecastLink', stroke: '#2563eb', strokeDasharray: '4 4' },
                  ]
                : []),
              ...(salesTrendVisible.competitor
                ? [{ dataKey: 'competitorActual', stroke: '#e11d48' }]
                : []),
            ]}
            tooltipValueFormatter={(value, name) => {
              if (name === 'actual') return [formatGroupedNumber(value), '판매 실적']
              if (name === 'competitorActual') return [formatGroupedNumber(value), `${competitorTrendLabel} 판매`]
              if (name === 'forecastLink') return [formatGroupedNumber(value), '판매 예측']
              return [formatGroupedNumber(value), name]
            }}
            tooltipLabelFormatter={(row) => String(row.date ?? '')}
            tickFormatter={(row) => String(row.date ?? '')}
          />
        </div>
      </div>
    </div>
  )
}
