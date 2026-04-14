import type { ProductSummary } from '../../../types'
import type { CompetitorChannel, SalesKpiColumn, SecondaryOrderSnapshot } from './secondaryPanelTypes'

const SNAPSHOT_STORAGE_KEY = 'dashboard.orderSnapshots.v1'

export const COMPETITOR_CHANNELS: CompetitorChannel[] = [
  { id: 'kream', label: '크림', priceSkew: 1, qtySkew: 1 },
  { id: 'naver', label: '네이버 스토어', priceSkew: 0.97, qtySkew: 1.12 },
  { id: 'musinsa', label: '무신사', priceSkew: 1.02, qtySkew: 0.88 },
]

/** Crude z for service level (two-tail common values). */
export function zFromServiceLevelPct(p: number): number {
  if (p >= 99) return 2.33
  if (p >= 98) return 2.05
  if (p >= 95) return 1.65
  if (p >= 90) return 1.28
  if (p >= 85) return 1.04
  return 0.84
}

function hashRank(seed: string, mod: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return (h % mod) + 1
}

export function buildSalesKpiColumn(
  kind: 'self' | 'competitor',
  summary: ProductSummary,
  channel: CompetitorChannel,
): SalesKpiColumn {
  const price =
    kind === 'self'
      ? summary.selfPrice
      : Math.round(summary.competitorPrice * channel.priceSkew)
  const qty =
    kind === 'self'
      ? summary.selfQty
      : Math.max(1, Math.round(summary.competitorQty * channel.qtySkew))
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
  const qtyRank = hashRank(`${summary.id}-${kind}-qty`, 28)
  const amountRank = hashRank(`${summary.id}-${kind}-amt`, 28)
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
  trend: ProductSummary['salesTrend'],
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
  const sum = sales.reduce((a, b) => a + b, 0)
  const mean = sum / sales.length
  const days = Math.max(1, slice.length * 30)
  const dailyMean = mean / 30
  const variance = sales.reduce((acc, s) => acc + (s - mean) ** 2, 0) / sales.length
  const sigma = Math.sqrt(variance) / 30
  return { dailyMean, sigma, days }
}

export function loadSnapshots(productId: string): SecondaryOrderSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, SecondaryOrderSnapshot[]>
    return all[productId] ?? []
  } catch {
    return []
  }
}

export function saveOrderSnapshot(snapshot: SecondaryOrderSnapshot): void {
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
    const all = (raw ? JSON.parse(raw) : {}) as Record<string, SecondaryOrderSnapshot[]>
    const list = all[snapshot.productId] ?? []
    list.push(snapshot)
    all[snapshot.productId] = list
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore quota */
  }
}

export async function mockLlmAnswer(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 450))
  const trimmed = prompt.trim() || '(입력 없음)'
  const head = trimmed.slice(0, 200)
  const tail = trimmed.length > 200 ? '…' : ''
  return `[목업 ����]\n��의: ${head}${tail}\n\n실제 서비스에서는 LLM API로 교체합니다.`
}
