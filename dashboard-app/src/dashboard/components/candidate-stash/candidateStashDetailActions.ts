import type { Dispatch, SetStateAction } from 'react'
import type { CandidateItemSummary } from '../../../api'
import type { useCandidateBulkDetailConfirm } from './useCandidateBulkDetailConfirm'
import type { useCandidateDataReferencePeriod } from './useCandidateDataReferencePeriod'
import type { useCandidateDetailConfirmationMutations } from './useCandidateDetailConfirmationMutations'
import type { useCandidateItemsLoader } from './useCandidateItemsLoader'
import type { useCandidateRecommendations } from './useCandidateRecommendations'
import type { useCandidateStashItemActions } from './useCandidateStashItemActions'
import type { useCandidateStashItemDrawer } from './useCandidateStashItemDrawer'
import type { useCandidateStashSummaries } from './useCandidateStashSummaries'
import type { useInnerCandidateTable } from './useInnerCandidateTable'

type CandidateItemActionContract = Pick<
  ReturnType<typeof useCandidateStashItemActions>,
  | 'itemDeleteBusy'
  | 'bulkDeleteBusy'
  | 'bulkUnconfirmBusy'
  | 'orderExportBusy'
  | 'orderExportError'
  | 'confirmDeleteItems'
  | 'confirmUnconfirmItems'
  | 'downloadOrderExcel'
>

type CandidateBulkConfirmContract = ReturnType<typeof useCandidateBulkDetailConfirm>
type CandidateDataReferencePeriodContract = ReturnType<typeof useCandidateDataReferencePeriod>
type CandidateDetailConfirmationMutationContract = ReturnType<typeof useCandidateDetailConfirmationMutations>
type CandidateItemsLoaderContract = ReturnType<typeof useCandidateItemsLoader>
type CandidateRecommendationContract = ReturnType<typeof useCandidateRecommendations>
type CandidateStashDrawerContract = ReturnType<typeof useCandidateStashItemDrawer>
type CandidateStashSummaryContract = ReturnType<typeof useCandidateStashSummaries>
type CandidateTableContract = ReturnType<typeof useInnerCandidateTable>

type CreateCandidateStashDetailModalModelParams = {
  actions: CandidateItemActionContract
  bulkConfirm: CandidateBulkConfirmContract
  confirmDeleteItem: () => Promise<void>
  dataReferenceEnd: string | undefined
  dataReferencePeriod: CandidateDataReferencePeriodContract
  dataReferenceStart: string | undefined
  detailError: CandidateItemsLoaderContract['detailError']
  detailLoading: CandidateItemsLoaderContract['detailLoading']
  detailTarget: CandidateStashSummaryContract['detailTarget']
  drawer: CandidateStashDrawerContract
  itemDeleteTarget: CandidateItemSummary | null
  items: CandidateItemSummary[]
  loadItems: CandidateItemsLoaderContract['loadItems']
  markDrawerSnapshotConfirmed: CandidateDetailConfirmationMutationContract['markDrawerSnapshotConfirmed']
  markDrawerSnapshotUnconfirmed: CandidateDetailConfirmationMutationContract['markDrawerSnapshotUnconfirmed']
  recommendations: CandidateRecommendationContract
  refreshStashes: CandidateStashSummaryContract['refreshStashes']
  setItemDeleteTarget: Dispatch<SetStateAction<CandidateItemSummary | null>>
  table: CandidateTableContract
}

