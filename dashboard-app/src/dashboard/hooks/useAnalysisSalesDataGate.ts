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
}: AnalysisSalesDataGateOptions<Row>) : { rows: Row[]; scatterGrid: ScatterSalesGridResponse | null; rowsReady: boolean; scatterReady: boolean; rowsInitialLoading: boolean; rowsRefreshing: boolean; scatterInitialLoading: boolean; scatterRefreshing: boolean; } {
  return useMemo(() : { rows: Row[]; scatterGrid: ScatterSalesGridResponse | null; rowsReady: boolean; scatterReady: boolean; rowsInitialLoading: boolean; rowsRefreshing: boolean; scatterInitialLoading: boolean; scatterRefreshing: boolean; } => {
    const rowsReady: boolean = rowsRequest.dataKey === requestKey
    const scatterReady: boolean = scatterGridRequest.dataKey === requestKey

    return {
      rows: rowsReady ? rowsRequest.data : emptyRows,
      scatterGrid: scatterReady ? scatterGridRequest.data : null,
      rowsReady,
      scatterReady,
      rowsInitialLoading: !rowsReady && rowsRequest.loading,
      rowsRefreshing: rowsRequest.isRefreshing,
      scatterInitialLoading: !scatterReady && scatterGridRequest.loading,
      scatterRefreshing: scatterGridRequest.isRefreshing,
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
