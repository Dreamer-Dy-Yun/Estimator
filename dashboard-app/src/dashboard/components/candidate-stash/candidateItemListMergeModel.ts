import type {
  CandidateItemSummary,
  CandidateStashItemSummary,
} from '../../../api'

export type CandidateMetricReloadOptions = {
  metricSkuGroupKeys?: readonly string[]
  preserveExistingMetrics?: boolean
}

function preserveOrderMetricFields(
  next: CandidateItemSummary,
  previous: CandidateItemSummary | undefined,
): CandidateItemSummary {
  if (!previous) return next
  return {
    ...next,
    orderMetricStatus: previous.orderMetricStatus,
    qty: previous.qty,
    expectedOrderAmount: previous.expectedOrderAmount,
    expectedSalesAmount: previous.expectedSalesAmount,
    expectedOpProfit: previous.expectedOpProfit,
    insight: previous.insight,
    orderExport: previous.orderExport,
  }
}

export function selectMetricCandidateItems(
  candidateItems: CandidateStashItemSummary[],
  metricSkuGroupKeys: readonly string[] | undefined,
): CandidateStashItemSummary[] {
  if (metricSkuGroupKeys == null) return candidateItems
  const metricSkuGroupKeySet = new Set(metricSkuGroupKeys)
  return candidateItems.filter((item) => metricSkuGroupKeySet.has(item.skuGroupKey))
}

export function mergeCandidateItemsWithPreservedMetrics(
  nextItems: CandidateItemSummary[],
  metricCandidateItems: CandidateStashItemSummary[],
  previousItems: CandidateItemSummary[],
  preserveExistingMetrics: boolean | undefined,
): CandidateItemSummary[] {
  if (!preserveExistingMetrics) return nextItems
  const metricItemUuidSet = new Set(metricCandidateItems.map((item) => item.uuid))
  const previousItemByUuid = new Map(previousItems.map((item) => [item.uuid, item]))
  return nextItems.map((item) => (
    metricItemUuidSet.has(item.uuid) ? item : preserveOrderMetricFields(item, previousItemByUuid.get(item.uuid))
  ))
}
