export interface AnalysisScatterGridPointBase {
  cellKey: string
  color: string
}

export interface AnalysisScatterGridPoint extends AnalysisScatterGridPointBase {
  x: number
  y: number
  count: number
  xStart: number
  xEnd: number
  yStart: number
  yEnd: number
  hasMoreSkuIds: boolean
}
