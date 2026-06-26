import type { CandidateItemInsightSummary } from '../../../api/types/candidate'
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

export function resetCandidateItemOrderMetricLoading(item: CandidateItemSummary): CandidateItemSummary {
  return {
    ...item,
    orderMetricStatus: 'loading',
    qty: 0,
    expectedOrderAmount: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    insight: {
      ...item.insight,
      expectedSalesQty: 0,
      expectedSalesAmount: 0,
      expectedOpProfit: 0,
    },
    orderExport: null,
  }
}

export function resetCandidateOrderMetricsLoadingByUuid(
  items: CandidateItemSummary[],
  itemUuids: readonly string[],
): CandidateItemSummary[] {
  if (!items.length || !itemUuids.length) return items
  const itemUuidSet: Set<string> = new Set(itemUuids)
  let changed: boolean = false
  const nextItems: CandidateItemSummary[] = items.map((item: CandidateItemSummary): CandidateItemSummary => {
    if (!itemUuidSet.has(item.uuid)) return item
    changed = true
    return resetCandidateItemOrderMetricLoading(item)
  })
  return changed ? nextItems : items
}

function clearCandidateItemOrderMetricAsFailed(item: CandidateItemSummary): CandidateItemSummary {
  return {
    ...item,
    orderMetricStatus: 'failed',
    qty: 0,
    expectedOrderAmount: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    insight: {
      ...item.insight,
      expectedSalesQty: 0,
      expectedSalesAmount: 0,
      expectedOpProfit: 0,
    },
    orderExport: null,
  }
}

export function markComparisonUnavailableCandidateOrderMetricsFailed(items: CandidateItemSummary[]): CandidateItemSummary[] {
  if (!items.length) return items
  let changed: boolean = false
  const failedItems: CandidateItemSummary[] = items.map((item: CandidateItemSummary) : CandidateItemSummary => {
    const targetUnavailableAffected: boolean = !item.hasConfirmedOrderSnapshot
      && (item.orderMetricStatus === 'loading' || item.orderMetricStatus === 'loaded')
    if (!targetUnavailableAffected) return item
    changed = true
    return clearCandidateItemOrderMetricAsFailed(item)
  })
  return changed ? failedItems : items
}

export function markCandidateItemInsightsFailed(items: CandidateItemSummary[]): CandidateItemSummary[] {
  if (!items.length) return items
  let changed: boolean = false
  const failedItems: CandidateItemSummary[] = items.map((item: CandidateItemSummary) : CandidateItemSummary => {
    if (item.insightStatus !== 'loading') return item
    changed = true
    return {
      ...item,
      insightStatus: 'failed' as const,
    }
  })
  return changed ? failedItems : items
}

export function applyRecommendationInsightsToCandidateItems(
  items: CandidateItemSummary[],
  recommendations: CandidateReferenceItemSummary[],
): CandidateItemSummary[] {
  if (!items.length) return items
  if (!recommendations.length) {
    let changed: boolean = false
    const loadedItems: CandidateItemSummary[] = items.map((item: CandidateItemSummary) : CandidateItemSummary => {
      if (item.insightStatus === 'loaded') return item
      changed = true
      return {
        ...item,
        insightStatus: 'loaded' as const,
      }
    })
    return changed ? loadedItems : items
  }
  const insightBySkuUuid: Map<string, CandidateItemInsightSummary> = new Map(recommendations.map((row: CandidateReferenceItemSummary) : [string, CandidateItemInsightSummary] => [row.uuid, row.insight]))
  let changed: boolean = false
  const loadedItems: CandidateItemSummary[] = items.map((item: CandidateItemSummary) : CandidateItemSummary => {
    const insight: CandidateItemInsightSummary | undefined = insightBySkuUuid.get(item.skuUuid)
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
