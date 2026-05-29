import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCandidateItemByUuid, isAllCompanyScope, type CandidateStashSummary } from '../../../api'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { clampForecastMonths, DEFAULT_FORECAST_MONTHS } from '../../../utils/forecastMonthsStorage'
import { parseOrderSnapshot } from '../../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocumentV2 } from '../../../snapshot/orderSnapshotTypes'
import { mergePrimarySummaryFromBundleAndSnapshot } from '../../drawer/mergePrimarySummaryFromSnapshot'
import { useProductDrawerBundle } from '../../hooks/useProductDrawerBundle'
import type { InnerCandidateRow } from './candidateStashDetailTypes'

const INNER_DRAWER_CLOSE_LAYOUT_MS = 440

type DrawerSnapshotSource = 'confirmed' | 'live'
type DraftSnapshotEntry = { snapshot: OrderSnapshotDocumentV2; source: DrawerSnapshotSource }
type SnapshotMutationState = { state: 'confirmed' | 'unconfirmed'; baseDbUpdatedAt: string | null }
type OpenItemDrawerOptions = { companyUuid?: string | null }

type Args = {
  dataReferenceStart: string | undefined
  dataReferenceEnd: string | undefined
  detailTarget: CandidateStashSummary | null
  itemDeleteTargetUuid: string | null
  tableRows: InnerCandidateRow[]
}

