import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  appendCandidateItems,
  getCandidateItemsByStash,
  getCandidateStashes,
  subscribeCandidateOrderMetrics,
  type CandidateItemSummary,
  type CandidateOrderMetricSubscription,
  type CandidateReferenceItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import { normalizeRangeOnEndInput, normalizeRangeOnStartInput } from '../../hooks/usePeriodRangeFilter'
import { preloadCandidateOrderExcelExport } from '../../../utils/candidateOrderExcelExport'
import { useAppToast } from '../../../components/AppToastContext'
import { useInnerCandidateTable } from './useInnerCandidateTable'
import { useCandidateStashItemDrawer } from './useCandidateStashItemDrawer'
import { useCandidateStashItemActions } from './useCandidateStashItemActions'
import {
  applyOrderMetricToCandidateItem,
  deriveCandidateRecommendations,
  markCandidateItemOrderMetricFailed,
} from './candidateItemMetricModel'

type Args = {
  stashUuid: string
  /** 부모가 이미 알고 있으면 전달 — `getCandidateStashes()` 중복 호출 생략 */
  stashSummary?: CandidateStashSummary | null
  onStashesInvalidate?: () => void
}

export type { InnerCandidateRow, InnerCandidateSortKey } from './candidateStashDetailTypes'

export function useCandidateStashDetailModal({
  stashUuid,
  stashSummary: stashSummaryProp,
  onStashesInvalidate,
}: Args) {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [items, setItems] = useState<CandidateItemSummary[]>([])
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
  const stashLoadSeqRef = useRef(0)
  const itemLoadSeqRef = useRef(0)
  const metricSubscriptionRef = useRef<CandidateOrderMetricSubscription | null>(null)
  const initializedDetailTargetUuidRef = useRef<string | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stashLoadSeqRef.current += 1
      itemLoadSeqRef.current += 1
      metricSubscriptionRef.current?.close()
      metricSubscriptionRef.current = null
    }
  }, [])

  const closeMetricSubscription = useCallback(() => {
    metricSubscriptionRef.current?.close()
    metricSubscriptionRef.current = null
  }, [])

  useEffect(() => {
    const seq = stashLoadSeqRef.current + 1
    stashLoadSeqRef.current = seq
    void (async () => {
      if (stashSummaryProp && stashSummaryProp.uuid === stashUuid) {
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes([stashSummaryProp])
        return
      }
      try {
        const list = await getCandidateStashes()
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes(list)
      } catch {
        if (!mountedRef.current || stashLoadSeqRef.current !== seq) return
        setStashes([])
      }
    })()
  }, [stashUuid, stashSummaryProp])

  const loadItems = useCallback(async (
    nextPeriodStart = dataReferencePeriodStart,
    nextPeriodEnd = dataReferencePeriodEnd,
  ) => {
    if (!stashUuid || !nextPeriodStart || !nextPeriodEnd) return
    const seq = itemLoadSeqRef.current + 1
    itemLoadSeqRef.current = seq
    closeMetricSubscription()
    setDetailLoading(true)
    setDetailError(null)
    try {
      const result = await getCandidateItemsByStash({
        stashUuid,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
      })
      if (!mountedRef.current || itemLoadSeqRef.current !== seq) return
      setItems(result.items)
      setRecommendationItems(deriveCandidateRecommendations(result.referenceItems, result.candidateItems))
      setDetailLoading(false)
      const candidateItemUuids = result.candidateItems.map((item) => item.uuid)
      const requestId = `${stashUuid}:${nextPeriodStart}:${nextPeriodEnd}:${seq}`
      metricSubscriptionRef.current = subscribeCandidateOrderMetrics({
        stashUuid,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
        requestId,
        candidateItemUuids,
      }, (event) => {
        if (!mountedRef.current || itemLoadSeqRef.current !== seq) return
        if (event.requestId !== requestId) return
        if (event.type === 'item') {
          setItems((current) => current.map((item) => (
            item.uuid === event.itemUuid ? applyOrderMetricToCandidateItem(item, event.metric) : item
          )))
          return
        }
        if (event.type === 'itemFailed') {
          setItems((current) => current.map((item) => (
            item.uuid === event.itemUuid ? markCandidateItemOrderMetricFailed(item) : item
          )))
        }
      })
    } catch (err) {
      if (!mountedRef.current || itemLoadSeqRef.current !== seq) return
      const message = err instanceof Error ? err.message : '이너 후보 목록 스냅샷 데이터가 올바르지 않습니다.'
      setItems([])
      setRecommendationItems([])
      setDetailError(message)
      setDetailLoading(false)
    }
  }, [closeMetricSubscription, dataReferencePeriodEnd, dataReferencePeriodStart, stashUuid])

  useEffect(() => {
    if (!items.length) return
    void preloadCandidateOrderExcelExport().catch(() => undefined)
  }, [items.length, stashUuid])

  const refreshStashes = useCallback(async () => {
    const list = await getCandidateStashes()
    if (!mountedRef.current) return
    setStashes(list)
    onStashesInvalidate?.()
  }, [onStashesInvalidate])

  const detailTarget = useMemo(
    () => (stashUuid ? stashes.find((s) => s.uuid === stashUuid) ?? null : null),
    [stashUuid, stashes],
  )

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
  }, [closeMetricSubscription, detailTarget, loadItems])

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
    await appendCandidateItems({ stashUuid, skuGroupKeys })
    if (!mountedRef.current) return
    await loadItems()
    await refreshStashes()
    showToast('추천 후보를 후보군에 추가했습니다.')
  }, [loadItems, refreshStashes, showToast, stashUuid])

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
