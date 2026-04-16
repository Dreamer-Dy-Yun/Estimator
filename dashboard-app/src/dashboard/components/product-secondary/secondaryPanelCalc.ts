import jStat from 'jstat'
import type { MonthlySalesPoint, ProductPrimarySummary, ProductSecondaryDetail, ProductSizeMixMergedRow } from '../../../types'
import type { CompetitorChannel, SalesKpiColumn } from './secondaryPanelTypes'

/** 1차 사이즈 행 + 2차 경쟁 비중 병합 (UI·차트용). */
export function mergePrimarySecondarySizeMix(
  primary: ProductPrimarySummary,
  secondary: ProductSecondaryDetail,
): ProductSizeMixMergedRow[] {
  return primary.sizeMix.map((row) => ({
    ...row,
    competitorRatio: secondary.competitorRatioBySize[row.size] ?? 1,
  }))
}

/** z = Φ⁻¹(p), p = 서비스 수준 확률(퍼센트 ÷ 100). 표준정규 역분포. */
export function zFromServiceLevelPct(serviceLevelPct: number): number {
  const p = Math.min(0.999999, Math.max(1e-6, serviceLevelPct / 100))
  return jStat.normal.inv(p, 0, 1)
}

function hashRank(seed: string, mod: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return (h % mod) + 1
}

export function buildSalesKpiColumn(
  kind: 'self' | 'competitor',
  primary: ProductPrimarySummary,
  secondary: ProductSecondaryDetail,
  channel: CompetitorChannel,
): SalesKpiColumn {
  const price =
    kind === 'self'
      ? primary.price
      : Math.round(secondary.competitorPrice * channel.priceSkew)
  const qty =
    kind === 'self'
      ? primary.qty
      : Math.max(1, Math.round(secondary.competitorQty * channel.qtySkew))
  const amount = Math.round(price * qty)
  const avgCost = kind === 'self'
    ? Math.round(price * 0.78)
    : Math.round(price * 0.8)
  const grossMarginPerUnit = price - avgCost
  const feeRatePct = 13
  const feePerUnit = Math.round(price * (feeRatePct / 100))
  const opMarginPerUnit = grossMarginPerUnit - feePerUnit
  const opMarginRatePct = price > 0 ? (opMarginPerUnit / price) * 100 : 0
  const costRatioPct = price > 0 ? (avgCost / price) * 100 : 0
  const qtyRank = hashRank(`${primary.id}-${kind}-qty`, 28)
  const amountRank = hashRank(`${primary.id}-${kind}-amt`, 28)
  return {
    avgPrice: price,
    qty,
    amount,
    avgCost,
    grossMarginPerUnit,
    feePerUnit,
    feeRatePct,
    opMarginPerUnit,
    opMarginRatePct,
    costRatioPct,
    qtyRank,
    amountRank,
  }
}

function monthKeyFromDate(d: string) {
  return d.slice(0, 7)
}

export function dailyMeanAndSigmaFromTrend(
  trend: MonthlySalesPoint[],
  periodStart: string,
  periodEnd: string,
): { dailyMean: number; sigma: number; days: number } {
  const a = periodStart.slice(0, 7)
  const b = periodEnd.slice(0, 7)
  const inRange = trend.filter((p) => {
    const m = monthKeyFromDate(p.date)
    return m >= a && m <= b
  })
  const slice = inRange.length ? inRange : trend.slice(-6)
  if (slice.length === 0) return { dailyMean: 0, sigma: 0, days: 30 }
  const sales = slice.map((p) => p.sales)
  const sum = sales.reduce((x, y) => x + y, 0)
  const mean = sum / sales.length
  const days = Math.max(1, slice.length * 30)
  const dailyMean = mean / 30
  const variance = sales.reduce((acc, s) => acc + (s - mean) ** 2, 0) / sales.length
  const sigma = Math.sqrt(variance) / 30
  return { dailyMean, sigma, days }
}
