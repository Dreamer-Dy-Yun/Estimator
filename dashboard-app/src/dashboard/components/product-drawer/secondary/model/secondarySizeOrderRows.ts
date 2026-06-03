import type { ProductSecondarySizeShareRow } from './secondaryDrawerCalc'
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

export type SizeOrderRowsParams = {
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
  const mix: ProductSecondarySizeShareRow[] = mergeSecondarySizeRows(secondary)
  const selfRatioSum: number = mix.reduce((acc: number, row: ProductSecondarySizeShareRow) : number => acc + row.selfRatio, 0)
  const competitorRatioSum: number = mix.reduce((acc: number, row: ProductSecondarySizeShareRow) : number => acc + row.competitorRatio, 0)
  const selfWeight: number = selfWeightPct / 100
  const competitorWeight: number = 1 - selfWeight
  const raw: { size: string; selfSharePct: number; competitorSharePct: number; blendedRaw: number; avgPrice: number; }[] = mix.map((row: ProductSecondarySizeShareRow) : { size: string; selfSharePct: number; competitorSharePct: number; blendedRaw: number; avgPrice: number; } => {
    const selfSharePct: number = selfRatioSum > 0 ? (row.selfRatio / selfRatioSum) * 100 : 0
    const competitorSharePct: number = competitorRatioSum > 0 ? (row.competitorRatio / competitorRatioSum) * 100 : 0
    return {
      size: row.size,
      selfSharePct,
      competitorSharePct,
      blendedRaw: selfSharePct * selfWeight + competitorSharePct * competitorWeight,
      avgPrice: row.avgPrice,
    }
  })
  const blendedSum: number = raw.reduce((acc: number, row: { size: string; selfSharePct: number; competitorSharePct: number; blendedRaw: number; avgPrice: number; }) : number => acc + row.blendedRaw, 0) || 1
  return raw.map((row: { size: string; selfSharePct: number; competitorSharePct: number; blendedRaw: number; avgPrice: number; }) : { size: string; selfSharePct: number; competitorSharePct: number; blendedSharePct: number; avgPrice: number; } => ({
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
  const totalQtyWindow: number = dailyMeanEa * forecastSalesHorizonDays
  const stockOrderSizeRowBySize: Map<string, SecondaryStockOrderSizeRow> = new Map(stockOrderSizeRows.map((row: SecondaryStockOrderSizeRow) : [string, SecondaryStockOrderSizeRow] => [row.size, row]))
  const missingStockOrderSizes: string[] = shares
    .map((row: SecondarySizeShare) : string => row.size)
    .filter((size: string) : boolean => !stockOrderSizeRowBySize.has(size))
  if (missingStockOrderSizes.length) {
    throw new Error(`Missing stock order display rows for sizes: ${missingStockOrderSizes.join(', ')}`)
  }
  return shares.map((row: SecondarySizeShare) : { forecastQty: number; recommendedQty: number; confirmQty: number; size: string; selfSharePct: number; competitorSharePct: number; blendedSharePct: number; avgPrice: number; } => {
    const forecastQty: number = Math.ceil((totalQtyWindow * row.blendedSharePct) / 100)
    const bufferQtyEa: number = Math.ceil((dailyMeanEa * bufferStock * row.blendedSharePct) / 100)
    const stockOrderSizeRow: SecondaryStockOrderSizeRow | undefined = stockOrderSizeRowBySize.get(row.size)
    const stock: number = stockOrderSizeRow!.currentStockQty
    const inbound: number = stockOrderSizeRow!.expectedInboundOrderBalance
    const recommendedQty: number = Math.max(0, Math.round(forecastQty - stock - inbound + bufferQtyEa))
    return {
      ...row,
      forecastQty,
      recommendedQty,
      confirmQty: orderDraft.confirmQty(row.size, recommendedQty),
    }
  })
}

export function buildDailyTrendSizeOptions(sizeRows: ProductSecondarySizeRow[]) : { id: string; label: string; share: number; }[] {
  if (!sizeRows.length) return []
  const sum: number = sizeRows.reduce((acc: number, row: ProductSecondarySizeRow) : number => acc + row.selfRatio, 0) || 1
  return sizeRows.map((row: ProductSecondarySizeRow) : { id: string; label: string; share: number; } => ({
    id: row.size,
    label: row.size,
    share: row.selfRatio / sum,
  }))
}
