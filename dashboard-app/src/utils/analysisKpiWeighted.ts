import type { SelfSalesRow } from '../types'

/**
 * Hardened module: self-sales KPI weighted-rate helpers.
 * Responsibility: calculate sales-amount-weighted margin rates from already filtered rows.
 * Contract: rows must already be the caller's target filter scope. A zero total amount returns 0.
 * Side effects: none.
 */
/** 매출(amount) 가중 평균 비율 — 자사 KPI 등 */
function weightedMeanRateByAmount(rows: Array<{ rate: number; amount: number }>): number {
  const total: number = rows.reduce((s: number, r: { rate: number; amount: number; }) : number => s + r.amount, 0)
  if (total <= 0) return 0
  return rows.reduce((s: number, r: { rate: number; amount: number; }) : number => s + r.rate * r.amount, 0) / total
}

export function selfSalesWeightedMarginRate(rows: SelfSalesRow[]): number {
  return weightedMeanRateByAmount(rows.map((r: SelfSalesRow) : { rate: number; amount: number; } => ({ rate: r.marginRate, amount: r.amount })))
}

export function selfSalesWeightedOpMarginRate(rows: SelfSalesRow[]): number {
  return weightedMeanRateByAmount(rows.map((r: SelfSalesRow) : { rate: number; amount: number; } => ({ rate: r.opMarginRate, amount: r.amount })))
}
