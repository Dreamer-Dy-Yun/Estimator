import { useMemo } from 'react'
import type { ScatterSalesGridResponse } from '../../api/types'
import type { DashboardRequestState } from './useDashboardRequest'

type AnalysisSalesDataGateOptions<Row> = {
  rowsRequest: DashboardRequestState<Row[]>
  scatterGridRequest: DashboardRequestState<ScatterSalesGridResponse | null>
  requestKey: string
  emptyRows: Row[]
}

export function useAnalysisSalesDataGate<Row>({
  rowsRequest,
  scatterGridRequest,
  requestKey,
  emptyRows,
}: AnalysisSalesDataGateOptions<Row>) : { rows: Row[]; scatterGrid: ScatterSalesGridResponse | null; initialLoading: boolean; refreshing: boolean; ready: boolean; } {
  return useMemo(() : { rows: Row[]; scatterGrid: ScatterSalesGridResponse | null; initialLoading: boolean; refreshing: boolean; ready: boolean; } => {
    const rowsCurrent: boolean = rowsRequest.dataKey === requestKey
    const scatterCurrent: boolean = scatterGridRequest.dataKey === requestKey
    const ready: boolean = rowsCurrent && scatterCurrent

    return {
      rows: ready ? rowsRequest.data : emptyRows,
      scatterGrid: ready ? scatterGridRequest.data : null,
      initialLoading: !ready && (rowsRequest.loading || scatterGridRequest.loading),
      refreshing: rowsRequest.isRefreshing || scatterGridRequest.isRefreshing,
      ready,
    }
  }, [
    emptyRows,
    requestKey,
    rowsRequest.data,
    rowsRequest.dataKey,
    rowsRequest.isRefreshing,
    rowsRequest.loading,
    scatterGridRequest.data,
    scatterGridRequest.dataKey,
    scatterGridRequest.isRefreshing,
    scatterGridRequest.loading,
  ])
}
