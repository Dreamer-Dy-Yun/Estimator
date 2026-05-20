import type { MonthlySalesPoint } from '../../types'
import type { SecondaryDailyTrendPoint } from '../types'
import { DAILY_TREND_AS_OF_DATE } from '../dailyTrendAsOf'
import { daysInMonth, formatIsoDateUtc, parseIsoDateUtc } from './secondaryDailyTrendDates'

const DAILY_PATTERN_STEADY: readonly number[] = [
  58, 60, 57, 61, 63, 59, 56, 62, 64, 60,
  58, 57, 61, 63, 66, 64, 60, 59, 57, 62,
  65, 67, 63, 61, 60, 58, 59, 62, 64, 66,
]

const DAILY_PATTERN_UP: readonly number[] = [
  48, 50, 49, 51, 52, 50, 53, 54, 55, 56,
  54, 53, 55, 57, 58, 59, 57, 56, 58, 60,
  61, 62, 60, 59, 61, 63, 64, 65, 63, 62,
]

const DAILY_PATTERN_PEAK: readonly number[] = [
  66, 68, 70, 69, 71, 73, 72, 74, 75, 76,
  74, 73, 75, 77, 78, 79, 78, 76, 75, 77,
  79, 81, 80, 78, 77, 76, 75, 77, 79, 80,
]

const DAILY_PATTERN_FORECAST: readonly number[] = [
  62, 63, 61, 64, 65, 63, 62, 64, 66, 65,
  63, 62, 64, 65, 67, 66, 64, 63, 65, 66,
  68, 69, 67, 66, 65, 64, 65, 66, 67, 68,
]

const DAILY_PATTERN_BY_MONTH: Record<string, readonly number[]> = {
  '2024-07': DAILY_PATTERN_STEADY,
  '2024-08': DAILY_PATTERN_STEADY,
  '2024-09': DAILY_PATTERN_UP,
  '2024-10': DAILY_PATTERN_UP,
  '2024-11': DAILY_PATTERN_PEAK,
  '2024-12': DAILY_PATTERN_PEAK,
  '2025-01': DAILY_PATTERN_STEADY,
  '2025-02': DAILY_PATTERN_STEADY,
  '2025-03': DAILY_PATTERN_UP,
  '2025-04': DAILY_PATTERN_UP,
  '2025-05': DAILY_PATTERN_STEADY,
  '2025-06': DAILY_PATTERN_STEADY,
  '2025-07': DAILY_PATTERN_UP,
  '2025-08': DAILY_PATTERN_UP,
  '2025-09': DAILY_PATTERN_PEAK,
  '2025-10': DAILY_PATTERN_PEAK,
  '2025-11': DAILY_PATTERN_PEAK,
  '2025-12': DAILY_PATTERN_PEAK,
  '2026-01': DAILY_PATTERN_FORECAST,
  '2026-02': DAILY_PATTERN_FORECAST,
  '2026-03': DAILY_PATTERN_FORECAST,
  '2026-04': DAILY_PATTERN_FORECAST,
  '2026-05': DAILY_PATTERN_FORECAST,
  '2026-06': DAILY_PATTERN_FORECAST,
}

const DAILY_EXT_SALES_DELTA: readonly number[] = [0, -1, 1, 0, -1, 0, 1, -1, 0, 1]
const KREAM_TO_SELF_DAILY_SALES_RATIO = 10

type MonthlyStockTrendPoint = {
  date: string
  stock: number
  inboundExpected: number
  inboundQty?: number
}

export const dailyMeanSigma = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
) => {
  const startMonth = periodStart.slice(0, 7)
  const endMonth = periodEnd.slice(0, 7)
  const inRange = trend.filter((point) => point.date >= startMonth && point.date <= endMonth)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return { dailyMean: 0, sigma: 0 }

  const dailyRates = slice.map((point) => point.sales / daysInMonth(point.date))
  const mean = dailyRates.reduce((sum, dailyRate) => sum + dailyRate, 0) / dailyRates.length
  const variance = dailyRates.reduce((sum, dailyRate) => sum + (dailyRate - mean) ** 2, 0) / dailyRates.length
  return { dailyMean: mean, sigma: Math.sqrt(variance) }
}

