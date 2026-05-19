import { useCallback, useState, type MutableRefObject } from 'react'
import { getCandidateItemsByStash, type CandidateItemSummary } from '../../../api'
import {
  applyCandidateDetailConfirmationOverrides,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'
import {
  mergeCandidateItemsWithPreservedMetrics,
  selectMetricCandidateItems,
  type CandidateMetricReloadOptions,
} from './candidateItemListMergeModel'
import type { AppliedCandidateDataReferencePeriod } from './useCandidateDataReferencePeriod'

type ItemStateUpdater = CandidateItemSummary[] | ((current: CandidateItemSummary[]) => CandidateItemSummary[])

interface SubscribeOrderMetricsArgs {
  seq: number
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  candidateItemUuids: string[]
}

interface UseCandidateItemsLoaderParams {
  stashUuid: string
  appliedPeriodRef: MutableRefObject<AppliedCandidateDataReferencePeriod>
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  confirmationOverridesRef: MutableRefObject<CandidateDetailConfirmationOverrideMap>
  clearRecommendationItems: () => void
  beginItemLoad: () => number
  isCurrentItemLoad: (seq: number) => boolean
  setItems: (next: ItemStateUpdater) => void
  subscribeOrderMetrics: (args: SubscribeOrderMetricsArgs) => void
}

export function useCandidateItemsLoader({
  stashUuid,
  appliedPeriodRef,
  itemsRef,
  confirmationOverridesRef,
  clearRecommendationItems,
  beginItemLoad,
  isCurrentItemLoad,
  setItems,
  subscribeOrderMetrics,
}: UseCandidateItemsLoaderParams) {
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const loadItems = useCallback(async (
    nextPeriodStart = appliedPeriodRef.current.start,
    nextPeriodEnd = appliedPeriodRef.current.end,
    options: CandidateMetricReloadOptions = {},
  ) => {
    if (!stashUuid || !nextPeriodStart || !nextPeriodEnd) return
    const seq = beginItemLoad()
    setDetailLoading(true)
    setDetailError(null)
    clearRecommendationItems()
    try {
      const result = await getCandidateItemsByStash({
        stashUuid,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
      })
      if (!isCurrentItemLoad(seq)) return
      const metricCandidateItems = selectMetricCandidateItems(result.candidateItems, options.metricSkuGroupKeys)
      const nextItems = mergeCandidateItemsWithPreservedMetrics(
        result.items,
        metricCandidateItems,
        itemsRef.current,
        options.preserveExistingMetrics,
      )
      const protectedResult = applyCandidateDetailConfirmationOverrides(nextItems, confirmationOverridesRef.current)
      confirmationOverridesRef.current = protectedResult.overrides
      setItems(protectedResult.items)
      setDetailLoading(false)
      subscribeOrderMetrics({
        seq,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
        candidateItemUuids: metricCandidateItems.map((item) => item.uuid),
      })
    } catch (err) {
      if (!isCurrentItemLoad(seq)) return
      const message = err instanceof Error ? err.message : '이너 후보 목록 스냅샷 데이터가 올바르지 않습니다.'
      setItems([])
      clearRecommendationItems()
      setDetailError(message)
      setDetailLoading(false)
    }
  }, [
    appliedPeriodRef,
    beginItemLoad,
    clearRecommendationItems,
    confirmationOverridesRef,
    isCurrentItemLoad,
    itemsRef,
    setItems,
    stashUuid,
    subscribeOrderMetrics,
  ])

  return {
    detailLoading,
    detailError,
    loadItems,
  }
}
