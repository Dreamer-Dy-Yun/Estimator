import { useEffect, useId, useRef, useState, type WheelEvent } from 'react'
import { dashboardApi, getCompanyUuidForOptionalScope, type ProductMonthlyTrend } from '../../../../api'
import { useAuth } from '../../../../auth/AuthContext'
import type { ApiUnitErrorInfo, MonthlySalesPoint } from '../../../../types'
import { monthToEndDate, monthToStartDate } from '../../../../utils/date'
import { buildShadeRanges, normalizeMonthKey } from '../../trend/trendRangeUtils'
import { makeApiErrorInfo } from '../apiErrorInfo'

const COMPETITOR_CHANNEL_FALLBACK_LABEL = '경쟁사'

export type ProductMonthlyTrendModelArgs = {
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  onForecastMonthsChange: (months: number) => void
  channelId: string
  fallbackChannelLabel: string
  fallbackTrend: MonthlySalesPoint[]
  pageName: string
}

type SalesSeriesPoint = {
  date: string
  isForecast: boolean
  idx: number
  sales: number
  competitorSales: number | null
}

type ShadeRange = { x1: number; x2: number }

const shiftShade = (
  shade: ShadeRange | null | undefined,
  viewStart: number,
  viewEnd: number,
  collapseWhenOutside = false,
) => {
  if (!shade) return null
  const min = -0.5
  const max = Math.max(0, viewEnd - viewStart) + 0.5
  const x1 = Math.max(min, shade.x1 - viewStart)
  const x2 = Math.min(max, shade.x2 - viewStart)
  if (x2 < x1) return collapseWhenOutside ? { x1, x2: x1 } : null
  return { x1, x2 }
}

const getViewRange = (
  salesSeries: SalesSeriesPoint[],
  periodStartIdx: number,
  periodEndIdx: number,
  windowSize: number,
) => {
  const lastSeriesIdx = salesSeries.length - 1
  if (salesSeries.some((point) => point.isForecast)) {
    return {
      viewEnd: lastSeriesIdx,
      viewStart: Math.max(0, lastSeriesIdx - windowSize + 1),
    }
  }
  const center = (periodStartIdx + periodEndIdx) / 2
  let viewStart = Math.max(0, Math.round(center) - Math.floor(windowSize / 2))
  const viewEnd = Math.min(lastSeriesIdx, viewStart + windowSize - 1)
  if (viewEnd - viewStart + 1 < windowSize) viewStart = Math.max(0, viewEnd - windowSize + 1)
  return { viewStart, viewEnd }
}