export const forecastDailyMeanFromModel = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
): number => {
  const startMonth = periodStart.slice(0, 7)
  const endMonth = periodEnd.slice(0, 7)
  const inRange = trend.filter((point) => point.date >= startMonth && point.date <= endMonth)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return 0

  let weightedSum = 0
  let weightTotal = 0
  slice.forEach((point, index) => {
    const weight = (index + 1) ** 1.35
    const daily = point.sales / daysInMonth(point.date)
    weightedSum += daily * weight
    weightTotal += weight
  })
  return weightTotal > 0 ? weightedSum / weightTotal : 0
}

const dailySalesForMonth = (days: number, pattern: readonly number[], monthTotal: number): number[] => {
  if (days <= 0) return []
  const weights = Array.from({ length: days }, (_, index) => pattern[index % pattern.length]!)
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const out: number[] = []
  let allocated = 0

  for (let index = 0; index < days - 1; index += 1) {
    const sales = weightSum > 0 ? Math.floor((monthTotal * weights[index]!) / weightSum) : 0
    out.push(sales)
    allocated += sales
  }
  out.push(Math.max(0, monthTotal - allocated))
  return out
}

const inboundDayForMonth = (date: string, monthIndex: number, days: number, inboundQty: number): number => {
  if (inboundQty <= 0) return 0
  let hash = monthIndex * 13
  for (let index = 0; index < date.length; index += 1) {
    hash = (hash + date.charCodeAt(index) * (index + 3)) | 0
  }
  const span = Math.max(1, days - 2)
  return Math.max(2, Math.min(days, 2 + (Math.abs(hash) % span)))
}

const attachChannelSales = (points: SecondaryDailyTrendPoint[], competitorScale: number): void => {
  let prevCompetitorSales = 0
  points.forEach((point, index) => {
    if (point.isForecast) {
      point.selfSales = null
      point.competitorSales = null
      return
    }

    const selfSales = Math.max(0, Math.round(point.sales))
    const lag3 = Math.max(0, Math.round(points[Math.max(0, index - 3)]?.sales ?? selfSales))
    const lag8 = Math.max(0, Math.round(points[Math.max(0, index - 8)]?.sales ?? selfSales))
    const weekly = Math.sin((index + 2) * ((2 * Math.PI) / 7))
    const biWeekly = Math.cos((index + 9) * ((2 * Math.PI) / 14))
    const monthly = Math.sin((index + 4) * ((2 * Math.PI) / 29))
    const daySeed = Number(point.date.slice(8, 10))
    const promoSpike = daySeed % 9 === 0 ? 0.12 : daySeed % 7 === 0 ? 0.06 : 0
    const noise = (((daySeed * 11 + index * 5) % 23) / 23 - 0.5) * 0.04
    const base = (selfSales * 0.72 + lag3 * 0.18 + lag8 * 0.1) * KREAM_TO_SELF_DAILY_SALES_RATIO * competitorScale
    const rhythm = 1 + weekly * 0.08 + biWeekly * 0.05 + monthly * 0.04 + promoSpike + noise
    const trendTarget = base * Math.max(0.55, rhythm)
    const competitorSales = prevCompetitorSales <= 0
      ? Math.max(0, Math.round(trendTarget))
      : Math.max(0, Math.round(prevCompetitorSales * 0.52 + trendTarget * 0.48))

    point.selfSales = selfSales
    point.competitorSales = competitorSales
    prevCompetitorSales = competitorSales
  })
}

const extendByLeadTime = (points: SecondaryDailyTrendPoint[], leadTimeDays: number): void => {
  const extendDays = Math.max(0, Math.round(leadTimeDays))
  if (extendDays <= 0 || points.length === 0) return

  let last = points[points.length - 1]!
  let date = parseIsoDateUtc(last.date)
  let physicalStock = last.stockBar
  let pipelineStock = last.inboundAccumBar

  for (let index = 0; index < extendDays; index += 1) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    const nextDate = formatIsoDateUtc(date)
    const sales = Math.max(1, Math.round(last.sales + DAILY_EXT_SALES_DELTA[index % DAILY_EXT_SALES_DELTA.length]!))
    let need = sales
    const fromPhysical = Math.min(need, physicalStock)
    physicalStock -= fromPhysical
    need -= fromPhysical
    const fromPipeline = Math.min(need, pipelineStock)
    pipelineStock -= fromPipeline

    const next: SecondaryDailyTrendPoint = {
      idx: points.length,
      date: nextDate,
      month: nextDate.slice(0, 7),
      sales,
      stockBar: Math.max(0, Math.round(physicalStock)),
      inboundAccumBar: Math.max(0, Math.round(pipelineStock)),
      selfSales: null,
      competitorSales: null,
      isForecast: true,
    }
    points.push(next)
    last = next
  }
}

