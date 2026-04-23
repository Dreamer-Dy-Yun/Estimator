import type { ProductPrimarySummary, ProductSecondaryDetail } from '../types'
import type { SecondaryCompetitorChannel } from '../api/types/secondary'
import { hashRank } from './hashRank'

/** 자사/경쟁 채널 한 컬럼의 판매·원가·수수료·순이익 지표 (2차 패널·스냅샷 공통). */
export type SalesKpiColumn = {
  avgPrice: number
  qty: number
  amount: number
  avgCost: number
  grossMarginPerUnit: number
  feePerUnit: number
  feeRatePct: number
  opMarginPerUnit: number
  opMarginRatePct: number
  qtyRank: number
  amountRank: number
  costRatioPct: number
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
