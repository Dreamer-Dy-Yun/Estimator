import type { CandidateItemListResult, ProductComparisonTarget } from '../../../api'
import type { CandidateDetailConfirmationOverrideResult } from './candidateDetailConfirmationOverrideModel'
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

export type CandidateMetricReloadOptions = {
  metricSkuGroupKeys?: readonly string[]
  preserveExistingMetrics?: boolean
}

export interface SubscribeOrderMetricsArgs {
  seq: number
  dataReferencePeriodStart: string
  dataReferencePeriodEnd: string
  companyUuid?: string
  candidateItemUuids: string[]
  comparison: ProductComparisonTarget
}

export interface UseCandidateItemsLoaderParams {
  stashUuid: string
  companyUuid?: string
  appliedPeriodRef: MutableRefObject<AppliedCandidateDataReferencePeriod>
  itemsRef: MutableRefObject<CandidateItemSummary[]>
  confirmationOverridesRef: MutableRefObject<CandidateDetailConfirmationOverrideMap>
  orderMetricComparisonTarget: ProductComparisonTarget | null
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
  const metricSkuGroupKeySet: Set<string> = new Set(metricSkuGroupKeys)
  return candidateItems.filter((item: CandidateStashItemSummary) : boolean => metricSkuGroupKeySet.has(item.skuGroupKey))
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
  orderMetricComparisonTarget,
  clearRecommendationItems,
  beginItemLoad,
  isCurrentItemLoad,
  setItems,
  subscribeOrderMetrics,
}: UseCandidateItemsLoaderParams) : { candidateItemsLoading: boolean; candidateItemsLoadError: string | null; loadItems: (nextPeriodStart?: string, nextPeriodEnd?: string, options?: CandidateMetricReloadOptions) => Promise<void>; } {
  const [candidateItemsLoading, setCandidateItemsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [candidateItemsLoadError, setCandidateItemsLoadError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)

  const loadItems: (nextPeriodStart?: string, nextPeriodEnd?: string, options?: CandidateMetricReloadOptions) => Promise<void> = useCallback(async (
    nextPeriodStart: string = appliedPeriodRef.current.start,
    nextPeriodEnd: string = appliedPeriodRef.current.end,
    options: CandidateMetricReloadOptions = {},
  ) : Promise<void> => {
    if (!stashUuid || !nextPeriodStart || !nextPeriodEnd) return
    const seq: number = beginItemLoad()
    setCandidateItemsLoading(true)
    setCandidateItemsLoadError(null)
    try {
      const result: CandidateItemListResult = await getCandidateItemsByStash({
        stashUuid,
        companyUuid,
        dataReferencePeriodStart: nextPeriodStart,
        dataReferencePeriodEnd: nextPeriodEnd,
      })
      if (!isCurrentItemLoad(seq)) return
      clearRecommendationItems()
      const metricCandidateItems: CandidateStashItemSummary[] = selectMetricCandidateItems(result.candidateItems, options.metricSkuGroupKeys)
      const previousItemByUuid: Map<string, CandidateItemSummary> | null = options.preserveExistingMetrics
        ? new Map(itemsRef.current.map((item: CandidateItemSummary) : [string, CandidateItemSummary] => [item.uuid, item]))
        : null
      const metricItemUuidSet: Set<string> = new Set(metricCandidateItems.map((item: CandidateStashItemSummary) : string => item.uuid))
      const nextItems: CandidateItemSummary[] = previousItemByUuid
        ? result.items.map((item: CandidateItemSummary) : CandidateItemSummary => (
            metricItemUuidSet.has(item.uuid) ? item : preserveOrderMetricFields(item, previousItemByUuid.get(item.uuid))
          ))
        : result.items
      const protectedResult: CandidateDetailConfirmationOverrideResult = applyCandidateDetailConfirmationOverrides(nextItems, confirmationOverridesRef.current)
      confirmationOverridesRef.current = protectedResult.overrides
      setItems(protectedResult.items)
      setCandidateItemsLoading(false)
      if (orderMetricComparisonTarget != null) {
        subscribeOrderMetrics({
          seq,
          dataReferencePeriodStart: nextPeriodStart,
          dataReferencePeriodEnd: nextPeriodEnd,
          companyUuid,
          candidateItemUuids: metricCandidateItems.map((item: CandidateStashItemSummary) : string => item.uuid),
          comparison: orderMetricComparisonTarget,
        })
      }
    } catch (err) {
      if (!isCurrentItemLoad(seq)) return
      const message: string = getApiErrorDisplayMessage(err, '후보 상품 목록을 불러오지 못했습니다.')
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
    orderMetricComparisonTarget,
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
