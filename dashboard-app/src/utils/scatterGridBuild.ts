import type { ScatterGridBinParams, ScatterGridCell, ScatterSalesGridResponse } from '../api/types'
import type { CompetitorSalesRow, SelfSalesRow } from '../types'

export interface ScatterGridBuildRow {
  skuGroupKey: string
  x: number
  y: number
}

interface ScatterGridBucket {
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

type CompetitorSalesRowWithSelfQty = CompetitorSalesRow & {
  selfQty: number
}

const DEFAULT_SCATTER_BUCKET_COUNT = 12 as const
const DEFAULT_SCATTER_BUCKET_SIZE_RATIO = 1 as const

function hasCompetitorSelfQty(row: CompetitorSalesRow): row is CompetitorSalesRowWithSelfQty {
  return row.selfQty != null
}

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

/**
 * 프론트 검토:
 * - 분석 리스트 요청방식/계산 주체 변경
 * - 현상: 프론트에서 해당 기간 리스트를 전체 확보하고 산점도에도 동일 조건을 같이 요청하면 동일 데이터 2중 요청 또는 불필요한 요청이 된다.
 * - 원래 의도: 전체 데이터 요청 후 산점도는 프론트에서 계산한다. 수천 행 이내이므로 프론트 부담은 경미하다.
 * - 선택: 현재 화면은 전체 rows 1회 요청을 기준으로 하고, 산점도 grid는 이 순수 계산 경계에서 만든다.
 * - 안 2는 산점도 전체 집계와 리스트 pagination이 필요한 시점에 backend API 계약 변경으로 재검토한다.
 */
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

  const cells: ScatterSalesGridResponse['cells'] = Array.from(cellsByKey.values()).map((row: ScatterGridBucket) : ScatterGridCell => ({
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

export function buildSelfSalesScatterGridFromRows(
  rows: SelfSalesRow[],
  params?: ScatterGridBinParams,
): ScatterSalesGridResponse {
  return buildScatterGridCells(
    rows.map((row: SelfSalesRow) : ScatterGridBuildRow => ({
      skuGroupKey: row.skuGroupKey,
      x: row.opMarginRate,
      y: row.qty,
    })),
    params?.xBucketSize,
    params?.yBucketSize,
    params?.maxSkuIdsPerCell,
  )
}

export function buildCompetitorSalesScatterGridFromRows(
  rows: CompetitorSalesRow[],
  params?: ScatterGridBinParams,
): ScatterSalesGridResponse {
  return buildScatterGridCells(
    rows
      .filter(hasCompetitorSelfQty)
      .map((row: CompetitorSalesRowWithSelfQty) : ScatterGridBuildRow => ({
        skuGroupKey: row.skuGroupKey,
        x: row.selfQty,
        y: row.competitorQty,
      })),
    params?.xBucketSize,
    params?.yBucketSize,
    params?.maxSkuIdsPerCell,
  )
}
