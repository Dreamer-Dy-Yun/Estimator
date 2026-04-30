import type { CompetitorSalesRow, SelfSalesRow } from '../types'

/** 매출(amount) 가중 평균 비율 — 자사 KPI 등 */
function weightedMeanRateByAmount(rows: Array<{ rate: number; amount: number }>): number {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  if (total <= 0) return 0
  return rows.reduce((s, r) => s + r.rate * r.amount, 0) / total
}

export function selfSalesWeightedOpMarginRate(rows: SelfSalesRow[]): number {
  return weightedMeanRateByAmount(rows.map((r) => ({ rate: r.opMarginRate, amount: r.amount })))
}

/**
 * 경쟁 판매액 대비 갭액 비율(가중).
 * 자사 실적 없는 행은 제외(기존 화면과 동일).
 */
export function competitorGapRateWeightedByCompetitorAmount(rows: CompetitorSalesRow[]): number {
  const withSelf = rows.filter((r) => r.selfAmount != null)
  const denom = withSelf.reduce((s, r) => s + r.competitorAmount, 0)
  if (denom <= 0) return 0
  const numer = withSelf.reduce((s, r) => s + (r.competitorAmount - (r.selfAmount ?? 0)), 0)
  return numer / denom
}
