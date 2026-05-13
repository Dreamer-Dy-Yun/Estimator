const SCATTER_GRID_HUE = 217
const SCATTER_GRID_SATURATION = 91
const SCATTER_GRID_LOW_DENSITY_LIGHTNESS = 86
const SCATTER_GRID_HIGH_DENSITY_LIGHTNESS = 60
const SCATTER_GRID_POINT_RADIUS_RATIO = 0.27
const SCATTER_GRID_POINT_RADIUS_MIN = 2.5
const SCATTER_GRID_POINT_RADIUS_MAX = 9

type ScatterGridAxisForDisplay = {
  min: number
  max: number
  bucketSize: number
}

type ScatterGridMetaForDisplay = {
  xAxis: ScatterGridAxisForDisplay
  yAxis: ScatterGridAxisForDisplay
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
  const range = axis.max - axis.min
  if (!Number.isFinite(range) || range <= 0) return 0
  if (!Number.isFinite(axis.bucketSize) || axis.bucketSize <= 0) return 0
  if (!Number.isFinite(chartPixelSize) || chartPixelSize <= 0) return 0
  return (axis.bucketSize / range) * chartPixelSize
}

export function getScatterGridCellColor(count: number, maxCount: number): string {
  if (!Number.isFinite(count) || !Number.isFinite(maxCount) || count <= 1 || maxCount <= 1) {
    return hslBlue(SCATTER_GRID_LOW_DENSITY_LIGHTNESS)
  }

  const ratio = clampRatio(Math.sqrt((count - 1) / (maxCount - 1)))
  const lightness = SCATTER_GRID_LOW_DENSITY_LIGHTNESS
    + (SCATTER_GRID_HIGH_DENSITY_LIGHTNESS - SCATTER_GRID_LOW_DENSITY_LIGHTNESS) * ratio
  return hslBlue(lightness)
}

export function getScatterGridCellPointRadius(
  meta: ScatterGridMetaForDisplay | null | undefined,
  chartWidth: number,
  chartHeight: number,
): number {
  if (!meta) return SCATTER_GRID_POINT_RADIUS_MIN

  const xBucketPixels = axisBucketPixelSize(meta.xAxis, chartWidth)
  const yBucketPixels = axisBucketPixelSize(meta.yAxis, chartHeight)
  const cellPixelSize = Math.min(xBucketPixels, yBucketPixels)
  if (!Number.isFinite(cellPixelSize) || cellPixelSize <= 0) return SCATTER_GRID_POINT_RADIUS_MIN

  const radius = clamp(
    cellPixelSize * SCATTER_GRID_POINT_RADIUS_RATIO,
    SCATTER_GRID_POINT_RADIUS_MIN,
    SCATTER_GRID_POINT_RADIUS_MAX,
  )
  return Number(radius.toFixed(1))
}
