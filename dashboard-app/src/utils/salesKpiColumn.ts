import type { ProductPrimarySummary, ProductSecondaryDetail } from '../types'
import type { SecondaryCompetitorChannel } from '../api/types/secondary'
import { hashRank } from './hashRank'

/** 자사/경쟁 채널 한 컬럼의 판매·원가·수수료·순이익 지표 (2차 패널·스냅샷 공통). */
export type SalesKpiColumn = {
  avgPrice: number
  qty: number
  amount: number
  /** 경쟁사 컬럼은 원가·마진·수수료·영업이익 미제공 → null */
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

export function buildSalesKpiColumn(
  kind: 'self' | 'competitor',
  primary: ProductPrimarySummary,
  secondary: ProductSecondaryDetail,
  channel: SecondaryCompetitorChannel,
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
  const qtyRank = hashRank(`${primary.id}-${kind}-qty`, 28)
  const amountRank = hashRank(`${primary.id}-${kind}-amt`, 28)
  const feeRank = kind === 'self' ? hashRank(`${primary.id}-${kind}-fee`, 28) : null
  const opMarginRank = kind === 'self' ? hashRank(`${primary.id}-${kind}-op-margin`, 28) : null
  const rankTotal = 100

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

  const avgCost = Math.round(price * 0.78)
  const grossMarginPerUnit = price - avgCost
  const feeRatePct = 13
  const feePerUnit = Math.round(price * (feeRatePct / 100))
  const opMarginPerUnit = grossMarginPerUnit - feePerUnit
  const opMarginRatePct = price > 0 ? (opMarginPerUnit / price) * 100 : 0
  const costRatioPct = price > 0 ? (avgCost / price) * 100 : 0
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
