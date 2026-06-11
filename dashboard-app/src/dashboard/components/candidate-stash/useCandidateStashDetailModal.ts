import type { CandidateMetricReloadOptions } from './useCandidateItemsLoader'
import type { SubscribeArgs } from './useCandidateOrderMetricStream'
import type { DrawerSnapshotSource, OpenItemDrawerOptions } from './useCandidateStashItemDrawer'
import type { CandidateItemDetail, ProductComparisonTarget, ProductDrawerBundle } from '../../../api'
import type { OrderSnapshotDocument } from '../../../api/types'
import type { ProductPrimarySummary } from '../../../types'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import type { AppendRecommendedItemsResult, InnerCandidateRow, InnerCandidateSortKey, InnerCandidateSortState } from './candidateStashDetailTypes'
import type { CandidateBulkDetailConfirmProgress } from './useCandidateBulkDetailConfirm'
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
import { resetCandidateItemOrderMetricLoading } from './candidateItemMetricModel'

export type Args = {
  stashUuid: string
  companyUuid?: string
  stashSummary?: CandidateStashSummary | null
  onStashesInvalidate?: () => void
  orderMetricComparisonTarget: ProductComparisonTarget | null
}

export type { InnerCandidateRow, InnerCandidateSortKey } from './candidateStashDetailTypes'

