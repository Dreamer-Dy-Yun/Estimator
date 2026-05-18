import { useMemo } from 'react'
import type { ScatterSalesGridResponse } from '../../api/types'
import { getScatterGridCellColor, getScatterGridCellPointRadius } from '../../utils/scatterGridDisplay'
import type { AnalysisScatterGridPoint } from '../model/analysisScatterGridPoint'

interface AnalysisScatterGridViewOptions {
  scatterGrid: ScatterSalesGridResponse | null
  chartWidth: number
  chartHeight: number
}

interface AnalysisScatterGridView {
  scatterData: AnalysisScatterGridPoint[]
  scatterChartWidth: number
  scatterChartHeight: number
  scatterPointRadius: number
}

export function useAnalysisScatterGridView({
  scatterGrid,
  chartWidth,
  chartHeight,
}: AnalysisScatterGridViewOptions): AnalysisScatterGridView {
  const maxScatterGridCount = useMemo(
    () => Math.max(0, ...(scatterGrid?.cells ?? []).map((cell) => cell.count)),
    [scatterGrid],
  )

  const scatterData = useMemo<AnalysisScatterGridPoint[]>(
    () => (scatterGrid?.cells ?? []).map((cell) => ({
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

  const scatterChartWidth = Math.max(1, Math.floor(chartWidth))
  const scatterChartHeight = Math.max(1, Math.floor(chartHeight))
  const scatterPointRadius = getScatterGridCellPointRadius(
    scatterGrid?.meta,
    scatterChartWidth,
    scatterChartHeight,
  )

  return {
    scatterData,
    scatterChartWidth,
    scatterChartHeight,
    scatterPointRadius,
  }
}
