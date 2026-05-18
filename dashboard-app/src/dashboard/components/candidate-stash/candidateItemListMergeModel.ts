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
    insightStatus: previous.insightStatus,
    insight: previous.insight,
    orderExport: previous.orderExport,
  }
}

export function selectMetricCandidateItems(
  candidateItems: CandidateStashItemSummary[],
  metricSkuGroupKeys: readonly string[] | undefined,
): CandidateStashItemSummary[] {
  if (metricSkuGroupKeys == null) return candidateItems
  if (metricSkuGroupKeys.length === 0) return []
  if (metricSkuGroupKeys.length === 1) {
    const [metricSkuGroupKey] = metricSkuGroupKeys
    return candidateItems.filter((item) => item.skuGroupKey === metricSkuGroupKey)
  }
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
  if (!previousItems.length) return nextItems
  const metricItemUuidSet = new Set(metricCandidateItems.map((item) => item.uuid))
  const previousItemByUuid = new Map(previousItems.map((item) => [item.uuid, item]))
  let changed = false
  const mergedItems = nextItems.map((item) => {
    if (metricItemUuidSet.has(item.uuid)) return item
    const mergedItem = preserveOrderMetricFields(item, previousItemByUuid.get(item.uuid))
    if (mergedItem !== item) changed = true
    return mergedItem
  })
  return changed ? mergedItems : nextItems
}
