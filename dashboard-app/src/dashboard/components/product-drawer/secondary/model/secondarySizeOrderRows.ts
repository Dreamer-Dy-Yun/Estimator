import type { ProductSecondaryDetail, ProductSecondarySizeRow } from '../../../../../types'
import { mergeSecondarySizeRows } from './secondaryDrawerCalc'
import type { SecondaryOrderDraft } from './SecondaryOrderDraft'

export type SecondarySizeShare = {
  size: string
  selfSharePct: number
  competitorSharePct: number
  blendedSharePct: number
  avgPrice: number
}

export type SecondarySizeOrderRow = SecondarySizeShare & {
  forecastQty: number
  recommendedQty: number
  confirmQty: number
}

export type SecondarySizeOrderDisplayRow = Omit<SecondarySizeOrderRow, 'avgPrice'>

export type SecondaryStockOrderSizeRow = {
  size: string
  currentStockQty: number
  totalOrderBalance: number
  expectedInboundOrderBalance: number
}

type SizeOrderRowsParams = {
  shares: SecondarySizeShare[]
  dailyMeanEa: number
  forecastSalesHorizonDays: number
  stockOrderSizeRows: SecondaryStockOrderSizeRow[]
  bufferStock: number
  orderDraft: SecondaryOrderDraft
}

export function buildSecondarySizeShares(
  secondary: ProductSecondaryDetail,
  selfWeightPct: number,
): SecondarySizeShare[] {
  const mix = mergeSecondarySizeRows(secondary)
  const selfRatioSum = mix.reduce((acc, row) => acc + row.selfRatio, 0)
  const competitorRatioSum = mix.reduce((acc, row) => acc + row.competitorRatio, 0)
  const selfWeight = selfWeightPct / 100
  const competitorWeight = 1 - selfWeight
  const raw = mix.map((row) => {
    const selfSharePct = selfRatioSum > 0 ? (row.selfRatio / selfRatioSum) * 100 : 0
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
  stockOrderSizeRows,
  bufferStock,
  orderDraft,
}: SizeOrderRowsParams): SecondarySizeOrderRow[] {
  const totalQtyWindow = dailyMeanEa * forecastSalesHorizonDays
  const stockOrderSizeRowBySize = new Map(stockOrderSizeRows.map((row) => [row.size, row]))
  const missingStockOrderSizes = shares
    .map((row) => row.size)
    .filter((size) => !stockOrderSizeRowBySize.has(size))
  if (missingStockOrderSizes.length) {
    throw new Error(`Missing stock order display rows for sizes: ${missingStockOrderSizes.join(', ')}`)
  }
  return shares.map((row) => {
    const forecastQty = Math.ceil((totalQtyWindow * row.blendedSharePct) / 100)
    const bufferQtyEa = Math.ceil((dailyMeanEa * bufferStock * row.blendedSharePct) / 100)
    const stockOrderSizeRow = stockOrderSizeRowBySize.get(row.size)
    const stock = stockOrderSizeRow!.currentStockQty
    const inbound = stockOrderSizeRow!.expectedInboundOrderBalance
    const recommendedQty = Math.max(0, Math.round(forecastQty - stock - inbound + bufferQtyEa))
    return {
      ...row,
      forecastQty,
      recommendedQty,
      confirmQty: orderDraft.confirmQty(row.size, recommendedQty),
    }
  })
}

export function buildDailyTrendSizeOptions(sizeRows: ProductSecondarySizeRow[]) {
  if (!sizeRows.length) return []
  const sum = sizeRows.reduce((acc, row) => acc + row.selfRatio, 0) || 1
  return sizeRows.map((row) => ({
    id: row.size,
    label: row.size,
    share: row.selfRatio / sum,
  }))
}
