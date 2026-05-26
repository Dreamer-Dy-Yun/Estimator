import type { ProductPrimarySummary, ProductSecondaryDetail, ProductSizeMixMergedRow } from '../../../../../types'

function isFiniteCompetitorRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function requireCompetitorRatio(size: string, value: number | undefined): number {
  if (isFiniteCompetitorRatio(value)) return value
  throw new Error(`Missing competitorRatioBySize for size "${size}".`)
}

/** 1차 사이즈 행 + 2차 경쟁 비중 병합 (UI·차트용). */
export function mergePrimarySecondarySizeMix(
  primary: ProductPrimarySummary,
  secondary: ProductSecondaryDetail,
): ProductSizeMixMergedRow[] {
  return primary.sizeMix.map((row) => {
    const competitorRatio = requireCompetitorRatio(row.size, secondary.competitorRatioBySize[row.size])
    return { ...row, competitorRatio }
  })
}
