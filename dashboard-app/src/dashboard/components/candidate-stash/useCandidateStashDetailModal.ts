import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCandidateItemsByStash,
  type CandidateItemDetail,
  type CandidateItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import { normalizeRangeOnEndInput, normalizeRangeOnStartInput } from '../../hooks/usePeriodRangeFilter'
import { preloadCandidateOrderExcelExport } from '../../../utils/candidateOrderExcelExport'
import { useAppToast } from '../../../components/AppToastContext'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { useInnerCandidateTable } from './useInnerCandidateTable'
import { useCandidateStashItemDrawer } from './useCandidateStashItemDrawer'
import { useCandidateStashItemActions } from './useCandidateStashItemActions'
import { useCandidateOrderMetricStream } from './useCandidateOrderMetricStream'
import { useCandidateStashSummaries } from './useCandidateStashSummaries'
import { useCandidateRecommendations } from './useCandidateRecommendations'
import {
  applyCandidateDetailConfirmationOverrides,
  createCandidateDetailConfirmationOverride,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'
import {
  mergeCandidateItemsWithPreservedMetrics,
  selectMetricCandidateItems,
  type CandidateMetricReloadOptions,
} from './candidateItemListMergeModel'

type Args = {
  stashUuid: string
  /** 부모가 이미 알고 있으면 전달 — `getCandidateStashes()` 중복 호출 생략 */
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
  const [dataReferencePeriodStart, setDataReferencePeriodStart] = useState('')
  const [dataReferencePeriodEnd, setDataReferencePeriodEnd] = useState('')
  const [draftDataReferencePeriodStart, setDraftDataReferencePeriodStart] = useState('')
  const [draftDataReferencePeriodEnd, setDraftDataReferencePeriodEnd] = useState('')
  const [itemDeleteTarget, setItemDeleteTarget] = useState<CandidateItemSummary | null>(null)
  const { showToast } = useAppToast()
  const mountedRef = useRef(false)
  const itemsRef = useRef<CandidateItemSummary[]>([])
  const clearRecommendationItemsRef = useRef<() => void>(() => undefined)
  const confirmationOverridesRef = useRef<CandidateDetailConfirmationOverrideMap>({})
  const initializedDetailTargetUuidRef = useRef<string | null>(null)

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
    nextPeriodStart = dataReferencePeriodStart,
    nextPeriodEnd = dataReferencePeriodEnd,
    options: CandidateMetricReloadOptions = {},
  ) => {
    if (!stashUuid || !nextPeriodStart || !nextPeriodEnd) return
    const seq = beginItemLoad()
    setDetailLoading(true)
    setDetailError(null)
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
      clearRecommendationItemsRef.current()
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
    beginItemLoad,
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    isCurrentItemLoad,
    setItems,
    stashUuid,
    subscribeOrderMetrics,
  ])

  useEffect(() => {
    if (!items.length) return
    void preloadCandidateOrderExcelExport().catch(() => undefined)
  }, [items.length, stashUuid])

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
  const { clearRecommendationItems } = recommendations

  useEffect(() => {
    clearRecommendationItemsRef.current = clearRecommendationItems
  }, [clearRecommendationItems])

  useEffect(() => {
    const nextUuid = detailTarget?.uuid ?? null
    if (initializedDetailTargetUuidRef.current === nextUuid) return
    initializedDetailTargetUuidRef.current = nextUuid

    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      if (!detailTarget) {
        setDataReferencePeriodStart('')
        setDataReferencePeriodEnd('')
        setDraftDataReferencePeriodStart('')
        setDraftDataReferencePeriodEnd('')
        setItems([])
        clearRecommendationItems()
        closeMetricSubscription()
        return
      }
      setDataReferencePeriodStart(detailTarget.periodStart)
      setDataReferencePeriodEnd(detailTarget.periodEnd)
      setDraftDataReferencePeriodStart(detailTarget.periodStart)
      setDraftDataReferencePeriodEnd(detailTarget.periodEnd)
      void loadItems(detailTarget.periodStart, detailTarget.periodEnd)
    })
    return () => {
      alive = false
    }
  }, [clearRecommendationItems, closeMetricSubscription, detailTarget, loadItems, setItems])
  const onDataReferencePeriodStartChange = useCallback((value: string) => {
    if (!value) return
    setDraftDataReferencePeriodStart(value)
    setDraftDataReferencePeriodEnd((currentEnd) => normalizeRangeOnStartInput(value, currentEnd || value).endDate)
  }, [])

  const onDataReferencePeriodEndChange = useCallback((value: string) => {
    if (!value) return
    setDraftDataReferencePeriodEnd(value)
    setDraftDataReferencePeriodStart((currentStart) => normalizeRangeOnEndInput(value, currentStart || value).startDate)
  }, [])

  const applyDataReferencePeriod = useCallback(() => {
    if (!draftDataReferencePeriodStart || !draftDataReferencePeriodEnd) return
    const normalized = normalizeRangeOnStartInput(draftDataReferencePeriodStart, draftDataReferencePeriodEnd)
    setDataReferencePeriodStart(normalized.startDate)
    setDataReferencePeriodEnd(normalized.endDate)
    setDraftDataReferencePeriodStart(normalized.startDate)
    setDraftDataReferencePeriodEnd(normalized.endDate)
    void loadItems(normalized.startDate, normalized.endDate)
  }, [draftDataReferencePeriodEnd, draftDataReferencePeriodStart, loadItems])
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
  const recordDetailConfirmationMutation = useCallback((
    itemUuid: string,
    isDetailConfirmed: boolean,
    confirmedSnapshot: OrderSnapshotDocumentV1 | null,
    updatedItem: CandidateItemDetail,
  ) => {
    const baseItem = itemsRef.current.find((item) => item.uuid === itemUuid)
    confirmationOverridesRef.current = {
      ...confirmationOverridesRef.current,
      [itemUuid]: createCandidateDetailConfirmationOverride(baseItem, isDetailConfirmed, confirmedSnapshot),
    }
    setItems((current) => current.map((item) => (
      item.uuid === itemUuid
        ? {
            ...item,
            isDetailConfirmed: updatedItem.isDetailConfirmed,
            isLatestLlmComment: updatedItem.isLatestLlmComment,
            dbUpdatedAt: updatedItem.dbUpdatedAt,
          }
        : item
    )))
    return baseItem?.dbUpdatedAt ?? null
  }, [setItems])

  const markDrawerSnapshotConfirmed = useCallback((
    itemUuid: string,
    snapshot: OrderSnapshotDocumentV1,
    updatedItem: CandidateItemDetail,
  ) => {
    const baseDbUpdatedAt = recordDetailConfirmationMutation(itemUuid, true, snapshot, updatedItem)
    drawer.markDrawerSnapshotConfirmed(itemUuid, snapshot, baseDbUpdatedAt)
  }, [drawer, recordDetailConfirmationMutation])

  const markDrawerSnapshotUnconfirmed = useCallback((itemUuid: string, updatedItem: CandidateItemDetail) => {
    const baseDbUpdatedAt = recordDetailConfirmationMutation(itemUuid, false, null, updatedItem)
    drawer.markDrawerSnapshotUnconfirmed(itemUuid, baseDbUpdatedAt)
  }, [drawer, recordDetailConfirmationMutation])

  const markItemsDetailUnconfirmed = useCallback((updatedItems: CandidateItemDetail[]) => {
    const uniqueUuids = [...new Set(updatedItems.map((item) => item.uuid))]
    if (!uniqueUuids.length) return
    const uuidSet = new Set(uniqueUuids)
    const updatedItemByUuid = new Map(updatedItems.map((item) => [item.uuid, item]))
    const itemByUuid = new Map(itemsRef.current.map((item) => [item.uuid, item]))
    const nextOverrides = { ...confirmationOverridesRef.current }
    uniqueUuids.forEach((itemUuid) => {
      const baseItem = itemByUuid.get(itemUuid)
      nextOverrides[itemUuid] = createCandidateDetailConfirmationOverride(baseItem, false, null)
      drawer.markDrawerSnapshotUnconfirmed(itemUuid, baseItem?.dbUpdatedAt ?? null)
    })
    confirmationOverridesRef.current = nextOverrides
    setItems((current) => current.map((item) => (
      uuidSet.has(item.uuid)
        ? {
            ...item,
            isDetailConfirmed: updatedItemByUuid.get(item.uuid)?.isDetailConfirmed ?? false,
            isLatestLlmComment: updatedItemByUuid.get(item.uuid)?.isLatestLlmComment ?? false,
            dbUpdatedAt: updatedItemByUuid.get(item.uuid)?.dbUpdatedAt ?? item.dbUpdatedAt,
          }
        : item
    )))
  }, [drawer, setItems])

  const actions = useCandidateStashItemActions({
    stashUuid,
    detailTarget,
    items,
    itemDeleteTarget,
    openedItemUuid: drawer.openedItemUuid,
    closeDrawer: drawer.closeDrawer,
    loadItems,
    refreshStashes,
    showToast,
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
    confirmDeleteItems: actions.confirmDeleteItems,
    confirmUnconfirmItems: actions.confirmUnconfirmItems,
    downloadOrderExcel: actions.downloadOrderExcel,
    loadRecommendations: recommendations.loadRecommendations,
  }
}

export type CandidateStashDetailModalModel = ReturnType<typeof useCandidateStashDetailModal>
