import type { ProductPrimarySummary, ProductSecondaryDetail } from '../types'
import { hashRank } from './hashRank'

/** 자사/경쟁 채널 판매 KPI 컬럼. 1차 요약 카드와 2차 계산 카드가 같은 구조를 사용한다. */
export type SalesKpiColumn = {
  avgPrice: number
  qty: number
  amount: number
  /** 경쟁사 컬럼은 원가, 마진, 수수료, 영업이익을 제공하지 않으므로 null이다. */
  avgCost: number | null
  grossMarginPerUnit: number | null
  feePerUnit: number | null
  feeRatePct: number | null
  opMarginPerUnit: number | null
  opMarginRatePct: number | null
  qtyRank: number
  amountRank: number
  feeRank: number | null
  opMarginRank: number | null
  rankTotal: number
  costRatioPct: number | null
}

export type SalesKpiChannel = {
  id: string
  label: string
  priceSkew?: number
  qtySkew?: number
}

export function buildSalesKpiColumn(
  kind: 'self' | 'competitor',
  primary: ProductPrimarySummary,
  secondary: ProductSecondaryDetail,
  channel: SalesKpiChannel,
): SalesKpiColumn {
  const priceSkew: number = channel.priceSkew ?? 1
  const qtySkew: number = channel.qtySkew ?? 1
  const price: number =
    kind === 'self'
      ? primary.price
      : Math.round(secondary.competitorPrice * priceSkew)
  const qty: number =
    kind === 'self'
      ? primary.qty
      : Math.max(0, Math.round(secondary.competitorQty * qtySkew))
  const amount: number = Math.round(price * qty)
  const qtyRank: number = hashRank(`${primary.skuGroupKey}-${kind}-qty`, 28)
  const amountRank: number = hashRank(`${primary.skuGroupKey}-${kind}-amt`, 28)
  const feeRank: number | null = kind === 'self' ? hashRank(`${primary.skuGroupKey}-${kind}-fee`, 28) : null
  const opMarginRank: number | null = kind === 'self' ? hashRank(`${primary.skuGroupKey}-${kind}-op-margin`, 28) : null
  const rankTotal = 100 as const

  if (kind === 'competitor') {
    return {
      avgPrice: price,
      qty,
      amount,
      avgCost: null,
      grossMarginPerUnit: null,
      feePerUnit: null,
      feeRatePct: null,
      opMarginPerUnit: null,
      opMarginRatePct: null,
      costRatioPct: null,
      qtyRank,
      amountRank,
      feeRank,
      opMarginRank,
      rankTotal,
    }
  }

  const avgCost: number = Math.round(price * 0.78)
  const grossMarginPerUnit: number = price - avgCost
  const feeRatePct = 13 as const
  const feePerUnit: number = Math.round(price * (feeRatePct / 100))
  const opMarginPerUnit: number = grossMarginPerUnit - feePerUnit
  const opMarginRatePct: number = price > 0 ? (opMarginPerUnit / price) * 100 : 0
  const costRatioPct: number = price > 0 ? (avgCost / price) * 100 : 0
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
    feeRank,
    opMarginRank,
    rankTotal,
  }
}
