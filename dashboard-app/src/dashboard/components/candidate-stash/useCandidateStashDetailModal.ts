import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteCandidateItem,
  deleteCandidateItems,
  getCandidateItemByUuid,
  getCandidateItemsByStash,
  getCandidateRecommendations,
  getCandidateStashes,
  startCandidateStashAnalysis,
  subscribeCandidateStashAnalysis,
  type CandidateStashAnalysisProgressEvent,
  type CandidateStashAnalysisSubscription,
  type CandidateBadgeDefinitionMap,
  type CandidateItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { clampForecastMonths } from '../../../utils/forecastMonthsStorage'
import { parseOrderSnapshot } from '../../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { compareSortValues, nextSortState, type SortState, type SortValue } from '../../../utils/sort'
import { uniqueSortedStrings } from '../../../utils/uniqueSortedStrings'
import { mergePrimarySummaryFromBundleAndSnapshot } from '../../drawer/mergePrimarySummaryFromSnapshot'
import { useProductDrawerBundle } from '../../hooks/useProductDrawerBundle'
import { normalizeRangeOnEndInput, normalizeRangeOnStartInput } from '../../hooks/usePeriodRangeFilter'
import {
  createCandidateOrderExcelExport,
  downloadBlob,
  preloadCandidateOrderExcelExport,
} from '../../../utils/candidateOrderExcelExport'

const INNER_DRAWER_CLOSE_LAYOUT_MS = 440

export type InnerCandidateRow = CandidateItemSummary & { id: string }
export type InnerCandidateSortKey =
  | 'brand'
  | 'productCode'
  | 'productName'
  | 'selfQty'
  | 'competitorQty'
  | 'expectedSalesQty'
  | 'expectedOrderAmount'

type InnerCandidateSortState = SortState<InnerCandidateSortKey>

type Args = {
  stashUuid: string
  /** 부모가 이미 알고 있으면 전달 — `getCandidateStashes()` 중복 호출 생략 */
  stashSummary?: CandidateStashSummary | null
  onStashesInvalidate?: () => void
}

function candidateSortValue(row: InnerCandidateRow, key: InnerCandidateSortKey): SortValue {
  switch (key) {
    case 'brand':
      return row.brand
    case 'productCode':
      return row.productCode
    case 'productName':
      return row.productName
    case 'selfQty':
      return row.insight.selfQty
    case 'competitorQty':
      return row.insight.competitorQty
    case 'expectedSalesQty':
      return row.insight.expectedSalesQty
    case 'expectedOrderAmount':
      return row.expectedOrderAmount
  }
}

function applySnapshotDataReferencePeriod(
  snap: OrderSnapshotDocumentV1,
  dataReferencePeriodStart: string,
  dataReferencePeriodEnd: string,
): OrderSnapshotDocumentV1 {
  return {
    ...snap,
    context: {
      ...snap.context,
      periodStart: dataReferencePeriodStart,
      periodEnd: dataReferencePeriodEnd,
      dailyTrendStartMonth: dataReferencePeriodStart.slice(0, 7),
    },
  }
}

