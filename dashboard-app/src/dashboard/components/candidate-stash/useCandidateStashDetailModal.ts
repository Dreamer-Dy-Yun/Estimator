import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type CandidateItemSummary,
  type CandidateReferenceItemSummary,
  type CandidateStashItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import { preloadCandidateOrderExcelExport } from '../../../utils/candidateOrderExcelExport'
import { useAppToast } from '../../../components/AppToastContext'
import { useInnerCandidateTable } from './useInnerCandidateTable'
import { useCandidateStashItemDrawer } from './useCandidateStashItemDrawer'
import { useCandidateStashItemActions } from './useCandidateStashItemActions'
import { useCandidateOrderMetricStream } from './useCandidateOrderMetricStream'
import { useCandidateStashSummaries } from './useCandidateStashSummaries'
import { useCandidateRecommendations } from './useCandidateRecommendations'
import { useCandidateDataReferencePeriod, type AppliedCandidateDataReferencePeriod } from './useCandidateDataReferencePeriod'
import { useCandidateDetailConfirmationMutations } from './useCandidateDetailConfirmationMutations'
import { useCandidateBulkDetailConfirm } from './useCandidateBulkDetailConfirm'
import type { CandidateDetailConfirmationOverrideMap } from './candidateDetailConfirmationOverrideModel'
import {
  appendRecommendedCandidateItems,
  removeCandidateItemsByUuid,
} from './candidateItemLocalMutationModel'
import { useCandidateItemsLoader } from './useCandidateItemsLoader'

type Args = {
  stashUuid: string
  stashSummary?: CandidateStashSummary | null
  onStashesInvalidate?: () => void
}

type ItemStateUpdater = CandidateItemSummary[] | ((current: CandidateItemSummary[]) => CandidateItemSummary[])

export type { InnerCandidateRow, InnerCandidateSortKey } from './candidateStashDetailTypes'

export function useCandidateStashDetailModal({
  stashUuid,
  stashSummary: stashSummaryProp,
  onStashesInvalidate,
}: Args) {
  const [items, setItemsState] = useState<CandidateItemSummary[]>([])
  const [itemDeleteTarget, setItemDeleteTarget] = useState<CandidateItemSummary | null>(null)
  const { showToast } = useAppToast()
  const mountedRef = useRef(false)
  const itemsRef = useRef<CandidateItemSummary[]>([])
  const clearRecommendationItemsRef = useRef<() => void>(() => undefined)
  const confirmationOverridesRef = useRef<CandidateDetailConfirmationOverrideMap>({})
  const appliedPeriodRef = useRef<AppliedCandidateDataReferencePeriod>({ start: '', end: '' })
  const clearRecommendationItemsFromRef = useCallback(() => {
    clearRecommendationItemsRef.current()
  }, [])

  const setItems = useCallback((next: ItemStateUpdater) => {
    setItemsState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next
      itemsRef.current = resolved
      return resolved
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const {
    beginItemLoad,
    closeMetricSubscription,
    getCurrentItemLoadSeq,
    isCurrentItemLoad,
    subscribeOrderMetrics,
  } = useCandidateOrderMetricStream({ stashUuid, mountedRef, setItems })
  const { detailTarget, refreshStashes, stashListLoadError } = useCandidateStashSummaries({
    stashUuid,
    stashSummary: stashSummaryProp,
    mountedRef,
    onStashesInvalidate,
  })

  const { detailLoading, detailError, loadItems } = useCandidateItemsLoader({
    stashUuid,
    appliedPeriodRef,
    itemsRef,
    confirmationOverridesRef,
    clearRecommendationItems: clearRecommendationItemsFromRef,
    beginItemLoad,
    isCurrentItemLoad,
    setItems,
    subscribeOrderMetrics,
  })

  useEffect(() => {
    if (!items.length) return
    void preloadCandidateOrderExcelExport().catch(() => undefined)
  }, [items.length, stashUuid])

  const dataReferencePeriod = useCandidateDataReferencePeriod({
    detailTarget,
    appliedPeriodRef,
    setItems,
    clearRecommendationItems: clearRecommendationItemsFromRef,
    closeMetricSubscription,
    loadItems,
  })
  const {
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
  } = dataReferencePeriod

  const appendRecommendedItemsLocally = useCallback((
    candidateItems: CandidateStashItemSummary[],
    recommendationRows: CandidateReferenceItemSummary[],
  ) => {
    if (!candidateItems.length) return
    setItems(appendRecommendedCandidateItems(itemsRef.current, candidateItems, recommendationRows))
    subscribeOrderMetrics({
      seq: getCurrentItemLoadSeq(),
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      candidateItemUuids: candidateItems.map((item) => item.uuid),
    })
  }, [
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    getCurrentItemLoadSeq,
    itemsRef,
    setItems,
    subscribeOrderMetrics,
  ])

  const recommendations = useCandidateRecommendations({
    stashUuid,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    mountedRef,
    itemsRef,
    setItems,
    onRecommendedItemsAppended: appendRecommendedItemsLocally,
    refreshStashes,
    showToast,
  })
  const {
    clearRecommendationItems,
    loadRecommendations,
    recommendationLoading,
  } = recommendations

  useEffect(() => {
    clearRecommendationItemsRef.current = clearRecommendationItems
  }, [clearRecommendationItems])

  useEffect(() => {
    if (detailLoading || detailError || recommendationLoading) return
    if (!items.some((item) => item.insightStatus === 'loading')) return
    void loadRecommendations()
  }, [detailError, detailLoading, items, loadRecommendations, recommendationLoading])

  const table = useInnerCandidateTable(items)
  const dataReferenceStart = dataReferencePeriodStart || undefined
  const dataReferenceEnd = dataReferencePeriodEnd || undefined

  const drawer = useCandidateStashItemDrawer({
    dataReferenceStart,
    dataReferenceEnd,
    detailTarget,
    itemDeleteTargetUuid: itemDeleteTarget?.uuid ?? null,
    tableRows: table.tableRows,
  })
  const {
    markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed,
    markItemsDetailConfirmed,
    markItemsDetailUnconfirmed,
  } =
    useCandidateDetailConfirmationMutations({
      itemsRef,
      confirmationOverridesRef,
      setItems,
      drawer,
    })
  const bulkConfirm = useCandidateBulkDetailConfirm({
    stashUuid,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    mountedRef,
    onItemsConfirmed: markItemsDetailConfirmed,
    showToast,
  })
  const removeItemsLocally = useCallback((itemUuids: string[]) => {
    setItems((current) => removeCandidateItemsByUuid(current, itemUuids))
  }, [setItems])

  const actions = useCandidateStashItemActions({
    stashUuid,
    detailTarget,
    items,
    itemDeleteTarget,
    openedItemUuid: drawer.openedItemUuid,
    closeDrawer: drawer.closeDrawer,
    refreshStashes,
    showToast,
    onItemsDeleted: removeItemsLocally,
    onItemsUnconfirmed: markItemsDetailUnconfirmed,
  })

  const confirmDeleteItem = useCallback(async () => {
    await actions.confirmDeleteItem()
    if (mountedRef.current) setItemDeleteTarget(null)
  }, [actions])

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
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
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
    stashListLoadError,
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

export type CandidateStashDetailModalModel = ReturnType<typeof useCandidateStashDetailModal>
