import type { ProductPrimarySummary, ProductSecondaryDetail, ProductSizeMixMergedRow } from '../../../../../types'

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
