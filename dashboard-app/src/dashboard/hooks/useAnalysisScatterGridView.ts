import type { ScatterGridCell } from '../../api/types'
import { useMemo } from 'react'
import type { ScatterSalesGridResponse } from '../../api/types'
import { getScatterGridCellColor } from '../../utils/scatterGridDisplay'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'

export interface AnalysisScatterGridViewOptions {
  scatterGrid: ScatterSalesGridResponse | null
  chartWidth: number
  chartHeight: number
  pointRadius: number
}

export interface AnalysisScatterGridView {
  scatterData: AnalysisScatterGridPoint[]
  scatterChartWidth: number
  scatterChartHeight: number
  scatterPointRadius: number
}

export function useAnalysisScatterGridView({
  scatterGrid,
  chartWidth,
  chartHeight,
  pointRadius,
}: AnalysisScatterGridViewOptions): AnalysisScatterGridView {
  const maxScatterGridCount: number = useMemo(
    () : number => Math.max(0, ...(scatterGrid?.cells ?? []).map((cell: ScatterGridCell) : number => cell.count)),
    [scatterGrid],
  )

  const scatterData: AnalysisScatterGridPoint[] = useMemo<AnalysisScatterGridPoint[]>(
    () : { x: number; y: number; cellKey: string; count: number; xStart: number; xEnd: number; yStart: number; yEnd: number; hasMoreSkuIds: boolean; color: string; }[] => (scatterGrid?.cells ?? []).map((cell: ScatterGridCell) : { x: number; y: number; cellKey: string; count: number; xStart: number; xEnd: number; yStart: number; yEnd: number; hasMoreSkuIds: boolean; color: string; } => ({
      x: cell.representativeX,
      y: cell.representativeY,
      cellKey: cell.cellKey,
      count: cell.count,
      xStart: cell.xStart,
      xEnd: cell.xEnd,
      yStart: cell.yStart,
      yEnd: cell.yEnd,
      hasMoreSkuIds: cell.hasMoreSkuIds,
      color: getScatterGridCellColor(cell.count, maxScatterGridCount),
    })),
    [maxScatterGridCount, scatterGrid],
  )

  const scatterChartWidth: number = Math.max(1, Math.floor(chartWidth))
  const scatterChartHeight: number = Math.max(1, Math.floor(chartHeight))

  return {
    scatterData,
    scatterChartWidth,
    scatterChartHeight,
    scatterPointRadius: pointRadius,
  }
}
