import type { ProductSecondaryDetail, ProductSecondarySizeRow } from '../../../../../types'

function isFiniteComparisonRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function requireComparisonRatio(size: string, value: number | undefined): number {
  if (isFiniteComparisonRatio(value)) return value
  throw new Error(`Missing comparisonRatioBySize for size "${size}".`)
}

export type ProductSecondarySizeShareRow = ProductSecondarySizeRow & { comparisonRatio: number }

export function mergeSecondarySizeRows(
  secondary: ProductSecondaryDetail,
): ProductSecondarySizeShareRow[] {
  return secondary.sizeRows.map((row: ProductSecondarySizeRow) : { comparisonRatio: number; size: string; selfRatio: number; confirmedQty: number; avgPrice: number; qty: number; availableStock: number; } => {
    const comparisonRatio: number = requireComparisonRatio(row.size, secondary.comparisonRatioBySize[row.size])
    return { ...row, comparisonRatio }
  })
}
