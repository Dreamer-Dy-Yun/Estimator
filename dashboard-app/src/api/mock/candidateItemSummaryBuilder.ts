import type {
  CandidateItemSummary,
  CandidateOrderMetric,
  CandidateReferenceItemSummary,
  CandidateStashItemSummary,
} from '../types'
import type { CandidateItemRecord } from './records'
import type { CandidateDataReferencePeriod } from './candidateItemSummaryTypes'
import {
  buildCandidateItemInsight,
  buildCandidateItemPeriodSalesInsight,
  hasCandidateBadgeSource,
} from './candidateItemInsights'
import { buildCandidateItemOrderMetric } from './candidateItemOrderMetrics'
import { skuMetadataBySkuGroupKey } from './productCatalog'

export type { CandidateDataReferencePeriod } from './candidateItemSummaryTypes'

function getSkuMetadata(skuGroupKey: string) {
  const metadata = skuMetadataBySkuGroupKey[skuGroupKey]
  if (!metadata) throw new Error(`Unknown mock SKU metadata: ${skuGroupKey}`)
  return metadata
}

export function buildCandidateReferenceItems(
  skuGroupKeys: string[],
  dataReferencePeriod?: CandidateDataReferencePeriod,
  companyUuid?: string,
): CandidateReferenceItemSummary[] {
  return skuGroupKeys.map((skuGroupKey) => buildCandidateReferenceItem(skuGroupKey, dataReferencePeriod, companyUuid))
}

export function buildCandidateReferenceItem(
  skuGroupKey: string,
  dataReferencePeriod?: CandidateDataReferencePeriod,
  companyUuid?: string,
): CandidateReferenceItemSummary {
  const metadata = getSkuMetadata(skuGroupKey)
  return {
    uuid: skuGroupKey,
    skuGroupKey,
    brand: metadata.brand,
    code: metadata.code,
    productName: metadata.productName,
    colorCode: metadata.colorCode,
    insight: buildCandidateItemInsight(skuGroupKey, 0, 0, 0, dataReferencePeriod, companyUuid),
  }
}

export function hasCandidateRecommendationBadge(skuGroupKey: string, companyUuid?: string): boolean {
  return hasCandidateBadgeSource(skuGroupKey, companyUuid)
}

export function buildCandidateStashItems(records: CandidateItemRecord[]): CandidateStashItemSummary[] {
  return records.map((row) => ({
    uuid: row.uuid,
    stashUuid: row.stashUuid,
    skuUuid: row.skuUuid,
    skuGroupKey: row.skuGroupKey,
    isLatestLlmComment: row.isLatestLlmComment,
    hasSnapshot: row.details != null,
    snapshotUpdatedAt: row.details ? row.dbUpdatedAt ?? row.dbCreatedAt : undefined,
    dbCreatedAt: row.dbCreatedAt,
    dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
  }))
}

export function applyCandidateOrderMetric(
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

export function markCandidateOrderMetricFailed(item: CandidateItemSummary): CandidateItemSummary {
  return {
    ...item,
    orderMetricStatus: 'failed',
  }
}

export function buildCandidateOrderMetric(
  row: CandidateItemRecord,
  dataReferencePeriod?: CandidateDataReferencePeriod,
  companyUuid?: string,
): CandidateOrderMetric {
  return buildCandidateItemOrderMetric(row, dataReferencePeriod, companyUuid)
}

export function buildCandidateItemSummaries(
  records: CandidateItemRecord[],
  dataReferencePeriod?: CandidateDataReferencePeriod,
  options: { includeOrderMetrics?: boolean; includeRecommendationInsights?: boolean; companyUuid?: string } = {},
): CandidateItemSummary[] {
  const includeOrderMetrics = options.includeOrderMetrics ?? true
  const includeRecommendationInsights = options.includeRecommendationInsights ?? true

  return records
    .map((row) => {
      const skuGroupKey = row.skuGroupKey
      const metadata = getSkuMetadata(skuGroupKey)
      const baseInsight = includeRecommendationInsights
        ? buildCandidateItemInsight(skuGroupKey, 0, 0, 0, dataReferencePeriod, options.companyUuid)
        : buildCandidateItemPeriodSalesInsight(skuGroupKey, dataReferencePeriod, options.companyUuid)
      const baseItem: CandidateItemSummary = {
        uuid: row.uuid,
        stashUuid: row.stashUuid,
        skuUuid: row.skuUuid,
        skuGroupKey,
        brand: metadata.brand,
        code: metadata.code,
        productName: metadata.productName,
        colorCode: metadata.colorCode,
        orderMetricStatus: includeOrderMetrics ? 'loaded' : 'loading',
        qty: 0,
        expectedOrderAmount: 0,
        expectedSalesAmount: 0,
        expectedOpProfit: 0,
        insightStatus: includeRecommendationInsights ? 'loaded' : 'loading',
        insight: baseInsight,
        isLatestLlmComment: row.isLatestLlmComment,
        isDetailConfirmed: row.details != null,
        orderExport: null,
        dbCreatedAt: row.dbCreatedAt,
        dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
      }
      if (!includeOrderMetrics) return baseItem
      return applyCandidateOrderMetric(baseItem, buildCandidateItemOrderMetric(
        row,
        dataReferencePeriod,
        options.companyUuid,
      ))
    })
    .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
}
