import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type CandidateItemSummary,
  type CandidateReferenceItemSummary,
  type CandidateStashItemSummary,
  type CandidateStashSummary,
} from '../../../api'
import { preloadCandidateOrderExcelExport } from '../../../utils/candidateOrderExcelExport'
import { useAppToast } from '../../../components/AppToastContext'
import { useInnerCandidateTable } from './useInnerCandidateTable'
import { useCandidateStashItemDrawer } from './useCandidateStashItemDrawer'
import { useCandidateStashItemActions } from './useCandidateStashItemActions'
import { useCandidateOrderMetricStream } from './useCandidateOrderMetricStream'
import { useCandidateStashSummaries } from './useCandidateStashSummaries'
import { useCandidateRecommendations } from './useCandidateRecommendations'
import { useCandidateDataReferencePeriod, type AppliedCandidateDataReferencePeriod } from './useCandidateDataReferencePeriod'
import { useCandidateDetailConfirmationMutations } from './useCandidateDetailConfirmationMutations'
import { useCandidateBulkDetailConfirm } from './useCandidateBulkDetailConfirm'
import type { CandidateDetailConfirmationOverrideMap } from './candidateDetailConfirmationOverrideModel'
import {
  appendRecommendedCandidateItems,
  removeCandidateItemsByUuid,
} from './candidateItemLocalMutationModel'
import { useCandidateItemsLoader } from './useCandidateItemsLoader'
import type { CandidateItemStateUpdater } from './candidateStashDetailTypes'

type Args = {
  stashUuid: string
  companyUuid?: string
  stashSummary?: CandidateStashSummary | null
  onStashesInvalidate?: () => void
}

export type { InnerCandidateRow, InnerCandidateSortKey } from './candidateStashDetailTypes'