export function useProductMonthlyTrendModel({
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastMonths,
  onForecastMonthsChange,
  channelId,
  fallbackChannelLabel,
  fallbackTrend,
  pageName,
}: ProductMonthlyTrendModelArgs) {
  const { selectedCompanyUuid } = useAuth()
  const companyUuid = getCompanyUuidForOptionalScope(selectedCompanyUuid)
  const forecastMonthsLabelId = useId()
  const forecastComboRef = useRef<HTMLDivElement | null>(null)
  const reqSeqRef = useRef(0)
  const [forecastComboOpenForSkuGroupKey, setForecastComboOpenForSkuGroupKey] = useState<string | null>(null)
  const [monthlyTrendState, setMonthlyTrendState] = useState<{
    data: ProductMonthlyTrend | null
    error: ApiUnitErrorInfo | null
  } | null>(null)
  const [salesTrendVisible, setSalesTrendVisible] = useState({ self: true, competitor: true })
  const [chartHoveredSkuGroupKey, setChartHoveredSkuGroupKey] = useState<string | null>(null)
  const forecastComboOpen = forecastComboOpenForSkuGroupKey === skuGroupKey
  const chartHovered = chartHoveredSkuGroupKey === skuGroupKey

  useEffect(() => {
    if (!forecastComboOpen) return
    const closeForecastCombo = () => setForecastComboOpenForSkuGroupKey(null)
    const onDocDown = (event: MouseEvent) => {
      const el = forecastComboRef.current
      if (el && !el.contains(event.target as Node)) closeForecastCombo()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closeForecastCombo()
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

  useEffect(() => {
    let alive = true
    const reqSeq = ++reqSeqRef.current
    queueMicrotask(() => {
      if (!alive || reqSeq !== reqSeqRef.current) return
      setMonthlyTrendState(null)
      if (!channelId) return
      void dashboardApi.getProductMonthlyTrend(skuGroupKey, {
        startDate,
        endDate,
        companyUuid,
        forecastMonths,
        competitorChannelId: channelId,
      }).then(
        (data) => {
          if (alive && reqSeq === reqSeqRef.current) setMonthlyTrendState({ data, error: null })
        },
        (err) => {
          if (!alive || reqSeq !== reqSeqRef.current) return
          setMonthlyTrendState({
            data: null,
            error: makeApiErrorInfo(
              pageName,
              `getProductMonthlyTrend(${JSON.stringify({ skuGroupKey, startDate, endDate, companyUuid, forecastMonths, competitorChannelId: channelId })})`,
              err,
            ),
          })
        },
      )
    })
    return () => {
      alive = false
    }
  }, [channelId, companyUuid, endDate, forecastMonths, pageName, skuGroupKey, startDate])

  const monthlyTrend = channelId ? monthlyTrendState?.data ?? null : null
  const monthlyTrendError = channelId ? monthlyTrendState?.error ?? null : null
  const salesSeries: SalesSeriesPoint[] = monthlyTrend
    ? monthlyTrend.points.map((point, idx) => ({
      date: point.date,
      isForecast: Boolean(point.isForecast),
      idx,
      sales: Math.round(point.selfSales),
      competitorSales: point.competitorSales,
    }))
    : fallbackTrend.map((point, idx) => ({
      date: point.date,
      isForecast: Boolean(point.isForecast),
      idx,
      sales: Math.round(point.sales),
      competitorSales: null,
    }))
  const { periodStartIdx, periodEndIdx, periodShade, forecastShade } = buildShadeRanges(
    salesSeries,
    selectedStart,
    selectedEnd,
  )
  const periodLen = Math.max(1, periodEndIdx - periodStartIdx + 1)
  const requiredSpan = periodStartIdx <= salesSeries.length - 1
    ? salesSeries.length - periodStartIdx
    : salesSeries.length
  const baseWindowSize = Math.min(salesSeries.length, Math.max(8, periodLen * 2, requiredSpan))
  const windowSizeKey = `${skuGroupKey}:${baseWindowSize}`
  const [windowSizeState, setWindowSizeState] = useState<{ key: string; value: number } | null>(null)
  const windowSize = windowSizeState?.key === windowSizeKey ? windowSizeState.value : baseWindowSize
  const { viewStart, viewEnd } = getViewRange(salesSeries, periodStartIdx, periodEndIdx, windowSize)

  const firstForecastIdx = salesSeries.findIndex((point) => point.isForecast)
  const chartData = salesSeries.map((point, idx) => ({
    ...point,
    actual: point.isForecast ? null : point.sales,
    competitorActual: point.isForecast ? null : point.competitorSales,
    forecastLink: firstForecastIdx !== -1 && (idx === firstForecastIdx - 1 || idx >= firstForecastIdx)
      ? point.sales
      : null,
  }))
  const trendWindowData = chartData.slice(viewStart, viewEnd + 1).map((row, idx) => ({ ...row, idx }))
  const salesTrendYMax = (() => {
    let max = 0
    for (let i = Math.max(0, viewStart); i <= Math.min(viewEnd, chartData.length - 1); i += 1) {
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
  })()

  const onChartWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!chartHovered) return
    event.preventDefault()
    const next = event.deltaY > 0 ? windowSize + 2 : windowSize - 2
    setWindowSizeState({
      key: windowSizeKey,
      value: Math.max(Math.max(periodLen + 2, 6), Math.min(salesSeries.length, next)),
    })
  }

  return {
    forecastMonthsLabelId,
    forecastComboRef,
    forecastComboOpen,
    monthlyTrendError,
    salesTrendVisible,
    competitorTrendLabel: monthlyTrend?.competitorChannelLabel ?? fallbackChannelLabel ?? COMPETITOR_CHANNEL_FALLBACK_LABEL,
    trendWindowData,
    salesTrendChartDense: trendWindowData.length >= 18,
    salesTrendYMax,
    shiftedPeriodShade: shiftShade(periodShade, viewStart, viewEnd, true) ?? { x1: -0.5, x2: -0.5 },
    shiftedForecastShade: shiftShade(forecastShade, viewStart, viewEnd),
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
