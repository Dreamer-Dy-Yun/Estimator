import type { SelfSalesRow } from '../types'

/** 매출(amount) 가중 평균 비율 — 자사 KPI 등 */
function weightedMeanRateByAmount(rows: Array<{ rate: number; amount: number }>): number {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  if (total <= 0) return 0
  return rows.reduce((s, r) => s + r.rate * r.amount, 0) / total
}

export function selfSalesWeightedMarginRate(rows: SelfSalesRow[]): number {
  return weightedMeanRateByAmount(rows.map((r) => ({ rate: r.marginRate, amount: r.amount })))
}

export function selfSalesWeightedOpMarginRate(rows: SelfSalesRow[]): number {
  return weightedMeanRateByAmount(rows.map((r) => ({ rate: r.opMarginRate, amount: r.amount })))
}
