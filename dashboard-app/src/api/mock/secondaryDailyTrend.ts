import type { MonthlySalesPoint } from '../../types'
import type { SecondaryDailyTrendPoint } from '../types'
import { DAILY_TREND_AS_OF_DATE } from '../dailyTrendAsOf'

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

const daysInMonth = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const parseIsoDateUtc = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

const formatIsoDateUtc = (date: Date) => {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const zFromServiceLevelPct = (p: number): number => {
  if (p >= 99) return 2.33
  if (p >= 98) return 2.05
  if (p >= 95) return 1.65
  if (p >= 90) return 1.28
  if (p >= 85) return 1.04
  return 0.84
}

/** 조회 기간 내 월별 판매 단순 산술평균 → 일평균 판매량(EA/일). 기간 산술평균 컬럼의 μ. */
export const dailyMeanSigma = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
) => {
  const a = periodStart.slice(0, 7)
  const b = periodEnd.slice(0, 7)
  const inRange = trend.filter((p) => p.date >= a && p.date <= b)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return { dailyMean: 0, sigma: 0 }
  const dailyRates = slice.map((p) => p.sales / daysInMonth(p.date))
  const mean = dailyRates.reduce((x, y) => x + y, 0) / dailyRates.length
  const variance = dailyRates.reduce((acc, d) => acc + (d - mean) ** 2, 0) / dailyRates.length
  return { dailyMean: mean, sigma: Math.sqrt(variance) }
}

/**
 * 목업: 예측 수량연산 컬럼용 일평균(EA/일).
 * 같은 구간이라도 최근 월에 더 큰 가중을 두어 기간 단순 산술평균과 값이 갈리도록 함.
 */
export const forecastDailyMeanFromModel = (
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
): number => {
  const a = periodStart.slice(0, 7)
  const b = periodEnd.slice(0, 7)
  const inRange = trend.filter((p) => p.date >= a && p.date <= b)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return 0
  let wsum = 0
  let wtotal = 0
  slice.forEach((p, i) => {
    const w = (i + 1) ** 1.35
    const daily = p.sales / daysInMonth(p.date)
    wsum += daily * w
    wtotal += w
  })
  return wtotal > 0 ? wsum / wtotal : 0
}

/** 월 총 판매량에 맞춰 일별 판매 배분(합 = monthTotal). */
const dailySalesForMonth = (days: number, pattern: readonly number[], monthTotal: number): number[] => {
  if (days <= 0) return []
  const w = Array.from({ length: days }, (_, i) => pattern[i % pattern.length]!)
  const sumW = w.reduce((a, b) => a + b, 0)
  const out: number[] = []
  let acc = 0
  for (let i = 0; i < days - 1; i += 1) {
    const s = sumW > 0 ? Math.floor((monthTotal * w[i]!) / sumW) : 0
    out.push(s)
    acc += s
  }
  out.push(Math.max(0, monthTotal - acc))
  return out
}

/**
 * 일간 판매추이 목업
 * - 기준일(`DAILY_TREND_AS_OF_DATE`)까지: 실재고만(초기 재고 → 판매 차감 → 입고일에 충전). 예상 재고 막대는 0.
 * - 기준일 이후: 실재고는 판매로만 감소(입고로는 늘리지 않음). 입고분·재고 증가는 전부 예상 재고(파이프라인).
 *   판매는 실재고를 먼저 깐 뒤 예상 재고를 깜.
 */
