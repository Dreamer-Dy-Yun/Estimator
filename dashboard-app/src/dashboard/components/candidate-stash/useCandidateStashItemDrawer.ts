import type { CandidateItemDetail, CandidateItemSummary, ProductComparisonBaseSubjectRef, ProductDrawerBundle } from '../../../api'
import type { ProductPrimarySummary } from '../../../types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCandidateItemByUuid, isAllCompanyScope, type CandidateStashSummary } from '../../../api'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { adjacentIdInOrder } from '../../../utils/adjacentListNavigation'
import { clampForecastMonths, DEFAULT_FORECAST_MONTHS } from '../../../utils/forecastMonthsStorage'
import { parseOrderSnapshot } from '../../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocument } from '../../../snapshot/orderSnapshotTypes'
import { mergePrimarySummaryFromBundleAndSnapshot } from '../../drawer/mergePrimarySummaryFromSnapshot'
import { useProductDrawerBundleState } from '../../hooks/useProductDrawerBundle'
import { assertCandidateItemDetailSnapshotFlag } from './candidateItemDetailContract'
import type { InnerCandidateRow } from './candidateStashDetailTypes'

const INNER_DRAWER_CLOSE_LAYOUT_MS = 440 as const

export type DrawerSnapshotSource = 'confirmed' | 'live'
export type DraftSnapshotEntry = { snapshot: OrderSnapshotDocument; source: DrawerSnapshotSource }
export type SnapshotMutationState = { state: 'confirmed' | 'unconfirmed'; baseDbUpdatedAt: string | null }
export type OpenItemDrawerOptions = { companyUuid?: string | null }

export type Args = {
  dataReferenceStart: string | undefined
  dataReferenceEnd: string | undefined
  detailTarget: CandidateStashSummary | null
  itemDeleteTargetUuid: string | null
  tableRows: InnerCandidateRow[]
}

