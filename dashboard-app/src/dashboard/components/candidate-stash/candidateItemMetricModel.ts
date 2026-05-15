import type {
  CandidateItemSummary,
  CandidateOrderMetric,
  CandidateReferenceItemSummary,
  CandidateStashItemSummary,
} from '../../../api'

export function applyOrderMetricToCandidateItem(
  item: CandidateItemSummary,
  metric: CandidateOrderMetric,
): CandidateItemSummary {
  return {
    ...item,
    orderMetricStatus: 'loaded',
    qty: metric.qty,
    expectedOrderAmount: metric.expectedOrderAmount,
    expectedSalesAmount: metric.expectedSalesAmount,
    expectedOpProfit: metric.expectedOpProfit,
    insight: {
      ...item.insight,
      expectedSalesQty: metric.qty,
      expectedSalesAmount: metric.expectedSalesAmount,
      expectedOpProfit: metric.expectedOpProfit,
    },
    orderExport: metric.orderExport,
  }
}

export function markCandidateItemOrderMetricFailed(item: CandidateItemSummary): CandidateItemSummary {
  return {
    ...item,
    orderMetricStatus: 'failed',
  }
}

export function deriveCandidateRecommendations(
  referenceItems: CandidateReferenceItemSummary[],
  candidateItems: CandidateStashItemSummary[],
): CandidateReferenceItemSummary[] {
  const candidateSkuUuidSet = new Set(candidateItems.map((item) => item.skuUuid))
  return referenceItems.filter((item) => !candidateSkuUuidSet.has(item.uuid))
}
