import type { MonthlySalesPoint } from '../../../../types'
import { calendarDaysInMonth } from '../../../../utils/date'

/** 목·UI 공통: 서비스수준 → z (mock `zFromServiceLevelPct`와 동일). */
export function zFromServiceLevelPct(p: number): number {
  if (p >= 99) return 2.33
  if (p >= 98) return 2.05
  if (p >= 95) return 1.65
  if (p >= 90) return 1.28
  if (p >= 85) return 1.04
  return 0.84
}

/** 조회 기간 월 판매 단순 산술평균 → 일평균 판매량(EA/일). */
export function dailyMeanSigmaFromTrend(
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
): { dailyMean: number; sigma: number } {
  const a = periodStart.slice(0, 7)
  const b = periodEnd.slice(0, 7)
  const inRange = trend.filter((p) => p.date >= a && p.date <= b)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return { dailyMean: 0, sigma: 0 }
  /** 월별 판매량을 해당 달 일수로 나눈 일평균(EA/일)의 산술평균 — 고정 30일 나눗셈보다 보수적. */
  const dailyRates = slice.map((p) => p.sales / calendarDaysInMonth(p.date))
  const mean = dailyRates.reduce((x, y) => x + y, 0) / dailyRates.length
  const variance = dailyRates.reduce((acc, d) => acc + (d - mean) ** 2, 0) / slice.length
  return { dailyMean: mean, sigma: Math.sqrt(variance) }
}

/** 예측 수량연산용: 최근 월 가중 일평균(EA/일). */
export function forecastDailyMeanFromModel(
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
): number {
  const a = periodStart.slice(0, 7)
  const b = periodEnd.slice(0, 7)
  const inRange = trend.filter((p) => p.date >= a && p.date <= b)
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return 0
  let wsum = 0
  let wtotal = 0
  slice.forEach((p, i) => {
    const w = (i + 1) ** 1.35
    const daily = p.sales / calendarDaysInMonth(p.date)
    wsum += daily * w
    wtotal += w
  })
  return wtotal > 0 ? wsum / wtotal : 0
}

export type ClientStockOrderComputeParams = {
  monthlySalesTrend: MonthlySalesPoint[]
  periodStart: string
  periodEnd: string
  forecastPeriodEnd?: string
  serviceLevelPct: number
  leadTimeDays: number
  safetyStockMode: 'manual' | 'formula'
  manualSafetyStock: number
  dailyMeanClient: number | null
  availableStock: number
  price: number
}

export type ClientStockOrderComputeResult = {
  trendDailyMean: number
  forecastDailyMean: number
  sigma: number
  trendMuRaw: number
  forecastMuRaw: number
  safetyStock: number
  safetyRecQty: number
  forecastRecQty: number
  safetyExpectedSalesAmount: number
  forecastExpectedSalesAmount: number
  safetyExpectedOrderAmount: number
  forecastExpectedOrderAmount: number
  safetyExpectedOpProfit: number
  forecastExpectedOpProfit: number
}

/**
 * 2차 패널·사이즈별 오더용 재고/예측 수치 — API가 아닌 동일 수식을 클라이언트에서 연산.
 * (목 API `getSecondaryStockOrderCalc`와 로직 맞춤; 화면 표시는 항상 이 결과 사용.)
 */
export function computeClientStockOrder(p: ClientStockOrderComputeParams): ClientStockOrderComputeResult {
  const fromTrend = dailyMeanSigmaFromTrend(p.monthlySalesTrend, p.periodStart, p.periodEnd)
  const trendMuRaw = fromTrend.dailyMean
  const trendDailyMean = Math.round(trendMuRaw * 10) / 10
  const forecastPeriodEnd = p.forecastPeriodEnd ?? p.periodEnd

  const forecastMuRaw =
    p.dailyMeanClient != null && Number.isFinite(p.dailyMeanClient)
      ? Math.max(0, p.dailyMeanClient)
      : forecastDailyMeanFromModel(p.monthlySalesTrend, p.periodStart, forecastPeriodEnd)
  const forecastDailyMean = Math.round(forecastMuRaw * 10) / 10

  const sigma = fromTrend.sigma
  const safeLead = Math.max(0, Math.round(p.leadTimeDays))
  const z = zFromServiceLevelPct(p.serviceLevelPct)
  const formulaSafetyStock = Math.max(0, Math.round(z * sigma * Math.sqrt(safeLead) + trendMuRaw * safeLead))
  const safetyStock =
    p.safetyStockMode === 'manual'
      ? Math.max(0, Math.round(p.manualSafetyStock))
      : formulaSafetyStock
  const safetyRecQty = Math.max(0, Math.round(safetyStock - p.availableStock + trendMuRaw * safeLead))
  const forecastRecQty = Math.max(0, Math.round(forecastMuRaw * safeLead * 1.05))

  const avgCost = Math.round(p.price * 0.78)
  const opMarginPerUnit = p.price - avgCost - Math.round(p.price * 0.13)

  return {
    trendDailyMean,
    forecastDailyMean,
    sigma,
    trendMuRaw,
    forecastMuRaw,
    safetyStock,
    safetyRecQty,
    forecastRecQty,
    safetyExpectedSalesAmount: safetyRecQty * p.price,
    forecastExpectedSalesAmount: forecastRecQty * p.price,
    safetyExpectedOrderAmount: safetyRecQty * avgCost,
    forecastExpectedOrderAmount: forecastRecQty * avgCost,
    safetyExpectedOpProfit: safetyRecQty * opMarginPerUnit,
    forecastExpectedOpProfit: forecastRecQty * opMarginPerUnit,
  }
}
