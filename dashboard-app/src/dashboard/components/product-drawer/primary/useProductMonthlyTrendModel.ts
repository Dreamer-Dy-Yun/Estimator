import { useEffect, useId, useMemo, useRef, useState, type WheelEvent } from 'react'
import { dashboardApi, type ProductMonthlyTrend } from '../../../../api'
import type { ApiUnitErrorInfo, MonthlySalesPoint } from '../../../../types'
import { monthToEndDate, monthToStartDate } from '../../../../utils/date'
import { buildShadeRanges, normalizeMonthKey } from '../../trend/trendRangeUtils'
import { makeApiErrorInfo } from '../apiErrorInfo'

const COMPETITOR_CHANNEL_FALLBACK_LABEL = '경쟁사'

export type ProductMonthlyTrendModelArgs = {
  skuGroupKey: string
  fallbackTrend: MonthlySalesPoint[]
  periodStart: string
  periodEnd: string
  forecastMonths: number
  onForecastMonthsChange: (months: number) => void
  channelId: string
  fallbackChannelLabel: string
  pageName: string
}

type MonthlyTrendState = {
  key: string
  data: ProductMonthlyTrend | null
  error: ApiUnitErrorInfo | null
}

export function useProductMonthlyTrendModel({
  skuGroupKey,
  fallbackTrend,
  periodStart,
  periodEnd,
  forecastMonths,
  onForecastMonthsChange,
  channelId,
  fallbackChannelLabel,
  pageName,
}: ProductMonthlyTrendModelArgs) {
  const forecastMonthsLabelId = useId()
  const forecastComboRef = useRef<HTMLDivElement | null>(null)
  const reqSeqRef = useRef(0)
  const [forecastComboOpenForSkuGroupKey, setForecastComboOpenForSkuGroupKey] = useState<string | null>(null)
  const [monthlyTrendState, setMonthlyTrendState] = useState<MonthlyTrendState | null>(null)
  const [salesTrendVisible, setSalesTrendVisible] = useState({ self: true, competitor: true })
  const [chartHoveredSkuGroupKey, setChartHoveredSkuGroupKey] = useState<string | null>(null)
  const forecastComboOpen = forecastComboOpenForSkuGroupKey === skuGroupKey
  const chartHovered = chartHoveredSkuGroupKey === skuGroupKey

  useEffect(() => {
    if (!forecastComboOpen) return
    const onDocDown = (event: MouseEvent) => {
      const el = forecastComboRef.current
      if (el && !el.contains(event.target as Node)) setForecastComboOpenForSkuGroupKey(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setForecastComboOpenForSkuGroupKey(null)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [forecastComboOpen])

  const selectedStart = normalizeMonthKey(periodStart)
  const selectedEnd = normalizeMonthKey(periodEnd)
  const startDate = monthToStartDate(selectedStart)
  const endDate = monthToEndDate(selectedEnd)
  const monthlyTrendRequestKey = JSON.stringify({
    skuGroupKey,
    startDate,
    endDate,
    forecastMonths,
    competitorChannelId: channelId,
  })
  const monthlyTrend =
    channelId && monthlyTrendState?.key === monthlyTrendRequestKey ? monthlyTrendState.data : null
  const monthlyTrendError =
    channelId && monthlyTrendState?.key === monthlyTrendRequestKey ? monthlyTrendState.error : null

  useEffect(() => {
    if (!channelId) return
    let alive = true
    const reqSeq = ++reqSeqRef.current
    void (async () => {
      try {
        const data = await dashboardApi.getProductMonthlyTrend(skuGroupKey, {
          startDate,
          endDate,
          forecastMonths,
          competitorChannelId: channelId,
        })
        if (!alive || reqSeq !== reqSeqRef.current) return
        setMonthlyTrendState({ key: monthlyTrendRequestKey, data, error: null })
      } catch (err) {
        if (!alive || reqSeq !== reqSeqRef.current) return
        setMonthlyTrendState({
          key: monthlyTrendRequestKey,
          data: null,
          error: makeApiErrorInfo(
            pageName,
            `getProductMonthlyTrend(${JSON.stringify({ skuGroupKey, startDate, endDate, forecastMonths, competitorChannelId: channelId })})`,
            err,
          ),
        })
      }
    })()
    return () => {
      alive = false
    }
  }, [channelId, endDate, forecastMonths, monthlyTrendRequestKey, pageName, skuGroupKey, startDate])

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
    ?? COMPETITOR_CHANNEL_FALLBACK_LABEL

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
  const windowSizeKey = `${skuGroupKey}:${baseWindowSize}`
  const [windowSizeState, setWindowSizeState] = useState<{ key: string; value: number } | null>(null)
  const windowSize = windowSizeState?.key === windowSizeKey ? windowSizeState.value : baseWindowSize

  const hasForecastInSeries = salesSeries.some((point) => point.isForecast)
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

    return salesSeries.map((point, idx) => ({
      ...point,
      actual: point.isForecast ? null : point.sales,
      competitorActual: point.isForecast ? null : point.competitorSales,
      forecastLink: hasForecast && (idx === firstForecastIdx - 1 || idx >= firstForecastIdx)
        ? point.sales
        : null,
    }))
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
    let max = 0
    const from = Math.max(0, Math.min(viewStart, chartData.length - 1))
    const to = Math.max(from, Math.min(viewEnd, chartData.length - 1))
    for (let i = from; i <= to; i += 1) {
      const row = chartData[i]
      if (!row) continue
      max = Math.max(
        max,
        salesTrendVisible.self ? row.actual ?? 0 : 0,
        salesTrendVisible.self ? row.forecastLink ?? 0 : 0,
        salesTrendVisible.competitor ? row.competitorActual ?? 0 : 0,
      )
    }
    return max <= 0 ? 100 : Math.ceil(max * 1.06)
  }, [chartData, salesTrendVisible.competitor, salesTrendVisible.self, viewStart, viewEnd])

  const onChartWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!chartHovered) return
    event.preventDefault()
    const next = event.deltaY > 0 ? windowSize + 2 : windowSize - 2
    const minWindow = Math.max(periodLen + 2, 6)
    setWindowSizeState({
      key: windowSizeKey,
      value: Math.max(minWindow, Math.min(salesSeries.length, next)),
    })
  }

  return {
    forecastMonthsLabelId,
    forecastComboRef,
    forecastComboOpen,
    monthlyTrendError,
    salesTrendVisible,
    competitorTrendLabel,
    trendWindowData,
    salesTrendChartDense,
    salesTrendYMax,
    shiftedPeriodShade,
    shiftedForecastShade,
    onChartWheel,
    onChartMouseEnter: () => setChartHoveredSkuGroupKey(skuGroupKey),
    onChartMouseLeave: () => setChartHoveredSkuGroupKey(null),
    toggleForecastCombo: () => setForecastComboOpenForSkuGroupKey((current) => (
      current === skuGroupKey ? null : skuGroupKey
    )),
    selectForecastMonths: (months: number) => {
      onForecastMonthsChange(months)
      setForecastComboOpenForSkuGroupKey(null)
    },
    toggleSalesTrendSeries: (series: 'self' | 'competitor') => {
      setSalesTrendVisible((prev) => ({ ...prev, [series]: !prev[series] }))
    },
  }
}
