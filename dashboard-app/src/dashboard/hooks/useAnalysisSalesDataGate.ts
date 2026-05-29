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
}: AnalysisSalesDataGateOptions<Row>) {
  return useMemo(() => {
    const rowsCurrent = rowsRequest.dataKey === requestKey
    const scatterCurrent = scatterGridRequest.dataKey === requestKey
    const ready = rowsCurrent && scatterCurrent

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
