import { useCallback, useEffect, useRef, useState } from 'react'
import {
  appendCandidateItems,
  getCandidateItemsByStash,
  type CandidateItemSummary,
  type CandidateReferenceItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import { normalizeRangeOnEndInput, normalizeRangeOnStartInput } from '../../hooks/usePeriodRangeFilter'
import { preloadCandidateOrderExcelExport } from '../../../utils/candidateOrderExcelExport'
import { useAppToast } from '../../../components/AppToastContext'
import { useInnerCandidateTable } from './useInnerCandidateTable'
import { useCandidateStashItemDrawer } from './useCandidateStashItemDrawer'
import { useCandidateStashItemActions } from './useCandidateStashItemActions'
import { useCandidateOrderMetricStream } from './useCandidateOrderMetricStream'
import { useCandidateStashSummaries } from './useCandidateStashSummaries'
import { deriveCandidateRecommendations } from './candidateItemMetricModel'
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
  const [recommendationItems, setRecommendationItems] = useState<CandidateReferenceItemSummary[]>([])
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
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
      setItems(nextItems)
      setRecommendationItems(deriveCandidateRecommendations(result.referenceItems, result.candidateItems))
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
      setRecommendationItems([])
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
        setRecommendationItems([])
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
  }, [closeMetricSubscription, detailTarget, loadItems, setItems])

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

  const loadRecommendations = useCallback(async (): Promise<CandidateReferenceItemSummary[]> => {
    if (!stashUuid || !dataReferenceStart || !dataReferenceEnd) return []
    setRecommendationLoading(true)
    setRecommendationError(null)
    await Promise.resolve()
    if (!mountedRef.current) return []
    setRecommendationLoading(false)
    return recommendationItems
  }, [dataReferenceEnd, dataReferenceStart, recommendationItems, stashUuid])

  const appendRecommendedItems = useCallback(async (rows: CandidateReferenceItemSummary[]) => {
    const skuGroupKeys = [...new Set(rows.map((row) => row.skuGroupKey))]
    if (!skuGroupKeys.length) return
    const existingSkuGroupKeySet = new Set(itemsRef.current.map((item) => item.skuGroupKey))
    const addedMetricSkuGroupKeys = skuGroupKeys.filter((skuGroupKey) => !existingSkuGroupKeySet.has(skuGroupKey))
    await appendCandidateItems({ stashUuid, skuGroupKeys })
    if (!mountedRef.current) return
    await loadItems(dataReferencePeriodStart, dataReferencePeriodEnd, {
      metricSkuGroupKeys: addedMetricSkuGroupKeys,
      preserveExistingMetrics: true,
    })
    await refreshStashes()
    showToast('추천 후보를 후보군에 추가했습니다.')
  }, [dataReferencePeriodEnd, dataReferencePeriodStart, loadItems, refreshStashes, showToast, stashUuid])

  const drawer = useCandidateStashItemDrawer({
    dataReferenceStart,
    dataReferenceEnd,
    detailTarget,
    itemDeleteTargetUuid: itemDeleteTarget?.uuid ?? null,
    tableRows: table.tableRows,
  })
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
  })

  const confirmDeleteItem = useCallback(async () => {
    await actions.confirmDeleteItem()
    if (mountedRef.current) setItemDeleteTarget(null)
  }, [actions])

  return {
    drawerOpen: drawer.drawerOpen,
    drawerClosing: drawer.drawerClosing,
    items,
    recommendationItems,
    recommendationLoading,
    recommendationError,
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
    markDrawerSnapshotConfirmed: drawer.markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed: drawer.markDrawerSnapshotUnconfirmed,
    restoreDrawerConfirmedSnapshot: drawer.restoreDrawerConfirmedSnapshot,
    loadItems,
    refreshStashes,
    appendRecommendedItems,
    confirmDeleteItem,
    confirmDeleteItems: actions.confirmDeleteItems,
    confirmUnconfirmItems: actions.confirmUnconfirmItems,
    downloadOrderExcel: actions.downloadOrderExcel,
    loadRecommendations,
  }
}

export type CandidateStashDetailModalModel = ReturnType<typeof useCandidateStashDetailModal>
