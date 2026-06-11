import type { ProductSecondaryDetail, ProductSecondarySizeRow } from '../types'

export type ProductSecondarySizeShareRow = ProductSecondarySizeRow & { comparisonRatio: number }

export type SecondarySizeShare = {
  size: string
  baseSharePct: number
  comparisonSharePct: number
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

export type SecondaryOrderDraftLike = {
  confirmQty: (size: string, recommendedQty: number) => number
}

export type SizeOrderRowsParams = {
  shares: SecondarySizeShare[]
  dailyMeanEa: number
  forecastSalesHorizonDays: number
  stockOrderSizeRows: SecondaryStockOrderSizeRow[]
  bufferStock: number
  orderDraft: SecondaryOrderDraftLike
}

function isFiniteComparisonRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function requireComparisonRatio(size: string, value: number | undefined): number {
  if (isFiniteComparisonRatio(value)) return value
  throw new Error(`Missing comparisonRatioBySize for size "${size}".`)
}

export function mergeSecondarySizeRows(
  secondary: ProductSecondaryDetail,
): ProductSecondarySizeShareRow[] {
  return secondary.sizeRows.map((row: ProductSecondarySizeRow) : ProductSecondarySizeShareRow => {
    const comparisonRatio: number = requireComparisonRatio(row.size, secondary.comparisonRatioBySize[row.size])
    return { ...row, comparisonRatio }
  })
}

export function buildSecondarySizeShares(
  secondary: ProductSecondaryDetail,
  selfWeightPct: number,
): SecondarySizeShare[] {
  const mix: ProductSecondarySizeShareRow[] = mergeSecondarySizeRows(secondary)
  const selfRatioSum: number = mix.reduce((acc: number, row: ProductSecondarySizeShareRow) : number => acc + row.selfRatio, 0)
  const comparisonRatioSum: number = mix.reduce((acc: number, row: ProductSecondarySizeShareRow) : number => acc + row.comparisonRatio, 0)
  const selfWeight: number = selfWeightPct / 100
  const comparisonWeight: number = 1 - selfWeight
  const raw: { size: string; baseSharePct: number; comparisonSharePct: number; blendedRaw: number; avgPrice: number; }[] = mix.map((row: ProductSecondarySizeShareRow) : { size: string; baseSharePct: number; comparisonSharePct: number; blendedRaw: number; avgPrice: number; } => {
    const baseSharePct: number = selfRatioSum > 0 ? (row.selfRatio / selfRatioSum) * 100 : 0
    const comparisonSharePct: number = comparisonRatioSum > 0 ? (row.comparisonRatio / comparisonRatioSum) * 100 : 0
    return {
      size: row.size,
      baseSharePct,
      comparisonSharePct,
      blendedRaw: baseSharePct * selfWeight + comparisonSharePct * comparisonWeight,
      avgPrice: row.avgPrice,
    }
  })
  const blendedSum: number = raw.reduce((acc: number, row: { size: string; baseSharePct: number; comparisonSharePct: number; blendedRaw: number; avgPrice: number; }) : number => acc + row.blendedRaw, 0) || 1
  return raw.map((row: { size: string; baseSharePct: number; comparisonSharePct: number; blendedRaw: number; avgPrice: number; }) : SecondarySizeShare => ({
    size: row.size,
    baseSharePct: row.baseSharePct,
    comparisonSharePct: row.comparisonSharePct,
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
  return shares.map((row: SecondarySizeShare) : SecondarySizeOrderRow => {
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
