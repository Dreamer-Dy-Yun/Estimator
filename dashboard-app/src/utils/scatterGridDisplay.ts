const SCATTER_GRID_HUE = 217 as const
const SCATTER_GRID_SATURATION = 91 as const
const SCATTER_GRID_LOW_DENSITY_LIGHTNESS = 86 as const
const SCATTER_GRID_HIGH_DENSITY_LIGHTNESS = 60 as const

export type ScatterGridAxisForDisplay = {
  min: number
  max: number
  bucketSize: number
}

export type ScatterGridMetaForDisplay = {
  xAxis: ScatterGridAxisForDisplay
  yAxis: ScatterGridAxisForDisplay
}

export interface ScatterGridPointRadiusPolicy {
  cellSizeRatio: number
  minRadius: number
  maxRadius: number
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function hslBlue(lightness: number): string {
  return `hsl(${SCATTER_GRID_HUE}, ${SCATTER_GRID_SATURATION}%, ${Number(lightness.toFixed(1))}%)`
}

function axisBucketPixelSize(axis: ScatterGridAxisForDisplay, chartPixelSize: number): number {
  const range: number = axis.max - axis.min
  if (!Number.isFinite(range) || range <= 0) return 0
  if (!Number.isFinite(axis.bucketSize) || axis.bucketSize <= 0) return 0
  if (!Number.isFinite(chartPixelSize) || chartPixelSize <= 0) return 0
  return (axis.bucketSize / range) * chartPixelSize
}

export function getScatterGridCellColor(count: number, maxCount: number): string {
  if (!Number.isFinite(count) || !Number.isFinite(maxCount) || count <= 1 || maxCount <= 1) {
    return hslBlue(SCATTER_GRID_LOW_DENSITY_LIGHTNESS)
  }

  const ratio: number = clampRatio(Math.sqrt((count - 1) / (maxCount - 1)))
  const lightness: number = SCATTER_GRID_LOW_DENSITY_LIGHTNESS
    + (SCATTER_GRID_HIGH_DENSITY_LIGHTNESS - SCATTER_GRID_LOW_DENSITY_LIGHTNESS) * ratio
  return hslBlue(lightness)
}

export function getScatterGridCellPointRadius(
  meta: ScatterGridMetaForDisplay | null | undefined,
  chartWidth: number,
  chartHeight: number,
  radiusPolicy: ScatterGridPointRadiusPolicy,
): number {
  const fallbackRadius: number = radiusPolicy.minRadius
  if (!meta) return fallbackRadius

  const xBucketPixels: number = axisBucketPixelSize(meta.xAxis, chartWidth)
  const yBucketPixels: number = axisBucketPixelSize(meta.yAxis, chartHeight)
  const cellPixelSize: number = Math.min(xBucketPixels, yBucketPixels)
  if (!Number.isFinite(cellPixelSize) || cellPixelSize <= 0) return fallbackRadius

  const radius: number = clamp(
    cellPixelSize * radiusPolicy.cellSizeRatio,
    radiusPolicy.minRadius,
    radiusPolicy.maxRadius,
  )
  return Number(radius.toFixed(1))
}