export function useCandidateStashItemDrawer({ dataReferenceStart, dataReferenceEnd, detailTarget, itemDeleteTargetUuid, tableRows }: Args) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [drawerSkuGroupKey, setDrawerSkuGroupKey] = useState<string | null>(null)
  const [openedItemUuid, setOpenedItemUuid] = useState<string | null>(null)
  const [hydrateSnap, setHydrateSnap] = useState<OrderSnapshotDocumentV2 | null>(null)
  const [hydrateSnapSource, setHydrateSnapSource] = useState<DrawerSnapshotSource | null>(null)
  const [confirmedHydrateSnap, setConfirmedHydrateSnap] = useState<OrderSnapshotDocumentV2 | null>(null)
  const [drawerForecastMonths, setDrawerForecastMonths] = useState(DEFAULT_FORECAST_MONTHS)
  const [drawerCompanyUuid, setDrawerCompanyUuid] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const drawerRequestSeqRef = useRef(0)
  const drawerCloseTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const drawerCompanyUuidRef = useRef<string | null>(null)
  const innerNavLockRef = useRef(false)
  const draftSnapshotsByItemUuidRef = useRef<Record<string, DraftSnapshotEntry>>({})
  const confirmedSnapshotsByItemUuidRef = useRef<Record<string, OrderSnapshotDocumentV2>>({})
  const snapshotMutationsByItemUuidRef = useRef<Record<string, SnapshotMutationState>>({})

  const clearCloseTimer = useCallback(() => {
    if (drawerCloseTimerRef.current == null) return
    window.clearTimeout(drawerCloseTimerRef.current)
    drawerCloseTimerRef.current = null
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      drawerRequestSeqRef.current += 1
      clearCloseTimer()
    }
  }, [clearCloseTimer])

  const fc = clampForecastMonths(drawerForecastMonths)
  const bundle = useProductDrawerBundle(drawerOpen || drawerClosing ? drawerSkuGroupKey : null, {
    allowStaleWhileRevalidate: false,
    companyUuid: drawerCompanyUuid ?? undefined,
  })
  const mergedSummary = useMemo(() => mergePrimarySummaryFromBundleAndSnapshot(drawerSkuGroupKey, bundle, hydrateSnap), [bundle, drawerSkuGroupKey, hydrateSnap])
  const detailForecastMonths = detailTarget?.forecastMonths ?? DEFAULT_FORECAST_MONTHS

  if (drawerOpen && (!dataReferenceStart || !dataReferenceEnd)) throw new Error('후보 상세 조회 기간 정보 누락')

  const applyOpenedSnapshot = useCallback((itemUuid: string, nextHydrate: OrderSnapshotDocumentV2 | null, source: DrawerSnapshotSource | null, confirmed: OrderSnapshotDocumentV2 | null) => {
    if (openedItemUuid !== itemUuid) return
    setHydrateSnap(nextHydrate)
    setHydrateSnapSource(source)
    setConfirmedHydrateSnap(confirmed)
    if (source === 'confirmed' && nextHydrate) setDrawerForecastMonths(clampForecastMonths(nextHydrate.context.forecastMonths))
  }, [openedItemUuid])

  const openItemDrawer = useCallback(async (row: InnerCandidateRow, options?: OpenItemDrawerOptions) => {
    const seq = drawerRequestSeqRef.current + 1
    drawerRequestSeqRef.current = seq
    clearCloseTimer()
    setDrawerClosing(false)
    setDrawerError(null)
    try {
      const scopedCompanyUuid = (options ? options.companyUuid?.trim() : drawerCompanyUuidRef.current) ?? null
      if (!scopedCompanyUuid || isAllCompanyScope(scopedCompanyUuid)) throw new Error('Candidate item detail requires a single company scope.')
      drawerCompanyUuidRef.current = scopedCompanyUuid
      setDrawerCompanyUuid(scopedCompanyUuid)
      const detail = await getCandidateItemByUuid(row.uuid, { companyUuid: scopedCompanyUuid })
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      if (!detail) throw new Error(`후보 상세 데이터 없음: ${row.uuid}`)
      const parsedSnapshot = detail.details ? parseOrderSnapshot(detail.details) : null
      if (parsedSnapshot && parsedSnapshot.skuGroupKey !== row.skuGroupKey) {
        throw new Error(`Candidate item snapshot skuGroupKey mismatch: ${row.uuid}`)
      }
      if (parsedSnapshot && parsedSnapshot.companyUuid !== scopedCompanyUuid) {
        throw new Error(`Candidate item snapshot companyUuid mismatch: ${row.uuid}`)
      }
      const localMutation = snapshotMutationsByItemUuidRef.current[row.uuid] ?? null
      const serverCaughtUp = localMutation?.baseDbUpdatedAt != null
        && detail.dbUpdatedAt !== localMutation.baseDbUpdatedAt
        && Boolean(parsedSnapshot) === (localMutation.state === 'confirmed')
      if (serverCaughtUp) delete snapshotMutationsByItemUuidRef.current[row.uuid]
      const effectiveMutation = serverCaughtUp ? null : localMutation
      const confirmedSnap = effectiveMutation?.state === 'unconfirmed'
        ? null
        : effectiveMutation?.state === 'confirmed'
          ? confirmedSnapshotsByItemUuidRef.current[row.uuid] ?? parsedSnapshot
          : parsedSnapshot
      if (confirmedSnap) confirmedSnapshotsByItemUuidRef.current[row.uuid] = confirmedSnap
      else delete confirmedSnapshotsByItemUuidRef.current[row.uuid]
      const draftEntry = draftSnapshotsByItemUuidRef.current[row.uuid] ?? null
      const nextHydrate = draftEntry?.snapshot ?? confirmedSnap
      const nextSource = draftEntry?.source ?? (confirmedSnap ? 'confirmed' : null)
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      setHydrateSnap(nextHydrate)
      setHydrateSnapSource(nextSource)
      setConfirmedHydrateSnap(confirmedSnap)
      setDrawerForecastMonths(clampForecastMonths(nextHydrate?.context.forecastMonths ?? detailForecastMonths))
      setDrawerSkuGroupKey(row.skuGroupKey)
      setOpenedItemUuid(row.uuid)
      setDrawerOpen(true)
    } catch (err) {
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      setDrawerError(err instanceof Error ? err.message : '후보 상세 오류를 로드하지 못했습니다.')
    }
  }, [clearCloseTimer, detailForecastMonths])

  const onRequestNavigateAdjacent = useCallback(async (direction: AdjacentDirection) => {
    if (!drawerOpen || itemDeleteTargetUuid || innerNavLockRef.current) return
    const nextUuid = adjacentIdInOrder(tableRows.map((r) => r.uuid), openedItemUuid, direction)
    const row = nextUuid && nextUuid !== openedItemUuid ? tableRows.find((candidate) => candidate.uuid === nextUuid) : null
    if (!row) return
    innerNavLockRef.current = true
    try {
      await openItemDrawer(row)
    } finally {
      innerNavLockRef.current = false
    }
  }, [drawerOpen, itemDeleteTargetUuid, openedItemUuid, openItemDrawer, tableRows])

  const closeDrawer = useCallback(() => {
    drawerRequestSeqRef.current += 1
    if (!drawerOpen && !drawerClosing && drawerSkuGroupKey == null) return
    clearCloseTimer()
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
      drawerCompanyUuidRef.current = null
      setDrawerCompanyUuid(null)
    }, INNER_DRAWER_CLOSE_LAYOUT_MS)
  }, [clearCloseTimer, drawerClosing, drawerOpen, drawerSkuGroupKey])

  const onDrawerForecastMonthsChange = useCallback((n: number) => {
    setDrawerForecastMonths(clampForecastMonths(n))
  }, [])

  const saveDrawerDraftSnapshot = useCallback((itemUuid: string, snapshot: OrderSnapshotDocumentV2, source: DrawerSnapshotSource) => {
    if (source === 'confirmed') return
    draftSnapshotsByItemUuidRef.current[itemUuid] = { snapshot, source }
  }, [])

  const clearDrawerDraftSnapshot = useCallback((itemUuid: string) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    applyOpenedSnapshot(itemUuid, null, null, confirmedHydrateSnap)
  }, [applyOpenedSnapshot, confirmedHydrateSnap])

  const markDrawerSnapshotConfirmed = useCallback((itemUuid: string, snapshot: OrderSnapshotDocumentV2, baseDbUpdatedAt: string | null = null) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    confirmedSnapshotsByItemUuidRef.current[itemUuid] = snapshot
    snapshotMutationsByItemUuidRef.current[itemUuid] = { state: 'confirmed', baseDbUpdatedAt }
    applyOpenedSnapshot(itemUuid, snapshot, 'confirmed', snapshot)
  }, [applyOpenedSnapshot])

  const markDrawerSnapshotUnconfirmed = useCallback((itemUuid: string, baseDbUpdatedAt: string | null = null) => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    delete confirmedSnapshotsByItemUuidRef.current[itemUuid]
    snapshotMutationsByItemUuidRef.current[itemUuid] = { state: 'unconfirmed', baseDbUpdatedAt }
    applyOpenedSnapshot(itemUuid, null, null, null)
  }, [applyOpenedSnapshot])

  const restoreDrawerConfirmedSnapshot = useCallback((itemUuid: string) => {
    const snap = confirmedSnapshotsByItemUuidRef.current[itemUuid] ?? null
    if (!snap) return
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    applyOpenedSnapshot(itemUuid, snap, 'confirmed', snap)
  }, [applyOpenedSnapshot])

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