export function createCandidateStashDetailModalModel({
  actions,
  bulkConfirm,
  confirmDeleteItem,
  dataReferenceEnd,
  dataReferencePeriod,
  dataReferenceStart,
  detailError,
  detailLoading,
  detailTarget,
  drawer,
  itemDeleteTarget,
  items,
  loadItems,
  markDrawerSnapshotConfirmed,
  markDrawerSnapshotUnconfirmed,
  recommendations,
  refreshStashes,
  setItemDeleteTarget,
  table,
}: CreateCandidateStashDetailModalModelParams) {
  return {
    drawerOpen: drawer.drawerOpen,
    drawerClosing: drawer.drawerClosing,
    items,
    recommendationItems: recommendations.recommendationItems,
    recommendationLoading: recommendations.recommendationLoading,
    recommendationError: recommendations.recommendationError,
    detailLoading,
    detailError,
    brandQuery: table.brandQuery,
    setBrandQuery: table.setBrandQuery,
    codeQuery: table.codeQuery,
    setCodeQuery: table.setCodeQuery,
    productNameQuery: table.productNameQuery,
    setProductNameQuery: table.setProductNameQuery,
    tableSort: table.tableSort,
    toggleTableSort: table.toggleTableSort,
    drawerError: drawer.drawerError,
    openedItemUuid: drawer.openedItemUuid,
    hydrateSnap: drawer.hydrateSnap,
    hydrateSnapSource: drawer.hydrateSnapSource,
    confirmedHydrateSnap: drawer.confirmedHydrateSnap,
    dataReferencePeriodStart: dataReferencePeriod.dataReferencePeriodStart,
    dataReferencePeriodEnd: dataReferencePeriod.dataReferencePeriodEnd,
    draftDataReferencePeriodStart: dataReferencePeriod.draftDataReferencePeriodStart,
    draftDataReferencePeriodEnd: dataReferencePeriod.draftDataReferencePeriodEnd,
    dataReferencePeriodQueryDirty: dataReferencePeriod.dataReferencePeriodQueryDirty,
    onDataReferencePeriodStartChange: dataReferencePeriod.onDataReferencePeriodStartChange,
    onDataReferencePeriodEndChange: dataReferencePeriod.onDataReferencePeriodEndChange,
    applyDataReferencePeriod: dataReferencePeriod.applyDataReferencePeriod,
    fc: drawer.fc,
    bundle: drawer.bundle,
    mergedSummary: drawer.mergedSummary,
    periodStart: dataReferenceStart,
    periodEnd: dataReferenceEnd,
    itemDeleteTarget,
    detailTarget,
    brandOptions: table.brandOptions,
    codeOptions: table.codeOptions,
    productNameOptions: table.productNameOptions,
    tableRows: table.tableRows,
    totals: table.totals,
    pendingOrderMetricCount: table.pendingOrderMetricCount,
    totalExpectedOpProfitRatePct: table.totalExpectedOpProfitRatePct,
    itemDeleteBusy: actions.itemDeleteBusy,
    bulkConfirmBusy: bulkConfirm.bulkConfirmBusy,
    bulkConfirmProgress: bulkConfirm.bulkConfirmProgress,
    bulkDeleteBusy: actions.bulkDeleteBusy,
    bulkUnconfirmBusy: actions.bulkUnconfirmBusy,
    orderExportBusy: actions.orderExportBusy,
    orderExportError: actions.orderExportError,
    setItemDeleteTarget,
    openItemDrawer: drawer.openItemDrawer,
    onRequestNavigateAdjacent: drawer.onRequestNavigateAdjacent,
    closeDrawer: drawer.closeDrawer,
    onDrawerForecastMonthsChange: drawer.onDrawerForecastMonthsChange,
    saveDrawerDraftSnapshot: drawer.saveDrawerDraftSnapshot,
    clearDrawerDraftSnapshot: drawer.clearDrawerDraftSnapshot,
    markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed,
    restoreDrawerConfirmedSnapshot: drawer.restoreDrawerConfirmedSnapshot,
    loadItems,
    refreshStashes,
    appendRecommendedItems: recommendations.appendRecommendedItems,
    confirmDeleteItem,
    confirmBulkDetailItems: bulkConfirm.confirmBulkDetailItems,
    closeBulkConfirmProgress: bulkConfirm.closeBulkConfirmProgress,
    confirmDeleteItems: actions.confirmDeleteItems,
    confirmUnconfirmItems: actions.confirmUnconfirmItems,
    downloadOrderExcel: actions.downloadOrderExcel,
  }
}
