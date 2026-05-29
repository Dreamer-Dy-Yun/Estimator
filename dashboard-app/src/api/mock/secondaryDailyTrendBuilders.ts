import type { MonthlySalesPoint } from '../../types'
import type { SecondaryDailyTrendPoint } from '../types'
import { daysInMonth, formatIsoDateUtc, parseIsoDateUtc } from './secondaryDailyTrendDates'

type MonthlyStockTrendPoint = {
  date: string
  stock: number
  inboundExpected: number
  inboundQty?: number
}

function trendSlice(trend: MonthlySalesPoint[], periodStart: string, periodEnd: string) {
  const startMonth = periodStart.slice(0, 7)
  const endMonth = periodEnd.slice(0, 7)
  const inRange = trend.filter((point) => point.date >= startMonth && point.date <= endMonth)
  return inRange.length ? inRange : trend.slice(-6)
}

export const dailyMeanSigma = (trend: MonthlySalesPoint[], periodStart: string, periodEnd: string) => {
  const slice = trendSlice(trend, periodStart, periodEnd)
  if (slice.length === 0) return { dailyMean: 0, sigma: 0 }
  const dailyRates = slice.map((point) => point.sales / daysInMonth(point.date))
  const mean = dailyRates.reduce((sum, value) => sum + value, 0) / dailyRates.length
  const variance = dailyRates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / dailyRates.length
  return { dailyMean: mean, sigma: Math.sqrt(variance) }
}

export const forecastDailyMeanFromModel = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
): number => {
  const slice = trendSlice(trend, periodStart, periodEnd)
  if (slice.length === 0) return 0
  const weighted = slice.reduce((acc, point, index) => {
    const weight = (index + 1) ** 1.35
    return {
      sum: acc.sum + (point.sales / daysInMonth(point.date)) * weight,
      weight: acc.weight + weight,
    }
  }, { sum: 0, weight: 0 })
  return weighted.weight > 0 ? weighted.sum / weighted.weight : 0
}

function dailySales(monthTotal: number, dayIndex: number, days: number, seed: number): number {
  const base = monthTotal / Math.max(1, days)
  const wave = Math.sin((dayIndex + seed) * 0.9) * 0.08
  return Math.max(0, Math.round(base * (1 + wave)))
}

function appendForecastDays(points: SecondaryDailyTrendPoint[], forecastDays: number): void {
  const count = Math.max(0, Math.round(forecastDays))
  if (count <= 0 || points.length === 0) return
  let last = points[points.length - 1]!
  let date = parseIsoDateUtc(last.date)
  for (let index = 0; index < count; index += 1) {
    date = new Date(date.getTime() + 86_400_000)
    const sales = Math.max(1, Math.round(last.sales * (1 + Math.sin(index) * 0.04)))
    const stockBar = Math.max(0, last.stockBar - sales)
    last = {
      idx: points.length,
      date: formatIsoDateUtc(date),
      month: formatIsoDateUtc(date).slice(0, 7),
      sales,
      stockBar,
      inboundAccumBar: Math.max(0, last.inboundAccumBar - sales),
      selfSales: null,
      competitorSales: null,
      isForecast: true,
    }
    points.push(last)
  }
}

export const buildSecondaryDailyTrend = (
  monthlyTrend: MonthlySalesPoint[],
  monthlyStockTrend: MonthlyStockTrendPoint[],
  startDate: string,
  endDate: string,
  forecastDays: number,
  competitorSalesScale = 1,
): SecondaryDailyTrendPoint[] => {
  const startMonth = startDate.slice(0, 7)
  const endMonth = endDate.slice(0, 7)
  const stockByMonth = new Map(monthlyStockTrend.map((row) => [row.date, row]))
  const scale = Number.isFinite(competitorSalesScale) ? Math.max(0, competitorSalesScale) : 1
  const points: SecondaryDailyTrendPoint[] = []

  monthlyTrend.forEach((monthPoint, monthIndex) => {
    if (monthPoint.date < startMonth) return
    if (monthPoint.date > endMonth) return
    const days = daysInMonth(monthPoint.date)
    const stockRow = stockByMonth.get(monthPoint.date)
    const inboundQty = Math.max(0, Math.round(stockRow?.inboundQty ?? stockRow?.inboundExpected ?? 0))
    const endStock = Math.max(0, Math.round(stockRow?.stock ?? 0))
    const seed = monthPoint.date.charCodeAt(5) + monthIndex

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const date = `${monthPoint.date}-${String(dayIndex + 1).padStart(2, '0')}`
      if (date < startDate || date > endDate) continue
      const sales = dailySales(monthPoint.sales, dayIndex, days, seed)
      const monthProgress = (dayIndex + 1) / days
      const stockBar = Math.max(0, Math.round(endStock + inboundQty * (1 - monthProgress) - sales * (1 - monthProgress)))
      points.push({
        idx: points.length,
        date,
        month: monthPoint.date,
        sales,
        stockBar,
        inboundAccumBar: 0,
        selfSales: sales,
        competitorSales: Math.max(0, Math.round(sales * 10 * scale)),
        isForecast: false,
      })
    }
  })

  appendForecastDays(points, forecastDays)
  return points.map((point, index) => ({ ...point, idx: index }))
}
