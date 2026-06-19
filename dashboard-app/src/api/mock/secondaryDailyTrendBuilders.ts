import type { MonthlySalesPoint } from '../../types'
import type { SecondaryDailyTrendBaseFlow, SecondaryDailyTrendComparisonFlow, SecondaryDailyTrendPoint, SecondaryDailyTrendSource } from '../types'
import { daysInMonth, formatIsoDateUtc, parseIsoDateUtc } from './secondaryDailyTrendDates'

type MonthlyStockTrendPoint = {
  date: string
  stock: number
  inboundExpected: number
  inboundQty?: number
}

function sortedStockMonthKeys(stockByMonth: Map<string, MonthlyStockTrendPoint>): string[] {
  return Array.from(stockByMonth.keys()).sort()
}

function findStockTrendForMonth(stockByMonth: Map<string, MonthlyStockTrendPoint>, month: string): MonthlyStockTrendPoint | undefined {
  const exact: MonthlyStockTrendPoint | undefined = stockByMonth.get(month)
  if (exact != null) return exact

  const keys: string[] = sortedStockMonthKeys(stockByMonth)
  for (let i: number = keys.length - 1; i >= 0; i -= 1) {
    const prevMonth: string = keys[i] ?? ''
    if (!prevMonth || prevMonth <= month) return stockByMonth.get(prevMonth)
  }
  const first: string | undefined = keys[0]
  return first == null ? undefined : stockByMonth.get(first)
}

function trendSlice(trend: MonthlySalesPoint[], periodStart: string, periodEnd: string) : MonthlySalesPoint[] {
  const startMonth: string = periodStart.slice(0, 7)
  const endMonth: string = periodEnd.slice(0, 7)
  const inRange: MonthlySalesPoint[] = trend.filter((point: MonthlySalesPoint) : boolean => point.date >= startMonth && point.date <= endMonth)
  return inRange.length ? inRange : trend.slice(-6)
}

export const dailyMeanSigma: (trend: MonthlySalesPoint[], periodStart: string, periodEnd: string) => { dailyMean: number; sigma: number; } = (trend: MonthlySalesPoint[], periodStart: string, periodEnd: string) : { dailyMean: number; sigma: number; } => {
  const slice: MonthlySalesPoint[] = trendSlice(trend, periodStart, periodEnd)
  if (slice.length === 0) return { dailyMean: 0, sigma: 0 }
  const dailyRates: number[] = slice.map((point: MonthlySalesPoint) : number => point.sales / daysInMonth(point.date))
  const mean: number = dailyRates.reduce((sum: number, value: number) : number => sum + value, 0) / dailyRates.length
  const variance: number = dailyRates.reduce((sum: number, value: number) : number => sum + (value - mean) ** 2, 0) / dailyRates.length
  return { dailyMean: mean, sigma: Math.sqrt(variance) }
}

export const forecastDailyMeanFromModel: (trend: MonthlySalesPoint[], periodStart: string, periodEnd: string) => number = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
): number => {
  const slice: MonthlySalesPoint[] = trendSlice(trend, periodStart, periodEnd)
  if (slice.length === 0) return 0
  const weighted: { sum: number; weight: number; } = slice.reduce((acc: { sum: number; weight: number; }, point: MonthlySalesPoint, index: number) : { sum: number; weight: number; } => {
    const weight: number = (index + 1) ** 1.35
    return {
      sum: acc.sum + (point.sales / daysInMonth(point.date)) * weight,
      weight: acc.weight + weight,
    }
  }, { sum: 0, weight: 0 })
  return weighted.weight > 0 ? weighted.sum / weighted.weight : 0
}

function dailySales(monthTotal: number, dayIndex: number, days: number, seed: number): number {
  const base: number = monthTotal / Math.max(1, days)
  const wave: number = Math.sin((dayIndex + seed) * 0.9) * 0.08
  return Math.max(0, Math.round(base * (1 + wave)))
}

