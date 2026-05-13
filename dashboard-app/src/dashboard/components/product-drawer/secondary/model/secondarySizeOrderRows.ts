import type { ProductPrimarySummary, ProductSecondaryDetail } from '../../../../../types'
import { mergePrimarySecondarySizeMix } from './secondaryDrawerCalc'
import type { SecondaryOrderDraft } from './SecondaryOrderDraft'

export type SecondarySizeOrderRow = {
  size: string
  selfSharePct: number
  competitorSharePct: number
  blendedSharePct: number
  avgPrice: number
  forecastQty: number
  recommendedQty: number
  confirmQty: number
}

type SecondarySizeShare = Omit<SecondarySizeOrderRow, 'forecastQty' | 'recommendedQty' | 'confirmQty'>

type SizeOrderRowsParams = {
  shares: SecondarySizeShare[]
  dailyMeanEa: number
  forecastSalesHorizonDays: number
  currentStockBySize: number[]
  expectedInboundBySize: number[]
  bufferStock: number
  orderDraft: SecondaryOrderDraft
}

export function buildSecondarySizeShares(
  primary: ProductPrimarySummary,
  secondary: ProductSecondaryDetail,
  selfWeightPct: number,
): SecondarySizeShare[] {
  const mix = mergePrimarySecondarySizeMix(primary, secondary)
  const selfRatioSum = mix.reduce((acc, row) => acc + row.ratio, 0)
  const competitorRatioSum = mix.reduce((acc, row) => acc + row.competitorRatio, 0)
  const selfWeight = selfWeightPct / 100
  const competitorWeight = 1 - selfWeight
  const raw = mix.map((row) => {
    const selfSharePct = selfRatioSum > 0 ? (row.ratio / selfRatioSum) * 100 : 0
    const competitorSharePct = competitorRatioSum > 0 ? (row.competitorRatio / competitorRatioSum) * 100 : 0
    return {
      size: row.size,
      selfSharePct,
      competitorSharePct,
      blendedRaw: selfSharePct * selfWeight + competitorSharePct * competitorWeight,
      avgPrice: row.avgPrice,
    }
  })
  const blendedSum = raw.reduce((acc, row) => acc + row.blendedRaw, 0) || 1
  return raw.map((row) => ({
    size: row.size,
    selfSharePct: row.selfSharePct,
    competitorSharePct: row.competitorSharePct,
    blendedSharePct: (row.blendedRaw / blendedSum) * 100,
    avgPrice: row.avgPrice,
  }))
}

export function buildSecondarySizeOrderRows({
  shares,
  dailyMeanEa,
  forecastSalesHorizonDays,
  currentStockBySize,
  expectedInboundBySize,
  bufferStock,
  orderDraft,
}: SizeOrderRowsParams): SecondarySizeOrderRow[] {
  const totalQtyWindow = dailyMeanEa * forecastSalesHorizonDays
  return shares.map((row, index) => {
    const forecastQty = Math.ceil((totalQtyWindow * row.blendedSharePct) / 100)
    const bufferQtyEa = Math.ceil((dailyMeanEa * bufferStock * row.blendedSharePct) / 100)
    const stock = currentStockBySize[index] ?? 0
    const inbound = expectedInboundBySize[index] ?? 0
    const recommendedQty = Math.max(0, Math.round(forecastQty - stock - inbound + bufferQtyEa))
    return {
      ...row,
      forecastQty,
      recommendedQty,
      confirmQty: orderDraft.confirmQty(row.size, recommendedQty),
    }
  })
}

export function buildDailyTrendSizeOptions(sizeMix: ProductPrimarySummary['sizeMix']) {
  if (!sizeMix.length) return []
  const sum = sizeMix.reduce((acc, row) => acc + row.ratio, 0) || 1
  return sizeMix.map((row) => ({
    id: row.size,
    label: row.size,
    share: row.ratio / sum,
  }))
}
