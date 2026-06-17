import type { RefObject } from 'react'
import type { CandidateItemSummary, CandidateStashItemSummary, ProductComparisonTarget } from '../../../api'
import type { CandidateItemStateUpdater } from './candidateStashDetailTypes'
import type { SubscribeArgs } from './useCandidateOrderMetricStream'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  markComparisonUnavailableCandidateOrderMetricsFailed,
  resetCandidateItemOrderMetricLoading,
} from './candidateItemMetricModel'

interface CandidateOrderMetricCoordinatorArgs {
  companyUuid: string | undefined
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  items: CandidateItemSummary[]
  itemsRef: RefObject<CandidateItemSummary[]>
  setItems: (next: CandidateItemStateUpdater) => void
  orderMetricComparisonTarget: ProductComparisonTarget | null
  orderMetricComparisonLoading: boolean
  closeMetricSubscription: () => void
  getCurrentItemLoadSeq: () => number
  subscribeOrderMetrics: (args: SubscribeArgs) => void
}

interface CandidateOrderMetricCoordinator {
  subscribeMetricsForCandidateItems: (candidateItems: CandidateStashItemSummary[]) => void
}

export function useCandidateOrderMetricCoordinator({
  companyUuid,
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
  items,
  itemsRef,
  setItems,
  orderMetricComparisonTarget,
  orderMetricComparisonLoading,
  closeMetricSubscription,
  getCurrentItemLoadSeq,
  subscribeOrderMetrics,
}: CandidateOrderMetricCoordinatorArgs): CandidateOrderMetricCoordinator {
  const orderMetricComparisonKeyRef: RefObject<string> = useRef<string>('')
  const orderMetricComparisonKey: string = useMemo(() : string => {
    if (orderMetricComparisonTarget == null) return ''
    return `${orderMetricComparisonTarget.kind}:${orderMetricComparisonTarget.sourceId ?? ''}:${orderMetricComparisonTarget.id}`
  }, [orderMetricComparisonTarget])
  const hasComparisonUnavailableMetricRows: boolean = useMemo(() : boolean => items.some((item: CandidateItemSummary) : boolean => (
    !item.isDetailConfirmed && (item.orderMetricStatus === 'loading' || item.orderMetricStatus === 'loaded')
  )), [items])

  useEffect(() : void => {
    if (orderMetricComparisonLoading) return
    if (orderMetricComparisonTarget != null) return
    if (!hasComparisonUnavailableMetricRows) return
    closeMetricSubscription()
    orderMetricComparisonKeyRef.current = ''
    setItems(markComparisonUnavailableCandidateOrderMetricsFailed)
  }, [
    closeMetricSubscription,
    hasComparisonUnavailableMetricRows,
    orderMetricComparisonLoading,
    orderMetricComparisonTarget,
    setItems,
  ])

  useEffect(() : void => {
    if (orderMetricComparisonTarget == null) return
    if (!dataReferencePeriodStart || !dataReferencePeriodEnd) return
    if (!itemsRef.current.length) return
    const previousComparisonKey: string = orderMetricComparisonKeyRef.current
    const comparisonChanged: boolean = previousComparisonKey !== '' && previousComparisonKey !== orderMetricComparisonKey
    const targetItems: CandidateItemSummary[] = comparisonChanged
      ? itemsRef.current.filter((item: CandidateItemSummary) : boolean => !item.isDetailConfirmed)
      : itemsRef.current.filter((item: CandidateItemSummary) : boolean => item.orderMetricStatus === 'loading')
    if (!targetItems.length) return
    orderMetricComparisonKeyRef.current = orderMetricComparisonKey
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
    items.length,
    itemsRef,
    orderMetricComparisonKey,
    orderMetricComparisonTarget,
    setItems,
    subscribeOrderMetrics,
  ])

  const subscribeMetricsForCandidateItems: (candidateItems: CandidateStashItemSummary[]) => void = useCallback((
    candidateItems: CandidateStashItemSummary[],
  ) : void => {
    if (orderMetricComparisonTarget == null) return
    if (!dataReferencePeriodStart || !dataReferencePeriodEnd) return
    if (!candidateItems.length) return
    subscribeOrderMetrics({
      seq: getCurrentItemLoadSeq(),
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
      companyUuid,
      candidateItemUuids: candidateItems.map((item: CandidateStashItemSummary) : string => item.uuid),
      comparison: orderMetricComparisonTarget,
    })
  }, [
    companyUuid,
    dataReferencePeriodEnd,
    dataReferencePeriodStart,
    getCurrentItemLoadSeq,
    orderMetricComparisonTarget,
    subscribeOrderMetrics,
  ])

  return { subscribeMetricsForCandidateItems }
}