export function useCandidateStashDetailModal({
  stashUuid,
  companyUuid,
  stashSummary: stashSummaryProp,
  onStashesInvalidate,
  orderMetricComparisonTarget,
}: Args) : { companyUuid: string | undefined; items: CandidateItemSummary[]; candidateItemsLoading: boolean; candidateItemsLoadError: string | null; dataReferencePeriodStart: string; dataReferencePeriodEnd: string; periodStart: string | undefined; periodEnd: string | undefined; itemDeleteTarget: CandidateItemSummary | null; detailTarget: CandidateStashSummary | null; stashListLoadError: string | null; setItemDeleteTarget: React.Dispatch<React.SetStateAction<CandidateItemSummary | null>>; markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) => void; markDrawerSnapshotUnconfirmed: (itemUuid: string, updatedItem: CandidateItemDetail) => void; loadItems: (nextPeriodStart?: string, nextPeriodEnd?: string, options?: CandidateMetricReloadOptions) => Promise<void>; refreshStashes: () => Promise<void>; confirmDeleteItem: () => Promise<void>; recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; bulkConfirmBusy: boolean; bulkConfirmProgress: CandidateBulkDetailConfirmProgress | null; closeBulkConfirmProgress: () => void; confirmBulkDetailItems: (itemUuids: string[]) => Promise<void>; itemDeleteBusy: boolean; bulkDeleteBusy: boolean; bulkUnconfirmBusy: boolean; orderExportBusy: boolean; orderExportError: string | null; confirmDeleteItems: (itemUuids: string[]) => Promise<void>; confirmUnconfirmItems: (itemUuids: string[]) => Promise<void>; downloadOrderExcel: (userName: string) => Promise<void>; brandQuery: string; setBrandQuery: React.Dispatch<React.SetStateAction<string>>; codeQuery: string; setCodeQuery: React.Dispatch<React.SetStateAction<string>>; productNameQuery: string; setProductNameQuery: React.Dispatch<React.SetStateAction<string>>; tableSort: InnerCandidateSortState | null; toggleTableSort: (key: InnerCandidateSortKey) => void; resetTableSort: () => void; brandOptions: string[]; codeOptions: string[]; productNameOptions: string[]; tableRows: CandidateItemSummary[]; totals: { qty: number; expectedOrderAmount: number; expectedSalesAmount: number; expectedOpProfit: number; }; pendingOrderMetricCount: number; totalExpectedOpProfitRatePct: number | null; draftDataReferencePeriodStart: string; draftDataReferencePeriodEnd: string; dataReferencePeriodQueryDirty: boolean; onDataReferencePeriodStartChange: (value: string) => void; onDataReferencePeriodEndChange: (value: string) => void; applyDataReferencePeriod: () => void; drawerOpen: boolean; drawerClosing: boolean; drawerError: string | null; openedItemUuid: string | null; hydrateSnap: OrderSnapshotDocument | null; hydrateSnapSource: DrawerSnapshotSource | null; confirmedHydrateSnap: OrderSnapshotDocument | null; fc: number; bundle: ProductDrawerBundle | null; mergedSummary: ProductPrimarySummary | null; openItemDrawer: (row: InnerCandidateRow, options?: OpenItemDrawerOptions) => Promise<void>; onRequestNavigateAdjacent: (direction: AdjacentDirection) => Promise<void>; closeDrawer: () => void; onDrawerForecastMonthsChange: (n: number) => void; saveDrawerDraftSnapshot: (itemUuid: string, snapshot: OrderSnapshotDocument, source: DrawerSnapshotSource) => void; clearDrawerDraftSnapshot: (itemUuid: string) => void; restoreDrawerConfirmedSnapshot: (itemUuid: string) => void; } {
  const [items, setItemsState]: [CandidateItemSummary[], React.Dispatch<React.SetStateAction<CandidateItemSummary[]>>] = useState<CandidateItemSummary[]>([])
  const [itemDeleteTarget, setItemDeleteTarget]: [CandidateItemSummary | null, React.Dispatch<React.SetStateAction<CandidateItemSummary | null>>] = useState<CandidateItemSummary | null>(null)
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const mountedRef: React.RefObject<boolean> = useRef(false)
  const itemsRef: React.RefObject<CandidateItemSummary[]> = useRef<CandidateItemSummary[]>([])
  const clearRecommendationItemsRef: React.RefObject<() => void> = useRef<() => void>(() : undefined => undefined)
  const confirmationOverridesRef: React.RefObject<CandidateDetailConfirmationOverrideMap> = useRef<CandidateDetailConfirmationOverrideMap>({})
  const appliedPeriodRef: React.RefObject<AppliedCandidateDataReferencePeriod> = useRef<AppliedCandidateDataReferencePeriod>({ start: '', end: '' })
  const orderMetricComparisonKeyRef: React.RefObject<string> = useRef<string>('')
  const clearRecommendationItemsFromRef: () => void = useCallback(() : void => clearRecommendationItemsRef.current(), [])

  const setItems: (next: CandidateItemStateUpdater) => void = useCallback((next: CandidateItemStateUpdater) : void => {
    setItemsState((current: CandidateItemSummary[]) : CandidateItemSummary[] => {
      const resolved: CandidateItemSummary[] = typeof next === 'function' ? next(current) : next
      itemsRef.current = resolved
      return resolved
    })
  }, [])

  useEffect(() : () => void => {
    mountedRef.current = true
    return () : void => {
      mountedRef.current = false
    }
  }, [])

  const {
    beginItemLoad,
    closeMetricSubscription,
    getCurrentItemLoadSeq,
    isCurrentItemLoad,
    subscribeOrderMetrics,
  }: { beginItemLoad: () => number; closeMetricSubscription: () => void; getCurrentItemLoadSeq: () => number; isCurrentItemLoad: (seq: number) => boolean; subscribeOrderMetrics: (args: SubscribeArgs) => void; } = useCandidateOrderMetricStream({ stashUuid, companyUuid, mountedRef, setItems })
  const { detailTarget, refreshStashes, stashListLoadError }: { detailTarget: CandidateStashSummary | null; refreshStashes: () => Promise<void>; stashListLoadError: string | null; } = useCandidateStashSummaries({
    stashUuid,
    companyUuid,
    stashSummary: stashSummaryProp,
    mountedRef,
    onStashesInvalidate,
  })

  const { candidateItemsLoading, candidateItemsLoadError, loadItems }: { candidateItemsLoading: boolean; candidateItemsLoadError: string | null; loadItems: (nextPeriodStart?: string, nextPeriodEnd?: string, options?: CandidateMetricReloadOptions) => Promise<void>; } = useCandidateItemsLoader({
    stashUuid,
    companyUuid,
    appliedPeriodRef,
    itemsRef,
    confirmationOverridesRef,
    orderMetricComparisonTarget,
    clearRecommendationItems: clearRecommendationItemsFromRef,
    beginItemLoad,
    isCurrentItemLoad,
    setItems,
    subscribeOrderMetrics,
  })

  useEffect(() : void => {
    if (!items.length) return
    void preloadCandidateOrderExcelExport().catch(() : undefined => undefined)
  }, [items.length, stashUuid])

  const table: { brandQuery: string; setBrandQuery: React.Dispatch<React.SetStateAction<string>>; codeQuery: string; setCodeQuery: React.Dispatch<React.SetStateAction<string>>; productNameQuery: string; setProductNameQuery: React.Dispatch<React.SetStateAction<string>>; tableSort: InnerCandidateSortState | null; toggleTableSort: (key: InnerCandidateSortKey) => void; resetTableSort: () => void; brandOptions: string[]; codeOptions: string[]; productNameOptions: string[]; tableRows: CandidateItemSummary[]; totals: { qty: number; expectedOrderAmount: number; expectedSalesAmount: number; expectedOpProfit: number; }; pendingOrderMetricCount: number; totalExpectedOpProfitRatePct: number | null; } = useInnerCandidateTable(items)

  const dataReferencePeriod: { dataReferencePeriodStart: string; dataReferencePeriodEnd: string; draftDataReferencePeriodStart: string; draftDataReferencePeriodEnd: string; dataReferencePeriodQueryDirty: boolean; onDataReferencePeriodStartChange: (value: string) => void; onDataReferencePeriodEndChange: (value: string) => void; applyDataReferencePeriod: () => void; } = useCandidateDataReferencePeriod({
    detailTarget,
    appliedPeriodRef,
    setItems,
    clearRecommendationItems: clearRecommendationItemsFromRef,
    closeMetricSubscription,
    loadItems,
    onDataReferencePeriodApplied: table.resetTableSort,
  })
  const { dataReferencePeriodStart, dataReferencePeriodEnd }: { dataReferencePeriodStart: string; dataReferencePeriodEnd: string; draftDataReferencePeriodStart: string; draftDataReferencePeriodEnd: string; dataReferencePeriodQueryDirty: boolean; onDataReferencePeriodStartChange: (value: string) => void; onDataReferencePeriodEndChange: (value: string) => void; applyDataReferencePeriod: () => void; } = dataReferencePeriod

  const orderMetricComparisonKey: string = useMemo(() : string => {
    if (orderMetricComparisonTarget == null) return ''
    return `${orderMetricComparisonTarget.kind}:${orderMetricComparisonTarget.sourceId ?? ''}:${orderMetricComparisonTarget.id}`
  }, [orderMetricComparisonTarget])

  useEffect(() : void => {
    if (orderMetricComparisonTarget == null) return
    if (!dataReferencePeriodStart || !dataReferencePeriodEnd) return
    const previousComparisonKey: string = orderMetricComparisonKeyRef.current
    const comparisonChanged: boolean = previousComparisonKey !== '' && previousComparisonKey !== orderMetricComparisonKey
    orderMetricComparisonKeyRef.current = orderMetricComparisonKey
    const targetItems: CandidateItemSummary[] = comparisonChanged
      ? itemsRef.current.filter((item: CandidateItemSummary) : boolean => !item.isDetailConfirmed)
      : itemsRef.current.filter((item: CandidateItemSummary) : boolean => item.orderMetricStatus === 'loading')
    if (!targetItems.length) return
    const targetItemUuidSet: Set<string> = new Set(targetItems.map((item: CandidateItemSummary) : string => item.uuid))
    if (comparisonChanged) {
      setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => current.map((item: CandidateItemSummary) : CandidateItemSummary => (
        targetItemUuidSet.has(item.uuid) ? resetCandidateItemOrderMetricLoading(item) : item
      )))
    }
    subscribeOrderMetrics({
      seq: getCurrentItemLoadSeq(),
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      companyUuid,
      candidateItemUuids: targetItems.map((item: CandidateItemSummary) : string => item.uuid),
      comparison: orderMetricComparisonTarget,
    })
  }, [
    companyUuid,
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    getCurrentItemLoadSeq,
    orderMetricComparisonKey,
    orderMetricComparisonTarget,
    setItems,
    subscribeOrderMetrics,
  ])

  const appendRecommendedItemsLocally: (candidateItems: CandidateStashItemSummary[], recommendationRows: CandidateReferenceItemSummary[]) => number = useCallback((
    candidateItems: CandidateStashItemSummary[],
    recommendationRows: CandidateReferenceItemSummary[],
  ) : number => {
    if (!candidateItems.length) return 0
    const beforeSkuUuidSet: Set<string> = new Set(itemsRef.current.map((item: CandidateItemSummary) : string => item.skuUuid))
    const nextItems: CandidateItemSummary[] = appendRecommendedCandidateItems(itemsRef.current, candidateItems, recommendationRows)
    const appendedCount: number = nextItems.filter((item: CandidateItemSummary) : boolean => (
      !beforeSkuUuidSet.has(item.skuUuid)
      && candidateItems.some((candidateItem: CandidateStashItemSummary) : boolean => candidateItem.skuUuid === item.skuUuid)
    )).length
    setItems(nextItems)
    if (orderMetricComparisonTarget != null) {
      subscribeOrderMetrics({
        seq: getCurrentItemLoadSeq(),
        dataReferencePeriodStart,
        dataReferencePeriodEnd,
        companyUuid,
        candidateItemUuids: candidateItems.map((item: CandidateStashItemSummary) : string => item.uuid),
        comparison: orderMetricComparisonTarget,
      })
    }
    return appendedCount
  }, [
    companyUuid,
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    getCurrentItemLoadSeq,
    itemsRef,
    orderMetricComparisonTarget,
    setItems,
    subscribeOrderMetrics,
  ])
  const recommendationItemScope: { skuUuids: string[]; membershipKey: string; } = useMemo(() : { skuUuids: string[]; membershipKey: string; } => {
    const skuUuids: string[] = items.map((item: CandidateItemSummary) : string => item.skuUuid)
    return { skuUuids, membershipKey: [...skuUuids].sort().join('|') }
  }, [items])

  const recommendations: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } = useCandidateRecommendations({
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
  const { clearRecommendationItems, loadRecommendations, recommendationLoading }: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } = recommendations

  useEffect(() : void => {
    clearRecommendationItemsRef.current = clearRecommendationItems
  }, [clearRecommendationItems])

  useEffect(() : void => {
    if (candidateItemsLoading || candidateItemsLoadError || recommendationLoading) return
    if (!items.some((item: CandidateItemSummary) : boolean => item.insightStatus === 'loading')) return
    void loadRecommendations()
  }, [candidateItemsLoadError, candidateItemsLoading, items, loadRecommendations, recommendationLoading])

  const drawer: { drawerOpen: boolean; drawerClosing: boolean; drawerError: string | null; openedItemUuid: string | null; hydrateSnap: OrderSnapshotDocument | null; hydrateSnapSource: DrawerSnapshotSource | null; confirmedHydrateSnap: OrderSnapshotDocument | null; fc: number; bundle: ProductDrawerBundle | null; mergedSummary: ProductPrimarySummary | null; openItemDrawer: (row: InnerCandidateRow, options?: OpenItemDrawerOptions) => Promise<void>; onRequestNavigateAdjacent: (direction: AdjacentDirection) => Promise<void>; closeDrawer: () => void; onDrawerForecastMonthsChange: (n: number) => void; saveDrawerDraftSnapshot: (itemUuid: string, snapshot: OrderSnapshotDocument, source: DrawerSnapshotSource) => void; clearDrawerDraftSnapshot: (itemUuid: string) => void; markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocument, baseDbUpdatedAt?: string | null) => void; markDrawerSnapshotUnconfirmed: (itemUuid: string, baseDbUpdatedAt?: string | null) => void; restoreDrawerConfirmedSnapshot: (itemUuid: string) => void; } = useCandidateStashItemDrawer({
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
  }: { markDrawerSnapshotConfirmed: (itemUuid: string, snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) => void; markDrawerSnapshotUnconfirmed: (itemUuid: string, updatedItem: CandidateItemDetail) => void; markItemsDetailConfirmed: (updatedItems: CandidateItemDetail[]) => void; markItemsDetailUnconfirmed: (updatedItems: CandidateItemDetail[]) => void; } =
    useCandidateDetailConfirmationMutations({
      itemsRef,
      confirmationOverridesRef,
      setItems,
      drawer,
    })
  const bulkConfirm: { bulkConfirmBusy: boolean; bulkConfirmProgress: CandidateBulkDetailConfirmProgress | null; closeBulkConfirmProgress: () => void; confirmBulkDetailItems: (itemUuids: string[]) => Promise<void>; } = useCandidateBulkDetailConfirm({
    stashUuid,
    companyUuid,
    dataReferencePeriodStart,
    dataReferencePeriodEnd,
    mountedRef,
    onItemsConfirmed: markItemsDetailConfirmed,
    showToast,
  })
  const removeItemsLocally: (itemUuids: string[]) => void = useCallback((itemUuids: string[]) : void => {
    setItems((current: CandidateItemSummary[]) : CandidateItemSummary[] => removeCandidateItemsByUuid(current, itemUuids))
  }, [setItems])

  const actions: { itemDeleteBusy: boolean; bulkDeleteBusy: boolean; bulkUnconfirmBusy: boolean; orderExportBusy: boolean; orderExportError: string | null; confirmDeleteItem: () => Promise<void>; confirmDeleteItems: (itemUuids: string[]) => Promise<void>; confirmUnconfirmItems: (itemUuids: string[]) => Promise<void>; downloadOrderExcel: (userName: string) => Promise<void>; } = useCandidateStashItemActions({
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

  const confirmDeleteItem: () => Promise<void> = useCallback(async () : Promise<void> => {
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