export const buildSecondaryDailyTrend = (
  monthlyTrend: MonthlySalesPoint[],
  monthlyStockTrend: Array<{
    date: string
    stock: number
    inboundExpected: number
    inboundQty?: number
  }>,
  startMonth: string,
  leadTimeDays: number,
): SecondaryDailyTrendPoint[] => {
  const full: SecondaryDailyTrendPoint[] = []
  let idx = 0
  const stockByMonth = new Map(monthlyStockTrend.map((row) => [row.date, row]))
  let physical = 0
  let pipeline = 0
  const asOf = DAILY_TREND_AS_OF_DATE

  monthlyTrend.forEach((m, monthIdx) => {
    const pattern = DAILY_PATTERN_BY_MONTH[m.date] ?? (m.isForecast ? DAILY_PATTERN_FORECAST : DAILY_PATTERN_STEADY)
    const days = daysInMonth(m.date)
    const stockRow = stockByMonth.get(m.date)
    const prevRow = monthIdx > 0 ? stockByMonth.get(monthlyTrend[monthIdx - 1]!.date) : undefined
    const inboundQ = Math.max(0, Math.round(stockRow?.inboundQty ?? stockRow?.inboundExpected ?? 0))
    const endStock = Math.max(0, Math.round(stockRow?.stock ?? 0))
    const monthTotalSales = prevRow
      ? Math.max(0, Math.round(prevRow.stock + inboundQ - endStock))
      : Math.max(0, Math.round(m.sales))

    /** 월간 stockTrend와 무관: 일간 시뮬만 월키·월 인덱스로 입고일 결정 */
    const inboundDay = (() => {
      if (inboundQ <= 0) return 0
      let h = monthIdx * 13
      for (let i = 0; i < m.date.length; i += 1) {
        h = (h + m.date.charCodeAt(i) * (i + 3)) | 0
      }
      const span = Math.max(1, days - 2)
      return Math.max(2, Math.min(days, 2 + (Math.abs(h) % span)))
    })()

    if (monthIdx === 0) {
      physical = Math.max(0, endStock - inboundQ + monthTotalSales)
    }

    const dailySales = dailySalesForMonth(days, pattern, monthTotalSales)
    const snapMonthEnd = m.date <= asOf.slice(0, 7)

    for (let i = 0; i < days; i += 1) {
      const dayNum = i + 1
      const dateStr = `${m.date}-${String(dayNum).padStart(2, '0')}`
      const isAfterAsOf = dateStr > asOf

      if (inboundQ > 0 && inboundDay > 0 && dayNum === inboundDay) {
        if (!isAfterAsOf) {
          physical += inboundQ
        } else {
          pipeline += inboundQ
        }
      }

      const sales = dailySales[i] ?? 0
      if (!isAfterAsOf) {
        physical = Math.max(0, physical - sales)
      } else {
        let need = sales
        const fromPhys = Math.min(need, physical)
        physical -= fromPhys
        need -= fromPhys
        const fromPipe = Math.min(need, pipeline)
        pipeline -= fromPipe
      }

      full.push({
        idx,
        date: dateStr,
        month: m.date,
        sales,
        stockBar: Math.max(0, Math.round(physical)),
        inboundAccumBar: isAfterAsOf ? Math.max(0, Math.round(pipeline)) : 0,
        selfSales: null,
        competitorSales: null,
        isForecast: m.isForecast,
      })
      idx += 1
    }

    if (snapMonthEnd) {
      physical = endStock
      pipeline = 0
    }
  })

  const startIdx = full.findIndex((p) => p.month >= startMonth)
  if (startIdx === -1) return []
  const out = full.slice(startIdx).map((row, i) => ({ ...row, idx: i }))
  const extendDays = Math.max(0, Math.round(leadTimeDays))
  if (extendDays <= 0 || out.length === 0) return out

  let last = out[out.length - 1]!
  let date = parseIsoDateUtc(last.date)
  let phys = last.stockBar
  let pipe = last.inboundAccumBar

  for (let i = 0; i < extendDays; i += 1) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    const nextDate = formatIsoDateUtc(date)
    const sales = Math.max(1, Math.round(last.sales + DAILY_EXT_SALES_DELTA[i % DAILY_EXT_SALES_DELTA.length]!))
    let need = sales
    const fromPhys = Math.min(need, phys)
    phys -= fromPhys
    need -= fromPhys
    const fromPipe = Math.min(need, pipe)
    pipe -= fromPipe
    need -= fromPipe

    const next = {
      idx: out.length,
      date: nextDate,
      month: nextDate.slice(0, 7),
      sales,
      stockBar: Math.max(0, Math.round(phys)),
      inboundAccumBar: Math.max(0, Math.round(pipe)),
      selfSales: null,
      competitorSales: null,
      isForecast: true,
    }
    out.push(next)
    last = next
  }

  let prevCompetitorSales = 0
  out.forEach((p, i) => {
    if (p.isForecast) {
      p.selfSales = null
      p.competitorSales = null
      return
    }
    const selfSales = Math.max(0, Math.round(p.sales))
    const lag3 = Math.max(0, Math.round(out[Math.max(0, i - 3)]?.sales ?? selfSales))
    const lag8 = Math.max(0, Math.round(out[Math.max(0, i - 8)]?.sales ?? selfSales))

    // 경쟁사(크림) 일간 트렌드: 평균적으로 자사 대비 10배 수준, 자사와 다른 리듬으로 생성
    const weekly = Math.sin((i + 2) * ((2 * Math.PI) / 7)) // 7일 주기
    const biWeekly = Math.cos((i + 9) * ((2 * Math.PI) / 14)) // 14일 주기
    const monthly = Math.sin((i + 4) * ((2 * Math.PI) / 29))
    const daySeed = Number(p.date.slice(8, 10))
    // 특정 날짜대에 경쟁사 프로모션 스파이크
    const promoSpike = daySeed % 9 === 0 ? 0.12 : daySeed % 7 === 0 ? 0.06 : 0
    const noise = (((daySeed * 11 + i * 5) % 23) / 23 - 0.5) * 0.04

    const base =
      (selfSales * 0.72 + lag3 * 0.18 + lag8 * 0.1) * KREAM_TO_SELF_DAILY_SALES_RATIO
    const rhythm = 1 + weekly * 0.08 + biWeekly * 0.05 + monthly * 0.04 + promoSpike + noise
    const trendTarget = base * Math.max(0.55, rhythm)

    const competitorSales =
      prevCompetitorSales <= 0
        ? Math.max(0, Math.round(trendTarget))
        : Math.max(0, Math.round(prevCompetitorSales * 0.52 + trendTarget * 0.48))

    p.selfSales = selfSales
    p.competitorSales = competitorSales
    prevCompetitorSales = competitorSales
  })
  return out
}
