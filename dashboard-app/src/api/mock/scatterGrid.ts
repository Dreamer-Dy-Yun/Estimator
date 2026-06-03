import type { ScatterGridCell } from '../types'
import type { ScatterSalesGridResponse } from '../types'

type ScatterGridBuildRow = {
  skuGroupKey: string
  x: number
  y: number
}

type ScatterGridBucket = {
  cellKey: string
  count: number
  skuIds: string[]
  xStart: number
  xEnd: number
  yStart: number
  yEnd: number
  representativeX: number
  representativeY: number
}

const DEFAULT_SCATTER_BUCKET_COUNT = 12 as const
const DEFAULT_SCATTER_BUCKET_SIZE_RATIO = 1 as const

function resolveBucketSize(span: number, requested: number | undefined): number {
  if (requested !== undefined && Number.isFinite(requested) && requested > 0) return requested
  if (!Number.isFinite(span) || span <= 0) return 1
  return (span / DEFAULT_SCATTER_BUCKET_COUNT) * DEFAULT_SCATTER_BUCKET_SIZE_RATIO
}

function clampIndex(value: number, start: number, bucketSize: number, bucketCount: number): number {
  const raw: number = (value - start) / bucketSize
  const idx: number = Math.floor(raw)
  if (!Number.isFinite(idx)) return 0
  return Math.max(0, Math.min(bucketCount - 1, idx))
}

function toGridMetaCellKey(valueStart: number, valueEnd: number): string {
  return `${valueStart.toFixed(6)}-${valueEnd.toFixed(6)}`
}

export function buildScatterGridCells(
  rows: ScatterGridBuildRow[],
  xBucketSize?: number,
  yBucketSize?: number,
  maxSkuIdsPerCell?: number,
): ScatterSalesGridResponse {
  const validRows: ScatterGridBuildRow[] = rows.filter((row: ScatterGridBuildRow) : boolean => Number.isFinite(row.x) && Number.isFinite(row.y))
  if (validRows.length === 0) {
    return {
      cells: [],
      meta: {
        xAxis: { min: 0, max: 0, bucketSize: xBucketSize && xBucketSize > 0 ? xBucketSize : 1 },
        yAxis: { min: 0, max: 0, bucketSize: yBucketSize && yBucketSize > 0 ? yBucketSize : 1 },
      },
    }
  }

  const xValues: number[] = validRows.map((row: ScatterGridBuildRow) : number => row.x)
  const yValues: number[] = validRows.map((row: ScatterGridBuildRow) : number => row.y)
  const xMin: number = Math.min(...xValues)
  const xMax: number = Math.max(...xValues)
  const yMin: number = Math.min(...yValues)
  const yMax: number = Math.max(...yValues)

  const xSize: number = resolveBucketSize(xMax - xMin, xBucketSize)
  const ySize: number = resolveBucketSize(yMax - yMin, yBucketSize)

  const xCount: number = xMin === xMax ? 1 : Math.max(1, Math.ceil((xMax - xMin) / xSize))
  const yCount: number = yMin === yMax ? 1 : Math.max(1, Math.ceil((yMax - yMin) / ySize))
  const maxSkuIds: number | undefined = maxSkuIdsPerCell && maxSkuIdsPerCell > 0 ? maxSkuIdsPerCell : undefined

  const cellsByKey: Map<string, ScatterGridBucket> = new Map<string, ScatterGridBucket>()

  for (const row of validRows) {
    const xIdx: number = clampIndex(row.x, xMin, xSize, xCount)
    const yIdx: number = clampIndex(row.y, yMin, ySize, yCount)
    const xStart: number = xMin + xIdx * xSize
    const xEnd: number = xIdx === xCount - 1 ? xMax : xStart + xSize
    const yStart: number = yMin + yIdx * ySize
    const yEnd: number = yIdx === yCount - 1 ? yMax : yStart + ySize
    const key: string = `${toGridMetaCellKey(xStart, xEnd)}|${toGridMetaCellKey(yStart, yEnd)}`
    const existing: ScatterGridBucket | undefined = cellsByKey.get(key)
    if (existing) {
      existing.count += 1
      if (maxSkuIds == null || existing.skuIds.length < maxSkuIds) {
        existing.skuIds.push(row.skuGroupKey)
      }
    } else {
      const xStartRounded: number = Number.isFinite(xStart) ? xStart : 0
      const xEndRounded: number = Number.isFinite(xEnd) ? xEnd : xStartRounded
      const yStartRounded: number = Number.isFinite(yStart) ? yStart : 0
      const yEndRounded: number = Number.isFinite(yEnd) ? yEnd : yStartRounded
      const skuIds: string[] = []
      if (maxSkuIds == null || 0 < maxSkuIds) {
        skuIds.push(row.skuGroupKey)
      }
      cellsByKey.set(key, {
        cellKey: key,
        count: 1,
        skuIds,
        xStart: xStartRounded,
        xEnd: xEndRounded,
        yStart: yStartRounded,
        yEnd: yEndRounded,
        representativeX: (xStartRounded + xEndRounded) / 2,
        representativeY: (yStartRounded + yEndRounded) / 2,
      })
    }
  }

  const cells: ScatterSalesGridResponse['cells'] = Array.from(cellsByKey.values()).map((row: ScatterGridBucket) : { cellKey: string; count: number; skuIds: string[]; hasMoreSkuIds: boolean; xStart: number; xEnd: number; yStart: number; yEnd: number; representativeX: number; representativeY: number; } => ({
    cellKey: row.cellKey,
    count: row.count,
    skuIds: row.skuIds,
    hasMoreSkuIds: maxSkuIds == null ? false : row.count > maxSkuIds,
    xStart: row.xStart,
    xEnd: row.xEnd,
    yStart: row.yStart,
    yEnd: row.yEnd,
    representativeX: row.representativeX,
    representativeY: row.representativeY,
  }))

  cells.sort((a: ScatterGridCell, b: ScatterGridCell) : number => b.count - a.count)

  return {
    cells,
    meta: {
      xAxis: { min: xMin, max: xMax, bucketSize: xSize },
      yAxis: { min: yMin, max: yMax, bucketSize: ySize },
    },
  }
}
