import type {
  CandidateItemSummary,
  CandidateOrderMetric,
  CandidateReferenceItemSummary,
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

export function applyRecommendationInsightsToCandidateItems(
  items: CandidateItemSummary[],
  recommendations: CandidateReferenceItemSummary[],
): CandidateItemSummary[] {
  if (!items.length) return items
  if (!recommendations.length) {
    let changed = false
    const loadedItems = items.map((item) => {
      if (item.insightStatus === 'loaded') return item
      changed = true
      return {
        ...item,
        insightStatus: 'loaded' as const,
      }
    })
    return changed ? loadedItems : items
  }
  const insightBySkuUuid = new Map(recommendations.map((row) => [row.uuid, row.insight]))
  let changed = false
  const loadedItems = items.map((item) => {
    const insight = insightBySkuUuid.get(item.skuUuid)
    if (!insight) {
      if (item.insightStatus === 'loaded') return item
      changed = true
      return {
        ...item,
        insightStatus: 'loaded' as const,
      }
    }
    changed = true
    return {
      ...item,
      insightStatus: 'loaded' as const,
      insight: {
        ...insight,
        expectedSalesQty: item.insight.expectedSalesQty,
        expectedSalesAmount: item.insight.expectedSalesAmount,
        expectedOpProfit: item.insight.expectedOpProfit,
      },
    }
  })
  return changed ? loadedItems : items
}