export function useCandidateStashDetailModal({
  stashUuid,
  stashSummary: stashSummaryProp,
  onStashesInvalidate,
}: Args) {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [items, setItems] = useState<CandidateItemSummary[]>([])
  const [recommendationItems, setRecommendationItems] = useState<CandidateItemSummary[]>([])
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [badgeDefinitions, setBadgeDefinitions] = useState<CandidateBadgeDefinitionMap>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [brandQuery, setBrandQuery] = useState('')
  const [productCodeQuery, setProductCodeQuery] = useState('')
  const [productNameQuery, setProductNameQuery] = useState('')
  const [tableSort, setTableSort] = useState<InnerCandidateSortState | null>(null)
  const [dataReferencePeriodStart, setDataReferencePeriodStart] = useState('')
  const [dataReferencePeriodEnd, setDataReferencePeriodEnd] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null)
  const [openedItemUuid, setOpenedItemUuid] = useState<string | null>(null)
  const [hydrateSnap, setHydrateSnap] = useState<OrderSnapshotDocumentV1 | null>(null)
  const [drawerForecastMonths, setDrawerForecastMonths] = useState(8)

  const [itemDeleteTarget, setItemDeleteTarget] = useState<CandidateItemSummary | null>(null)
  const [itemDeleteBusy, setItemDeleteBusy] = useState(false)
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false)
  const [orderExportBusy, setOrderExportBusy] = useState(false)
  const [orderExportError, setOrderExportError] = useState<string | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState<CandidateStashAnalysisProgressEvent | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const stashLoadSeqRef = useRef(0)
  const itemLoadSeqRef = useRef(0)
  const recommendationLoadSeqRef = useRef(0)
  const drawerRequestSeqRef = useRef(0)
  const drawerCloseTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const innerNavLockRef = useRef(false)
  const analysisRequestSeqRef = useRef(0)
  const initializedDetailTargetUuidRef = useRef<string | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stashLoadSeqRef.current += 1
      itemLoadSeqRef.current += 1
      recommendationLoadSeqRef.current += 1
      drawerRequestSeqRef.current += 1
      if (drawerCloseTimerRef.current != null) {
        window.clearTimeout(drawerCloseTimerRef.current)
        drawerCloseTimerRef.current = null
      }
    }
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

  const loadItems = useCallback(async () => {
    if (!stashUuid) return
    const seq = itemLoadSeqRef.current + 1
    itemLoadSeqRef.current = seq
    setDetailLoading(true)
    setDetailError(null)
    try {
      const result = await getCandidateItemsByStash(stashUuid)
      if (!mountedRef.current || itemLoadSeqRef.current !== seq) return
      setItems(result.items)
      setBadgeDefinitions(result.badgeDefinitions)
      setDetailLoading(false)
    } catch (err) {
      if (!mountedRef.current || itemLoadSeqRef.current !== seq) return
      const message = err instanceof Error ? err.message : '이너 후보 목록 스냅샷 데이터가 올바르지 않습니다.'
      setItems([])
      setBadgeDefinitions({})
      setDetailError(message)
      setDetailLoading(false)
    }
  }, [stashUuid])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

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

  useEffect(() => {
    let alive = true
    let subscription: CandidateStashAnalysisSubscription | null = null
    const closeSubscription = () => {
      const current = subscription
      subscription = null
      current?.close()
    }
    const requestSeq = analysisRequestSeqRef.current + 1
    analysisRequestSeqRef.current = requestSeq
    setAnalysisError(null)
    setAnalysisProgress({
      jobId: '',
      stashUuid,
      status: 'queued',
      totalItems: 0,
      completedItems: 0,
      currentItemUuid: null,
      currentProductName: null,
      message: '후보군 스냅샷 AI 분석 요청을 백엔드에 전송하는 중입니다.',
      error: null,
    })

    void (async () => {
      try {
        const started = await startCandidateStashAnalysis(stashUuid)
        if (!alive || analysisRequestSeqRef.current !== requestSeq) return
        setAnalysisProgress({
          jobId: started.jobId,
          stashUuid: started.stashUuid,
          status: 'queued',
          totalItems: started.itemCount,
          completedItems: 0,
          currentItemUuid: null,
          currentProductName: null,
          message: '백엔드가 AI 분석 작업을 접수했습니다.',
          error: null,
        })
        subscription = subscribeCandidateStashAnalysis(started.jobId, {
          onEvent: (event) => {
            if (!alive || analysisRequestSeqRef.current !== requestSeq) return
            setAnalysisProgress(event)
            if (event.status === 'failed') {
              setAnalysisError(event.error ?? event.message)
            }
            if (event.status === 'completed') {
              void loadItems()
              void refreshStashes()
              closeSubscription()
            }
            if (event.status === 'failed') {
              closeSubscription()
            }
          },
          onError: (err) => {
            if (!alive || analysisRequestSeqRef.current !== requestSeq) return
            setAnalysisError(err.message)
            setAnalysisProgress((prev) => prev
              ? { ...prev, status: 'failed', message: err.message, error: err.message }
              : null)
            closeSubscription()
          },
          onClose: () => {
            if (!alive || analysisRequestSeqRef.current !== requestSeq) return
            closeSubscription()
          },
        })
      } catch (err) {
        if (!alive || analysisRequestSeqRef.current !== requestSeq) return
        const message = err instanceof Error ? err.message : '후보군 AI 분석 요청에 실패했습니다.'
        setAnalysisError(message)
        setAnalysisProgress((prev) => prev
          ? { ...prev, status: 'failed', message, error: message }
          : null)
      }
    })()

    return () => {
      alive = false
      closeSubscription()
    }
  }, [loadItems, refreshStashes, stashUuid])

  const detailTarget = useMemo(
    () => (stashUuid ? stashes.find((s) => s.uuid === stashUuid) ?? null : null),
    [stashUuid, stashes],
  )

  useEffect(() => {
    const nextUuid = detailTarget?.uuid ?? null
    if (initializedDetailTargetUuidRef.current === nextUuid) return
    initializedDetailTargetUuidRef.current = nextUuid

    if (!detailTarget) {
      setDataReferencePeriodStart('')
      setDataReferencePeriodEnd('')
      return
    }
    setDataReferencePeriodStart(detailTarget.periodStart)
    setDataReferencePeriodEnd(detailTarget.periodEnd)
  }, [detailTarget])

  const onDataReferencePeriodStartChange = useCallback((value: string) => {
    if (!value) return
    setDataReferencePeriodStart(value)
    setDataReferencePeriodEnd((currentEnd) => normalizeRangeOnStartInput(value, currentEnd || value).endDate)
  }, [])

  const onDataReferencePeriodEndChange = useCallback((value: string) => {
    if (!value) return
    setDataReferencePeriodEnd(value)
    setDataReferencePeriodStart((currentStart) => normalizeRangeOnEndInput(value, currentStart || value).startDate)
  }, [])

  const toggleTableSort = useCallback((key: InnerCandidateSortKey) => {
    setTableSort((current) => nextSortState(current, key))
  }, [])

  const brandOptions = useMemo(() => uniqueSortedStrings(items.map((i) => i.brand)), [items])
  const productCodeOptions = useMemo(() => uniqueSortedStrings(items.map((i) => i.productCode)), [items])
  const productNameOptions = useMemo(() => uniqueSortedStrings(items.map((i) => i.productName)), [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const bq = brandQuery.trim().toLowerCase()
      const cq = productCodeQuery.trim().toLowerCase()
      const nq = productNameQuery.trim().toLowerCase()
      if (bq && !item.brand.toLowerCase().includes(bq)) return false
      if (cq && !item.productCode.toLowerCase().includes(cq)) return false
      if (nq && !item.productName.toLowerCase().includes(nq)) return false
      return true
    })
  }, [brandQuery, items, productCodeQuery, productNameQuery])

  const tableRows = useMemo((): InnerCandidateRow[] => {
    const rows = filteredItems.map((item) => ({ ...item, id: item.uuid }))
    if (!tableSort) return rows
    const originalIndex = new Map(rows.map((row, index) => [row.uuid, index]))
    return [...rows].sort((a, b) => {
      const compared = compareSortValues(
        candidateSortValue(a, tableSort.key),
        candidateSortValue(b, tableSort.key),
      )
      if (compared !== 0) return tableSort.dir === 'asc' ? compared : -compared
      return originalIndex.get(a.uuid)! - originalIndex.get(b.uuid)!
    })
  }, [filteredItems, tableSort])

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.qty += item.qty
        acc.expectedOrderAmount += item.expectedOrderAmount
        acc.expectedSalesAmount += item.expectedSalesAmount
        acc.expectedOpProfit += item.expectedOpProfit
        return acc
      },
      { qty: 0, expectedOrderAmount: 0, expectedSalesAmount: 0, expectedOpProfit: 0 },
    )
  }, [filteredItems])

  const totalExpectedOpProfitRatePct = useMemo(() => {
    if (totals.expectedSalesAmount <= 0) return null
    return (totals.expectedOpProfit / totals.expectedSalesAmount) * 100
  }, [totals.expectedOpProfit, totals.expectedSalesAmount])

  const fc = clampForecastMonths(drawerForecastMonths)
  const bundle = useProductDrawerBundle(drawerOpen || drawerClosing ? drawerProductId : null, {
    allowStaleWhileRevalidate: false,
  })

  const dataReferenceStart = dataReferencePeriodStart || hydrateSnap?.context.periodStart
  const dataReferenceEnd = dataReferencePeriodEnd || hydrateSnap?.context.periodEnd
  useEffect(() => {
    recommendationLoadSeqRef.current += 1
    setRecommendationItems([])
    setRecommendationError(null)
    setRecommendationLoading(false)
  }, [dataReferenceEnd, dataReferenceStart, stashUuid])

  const loadRecommendations = useCallback(async (): Promise<CandidateItemSummary[]> => {
    if (!stashUuid || !dataReferenceStart || !dataReferenceEnd) return []
    const seq = recommendationLoadSeqRef.current + 1
    recommendationLoadSeqRef.current = seq
    setRecommendationLoading(true)
    setRecommendationError(null)
    try {
      const result = await getCandidateRecommendations({
        stashUuid,
        dataReferencePeriodStart: dataReferenceStart,
        dataReferencePeriodEnd: dataReferenceEnd,
      })
      if (!mountedRef.current || recommendationLoadSeqRef.current !== seq) return []
      setRecommendationItems(result.items)
      setBadgeDefinitions(result.badgeDefinitions)
      setRecommendationLoading(false)
      return result.items
    } catch (err) {
      if (!mountedRef.current || recommendationLoadSeqRef.current !== seq) return []
      const message = err instanceof Error ? err.message : '추천 후보 조회에 실패했습니다.'
      setRecommendationItems([])
      setRecommendationError(message)
      setRecommendationLoading(false)
      return []
    }
  }, [dataReferenceEnd, dataReferenceStart, stashUuid])

  const drawerHydrateSnap = useMemo(
    () => (
      hydrateSnap && dataReferenceStart && dataReferenceEnd
        ? applySnapshotDataReferencePeriod(hydrateSnap, dataReferenceStart, dataReferenceEnd)
        : hydrateSnap
    ),
    [dataReferenceEnd, dataReferenceStart, hydrateSnap],
  )
  const mergedSummary = useMemo(
    () => mergePrimarySummaryFromBundleAndSnapshot(drawerProductId, bundle, drawerHydrateSnap),
    [bundle, drawerProductId, drawerHydrateSnap],
  )

  if (drawerOpen && (!dataReferenceStart || !dataReferenceEnd)) {
    throw new Error('후보 스냅샷 기간 정보 누락')
  }

  const openItemDrawer = useCallback(async (row: InnerCandidateRow) => {
    const seq = drawerRequestSeqRef.current + 1
    drawerRequestSeqRef.current = seq
    if (drawerCloseTimerRef.current != null) {
      window.clearTimeout(drawerCloseTimerRef.current)
      drawerCloseTimerRef.current = null
    }
    setDrawerClosing(false)
    setDrawerError(null)
    try {
      const detail = await getCandidateItemByUuid(row.uuid)
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      if (!detail) throw new Error(`후보 상세 데이터 없음: ${row.uuid}`)
      const snap = parseOrderSnapshot(detail.details)
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      setHydrateSnap(snap)
      setDrawerForecastMonths(clampForecastMonths(snap.context.forecastMonths))
      setDrawerProductId(row.productId)
      setOpenedItemUuid(row.uuid)
      setDrawerOpen(true)
    } catch (err) {
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      const message = err instanceof Error ? err.message : '후보 상세 스냅샷 로드에 실패했습니다.'
      setDrawerError(message)
    }
  }, [])

  const onRequestNavigateAdjacent = useCallback(
    async (direction: AdjacentDirection) => {
      if (!drawerOpen) return
      if (itemDeleteTarget) return
      if (innerNavLockRef.current) return
      const order = tableRows.map((r) => r.uuid)
      const nextUuid = adjacentIdInOrder(order, openedItemUuid, direction)
      if (nextUuid == null || nextUuid === openedItemUuid) return
      const row = tableRows.find((r) => r.uuid === nextUuid)
      if (!row) return
      innerNavLockRef.current = true
      try {
        await openItemDrawer(row)
      } finally {
        innerNavLockRef.current = false
      }
    },
    [drawerOpen, itemDeleteTarget, openedItemUuid, openItemDrawer, tableRows],
  )

  const closeDrawer = useCallback(() => {
    drawerRequestSeqRef.current += 1
    if (!drawerOpen && !drawerClosing && drawerProductId == null) return
    if (drawerCloseTimerRef.current != null) {
      window.clearTimeout(drawerCloseTimerRef.current)
      drawerCloseTimerRef.current = null
    }
    setDrawerOpen(false)
    setDrawerClosing(true)
    drawerCloseTimerRef.current = window.setTimeout(() => {
      drawerCloseTimerRef.current = null
      if (!mountedRef.current) return
      setDrawerClosing(false)
      setDrawerProductId(null)
      setOpenedItemUuid(null)
      setHydrateSnap(null)
    }, INNER_DRAWER_CLOSE_LAYOUT_MS)
  }, [drawerClosing, drawerOpen, drawerProductId])

  const onDrawerForecastMonthsChange = useCallback((n: number) => {
    setDrawerForecastMonths(clampForecastMonths(n))
  }, [])

  const confirmDeleteItem = useCallback(async () => {
    if (!itemDeleteTarget) return
    setItemDeleteBusy(true)
    try {
      await deleteCandidateItem(itemDeleteTarget.uuid)
      if (!mountedRef.current) return
      if (openedItemUuid === itemDeleteTarget.uuid) closeDrawer()
      setItemDeleteTarget(null)
      await loadItems()
      await refreshStashes()
    } finally {
      if (mountedRef.current) setItemDeleteBusy(false)
    }
  }, [closeDrawer, itemDeleteTarget, loadItems, openedItemUuid, refreshStashes])

  const confirmDeleteItems = useCallback(async (itemUuids: string[]) => {
    const uniqueUuids = [...new Set(itemUuids)]
    if (!uniqueUuids.length) return
    setBulkDeleteBusy(true)
    try {
      await deleteCandidateItems(stashUuid, uniqueUuids)
      if (!mountedRef.current) return
      if (openedItemUuid && uniqueUuids.includes(openedItemUuid)) closeDrawer()
      await loadItems()
      await refreshStashes()
    } finally {
      if (mountedRef.current) setBulkDeleteBusy(false)
    }
  }, [closeDrawer, loadItems, openedItemUuid, refreshStashes, stashUuid])

  const downloadOrderExcel = useCallback(async (userName: string) => {
    if (!detailTarget) return
    if (!items.length) return
    setOrderExportBusy(true)
    setOrderExportError(null)
    try {
      const { blob, filename } = await createCandidateOrderExcelExport({
        stashName: detailTarget.name,
        userName,
        items,
      })
      if (!mountedRef.current) return
      downloadBlob(blob, filename)
    } catch (err) {
      if (!mountedRef.current) return
      const message = err instanceof Error ? err.message : '엑셀 다운로드 파일 생성에 실패했습니다.'
      setOrderExportError(message)
    } finally {
      if (mountedRef.current) setOrderExportBusy(false)
    }
  }, [detailTarget, items])

  return {
    drawerOpen,
    drawerClosing,
    items,
    recommendationItems,
    recommendationLoading,
    recommendationError,
    badgeDefinitions,
    detailLoading,
    detailError,
    brandQuery,
    setBrandQuery,
    productCodeQuery,
    setProductCodeQuery,
    productNameQuery,
    setProductNameQuery,
    tableSort,
    toggleTableSort,
    drawerError,
    openedItemUuid,
    hydrateSnap: drawerHydrateSnap,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    onDataReferencePeriodStartChange,
    onDataReferencePeriodEndChange,
    fc,
    bundle,
    mergedSummary,
    periodStart: dataReferenceStart,
    periodEnd: dataReferenceEnd,
    itemDeleteTarget,
    itemDeleteBusy,
    bulkDeleteBusy,
    orderExportBusy,
    orderExportError,
    analysisProgress,
    analysisError,
    setItemDeleteTarget,
    detailTarget,
    brandOptions,
    productCodeOptions,
    productNameOptions,
    tableRows,
    totals,
    totalExpectedOpProfitRatePct,
    openItemDrawer,
    onRequestNavigateAdjacent,
    closeDrawer,
    onDrawerForecastMonthsChange,
    loadItems,
    refreshStashes,
    confirmDeleteItem,
    confirmDeleteItems,
    downloadOrderExcel,
    loadRecommendations,
  }
}