export function useCandidateStashDetailModal({
  stashUuid,
  companyUuid,
  stashSummary: stashSummaryProp,
  onStashesInvalidate,
}: Args) {
  const [items, setItemsState] = useState<CandidateItemSummary[]>([])
  const [itemDeleteTarget, setItemDeleteTarget] = useState<CandidateItemSummary | null>(null)
  const { showToast } = useAppToast()
  const mountedRef = useRef(false)
  const itemsRef = useRef<CandidateItemSummary[]>([])
  const clearRecommendationItemsRef = useRef<() => void>(() => undefined)
  const confirmationOverridesRef = useRef<CandidateDetailConfirmationOverrideMap>({})
  const appliedPeriodRef = useRef<AppliedCandidateDataReferencePeriod>({ start: '', end: '' })
  const clearRecommendationItemsFromRef = useCallback(() => clearRecommendationItemsRef.current(), [])

  const setItems = useCallback((next: CandidateItemStateUpdater) => {
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
    getCurrentItemLoadSeq,
    isCurrentItemLoad,
    subscribeOrderMetrics,
  } = useCandidateOrderMetricStream({ stashUuid, companyUuid, mountedRef, setItems })
  const { detailTarget, refreshStashes, stashListLoadError } = useCandidateStashSummaries({
    stashUuid,
    companyUuid,
    stashSummary: stashSummaryProp,
    mountedRef,
    onStashesInvalidate,
  })

  const { candidateItemsLoading, candidateItemsLoadError, loadItems } = useCandidateItemsLoader({
    stashUuid,
    companyUuid,
    appliedPeriodRef,
    itemsRef,
    confirmationOverridesRef,
    clearRecommendationItems: clearRecommendationItemsFromRef,
    beginItemLoad,
    isCurrentItemLoad,
    setItems,
    subscribeOrderMetrics,
  })

  useEffect(() => {
    if (!items.length) return
    void preloadCandidateOrderExcelExport().catch(() => undefined)
  }, [items.length, stashUuid])

  const dataReferencePeriod = useCandidateDataReferencePeriod({
    detailTarget,
    appliedPeriodRef,
    setItems,
    clearRecommendationItems: clearRecommendationItemsFromRef,
    closeMetricSubscription,
    loadItems,
  })
  const { dataReferencePeriodStart, dataReferencePeriodEnd } = dataReferencePeriod

  const appendRecommendedItemsLocally = useCallback((
    candidateItems: CandidateStashItemSummary[],
    recommendationRows: CandidateReferenceItemSummary[],
  ) => {
    if (!candidateItems.length) return 0
    const beforeSkuUuidSet = new Set(itemsRef.current.map((item) => item.skuUuid))
    const nextItems = appendRecommendedCandidateItems(itemsRef.current, candidateItems, recommendationRows)
    const appendedCount = nextItems.filter((item) => (
      !beforeSkuUuidSet.has(item.skuUuid)
      && candidateItems.some((candidateItem) => candidateItem.skuUuid === item.skuUuid)
    )).length
    setItems(nextItems)
    subscribeOrderMetrics({
      seq: getCurrentItemLoadSeq(),
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      companyUuid,
      candidateItemUuids: candidateItems.map((item) => item.uuid),
    })
    return appendedCount
  }, [
    companyUuid,
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    getCurrentItemLoadSeq,
    itemsRef,
    setItems,
    subscribeOrderMetrics,
  ])
  const recommendationItemScope = useMemo(() => {
    const skuUuids = items.map((item) => item.skuUuid)
    return { skuUuids, membershipKey: [...skuUuids].sort().join('|') }
  }, [items])

  const recommendations = useCandidateRecommendations({
    stashUuid,
    companyUuid,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    itemMembershipKey: recommendationItemScope.membershipKey,
    itemSkuUuids: recommendationItemScope.skuUuids,
    mountedRef,
    itemsRef,
    setItems,
    onRecommendedItemsAppended: appendRecommendedItemsLocally,
    refreshStashes,
    showToast,
  })
  const { clearRecommendationItems, loadRecommendations, recommendationLoading } = recommendations

  useEffect(() => {
    clearRecommendationItemsRef.current = clearRecommendationItems
  }, [clearRecommendationItems])

  useEffect(() => {
    if (candidateItemsLoading || candidateItemsLoadError || recommendationLoading) return
    if (!items.some((item) => item.insightStatus === 'loading')) return
    void loadRecommendations()
  }, [candidateItemsLoadError, candidateItemsLoading, items, loadRecommendations, recommendationLoading])

  const table = useInnerCandidateTable(items)

  const drawer = useCandidateStashItemDrawer({
    dataReferenceStart: dataReferencePeriodStart || undefined,
    dataReferenceEnd: dataReferencePeriodEnd || undefined,
    detailTarget,
    itemDeleteTargetUuid: itemDeleteTarget?.uuid ?? null,
    tableRows: table.tableRows,
  })
  const {
    markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed,
    markItemsDetailConfirmed,
    markItemsDetailUnconfirmed,
  } =
    useCandidateDetailConfirmationMutations({
      itemsRef,
      confirmationOverridesRef,
      setItems,
      drawer,
    })
  const bulkConfirm = useCandidateBulkDetailConfirm({
    stashUuid,
    companyUuid,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    mountedRef,
    onItemsConfirmed: markItemsDetailConfirmed,
    showToast,
  })
  const removeItemsLocally = useCallback((itemUuids: string[]) => {
    setItems((current) => removeCandidateItemsByUuid(current, itemUuids))
  }, [setItems])

  const actions = useCandidateStashItemActions({
    stashUuid,
    companyUuid,
    detailTarget,
    items,
    itemDeleteTarget,
    openedItemUuid: drawer.openedItemUuid,
    closeDrawer: drawer.closeDrawer,
    refreshStashes,
    showToast,
    onItemsDeleted: removeItemsLocally,
    onItemsUnconfirmed: markItemsDetailUnconfirmed,
  })

  const confirmDeleteItem = useCallback(async () => {
    await actions.confirmDeleteItem()
    if (mountedRef.current) setItemDeleteTarget(null)
  }, [actions])

  return {
    ...drawer,
    ...dataReferencePeriod,
    ...table,
    ...actions,
    ...bulkConfirm,
    ...recommendations,
    companyUuid,
    items,
    candidateItemsLoading,
    candidateItemsLoadError,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    periodStart: dataReferencePeriodStart || undefined,
    periodEnd: dataReferencePeriodEnd || undefined,
    itemDeleteTarget,
    detailTarget,
    stashListLoadError,
    setItemDeleteTarget,
    markDrawerSnapshotConfirmed,
    markDrawerSnapshotUnconfirmed,
    loadItems,
    refreshStashes,
    confirmDeleteItem,
  }
}

export type CandidateStashDetailModalModel = ReturnType<typeof useCandidateStashDetailModal>
