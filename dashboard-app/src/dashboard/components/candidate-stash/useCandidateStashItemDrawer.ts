import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCandidateItemByUuid, type CandidateStashSummary } from '../../../api'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { clampForecastMonths } from '../../../utils/forecastMonthsStorage'
import { parseOrderSnapshot } from '../../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocumentV2 } from '../../../snapshot/orderSnapshotTypes'
import { mergePrimarySummaryFromBundleAndSnapshot } from '../../drawer/mergePrimarySummaryFromSnapshot'
import { useProductDrawerBundle } from '../../hooks/useProductDrawerBundle'
import type { InnerCandidateRow } from './candidateStashDetailTypes'

const INNER_DRAWER_CLOSE_LAYOUT_MS = 440

type DrawerSnapshotSource = 'confirmed' | 'live'

type DrawerDraftSnapshotEntry = {
  snapshot: OrderSnapshotDocumentV2
  source: DrawerSnapshotSource
}

type DrawerSnapshotMutationState = {
  state: 'confirmed' | 'unconfirmed'
  baseDbUpdatedAt: string | null
}

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
  const [hydrateSnap, setHydrateSnap] = useState<OrderSnapshotDocumentV2 | null>(null)
  const [hydrateSnapSource, setHydrateSnapSource] = useState<DrawerSnapshotSource | null>(null)
  const [confirmedHydrateSnap, setConfirmedHydrateSnap] = useState<OrderSnapshotDocumentV2 | null>(null)
  const [drawerForecastMonths, setDrawerForecastMonths] = useState(8)
  const mountedRef = useRef(false)
  const drawerRequestSeqRef = useRef(0)
  const drawerCloseTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const innerNavLockRef = useRef(false)
  const draftSnapshotsByItemUuidRef = useRef<Record<string, DrawerDraftSnapshotEntry>>({})
  const confirmedSnapshotsByItemUuidRef = useRef<Record<string, OrderSnapshotDocumentV2>>({})
  const snapshotMutationsByItemUuidRef = useRef<Record<string, DrawerSnapshotMutationState>>({})

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
      const localMutation = snapshotMutationsByItemUuidRef.current[row.uuid] ?? null
      const serverCaughtUp = localMutation?.baseDbUpdatedAt != null
        && detail.dbUpdatedAt !== localMutation.baseDbUpdatedAt
        && Boolean(snap) === (localMutation.state === 'confirmed')
      if (serverCaughtUp) delete snapshotMutationsByItemUuidRef.current[row.uuid]
      const effectiveMutation = serverCaughtUp ? null : localMutation
      let confirmedSnap = snap
      if (effectiveMutation?.state === 'confirmed') {
        confirmedSnap = confirmedSnapshotsByItemUuidRef.current[row.uuid] ?? snap
      }
      if (effectiveMutation?.state === 'unconfirmed') {
        confirmedSnap = null
      }
      if (confirmedSnap) confirmedSnapshotsByItemUuidRef.current[row.uuid] = confirmedSnap
      else delete confirmedSnapshotsByItemUuidRef.current[row.uuid]
      const draftEntry = draftSnapshotsByItemUuidRef.current[row.uuid] ?? null
      const hydrateSnap = draftEntry?.snapshot ?? confirmedSnap
      const hydrateSource = draftEntry?.source ?? (confirmedSnap ? 'confirmed' : null)
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      setHydrateSnap(hydrateSnap)
      setHydrateSnapSource(hydrateSource)
      setConfirmedHydrateSnap(confirmedSnap)
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
      setHydrateSnapSource(null)
      setConfirmedHydrateSnap(null)
    }, INNER_DRAWER_CLOSE_LAYOUT_MS)
  }, [drawerClosing, drawerOpen, drawerSkuGroupKey])

  const onDrawerForecastMonthsChange = useCallback((n: number) => {
    setDrawerForecastMonths(clampForecastMonths(n))
  }, [])

  const saveDrawerDraftSnapshot = useCallback((
    itemUuid: string,
    snapshot: OrderSnapshotDocumentV2,
    source: DrawerSnapshotSource,
  ) => {
    draftSnapshotsByItemUuidRef.current[itemUuid] = { snapshot, source }
  }, [])

  const clearDrawerDraftSnapshot = useCallback((itemUuid: string) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    if (openedItemUuid === itemUuid) setHydrateSnap(null)
    if (openedItemUuid === itemUuid) setHydrateSnapSource(null)
  }, [openedItemUuid])

  const markDrawerSnapshotConfirmed = useCallback((
    itemUuid: string,
    snapshot: OrderSnapshotDocumentV2,
    baseDbUpdatedAt: string | null = null,
  ) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    confirmedSnapshotsByItemUuidRef.current[itemUuid] = snapshot
    snapshotMutationsByItemUuidRef.current[itemUuid] = { state: 'confirmed', baseDbUpdatedAt }
    if (openedItemUuid === itemUuid) setHydrateSnap(snapshot)
    if (openedItemUuid === itemUuid) setHydrateSnapSource('confirmed')
    if (openedItemUuid === itemUuid) setConfirmedHydrateSnap(snapshot)
  }, [openedItemUuid])

  const markDrawerSnapshotUnconfirmed = useCallback((
    itemUuid: string,
    baseDbUpdatedAt: string | null = null,
  ) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    delete confirmedSnapshotsByItemUuidRef.current[itemUuid]
    snapshotMutationsByItemUuidRef.current[itemUuid] = { state: 'unconfirmed', baseDbUpdatedAt }
    if (openedItemUuid === itemUuid) setHydrateSnap(null)
    if (openedItemUuid === itemUuid) setHydrateSnapSource(null)
    if (openedItemUuid === itemUuid) setConfirmedHydrateSnap(null)
  }, [openedItemUuid])

  const restoreDrawerConfirmedSnapshot = useCallback((itemUuid: string) => {
    const snap = confirmedSnapshotsByItemUuidRef.current[itemUuid] ?? null
    if (!snap) return
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    if (openedItemUuid === itemUuid) setHydrateSnap(snap)
    if (openedItemUuid === itemUuid) setHydrateSnapSource('confirmed')
    if (openedItemUuid === itemUuid) setConfirmedHydrateSnap(snap)
  }, [openedItemUuid])

  return {
    drawerOpen,
    drawerClosing,
    drawerError,
    openedItemUuid,
    hydrateSnap,
    hydrateSnapSource,
    confirmedHydrateSnap,
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
    restoreDrawerConfirmedSnapshot,
  }
}
