import type { ProductPrimarySummary, ProductSecondaryDetail, ProductSizeMixMergedRow } from '../../../../types'
import type { CompetitorChannel, SalesKpiColumn } from '../secondaryPanelTypes'

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
