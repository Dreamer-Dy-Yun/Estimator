import type { SecondaryInboundSplitSource } from '../api/types/secondary'
import type { ProductSecondaryDetail, ProductSecondarySizeRow } from '../types'
import {
  buildSecondaryPlanningSuggestedQuantitiesByRow,
  sumSecondaryPlanningSalesForecastBySize,
  type SecondaryPlanningSizeColumn,
} from './secondaryInboundSplitPlanning'

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
  bufferQty?: number
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
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  inboundSplitSource: SecondaryInboundSplitSource
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
  currentOrderInboundDueDate,
  nextOrderInboundDueDate,
  inboundSplitSource,
  stockOrderSizeRows,
  bufferStock,
  orderDraft,
}: SizeOrderRowsParams): SecondarySizeOrderRow[] {
  const stockOrderSizeRowBySize: Map<string, SecondaryStockOrderSizeRow> = new Map(stockOrderSizeRows.map((row: SecondaryStockOrderSizeRow) : [string, SecondaryStockOrderSizeRow] => [row.size, row]))
  const missingStockOrderSizes: string[] = shares
    .map((row: SecondarySizeShare) : string => row.size)
    .filter((size: string) : boolean => !stockOrderSizeRowBySize.has(size))
  if (missingStockOrderSizes.length) {
    throw new Error(`Missing stock order display rows for sizes: ${missingStockOrderSizes.join(', ')}`)
  }

  const planningColumns: SecondaryPlanningSizeColumn[] = shares.map((row: SecondarySizeShare): SecondaryPlanningSizeColumn => ({
    size: row.size,
    targetEndingStockQty: Math.ceil((dailyMeanEa * bufferStock * row.blendedSharePct) / 100),
  }))
  const forecastQtyBySize: Record<string, number> = sumSecondaryPlanningSalesForecastBySize(
    inboundSplitSource,
    planningColumns,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
  )
  const suggestedQtyBySize: Record<string, number> = buildSecondaryPlanningSuggestedQuantitiesByRow(
    planningColumns,
    [{ inboundDate: currentOrderInboundDueDate, ignoreExistingOrderInbound: false }],
    nextOrderInboundDueDate,
    inboundSplitSource,
  )[0] ?? {}

  return shares.map((row: SecondarySizeShare) : SecondarySizeOrderRow => {
    const bufferQtyEa: number = Math.ceil((dailyMeanEa * bufferStock * row.blendedSharePct) / 100)
    const forecastQty: number = Math.max(0, Math.ceil(forecastQtyBySize[row.size] ?? 0))
    const recommendedQty: number = Math.max(0, Math.round(suggestedQtyBySize[row.size] ?? 0))
    return {
      ...row,
      forecastQty,
      recommendedQty,
      bufferQty: bufferQtyEa,
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
