import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCandidateItemsByStash,
  type CandidateItemSummary,
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
import {
  applyCandidateDetailConfirmationOverrides,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'
import {
  mergeCandidateItemsWithPreservedMetrics,
  selectMetricCandidateItems,
  type CandidateMetricReloadOptions,
} from './candidateItemListMergeModel'
import { removeCandidateItemsByUuid } from './candidateItemLocalMutationModel'

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
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
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
    isCurrentItemLoad,
    subscribeOrderMetrics,
  } = useCandidateOrderMetricStream({ stashUuid, mountedRef, setItems })
  const { detailTarget, refreshStashes } = useCandidateStashSummaries({
    stashUuid,
    stashSummary: stashSummaryProp,
    mountedRef,
    onStashesInvalidate,
  })

  const loadItems = useCallback(async (
    nextPeriodStart = appliedPeriodRef.current.start,
    nextPeriodEnd = appliedPeriodRef.current.end,
    options: CandidateMetricReloadOptions = {},
  ) => {
    if (!stashUuid || !nextPeriodStart || !nextPeriodEnd) return
    const seq = beginItemLoad()
    setDetailLoading(true)
    setDetailError(null)
    clearRecommendationItemsRef.current()
    try {
      const result = await getCandidateItemsByStash({
        stashUuid,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
      })
      if (!isCurrentItemLoad(seq)) return
      const metricCandidateItems = selectMetricCandidateItems(result.candidateItems, options.metricSkuGroupKeys)
      const nextItems = mergeCandidateItemsWithPreservedMetrics(
        result.items,
        metricCandidateItems,
        itemsRef.current,
        options.preserveExistingMetrics,
      )
      const protectedResult = applyCandidateDetailConfirmationOverrides(nextItems, confirmationOverridesRef.current)
      confirmationOverridesRef.current = protectedResult.overrides
      setItems(protectedResult.items)
      setDetailLoading(false)
      const candidateItemUuids = metricCandidateItems.map((item) => item.uuid)
      subscribeOrderMetrics({
        seq,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
        candidateItemUuids,
      })
    } catch (err) {
      if (!isCurrentItemLoad(seq)) return
      const message = err instanceof Error ? err.message : '이너 후보 목록 스냅샷 데이터가 올바르지 않습니다.'
      setItems([])
      clearRecommendationItemsRef.current()
      setDetailError(message)
      setDetailLoading(false)
    }
  }, [
    appliedPeriodRef,
    beginItemLoad,
    isCurrentItemLoad,
    setItems,
    stashUuid,
    subscribeOrderMetrics,
  ])

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
    draftDataReferencePeriodStart,
    draftDataReferencePeriodEnd,
    onDataReferencePeriodStartChange,
    onDataReferencePeriodEndChange,
    applyDataReferencePeriod,
  } = dataReferencePeriod

  const recommendations = useCandidateRecommendations({
    stashUuid,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    mountedRef,
    itemsRef,
    setItems,
    loadItems,
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
    draftDataReferencePeriodStart,
    draftDataReferencePeriodEnd,
    onDataReferencePeriodStartChange,
    onDataReferencePeriodEndChange,
    applyDataReferencePeriod,
    fc: drawer.fc,
    bundle: drawer.bundle,
    mergedSummary: drawer.mergedSummary,
    periodStart: dataReferenceStart,
    periodEnd: dataReferenceEnd,
    itemDeleteTarget,
    itemDeleteBusy: actions.itemDeleteBusy,
    bulkConfirmBusy: bulkConfirm.bulkConfirmBusy,
    bulkConfirmProgress: bulkConfirm.bulkConfirmProgress,
    bulkDeleteBusy: actions.bulkDeleteBusy,
    bulkUnconfirmBusy: actions.bulkUnconfirmBusy,
    orderExportBusy: actions.orderExportBusy,
    orderExportError: actions.orderExportError,
    setItemDeleteTarget,
    detailTarget,
    brandOptions: table.brandOptions,
    codeOptions: table.codeOptions,
    productNameOptions: table.productNameOptions,
    tableRows: table.tableRows,
    totals: table.totals,
    pendingOrderMetricCount: table.pendingOrderMetricCount,
    totalExpectedOpProfitRatePct: table.totalExpectedOpProfitRatePct,
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