function appendForecastDays(points: SecondaryDailyTrendPoint[], forecastDays: number): void {
  const count: number = Math.max(0, Math.round(forecastDays))
  if (count <= 0 || points.length === 0) return
  let last: SecondaryDailyTrendPoint = points[points.length - 1]!
  let date: Date = parseIsoDateUtc(last.date)
  for (let index: number = 0; index < count; index += 1) {
    date = new Date(date.getTime() + 86_400_000)
    const sales: number = Math.max(1, Math.round(last.sales * (1 + Math.sin(index) * 0.04)))
    const comparisonSales: number = Math.max(0, Math.round((last.comparisonSales ?? sales) * (1 + Math.sin(index) * 0.04)))
    const stockBar: number | null = last.stockBar == null ? null : Math.max(0, last.stockBar - sales)
    last = {
      idx: points.length,
      date: formatIsoDateUtc(date),
      month: formatIsoDateUtc(date).slice(0, 7),
      sales,
      stockBar,
      inboundAccumBar: last.inboundAccumBar == null ? null : Math.max(0, last.inboundAccumBar - sales),
      baseSales: null,
      comparisonSales,
      isForecast: true,
    }
    points.push(last)
  }
}

function makeBaseSubjectFlow(sale: number, inbound: number): SecondaryDailyTrendBaseFlow {
  return {
    sale: Math.max(0, Math.round(sale)),
    inbound: Math.max(0, Math.round(inbound)),
  }
}

function makeComparisonSubjectFlow(sale: number, inbound: number | null): SecondaryDailyTrendComparisonFlow {
  return {
    sale: Math.max(0, Math.round(sale)),
    inbound: inbound == null ? null : Math.max(0, Math.round(inbound)),
  }
}

function pointBaseSale(point: SecondaryDailyTrendPoint): number {
  return Math.max(0, Math.round(point.baseSales ?? point.sales))
}

function pointComparisonSale(point: SecondaryDailyTrendPoint): number {
  return Math.max(0, Math.round(point.comparisonSales ?? 0))
}

function pointStock(point: SecondaryDailyTrendPoint): number | null {
  return point.stockBar == null ? null : Math.max(0, Math.round(point.stockBar))
}

function deriveBaseStockAtStart(points: SecondaryDailyTrendPoint[]): number | null {
  const first: SecondaryDailyTrendPoint | undefined = points[0]
  const firstStock: number | null = first == null ? null : pointStock(first)
  if (first == null || firstStock == null) return null
  return Math.max(0, Math.round(firstStock + pointBaseSale(first)))
}

function deriveDailyInbound(point: SecondaryDailyTrendPoint, previousStock: number | null): number | null {
  const stock: number | null = pointStock(point)
  if (stock == null || previousStock == null) return null
  return Math.max(0, Math.round(stock - previousStock + pointBaseSale(point)))
}

function buildFlowByDate(
  points: SecondaryDailyTrendPoint[],
  baseStock: number | null,
): SecondaryDailyTrendSource['data'] {
  let runningStock: number | null = baseStock
  const base: Record<string, SecondaryDailyTrendBaseFlow> = {}
  const comparison: Record<string, SecondaryDailyTrendComparisonFlow> = {}
  points.forEach((point: SecondaryDailyTrendPoint): void => {
    const sale: number = pointBaseSale(point)
    const inbound: number = deriveDailyInbound(point, runningStock) ?? 0
    if (runningStock != null) {
      runningStock = Math.max(0, Math.round(runningStock + inbound - sale))
    }
    base[point.date] = makeBaseSubjectFlow(sale, inbound)
    comparison[point.date] = makeComparisonSubjectFlow(pointComparisonSale(point), null)
  })
  return { base, comparison }
}

