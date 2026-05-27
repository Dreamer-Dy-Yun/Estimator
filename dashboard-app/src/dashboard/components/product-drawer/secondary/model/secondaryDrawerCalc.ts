import type { ProductSecondaryDetail, ProductSecondarySizeRow } from '../../../../../types'

function isFiniteCompetitorRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function requireCompetitorRatio(size: string, value: number | undefined): number {
  if (isFiniteCompetitorRatio(value)) return value
  throw new Error(`Missing competitorRatioBySize for size "${size}".`)
}

export type ProductSecondarySizeShareRow = ProductSecondarySizeRow & { competitorRatio: number }

export function mergeSecondarySizeRows(
  secondary: ProductSecondaryDetail,
): ProductSecondarySizeShareRow[] {
  return secondary.sizeRows.map((row) => {
    const competitorRatio = requireCompetitorRatio(row.size, secondary.competitorRatioBySize[row.size])
    return { ...row, competitorRatio }
  })
}
