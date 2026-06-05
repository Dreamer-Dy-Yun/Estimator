import { useMemo } from 'react'
import type { DashboardRequestState } from './useDashboardRequest'

type AnalysisSalesDataGateOptions<Row> = {
  rowsRequest: DashboardRequestState<Row[]>
  requestKey: string
  emptyRows: Row[]
}

export function useAnalysisSalesDataGate<Row>({
  rowsRequest,
  requestKey,
  emptyRows,
}: AnalysisSalesDataGateOptions<Row>) : { rows: Row[]; rowsReady: boolean; rowsInitialLoading: boolean; rowsRefreshing: boolean; } {
  return useMemo(() : { rows: Row[]; rowsReady: boolean; rowsInitialLoading: boolean; rowsRefreshing: boolean; } => {
    const rowsReady: boolean = rowsRequest.dataKey === requestKey

    return {
      rows: rowsReady ? rowsRequest.data : emptyRows,
      rowsReady,
      rowsInitialLoading: !rowsReady && rowsRequest.loading,
      rowsRefreshing: rowsRequest.isRefreshing,
    }
  }, [
    emptyRows,
    requestKey,
    rowsRequest.data,
    rowsRequest.dataKey,
    rowsRequest.isRefreshing,
    rowsRequest.loading,
  ])
}