export function useCandidateStashItemDrawer({ dataReferenceStart, dataReferenceEnd, itemDeleteTargetUuid, tableRows }: Args) : { drawerOpen: boolean; drawerClosing: boolean; drawerError: string | null; openedItemUuid: string | null; hydrateSnap: OrderSnapshotDocument | null; hydrateSnapSource: DrawerSnapshotSource | null; confirmedHydrateSnap: OrderSnapshotDocument | null; fc: number; bundle: ProductDrawerBundle | null; mergedSummary: ProductPrimarySummary | null; openItemDrawer: (row: InnerCandidateRow, options?: OpenItemDrawerOptions) => Promise<void>; onRequestNavigateAdjacent: (direction: AdjacentDirection) => Promise<void>; closeDrawer: () => void; onDrawerForecastMonthsChange: (n: number) => void; saveDrawerDraftSnapshot: (itemUuid: string, snapshot: OrderSnapshotDocument, source: DrawerSnapshotSource) => void; clearDrawerDraftSnapshot: (itemUuid: string) => void; markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocument, baseDbUpdatedAt?: string | null) => void; markDrawerSnapshotUnconfirmed: (itemUuid: string, baseDbUpdatedAt?: string | null) => void; restoreDrawerConfirmedSnapshot: (itemUuid: string) => void; } {
  const [drawerOpen, setDrawerOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [drawerClosing, setDrawerClosing]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [drawerError, setDrawerError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [drawerSkuGroupKey, setDrawerSkuGroupKey]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [openedItemUuid, setOpenedItemUuid]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [hydrateSnap, setHydrateSnap]: [OrderSnapshotDocument | null, React.Dispatch<React.SetStateAction<OrderSnapshotDocument | null>>] = useState<OrderSnapshotDocument | null>(null)
  const [hydrateSnapSource, setHydrateSnapSource]: [DrawerSnapshotSource | null, React.Dispatch<React.SetStateAction<DrawerSnapshotSource | null>>] = useState<DrawerSnapshotSource | null>(null)
  const [confirmedHydrateSnap, setConfirmedHydrateSnap]: [OrderSnapshotDocument | null, React.Dispatch<React.SetStateAction<OrderSnapshotDocument | null>>] = useState<OrderSnapshotDocument | null>(null)
  const [drawerForecastMonths, setDrawerForecastMonths]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(DEFAULT_FORECAST_MONTHS)
  const [drawerCompanyUuid, setDrawerCompanyUuid]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const mountedRef: React.RefObject<boolean> = useRef(false)
  const drawerRequestSeqRef: React.RefObject<number> = useRef(0)
  const drawerCloseTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null> = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const drawerCompanyUuidRef: React.RefObject<string | null> = useRef<string | null>(null)
  const innerNavLockRef: React.RefObject<boolean> = useRef(false)
  const stableMergedSummaryRef: React.RefObject<ProductPrimarySummary | null> = useRef<ProductPrimarySummary | null>(null)
  const draftSnapshotsByItemUuidRef: React.RefObject<Record<string, DraftSnapshotEntry>> = useRef<Record<string, DraftSnapshotEntry>>({})
  const confirmedSnapshotsByItemUuidRef: React.RefObject<Record<string, OrderSnapshotDocument>> = useRef<Record<string, OrderSnapshotDocument>>({})
  const snapshotMutationsByItemUuidRef: React.RefObject<Record<string, SnapshotMutationState>> = useRef<Record<string, SnapshotMutationState>>({})

  const clearCloseTimer: () => void = useCallback(() : void => {
    if (drawerCloseTimerRef.current == null) return
    window.clearTimeout(drawerCloseTimerRef.current)
    drawerCloseTimerRef.current = null
  }, [])

  useEffect(() : () => void => {
    mountedRef.current = true
    return () : void => {
      mountedRef.current = false
      drawerRequestSeqRef.current += 1
      clearCloseTimer()
    }
  }, [clearCloseTimer])

  const fc: number = clampForecastMonths(drawerForecastMonths)
  const drawerBaseSubject: ProductComparisonBaseSubjectRef = useMemo(
    () : ProductComparisonBaseSubjectRef => ({
      role: 'base',
      kind: 'self-company',
      ...(drawerCompanyUuid == null ? {} : { sourceId: drawerCompanyUuid }),
    }),
    [drawerCompanyUuid],
  )
  const {
    bundle,
    loading: drawerBundleLoading,
  }: { bundle: ProductDrawerBundle | null; loading: boolean } = useProductDrawerBundleState(drawerOpen || drawerClosing ? drawerSkuGroupKey : null, {
    allowStaleWhileRevalidate: false,
    baseSubject: drawerBaseSubject,
  })
  const mergedSummaryCandidate: ProductPrimarySummary | null = useMemo(() : ProductPrimarySummary | null => mergePrimarySummaryFromBundleAndSnapshot(drawerSkuGroupKey, bundle, hydrateSnap), [bundle, drawerSkuGroupKey, hydrateSnap])

  useEffect(() : void => {
    if (mergedSummaryCandidate != null) {
      stableMergedSummaryRef.current = mergedSummaryCandidate
      return
    }
    if (!drawerOpen && !drawerClosing) stableMergedSummaryRef.current = null
  }, [drawerClosing, drawerOpen, mergedSummaryCandidate])

  const stableMergedSummary: ProductPrimarySummary | null = stableMergedSummaryRef.current?.skuGroupKey === drawerSkuGroupKey ? stableMergedSummaryRef.current : null
  const mergedSummary: ProductPrimarySummary | null = mergedSummaryCandidate ?? ((drawerOpen || drawerClosing) && drawerBundleLoading ? stableMergedSummary : null)
  if (drawerOpen && (!dataReferenceStart || !dataReferenceEnd)) throw new Error('후보 상세 조회 기간 정보 누락')

  const applyOpenedSnapshot: (itemUuid: string, nextHydrate: OrderSnapshotDocument | null, source: DrawerSnapshotSource | null, confirmed: OrderSnapshotDocument | null) => void = useCallback((itemUuid: string, nextHydrate: OrderSnapshotDocument | null, source: DrawerSnapshotSource | null, confirmed: OrderSnapshotDocument | null) : void => {
    if (openedItemUuid !== itemUuid) return
    setHydrateSnap(nextHydrate)
    setHydrateSnapSource(source)
    setConfirmedHydrateSnap(confirmed)
  }, [openedItemUuid])

  const openItemDrawer: (row: InnerCandidateRow, options?: OpenItemDrawerOptions) => Promise<void> = useCallback(async (row: InnerCandidateRow, options?: OpenItemDrawerOptions) : Promise<void> => {
    const seq: number = drawerRequestSeqRef.current + 1
    drawerRequestSeqRef.current = seq
    clearCloseTimer()
    setDrawerClosing(false)
    setDrawerError(null)
    try {
      const scopedCompanyUuid: string | null = (options ? options.companyUuid?.trim() : drawerCompanyUuidRef.current) ?? null
      if (!scopedCompanyUuid || isAllCompanyScope(scopedCompanyUuid)) throw new Error('Candidate item detail requires a single company scope.')
      drawerCompanyUuidRef.current = scopedCompanyUuid
      setDrawerCompanyUuid(scopedCompanyUuid)
      const detail: CandidateItemDetail | null = await getCandidateItemByUuid(row.uuid, { companyUuid: scopedCompanyUuid })
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      if (!detail) throw new Error(`후보 상세 데이터 없음: ${row.uuid}`)
      assertCandidateItemDetailSnapshotFlag(detail)
      const parsedSnapshot: OrderSnapshotDocument | null = detail.confirmedOrderSnapshot ? parseOrderSnapshot(detail.confirmedOrderSnapshot) : null
      if (parsedSnapshot && parsedSnapshot.skuGroupKey !== row.skuGroupKey) {
        throw new Error(`Candidate item snapshot skuGroupKey mismatch: ${row.uuid}`)
      }
      if (parsedSnapshot && (parsedSnapshot.drawer2.baseSubject.sourceId ?? null) !== scopedCompanyUuid) {
        throw new Error(`Candidate item snapshot baseSubject sourceId mismatch: ${row.uuid}`)
      }
      const localMutation: SnapshotMutationState = snapshotMutationsByItemUuidRef.current[row.uuid] ?? null
      const serverCaughtUp: boolean = localMutation?.baseDbUpdatedAt != null
        && detail.dbUpdatedAt !== localMutation.baseDbUpdatedAt
        && Boolean(parsedSnapshot) === (localMutation.state === 'confirmed')
      if (serverCaughtUp) delete snapshotMutationsByItemUuidRef.current[row.uuid]
      const effectiveMutation: SnapshotMutationState | null = serverCaughtUp ? null : localMutation
      const confirmedSnap: OrderSnapshotDocument | null = effectiveMutation?.state === 'unconfirmed'
        ? null
        : effectiveMutation?.state === 'confirmed'
          ? confirmedSnapshotsByItemUuidRef.current[row.uuid] ?? parsedSnapshot
          : parsedSnapshot
      if (confirmedSnap) confirmedSnapshotsByItemUuidRef.current[row.uuid] = confirmedSnap
      else delete confirmedSnapshotsByItemUuidRef.current[row.uuid]
      const draftEntry: DraftSnapshotEntry = draftSnapshotsByItemUuidRef.current[row.uuid] ?? null
      const nextHydrate: OrderSnapshotDocument | null = draftEntry?.snapshot ?? confirmedSnap
      const nextSource: DrawerSnapshotSource | null = draftEntry?.source ?? (confirmedSnap ? 'confirmed' : null)
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      setHydrateSnap(nextHydrate)
      setHydrateSnapSource(nextSource)
      setConfirmedHydrateSnap(confirmedSnap)
      setDrawerSkuGroupKey(row.skuGroupKey)
      setOpenedItemUuid(row.uuid)
      setDrawerOpen(true)
    } catch (err) {
      if (!mountedRef.current || drawerRequestSeqRef.current !== seq) return
      setDrawerError(err instanceof Error ? err.message : '후보 상세 오류를 로드하지 못했습니다.')
    }
  }, [clearCloseTimer])

  const onRequestNavigateAdjacent: (direction: AdjacentDirection) => Promise<void> = useCallback(async (direction: AdjacentDirection) : Promise<void> => {
    if (!drawerOpen || itemDeleteTargetUuid || innerNavLockRef.current) return
    const nextUuid: string | null = adjacentIdInOrder(tableRows.map((r: CandidateItemSummary) : string => r.uuid), openedItemUuid, direction)
    const row: CandidateItemSummary | null | undefined = nextUuid && nextUuid !== openedItemUuid ? tableRows.find((candidate: CandidateItemSummary) : boolean => candidate.uuid === nextUuid) : null
    if (!row) return
    innerNavLockRef.current = true
    try {
      await openItemDrawer(row)
    } finally {
      innerNavLockRef.current = false
    }
  }, [drawerOpen, itemDeleteTargetUuid, openedItemUuid, openItemDrawer, tableRows])

  const closeDrawer: () => void = useCallback(() : void => {
    drawerRequestSeqRef.current += 1
    if (!drawerOpen && !drawerClosing && drawerSkuGroupKey == null) return
    clearCloseTimer()
    setDrawerOpen(false)
    setDrawerClosing(true)
    drawerCloseTimerRef.current = window.setTimeout(() : void => {
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

  const onDrawerForecastMonthsChange: (n: number) => void = useCallback((n: number) : void => {
    setDrawerForecastMonths(clampForecastMonths(n))
  }, [])

  const saveDrawerDraftSnapshot: (itemUuid: string, snapshot: OrderSnapshotDocument, source: DrawerSnapshotSource) => void = useCallback((itemUuid: string, snapshot: OrderSnapshotDocument, source: DrawerSnapshotSource) : void => {
    if (source === 'confirmed') return
    draftSnapshotsByItemUuidRef.current[itemUuid] = { snapshot, source }
  }, [])

  const clearDrawerDraftSnapshot: (itemUuid: string) => void = useCallback((itemUuid: string) : void => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    applyOpenedSnapshot(itemUuid, null, null, confirmedHydrateSnap)
  }, [applyOpenedSnapshot, confirmedHydrateSnap])

  const markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocument, baseDbUpdatedAt?: string | null) => void = useCallback((itemUuid: string, snapshot: OrderSnapshotDocument, baseDbUpdatedAt: string | null = null) : void => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    confirmedSnapshotsByItemUuidRef.current[itemUuid] = snapshot
    snapshotMutationsByItemUuidRef.current[itemUuid] = { state: 'confirmed', baseDbUpdatedAt }
    applyOpenedSnapshot(itemUuid, snapshot, 'confirmed', snapshot)
  }, [applyOpenedSnapshot])

  const markDrawerSnapshotUnconfirmed: (itemUuid: string, baseDbUpdatedAt?: string | null) => void = useCallback((itemUuid: string, baseDbUpdatedAt: string | null = null) : void => {
    delete draftSnapshotsByItemUuidRef.current[itemUuid]
    delete confirmedSnapshotsByItemUuidRef.current[itemUuid]
    snapshotMutationsByItemUuidRef.current[itemUuid] = { state: 'unconfirmed', baseDbUpdatedAt }
    applyOpenedSnapshot(itemUuid, null, null, null)
  }, [applyOpenedSnapshot])

  const restoreDrawerConfirmedSnapshot: (itemUuid: string) => void = useCallback((itemUuid: string) : void => {
    const snap: OrderSnapshotDocument | null = confirmedSnapshotsByItemUuidRef.current[itemUuid] ?? null
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
