import type { ProductComparisonBaseSubjectRef, ProductComparisonTarget, ProductMonthlyTrendPoint } from '../../../../api/types'
import { useEffect, useId, useRef, useState } from 'react'
import { dashboardApi, type ProductMonthlyTrend } from '../../../../api'
import type { ApiUnitErrorInfo, MonthlySalesPoint } from '../../../../types'
import { formatIsoDateLocal } from '../../../../utils/date'
import { buildShadeRanges, normalizeMonthKey } from '../../trend/trendRangeUtils'
import { makeApiErrorInfo } from '../apiErrorInfo'

const COMPARISON_TARGET_FALLBACK_LABEL = '비교 대상' as const

export type ProductMonthlyTrendModelArgs = {
  skuGroupKey: string
  baseSubject: ProductComparisonBaseSubjectRef
  comparisonTarget: ProductComparisonTarget | null
  periodStart: string
  periodEnd: string
  forecastMonths: number
  onForecastMonthsChange: (months: number) => void
  fallbackTrend: MonthlySalesPoint[]
  pageName: string
}

export type SalesSeriesPoint = {
  date: string
  isForecast: boolean
  idx: number
  sales: number
  comparisonSales: number | null
}

export type ShadeRange = { x1: number; x2: number }

const MONTHLY_TREND_HISTORY_MONTHS = 24 as const
const MONTHLY_TREND_FORECAST_MAX_MONTHS = 12 as const
const MONTHLY_TREND_MAX_VISIBLE_MONTHS: number = MONTHLY_TREND_HISTORY_MONTHS + MONTHLY_TREND_FORECAST_MAX_MONTHS

const buildMonthlyTrendRequestPeriod: (today?: Date) => { startDate: string; endDate: string; } = (today: Date = new Date()) : { startDate: string; endDate: string; } => {
  const previousMonth: Date = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const startMonth: Date = new Date(
    previousMonth.getFullYear(),
    previousMonth.getMonth() - (MONTHLY_TREND_HISTORY_MONTHS - 1),
    1,
  )
  const endOfPreviousMonth: Date = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)

  return {
    startDate: formatIsoDateLocal(startMonth),
    endDate: formatIsoDateLocal(endOfPreviousMonth),
  }
}

const shiftShade: (shade: ShadeRange | null | undefined, viewStart: number, viewEnd: number, collapseWhenOutside?: boolean) => { x1: number; x2: number; } | null = (
  shade: ShadeRange | null | undefined,
  viewStart: number,
  viewEnd: number,
  collapseWhenOutside: boolean = false,
) : { x1: number; x2: number; } | null => {
  if (!shade) return null
  const min: -0.5 = -0.5
  const max: number = Math.max(0, viewEnd - viewStart) + 0.5
  const x1: number = Math.max(min, shade.x1 - viewStart)
  const x2: number = Math.min(max, shade.x2 - viewStart)
  if (x2 < x1) return collapseWhenOutside ? { x1, x2: x1 } : null
  return { x1, x2 }
}

const getViewRange: (salesSeries: SalesSeriesPoint[], periodStartIdx: number, periodEndIdx: number, windowSize: number) => { viewEnd: number; viewStart: number; } = (
  salesSeries: SalesSeriesPoint[],
  periodStartIdx: number,
  periodEndIdx: number,
  windowSize: number,
) : { viewEnd: number; viewStart: number; } => {
  const lastSeriesIdx: number = salesSeries.length - 1
  if (salesSeries.some((point: SalesSeriesPoint) : boolean => point.isForecast)) {
    return {
      viewEnd: lastSeriesIdx,
      viewStart: Math.max(0, lastSeriesIdx - windowSize + 1),
    }
  }
  const center: number = (periodStartIdx + periodEndIdx) / 2
  let viewStart: number = Math.max(0, Math.round(center) - Math.floor(windowSize / 2))
  const viewEnd: number = Math.min(lastSeriesIdx, viewStart + windowSize - 1)
  if (viewEnd - viewStart + 1 < windowSize) viewStart = Math.max(0, viewEnd - windowSize + 1)
  return { viewStart, viewEnd }
}

