import type { ScatterGridMetaForDisplay, ScatterGridPointRadiusPolicy } from '../../utils/scatterGridDisplay'
import { getScatterGridCellPointRadius } from '../../utils/scatterGridDisplay'

const BASE_ANALYSIS_SCATTER_POINT_RADIUS_POLICY: ScatterGridPointRadiusPolicy = {
  cellSizeRatio: 0.405,
  minRadius: 3.8,
  maxRadius: 13.5,
}
const ANALYSIS_SCATTER_POINT_RADIUS_SCALE = 0.5 as const

export const ANALYSIS_SCATTER_POINT_RADIUS_POLICY: ScatterGridPointRadiusPolicy = {
  cellSizeRatio: BASE_ANALYSIS_SCATTER_POINT_RADIUS_POLICY.cellSizeRatio * ANALYSIS_SCATTER_POINT_RADIUS_SCALE,
  minRadius: BASE_ANALYSIS_SCATTER_POINT_RADIUS_POLICY.minRadius * ANALYSIS_SCATTER_POINT_RADIUS_SCALE,
  maxRadius: BASE_ANALYSIS_SCATTER_POINT_RADIUS_POLICY.maxRadius * ANALYSIS_SCATTER_POINT_RADIUS_SCALE,
}

export function getAnalysisScatterPointRadius(
  meta: ScatterGridMetaForDisplay | null | undefined,
  chartWidth: number,
  chartHeight: number,
): number {
  const normalizedChartWidth: number = Math.max(1, Math.floor(chartWidth))
  const normalizedChartHeight: number = Math.max(1, Math.floor(chartHeight))
  return getScatterGridCellPointRadius(
    meta,
    normalizedChartWidth,
    normalizedChartHeight,
    ANALYSIS_SCATTER_POINT_RADIUS_POLICY,
  )
}
