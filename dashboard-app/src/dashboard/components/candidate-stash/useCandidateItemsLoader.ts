import { useCallback, useState, type MutableRefObject } from 'react'
import {
  getApiErrorDisplayMessage,
  getCandidateItemsByStash,
  type CandidateItemSummary,
  type CandidateStashItemSummary,
} from '../../../api'
import {
  applyCandidateDetailConfirmationOverrides,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'
import type { AppliedCandidateDataReferencePeriod } from './useCandidateDataReferencePeriod'
import type { CandidateSetItems } from './candidateStashDetailTypes'

type CandidateMetricReloadOptions = {
  metricSkuGroupKeys?: readonly string[]
  preserveExistingMetrics?: boolean
}

interface SubscribeOrderMetricsArgs {
  seq: number
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  companyUuid?: string
  candidateItemUuids: string[]
}

interface UseCandidateItemsLoaderParams {
  stashUuid: string
  companyUuid?: string
  appliedPeriodRef: MutableRefObject<AppliedCandidateDataReferencePeriod>
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  confirmationOverridesRef: MutableRefObject<CandidateDetailConfirmationOverrideMap>
  clearRecommendationItems: () => void
  beginItemLoad: () => number
  isCurrentItemLoad: (seq: number) => boolean
  setItems: CandidateSetItems
  subscribeOrderMetrics: (args: SubscribeOrderMetricsArgs) => void
}

function selectMetricCandidateItems(
  candidateItems: CandidateStashItemSummary[],
  metricSkuGroupKeys?: readonly string[],
): CandidateStashItemSummary[] {
  if (!metricSkuGroupKeys) return candidateItems
  const metricSkuGroupKeySet = new Set(metricSkuGroupKeys)
  return candidateItems.filter((item) => metricSkuGroupKeySet.has(item.skuGroupKey))
}

function preserveOrderMetricFields(
  item: CandidateItemSummary,
  previous: CandidateItemSummary | undefined,
): CandidateItemSummary {
  return previous
    ? {
        ...item,
        orderMetricStatus: previous.orderMetricStatus,
        qty: previous.qty,
        expectedOrderAmount: previous.expectedOrderAmount,
        expectedSalesAmount: previous.expectedSalesAmount,
        expectedOpProfit: previous.expectedOpProfit,
        insightStatus: previous.insightStatus,
        insight: previous.insight,
        orderExport: previous.orderExport,
      }
    : item
}

export function useCandidateItemsLoader({
  stashUuid,
  companyUuid,
  appliedPeriodRef,
  itemsRef,
  confirmationOverridesRef,
  clearRecommendationItems,
  beginItemLoad,
  isCurrentItemLoad,
  setItems,
  subscribeOrderMetrics,
}: UseCandidateItemsLoaderParams) {
  const [candidateItemsLoading, setCandidateItemsLoading] = useState(false)
  const [candidateItemsLoadError, setCandidateItemsLoadError] = useState<string | null>(null)

  const loadItems = useCallback(async (
    nextPeriodStart = appliedPeriodRef.current.start,
    nextPeriodEnd = appliedPeriodRef.current.end,
    options: CandidateMetricReloadOptions = {},
  ) => {
    if (!stashUuid || !nextPeriodStart || !nextPeriodEnd) return
    const seq = beginItemLoad()
    setCandidateItemsLoading(true)
    setCandidateItemsLoadError(null)
    try {
      const result = await getCandidateItemsByStash({
        stashUuid,
        companyUuid,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
      })
      if (!isCurrentItemLoad(seq)) return
      clearRecommendationItems()
      const metricCandidateItems = selectMetricCandidateItems(result.candidateItems, options.metricSkuGroupKeys)
      const previousItemByUuid = options.preserveExistingMetrics
        ? new Map(itemsRef.current.map((item) => [item.uuid, item]))
        : null
      const metricItemUuidSet = new Set(metricCandidateItems.map((item) => item.uuid))
      const nextItems = previousItemByUuid
        ? result.items.map((item) => (
            metricItemUuidSet.has(item.uuid) ? item : preserveOrderMetricFields(item, previousItemByUuid.get(item.uuid))
          ))
        : result.items
      const protectedResult = applyCandidateDetailConfirmationOverrides(nextItems, confirmationOverridesRef.current)
      confirmationOverridesRef.current = protectedResult.overrides
      setItems(protectedResult.items)
      setCandidateItemsLoading(false)
      subscribeOrderMetrics({
        seq,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
        companyUuid,
        candidateItemUuids: metricCandidateItems.map((item) => item.uuid),
      })
    } catch (err) {
      if (!isCurrentItemLoad(seq)) return
      const message = getApiErrorDisplayMessage(err, '후보 상품 목록을 불러오지 못했습니다.')
      setCandidateItemsLoadError(message)
      setCandidateItemsLoading(false)
    }
  }, [
    appliedPeriodRef,
    beginItemLoad,
    clearRecommendationItems,
    companyUuid,
    confirmationOverridesRef,
    isCurrentItemLoad,
    itemsRef,
    setItems,
    stashUuid,
    subscribeOrderMetrics,
  ])

  return {
    candidateItemsLoading,
    candidateItemsLoadError,
    loadItems,
  }
}