export function useProductMonthlyTrendModel({
  skuGroupKey,
  baseSubject,
  comparisonTarget,
  periodStart,
  periodEnd,
  forecastMonths,
  onForecastMonthsChange,
  fallbackTrend,
  pageName,
}: ProductMonthlyTrendModelArgs) : { forecastMonthsLabelId: string; forecastComboRef: React.RefObject<HTMLDivElement | null>; forecastComboOpen: boolean; monthlyTrendError: ApiUnitErrorInfo | null; salesTrendVisible: { self: boolean; comparison: boolean; }; comparisonTrendLabel: string; trendWindowData: { idx: number; actual: number | null; comparisonActual: number | null; forecastLink: number | null; date: string; isForecast: boolean; sales: number; comparisonSales: number | null; }[]; salesTrendChartDense: boolean; salesTrendYMax: number; shiftedPeriodShade: { x1: number; x2: number; }; shiftedForecastShade: { x1: number; x2: number; } | null; onChartWheel: (event: React.WheelEvent<HTMLDivElement>) => void; onChartMouseEnter: () => void; onChartMouseLeave: () => void; toggleForecastCombo: () => void; selectForecastMonths: (months: number) => void; toggleSalesTrendSeries: (series: 'self' | 'comparison') => void; } {
  const forecastMonthsLabelId: string = useId()
  const forecastComboRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const reqSeqRef: React.RefObject<number> = useRef(0)
  const [forecastComboOpenForSkuGroupKey, setForecastComboOpenForSkuGroupKey]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [monthlyTrendState, setMonthlyTrendState]: [{ data: ProductMonthlyTrend | null; error: ApiUnitErrorInfo | null; } | null, React.Dispatch<React.SetStateAction<{ data: ProductMonthlyTrend | null; error: ApiUnitErrorInfo | null; } | null>>] = useState<{
    data: ProductMonthlyTrend | null
    error: ApiUnitErrorInfo | null
  } | null>(null)
  const [salesTrendVisible, setSalesTrendVisible]: [{ self: boolean; comparison: boolean; }, React.Dispatch<React.SetStateAction<{ self: boolean; comparison: boolean; }>>] = useState<{ self: boolean; comparison: boolean }>({ self: true, comparison: true })
  const [chartHoveredSkuGroupKey, setChartHoveredSkuGroupKey]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const forecastComboOpen: boolean = forecastComboOpenForSkuGroupKey === skuGroupKey
  const chartHovered: boolean = chartHoveredSkuGroupKey === skuGroupKey

  useEffect(() : (() => void) | undefined => {
    if (!forecastComboOpen) return
    const closeForecastCombo: () => void = () : void => setForecastComboOpenForSkuGroupKey(null)
    const onDocDown: (event: MouseEvent) => void = (event: MouseEvent) : void => {
      const el: HTMLDivElement | null = forecastComboRef.current
      if (el && !el.contains(event.target as Node)) closeForecastCombo()
    }
    const onKey: (event: KeyboardEvent) => void = (event: KeyboardEvent) : void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closeForecastCombo()
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () : void => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [forecastComboOpen])

  const selectedStart: string = normalizeMonthKey(periodStart)
  const selectedEnd: string = normalizeMonthKey(periodEnd)
  // 월간 추이 API는 완료된 월만 본다. 전월까지 포함한 최근 24개월을 요청한다.
  // 차트는 24개월 실제 + 최대 12개월 예측, 총 36개월까지만 표시한다.
  const { startDate, endDate }: { startDate: string; endDate: string; } = buildMonthlyTrendRequestPeriod()

  useEffect(() : () => void => {
    let alive: boolean = true
    const reqSeq: number = ++reqSeqRef.current
    queueMicrotask(() : void => {
      if (!alive || reqSeq !== reqSeqRef.current) return
      setMonthlyTrendState(null)
      if (comparisonTarget == null) return
      void dashboardApi.getProductMonthlyTrend(skuGroupKey, {
        startDate,
        endDate,
        forecastMonths,
        base: baseSubject,
        comparison: comparisonTarget,
      }).then(
        (data: ProductMonthlyTrend) : void => {
          if (alive && reqSeq === reqSeqRef.current) setMonthlyTrendState({ data, error: null })
        },
        (err: unknown) : void => {
          if (!alive || reqSeq !== reqSeqRef.current) return
          setMonthlyTrendState({
            data: null,
            error: makeApiErrorInfo(
              pageName,
              `getProductMonthlyTrend(${JSON.stringify({ skuGroupKey, startDate, endDate, forecastMonths, base: baseSubject, comparison: comparisonTarget })})`,
              err,
            ),
          })
        },
      )
    })
    return () : void => {
      alive = false
    }
  }, [baseSubject, comparisonTarget, endDate, forecastMonths, pageName, skuGroupKey, startDate])

  const monthlyTrend: ProductMonthlyTrend | null = comparisonTarget != null ? monthlyTrendState?.data ?? null : null
  const monthlyTrendError: ApiUnitErrorInfo | null = comparisonTarget != null ? monthlyTrendState?.error ?? null : null
  const salesSeries: SalesSeriesPoint[] = monthlyTrend
    ? monthlyTrend.points.map((point: ProductMonthlyTrendPoint, idx: number) : { date: string; isForecast: boolean; idx: number; sales: number; comparisonSales: number | null; } => ({
      date: point.date,
      isForecast: Boolean(point.isForecast),
      idx,
      sales: Math.round(point.baseSales),
      comparisonSales: point.comparisonSales,
    }))
    : fallbackTrend.map((point: MonthlySalesPoint, idx: number) : { date: string; isForecast: boolean; idx: number; sales: number; comparisonSales: null; } => ({
      date: point.date,
      isForecast: Boolean(point.isForecast),
      idx,
      sales: Math.round(point.sales),
      comparisonSales: null,
    }))
  const { periodStartIdx, periodEndIdx, periodShade, forecastShade }: { periodStartIdx: number; periodEndIdx: number; periodShade: { x1: number; x2: number; }; forecastShade: { x1: number; x2: number; } | null; } = buildShadeRanges(
    salesSeries,
    selectedStart,
    selectedEnd,
  )
  const periodLen: number = Math.max(1, periodEndIdx - periodStartIdx + 1)
  const maxWindowSize: number = Math.min(salesSeries.length, MONTHLY_TREND_MAX_VISIBLE_MONTHS)
  const baseWindowSize: number = maxWindowSize
  const windowSizeKey: string = `${skuGroupKey}:${baseWindowSize}`
  const [windowSizeState, setWindowSizeState]: [{ key: string; value: number; } | null, React.Dispatch<React.SetStateAction<{ key: string; value: number; } | null>>] = useState<{ key: string; value: number } | null>(null)
  const windowSize: number = windowSizeState?.key === windowSizeKey ? windowSizeState.value : baseWindowSize
  const { viewStart, viewEnd }: { viewEnd: number; viewStart: number; } = getViewRange(salesSeries, periodStartIdx, periodEndIdx, windowSize)

  const firstForecastIdx: number = salesSeries.findIndex((point: SalesSeriesPoint) : boolean => point.isForecast)
  const chartData: { actual: number | null; comparisonActual: number | null; forecastLink: number | null; date: string; isForecast: boolean; idx: number; sales: number; comparisonSales: number | null; }[] = salesSeries.map((point: SalesSeriesPoint, idx: number) : { actual: number | null; comparisonActual: number | null; forecastLink: number | null; date: string; isForecast: boolean; idx: number; sales: number; comparisonSales: number | null; } => ({
    ...point,
    actual: point.isForecast ? null : point.sales,
    comparisonActual: point.isForecast ? null : point.comparisonSales,
    forecastLink: firstForecastIdx !== -1 && (idx === firstForecastIdx - 1 || idx >= firstForecastIdx)
      ? point.sales
      : null,
  }))
  const trendWindowData: { idx: number; actual: number | null; comparisonActual: number | null; forecastLink: number | null; date: string; isForecast: boolean; sales: number; comparisonSales: number | null; }[] = chartData.slice(viewStart, viewEnd + 1).map((row: { actual: number | null; comparisonActual: number | null; forecastLink: number | null; date: string; isForecast: boolean; idx: number; sales: number; comparisonSales: number | null; }, idx: number) : { idx: number; actual: number | null; comparisonActual: number | null; forecastLink: number | null; date: string; isForecast: boolean; sales: number; comparisonSales: number | null; } => ({ ...row, idx }))
  const salesTrendYMax: number = (() : number => {
    let max: number = 0
    for (let i: number = Math.max(0, viewStart); i <= Math.min(viewEnd, chartData.length - 1); i += 1) {
      const row: { actual: number | null; comparisonActual: number | null; forecastLink: number | null; date: string; isForecast: boolean; idx: number; sales: number; comparisonSales: number | null; } = chartData[i]
      if (!row) continue
      max = Math.max(
        max,
        salesTrendVisible.self ? row.actual ?? 0 : 0,
        salesTrendVisible.self ? row.forecastLink ?? 0 : 0,
        salesTrendVisible.comparison ? row.comparisonActual ?? 0 : 0,
      )
    }
    return max <= 0 ? 100 : Math.ceil(max * 1.06)
  })()

  const onChartWheel: (event: React.WheelEvent<HTMLDivElement>) => void = (event: React.WheelEvent<HTMLDivElement>) : void => {
    if (!chartHovered) return
    event.preventDefault()
    const next: number = event.deltaY > 0 ? windowSize + 2 : windowSize - 2
    const minWindowSize: number = Math.min(maxWindowSize, Math.max(periodLen + 2, 6))
    setWindowSizeState({
      key: windowSizeKey,
      value: Math.max(minWindowSize, Math.min(maxWindowSize, next)),
    })
  }

  return {
    forecastMonthsLabelId,
    forecastComboRef,
    forecastComboOpen,
    monthlyTrendError,
    salesTrendVisible,
    comparisonTrendLabel: monthlyTrend?.comparison.label ?? comparisonTarget?.label ?? COMPARISON_TARGET_FALLBACK_LABEL,
    trendWindowData,
    salesTrendChartDense: trendWindowData.length >= 18,
    salesTrendYMax,
    shiftedPeriodShade: shiftShade(periodShade, viewStart, viewEnd, true) ?? { x1: -0.5, x2: -0.5 },
    shiftedForecastShade: shiftShade(forecastShade, viewStart, viewEnd),
    onChartWheel,
    onChartMouseEnter: () : void => setChartHoveredSkuGroupKey(skuGroupKey),
    onChartMouseLeave: () : void => setChartHoveredSkuGroupKey(null),
    toggleForecastCombo: () : void => setForecastComboOpenForSkuGroupKey((current: string | null) : string | null => (
      current === skuGroupKey ? null : skuGroupKey
    )),
    selectForecastMonths: (months: number) : void => {
      onForecastMonthsChange(months)
      setForecastComboOpenForSkuGroupKey(null)
    },
    toggleSalesTrendSeries: (series: 'self' | 'comparison') : void => {
      setSalesTrendVisible((prev: { self: boolean; comparison: boolean; }) : { self: boolean; comparison: boolean; } => ({ ...prev, [series]: !prev[series] }))
    },
  }
}