export const buildSecondaryDailyTrend = (
  monthlyTrend: MonthlySalesPoint[],
  monthlyStockTrend: MonthlyStockTrendPoint[],
  startMonth: string,
  leadTimeDays: number,
  competitorSalesScale = 1,
): SecondaryDailyTrendPoint[] => {
  const full: SecondaryDailyTrendPoint[] = []
  let idx = 0
  const stockByMonth = new Map(monthlyStockTrend.map((row) => [row.date, row]))
  let physicalStock = 0
  let pipelineStock = 0
  const asOf = DAILY_TREND_AS_OF_DATE
  const competitorScale = Number.isFinite(competitorSalesScale) ? Math.max(0, competitorSalesScale) : 1

  monthlyTrend.forEach((monthPoint, monthIndex) => {
    const pattern = DAILY_PATTERN_BY_MONTH[monthPoint.date]
      ?? (monthPoint.isForecast ? DAILY_PATTERN_FORECAST : DAILY_PATTERN_STEADY)
    const days = daysInMonth(monthPoint.date)
    const stockRow = stockByMonth.get(monthPoint.date)
    const prevRow = monthIndex > 0 ? stockByMonth.get(monthlyTrend[monthIndex - 1]!.date) : undefined
    const inboundQty = Math.max(0, Math.round(stockRow?.inboundQty ?? stockRow?.inboundExpected ?? 0))
    const endStock = Math.max(0, Math.round(stockRow?.stock ?? 0))
    const monthTotalSales = prevRow
      ? Math.max(0, Math.round(prevRow.stock + inboundQty - endStock))
      : Math.max(0, Math.round(monthPoint.sales))
    const inboundDay = inboundDayForMonth(monthPoint.date, monthIndex, days, inboundQty)

    if (monthIndex === 0) {
      physicalStock = Math.max(0, endStock - inboundQty + monthTotalSales)
    }

    const dailySales = dailySalesForMonth(days, pattern, monthTotalSales)
    const snapMonthEnd = monthPoint.date <= asOf.slice(0, 7)

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const dayNum = dayIndex + 1
      const dateStr = `${monthPoint.date}-${String(dayNum).padStart(2, '0')}`
      const isAfterAsOf = dateStr > asOf

      if (inboundQty > 0 && inboundDay > 0 && dayNum === inboundDay) {
        if (!isAfterAsOf) {
          physicalStock += inboundQty
        } else {
          pipelineStock += inboundQty
        }
      }

      const sales = dailySales[dayIndex] ?? 0
      if (!isAfterAsOf) {
        physicalStock = Math.max(0, physicalStock - sales)
      } else {
        let need = sales
        const fromPhysical = Math.min(need, physicalStock)
        physicalStock -= fromPhysical
        need -= fromPhysical
        const fromPipeline = Math.min(need, pipelineStock)
        pipelineStock -= fromPipeline
      }

      full.push({
        idx,
        date: dateStr,
        month: monthPoint.date,
        sales,
        stockBar: Math.max(0, Math.round(physicalStock)),
        inboundAccumBar: isAfterAsOf ? Math.max(0, Math.round(pipelineStock)) : 0,
        selfSales: null,
        competitorSales: null,
        isForecast: monthPoint.isForecast,
      })
      idx += 1
    }

    if (snapMonthEnd) {
      physicalStock = endStock
      pipelineStock = 0
    }
  })

  const startIdx = full.findIndex((point) => point.month >= startMonth)
  if (startIdx === -1) return []

  const out = full.slice(startIdx).map((row, index) => ({ ...row, idx: index }))
  extendByLeadTime(out, leadTimeDays)

  attachChannelSales(out, competitorScale)
  return out
}
