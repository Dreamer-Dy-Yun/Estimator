import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCandidateItemByUuid, type CandidateStashSummary } from '../../../api'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { clampForecastMonths } from '../../../utils/forecastMonthsStorage'
import { parseOrderSnapshot } from '../../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocumentV1 } from '../../../snapshot/orderSnapshotTypes'
import { mergePrimarySummaryFromBundleAndSnapshot } from '../../drawer/mergePrimarySummaryFromSnapshot'
import { useProductDrawerBundle } from '../../hooks/useProductDrawerBundle'
import type { InnerCandidateRow } from './candidateStashDetailTypes'

const INNER_DRAWER_CLOSE_LAYOUT_MS = 440

type Args = {
  dataReferenceStart: string | undefined
  dataReferenceEnd: string | undefined
  detailTarget: CandidateStashSummary | null
  itemDeleteTargetUuid: string | null
  tableRows: InnerCandidateRow[]
}

export function useCandidateStashItemDrawer({
  dataReferenceStart,
  dataReferenceEnd,
  detailTarget,
  itemDeleteTargetUuid,
  tableRows,
}: Args) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [drawerSkuGroupKey, setDrawerSkuGroupKey] = useState<string | null>(null)
  const [openedItemUuid, setOpenedItemUuid] = useState<string | null>(null)
  const [hydrateSnap, setHydrateSnap] = useState<OrderSnapshotDocumentV1 | null>(null)
  const [drawerForecastMonths, setDrawerForecastMonths] = useState(8)
  const mountedRef = useRef(false)
  const drawerRequestSeqRef = useRef(0)
  const drawerCloseTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const innerNavLockRef = useRef(false)
  const draftSnapshotsByItemUuidRef = useRef<Record<string, OrderSnapshotDocumentV1>>({})

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      drawerRequestSeqRef.current += 1
      if (drawerCloseTimerRef.current != null) {
        window.clearTimeout(drawerCloseTimerRef.current)
        drawerCloseTimerRef.current = null
      }
    }
  }, [])

  const fc = clampForecastMonths(drawerForecastMonths)
  const bundle = useProductDrawerBundle(drawerOpen || drawerClosing ? drawerSkuGroupKey : null, {
    allowStaleWhileRevalidate: false,
  })
  const mergedSummary = useMemo(
    () => mergePrimarySummaryFromBundleAndSnapshot(drawerSkuGroupKey, bundle, hydrateSnap),
    [bundle, drawerSkuGroupKey, hydrateSnap],
  )
  const detailForecastMonths = detailTarget?.forecastMonths ?? 8

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
      const snap = detail.details ? parseOrderSnapshot(detail.details) : null
      const draftSnap = draftSnapshotsByItemUuidRef.current[row.uuid] ?? null
      const hydrateSnap = draftSnap ?? snap
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      setHydrateSnap(hydrateSnap)
      setDrawerForecastMonths(clampForecastMonths(hydrateSnap?.context.forecastMonths ?? detailForecastMonths))
      setDrawerSkuGroupKey(row.skuGroupKey)
      setOpenedItemUuid(row.uuid)
      setDrawerOpen(true)
    } catch (err) {
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      const message = err instanceof Error ? err.message : '후보 상세 스냅샷 로드에 실패했습니다.'
      setDrawerError(message)
    }
  }, [detailForecastMonths])

  const onRequestNavigateAdjacent = useCallback(
    async (direction: AdjacentDirection) => {
      if (!drawerOpen) return
      if (itemDeleteTargetUuid) return
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
    [drawerOpen, itemDeleteTargetUuid, openedItemUuid, openItemDrawer, tableRows],
  )

  const closeDrawer = useCallback(() => {
    drawerRequestSeqRef.current += 1
    if (!drawerOpen && !drawerClosing && drawerSkuGroupKey == null) return
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
      setDrawerSkuGroupKey(null)
      setOpenedItemUuid(null)
      setHydrateSnap(null)
    }, INNER_DRAWER_CLOSE_LAYOUT_MS)
  }, [drawerClosing, drawerOpen, drawerSkuGroupKey])

  const onDrawerForecastMonthsChange = useCallback((n: number) => {
    setDrawerForecastMonths(clampForecastMonths(n))
  }, [])

  const saveDrawerDraftSnapshot = useCallback((itemUuid: string, snapshot: OrderSnapshotDocumentV1) => {
    draftSnapshotsByItemUuidRef.current[itemUuid] = snapshot
  }, [])

  const clearDrawerDraftSnapshot = useCallback((itemUuid: string) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    if (openedItemUuid === itemUuid) setHydrateSnap(null)
  }, [openedItemUuid])

  const markDrawerSnapshotConfirmed = useCallback((itemUuid: string, snapshot: OrderSnapshotDocumentV1) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    if (openedItemUuid === itemUuid) setHydrateSnap(snapshot)
  }, [openedItemUuid])

  const markDrawerSnapshotUnconfirmed = useCallback((itemUuid: string) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    if (openedItemUuid === itemUuid) setHydrateSnap(null)
  }, [openedItemUuid])

  return {
    drawerOpen,
    drawerClosing,
    drawerError,
    openedItemUuid,
    hydrateSnap,
    fc,
    bundle,
    mergedSummary,
    openItemDrawer,
    onRequestNavigateAdjacent,
    closeDrawer,
    onDrawerForecastMonthsChange,
    saveDrawerDraftSnapshot,
    clearDrawerDraftSnapshot,
    markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed,
  }
}
