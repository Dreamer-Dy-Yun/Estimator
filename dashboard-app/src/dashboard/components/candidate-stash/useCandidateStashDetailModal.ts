import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteCandidateItem,
  deleteCandidateStash,
  getCandidateItemByUuid,
  getCandidateItemsByStash,
  getCandidateStashes,
  startCandidateStashAnalysis,
  subscribeCandidateStashAnalysis,
  type CandidateStashAnalysisProgressEvent,
  type CandidateStashAnalysisSubscription,
  type CandidateItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { clampForecastMonths } from '../../../utils/forecastMonthsStorage'
import { parseOrderSnapshot } from '../../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { uniqueSortedStrings } from '../../../utils/uniqueSortedStrings'
import { mergePrimarySummaryFromBundleAndSnapshot } from '../../drawer/mergePrimarySummaryFromSnapshot'
import { useProductDrawerBundle } from '../../hooks/useProductDrawerBundle'

export type InnerCandidateRow = CandidateItemSummary & { id: string }

type Args = {
  stashUuid: string
  /** 부모가 이미 알고 있으면 전달 — `getCandidateStashes()` 중복 호출 생략 */
  stashSummary?: CandidateStashSummary | null
  onClose: () => void
  onStashesInvalidate?: () => void
}

export function useCandidateStashDetailModal({
  stashUuid,
  stashSummary: stashSummaryProp,
  onClose,
  onStashesInvalidate,
}: Args) {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [items, setItems] = useState<CandidateItemSummary[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [brandQuery, setBrandQuery] = useState('')
  const [productCodeQuery, setProductCodeQuery] = useState('')
  const [productNameQuery, setProductNameQuery] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null)
  const [openedItemUuid, setOpenedItemUuid] = useState<string | null>(null)
  const [hydrateSnap, setHydrateSnap] = useState<OrderSnapshotDocumentV1 | null>(null)
  const [drawerForecastMonths, setDrawerForecastMonths] = useState(8)

  const [itemDeleteTarget, setItemDeleteTarget] = useState<CandidateItemSummary | null>(null)
  const [itemDeleteBusy, setItemDeleteBusy] = useState(false)
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<CandidateStashAnalysisProgressEvent | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const innerNavLockRef = useRef(false)
  const analysisRequestSeqRef = useRef(0)

  useEffect(() => {
    void (async () => {
      if (stashSummaryProp && stashSummaryProp.uuid === stashUuid) {
        setStashes([stashSummaryProp])
        return
      }
      const list = await getCandidateStashes()
      setStashes(list)
    })()
  }, [stashUuid, stashSummaryProp])

  const loadItems = useCallback(async () => {
    if (!stashUuid) return
    setDetailLoading(true)
    setDetailError(null)
    try {
      const rows = await getCandidateItemsByStash(stashUuid)
      setItems(rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : '이너 후보 목록 스냅샷 데이터가 올바르지 않습니다.'
      setItems([])
      setDetailError(message)
    } finally {
      setDetailLoading(false)
    }
  }, [stashUuid])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

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
      message: '후보군 스냅샷 LLM 분석 요청을 백엔드에 전송하는 중입니다.',
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
          message: '백엔드가 LLM 분석 작업을 접수했습니다.',
          error: null,
        })
        subscription = subscribeCandidateStashAnalysis(started.jobId, {
          onEvent: (event) => {
            if (!alive || analysisRequestSeqRef.current !== requestSeq) return
            setAnalysisProgress(event)
            if (event.status === 'failed') {
              setAnalysisError(event.error ?? event.message)
            }
            if (event.status === 'completed' || event.status === 'failed') {
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
        const message = err instanceof Error ? err.message : '후보군 LLM 분석 요청에 실패했습니다.'
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
  }, [stashUuid])

  const detailTarget = useMemo(
    () => (stashUuid ? stashes.find((s) => s.uuid === stashUuid) ?? null : null),
    [stashUuid, stashes],
  )

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

  const tableRows = useMemo(
    (): InnerCandidateRow[] => filteredItems.map((item) => ({ ...item, id: item.uuid })),
    [filteredItems],
  )

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
  const bundle = useProductDrawerBundle(drawerOpen ? drawerProductId : null, fc, {
    allowStaleWhileRevalidate: false,
  })

  const mergedSummary = useMemo(
    () => mergePrimarySummaryFromBundleAndSnapshot(drawerProductId, bundle, hydrateSnap),
    [bundle, drawerProductId, hydrateSnap],
  )

  const periodStart = hydrateSnap?.context.periodStart
  const periodEnd = hydrateSnap?.context.periodEnd
  if (drawerOpen && (!periodStart || !periodEnd)) {
    throw new Error('후보 스냅샷 기간 정보 누락')
  }

  const openItemDrawer = useCallback(async (row: InnerCandidateRow) => {
    setDrawerError(null)
    try {
      const detail = await getCandidateItemByUuid(row.uuid)
      if (!detail) throw new Error(`후보 상세 데이터 없음: ${row.uuid}`)
      const snap = parseOrderSnapshot(detail.details)
      setHydrateSnap(snap)
      setDrawerForecastMonths(clampForecastMonths(snap.context.forecastMonths))
      setDrawerProductId(row.productId)
      setOpenedItemUuid(row.uuid)
      setDrawerOpen(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : '후보 상세 스냅샷 로드에 실패했습니다.'
      setDrawerError(message)
    }
  }, [])

  const onRequestNavigateAdjacent = useCallback(
    async (direction: AdjacentDirection) => {
      if (!drawerOpen) return
      if (deleteOpen || itemDeleteTarget) return
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
    [deleteOpen, drawerOpen, itemDeleteTarget, openedItemUuid, openItemDrawer, tableRows],
  )

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setDrawerProductId(null)
    setOpenedItemUuid(null)
    setHydrateSnap(null)
  }, [])

  const onDrawerForecastMonthsChange = useCallback((n: number) => {
    setDrawerForecastMonths(clampForecastMonths(n))
  }, [])

  const refreshStashes = useCallback(async () => {
    const list = await getCandidateStashes()
    setStashes(list)
    onStashesInvalidate?.()
  }, [onStashesInvalidate])

  const confirmDeleteStash = useCallback(async () => {
    if (!detailTarget) return
    setDeleteBusy(true)
    try {
      await deleteCandidateStash(detailTarget.uuid)
      await refreshStashes()
      onClose()
    } finally {
      setDeleteBusy(false)
    }
  }, [detailTarget, onClose, refreshStashes])

  const confirmDeleteItem = useCallback(async () => {
    if (!itemDeleteTarget) return
    setItemDeleteBusy(true)
    try {
      await deleteCandidateItem(itemDeleteTarget.uuid)
      if (openedItemUuid === itemDeleteTarget.uuid) closeDrawer()
      setItemDeleteTarget(null)
      await loadItems()
      await refreshStashes()
    } finally {
      setItemDeleteBusy(false)
    }
  }, [closeDrawer, itemDeleteTarget, loadItems, openedItemUuid, refreshStashes])

  const confirmDeleteItems = useCallback(async (itemUuids: string[]) => {
    const uniqueUuids = [...new Set(itemUuids)]
    if (!uniqueUuids.length) return
    setBulkDeleteBusy(true)
    try {
      for (const itemUuid of uniqueUuids) {
        await deleteCandidateItem(itemUuid)
      }
      if (openedItemUuid && uniqueUuids.includes(openedItemUuid)) closeDrawer()
      await loadItems()
      await refreshStashes()
    } finally {
      setBulkDeleteBusy(false)
    }
  }, [closeDrawer, loadItems, openedItemUuid, refreshStashes])

  return {
    drawerOpen,
    items,
    detailLoading,
    detailError,
    deleteBusy,
    deleteOpen,
    setDeleteOpen,
    brandQuery,
    setBrandQuery,
    productCodeQuery,
    setProductCodeQuery,
    productNameQuery,
    setProductNameQuery,
    drawerError,
    openedItemUuid,
    hydrateSnap,
    fc,
    bundle,
    mergedSummary,
    periodStart,
    periodEnd,
    itemDeleteTarget,
    itemDeleteBusy,
    bulkDeleteBusy,
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
    confirmDeleteStash,
    confirmDeleteItem,
    confirmDeleteItems,
  }
}
