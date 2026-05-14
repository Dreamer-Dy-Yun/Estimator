import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCandidateItemsByStash,
  getCandidateRecommendations,
  getCandidateStashes,
  type CandidateItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import { normalizeRangeOnEndInput, normalizeRangeOnStartInput } from '../../hooks/usePeriodRangeFilter'
import { preloadCandidateOrderExcelExport } from '../../../utils/candidateOrderExcelExport'
import { useAppToast } from '../../../components/AppToastContext'
import { useCandidateStashAnalysisProgress } from './useCandidateStashAnalysisProgress'
import { useInnerCandidateTable } from './useInnerCandidateTable'
import { useCandidateStashItemDrawer } from './useCandidateStashItemDrawer'
import { useCandidateStashItemActions } from './useCandidateStashItemActions'

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
  const [recommendationItems, setRecommendationItems] = useState<CandidateItemSummary[]>([])
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [dataReferencePeriodStart, setDataReferencePeriodStart] = useState('')
  const [dataReferencePeriodEnd, setDataReferencePeriodEnd] = useState('')

  const [itemDeleteTarget, setItemDeleteTarget] = useState<CandidateItemSummary | null>(null)
  const { showToast } = useAppToast()
  const mountedRef = useRef(false)
  const stashLoadSeqRef = useRef(0)
  const itemLoadSeqRef = useRef(0)
  const recommendationLoadSeqRef = useRef(0)
  const initializedDetailTargetUuidRef = useRef<string | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stashLoadSeqRef.current += 1
      itemLoadSeqRef.current += 1
      recommendationLoadSeqRef.current += 1
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
    if (!stashUuid || !dataReferencePeriodStart || !dataReferencePeriodEnd) return
    const seq = itemLoadSeqRef.current + 1
    itemLoadSeqRef.current = seq
    setDetailLoading(true)
    setDetailError(null)
    try {
      const result = await getCandidateItemsByStash({
        stashUuid,
        dataReferencePeriodStart,
        dataReferencePeriodEnd,
      })
      if (!mountedRef.current || itemLoadSeqRef.current !== seq) return
      setItems(result.items)
      setDetailLoading(false)
    } catch (err) {
      if (!mountedRef.current || itemLoadSeqRef.current !== seq) return
      const message = err instanceof Error ? err.message : '이너 후보 목록 스냅샷 데이터가 올바르지 않습니다.'
      setItems([])
      setDetailError(message)
      setDetailLoading(false)
    }
  }, [dataReferencePeriodEnd, dataReferencePeriodStart, stashUuid])

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) void loadItems()
    })
    return () => {
      alive = false
    }
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

  const handleAnalysisCompleted = useCallback(() => {
    void loadItems()
    void refreshStashes()
    showToast('후보군 AI 분석이 완료되었습니다.')
  }, [loadItems, refreshStashes, showToast])
  const { analysisProgress, analysisError } = useCandidateStashAnalysisProgress({
    stashUuid,
    onCompleted: handleAnalysisCompleted,
  })

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
        return
      }
      setDataReferencePeriodStart(detailTarget.periodStart)
      setDataReferencePeriodEnd(detailTarget.periodEnd)
    })
    return () => {
      alive = false
    }
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

  const table = useInnerCandidateTable(items)
  const dataReferenceStart = dataReferencePeriodStart || undefined
  const dataReferenceEnd = dataReferencePeriodEnd || undefined
  useEffect(() => {
    let alive = true
    recommendationLoadSeqRef.current += 1
    queueMicrotask(() => {
      if (!alive) return
      setRecommendationItems([])
      setRecommendationError(null)
      setRecommendationLoading(false)
    })
    return () => {
      alive = false
    }
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
    onDataReferencePeriodStartChange,
    onDataReferencePeriodEndChange,
    fc: drawer.fc,
    bundle: drawer.bundle,
    mergedSummary: drawer.mergedSummary,
    periodStart: dataReferenceStart,
    periodEnd: dataReferenceEnd,
    itemDeleteTarget,
    itemDeleteBusy: actions.itemDeleteBusy,
    bulkDeleteBusy: actions.bulkDeleteBusy,
    orderExportBusy: actions.orderExportBusy,
    orderExportError: actions.orderExportError,
    analysisProgress,
    analysisError,
    setItemDeleteTarget,
    detailTarget,
    brandOptions: table.brandOptions,
    codeOptions: table.codeOptions,
    productNameOptions: table.productNameOptions,
    tableRows: table.tableRows,
    totals: table.totals,
    totalExpectedOpProfitRatePct: table.totalExpectedOpProfitRatePct,
    openItemDrawer: drawer.openItemDrawer,
    onRequestNavigateAdjacent: drawer.onRequestNavigateAdjacent,
    closeDrawer: drawer.closeDrawer,
    onDrawerForecastMonthsChange: drawer.onDrawerForecastMonthsChange,
    loadItems,
    refreshStashes,
    confirmDeleteItem,
    confirmDeleteItems: actions.confirmDeleteItems,
    downloadOrderExcel: actions.downloadOrderExcel,
    loadRecommendations,
  }
}

export type CandidateStashDetailModalModel = ReturnType<typeof useCandidateStashDetailModal>