export const buildSecondaryDailyTrendSource: (
  size: string | null,
  monthlyTrend: MonthlySalesPoint[],
  monthlyStockTrend: MonthlyStockTrendPoint[],
  startDate: string,
  endDate: string,
  forecastDays: number,
  comparisonSalesScale?: number,
) => SecondaryDailyTrendSource = (
  size: string | null,
  monthlyTrend: MonthlySalesPoint[],
  monthlyStockTrend: MonthlyStockTrendPoint[],
  startDate: string,
  endDate: string,
  forecastDays: number,
  comparisonSalesScale: number = 10,
): SecondaryDailyTrendSource => {
  const points: SecondaryDailyTrendPoint[] = buildSecondaryDailyTrend(monthlyTrend, monthlyStockTrend, startDate, endDate, forecastDays, comparisonSalesScale)
  const baseStock: number | null = deriveBaseStockAtStart(points)
  return {
    size,
    baseStock,
    data: buildFlowByDate(points, baseStock),
  }
}

export const buildSecondaryDailyTrend: (monthlyTrend: MonthlySalesPoint[], monthlyStockTrend: MonthlyStockTrendPoint[], startDate: string, endDate: string, forecastDays: number, comparisonSalesScale?: number) => SecondaryDailyTrendPoint[] = (
  monthlyTrend: MonthlySalesPoint[],
  monthlyStockTrend: MonthlyStockTrendPoint[],
  startDate: string,
  endDate: string,
  forecastDays: number,
  comparisonSalesScale: number = 10,
): SecondaryDailyTrendPoint[] => {
  const startMonth: string = startDate.slice(0, 7)
  const endMonth: string = endDate.slice(0, 7)
  const stockByMonth: Map<string, MonthlyStockTrendPoint> = new Map(monthlyStockTrend.map((row: MonthlyStockTrendPoint) : [string, MonthlyStockTrendPoint] => [row.date, row]))
  const scale: number = Number.isFinite(comparisonSalesScale) ? Math.max(0, comparisonSalesScale) : 10
  const points: SecondaryDailyTrendPoint[] = []
  let priorStockRow: MonthlyStockTrendPoint | undefined = findStockTrendForMonth(stockByMonth, startMonth)

  monthlyTrend.forEach((monthPoint: MonthlySalesPoint, monthIndex: number) : void => {
    if (monthPoint.date < startMonth) return
    if (monthPoint.date > endMonth) return
    const days: number = daysInMonth(monthPoint.date)
    const monthStockRow: MonthlyStockTrendPoint | undefined = stockByMonth.get(monthPoint.date)
    if (monthStockRow != null) priorStockRow = monthStockRow
    const resolvedStockRow: MonthlyStockTrendPoint | undefined = priorStockRow
    const inboundQty: number = Math.max(0, Math.round(resolvedStockRow?.inboundQty ?? resolvedStockRow?.inboundExpected ?? 0))
    const endStock: number = Math.max(0, Math.round(resolvedStockRow?.stock ?? 0))
    const seed: number = monthPoint.date.charCodeAt(5) + monthIndex

    for (let dayIndex: number = 0; dayIndex < days; dayIndex += 1) {
      const date: string = `${monthPoint.date}-${String(dayIndex + 1).padStart(2, '0')}`
      if (date < startDate || date > endDate) continue
      const sales: number = dailySales(monthPoint.sales, dayIndex, days, seed)
      const monthProgress: number = (dayIndex + 1) / days
      const stockBar: number = Math.max(0, Math.round(endStock + inboundQty * (1 - monthProgress) - sales * (1 - monthProgress)))
      points.push({
        idx: points.length,
        date,
        month: monthPoint.date,
        sales,
        stockBar,
        inboundAccumBar: 0,
        baseSales: sales,
        comparisonSales: Math.max(0, Math.round(sales * scale)),
        isForecast: false,
      })
    }
  })

  appendForecastDays(points, forecastDays)
  return points.map((point: SecondaryDailyTrendPoint, index: number) : SecondaryDailyTrendPoint => ({ ...point, idx: index }))
}
