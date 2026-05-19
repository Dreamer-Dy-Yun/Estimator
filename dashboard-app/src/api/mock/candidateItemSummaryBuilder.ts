import type {
  CandidateBadge,
  CandidateItemSummary,
  CandidateOrderMetric,
  CandidateReferenceItemSummary,
  CandidateStashItemSummary,
} from '../types'
import type { CandidateItemInsightSummary } from '../types/candidate'
import type { CandidateItemRecord } from './records'
import { competitorBySkuGroupKey, secondaryCompetitorChannels, selfBySkuGroupKey } from './salesTables'
import { estimatePeriodWeight, productPrimaryBySkuGroupKey, skuMetadataBySkuGroupKey } from './productCatalog'

export type CandidateDataReferencePeriod = {
  start: string
  end: string
}

const INNER_ORDER_TOP_PERCENT_THRESHOLD = 10
const INNER_ORDER_BOTTOM_PERCENT_THRESHOLD = 10

const CANDIDATE_BADGES_BY_NAME: Record<string, CandidateBadge> = {
  크림판매: {
    name: '크림판매',
    color: '#0f766e',
    tooltip: `조회 기간 내 크림 경쟁사 판매수량 상위 ${INNER_ORDER_TOP_PERCENT_THRESHOLD}% 이내 후보입니다.`,
  },
  자사이익: {
    name: '자사이익',
    color: '#be123c',
    tooltip: '조회 기간 내 자사 영업이익률이 9% 이상인 후보입니다.',
  },
  자사판매: {
    name: '자사판매',
    color: '#c2410c',
    tooltip: `조회 기간 내 자사 판매수량 상위 ${INNER_ORDER_TOP_PERCENT_THRESHOLD}% 이내 후보입니다.`,
  },
}

function inTopPercent(rankPercentile: number | null | undefined) {
  return typeof rankPercentile === 'number' && rankPercentile >= 100 - INNER_ORDER_TOP_PERCENT_THRESHOLD
}

function inBottomPercent(rankPercentile: number | null | undefined) {
  return typeof rankPercentile === 'number' && rankPercentile <= INNER_ORDER_BOTTOM_PERCENT_THRESHOLD
}

function toCandidateBadges(names: string[]): CandidateBadge[] {
  return names.flatMap((name) => {
    const badge = CANDIDATE_BADGES_BY_NAME[name]
    return badge ? [badge] : []
  })
}

function getProductPrimary(skuGroupKey: string) {
  const primary = productPrimaryBySkuGroupKey[skuGroupKey]
  if (!primary) throw new Error(`Unknown mock SKU group: ${skuGroupKey}`)
  return primary
}

function getSkuMetadata(skuGroupKey: string) {
  const metadata = skuMetadataBySkuGroupKey[skuGroupKey]
  if (!metadata) throw new Error(`Unknown mock SKU metadata: ${skuGroupKey}`)
  return metadata
}

function getPrimaryCompetitorChannelLabel() {
  const channel = secondaryCompetitorChannels[0]
  if (!channel) throw new Error('Missing mock competitor channel master')
  return channel.label
}

function buildCandidateItemInsight(
  skuGroupKey: string,
  expectedSalesQty: number,
  expectedSalesAmount: number,
  expectedOpProfit: number,
  dataReferencePeriod?: CandidateDataReferencePeriod,
): CandidateItemInsightSummary {
  const competitor = competitorBySkuGroupKey[skuGroupKey]
  const self = selfBySkuGroupKey[skuGroupKey]
  const channelLabel = getPrimaryCompetitorChannelLabel()
  const badgeNameList: string[] = []
  const periodWeight = dataReferencePeriod
    ? estimatePeriodWeight(dataReferencePeriod.start, dataReferencePeriod.end)
    : 1
  const weightedSalesValue = (value: number | null | undefined) =>
    typeof value === 'number' ? Math.max(0, Math.round(value * periodWeight)) : null

  if (inTopPercent(competitor?.rankPercentile)) badgeNameList.push(`${channelLabel}판매`)
  if (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) badgeNameList.push('자사이익')
  if (inTopPercent(self?.rankPercentile)) badgeNameList.push('자사판매')

  const top = badgeNameList.length > 0
  const bottom = !top && (inBottomPercent(competitor?.rankPercentile) || inBottomPercent(self?.rankPercentile))

  return {
    competitorChannelLabel: channelLabel,
    competitorQty: weightedSalesValue(competitor?.competitorQty),
    competitorAmount: weightedSalesValue(competitor?.competitorAmount),
    selfQty: weightedSalesValue(self?.qty),
    selfAmount: weightedSalesValue(self?.amount),
    expectedSalesQty,
    expectedSalesAmount,
    expectedOpProfit,
    selfOpProfitRatePct: self?.opMarginRate ?? null,
    rankTone: top ? 'top' as const : bottom ? 'bottom' as const : 'neutral' as const,
    topPercentThreshold: INNER_ORDER_TOP_PERCENT_THRESHOLD,
    bottomPercentThreshold: INNER_ORDER_BOTTOM_PERCENT_THRESHOLD,
    badges: toCandidateBadges(badgeNameList),
  }
}

function hasCandidateBadgeSource(skuGroupKey: string) {
  const competitor = competitorBySkuGroupKey[skuGroupKey]
  const self = selfBySkuGroupKey[skuGroupKey]
  return (
    inTopPercent(competitor?.rankPercentile) ||
    (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) ||
    inTopPercent(self?.rankPercentile)
  )
}

function buildCandidateItemPeriodSalesInsight(
  skuGroupKey: string,
  dataReferencePeriod?: CandidateDataReferencePeriod,
): CandidateItemInsightSummary {
  const insight = buildCandidateItemInsight(skuGroupKey, 0, 0, 0, dataReferencePeriod)
  return {
    ...insight,
    rankTone: 'neutral',
    badges: [],
  }
}

function buildOrderMetric(
  row: CandidateItemRecord,
  dataReferencePeriod?: CandidateDataReferencePeriod,
): CandidateOrderMetric {
  const skuGroupKey = row.skuGroupKey
  const periodWeight = dataReferencePeriod
    ? estimatePeriodWeight(dataReferencePeriod.start, dataReferencePeriod.end)
    : 1
  const primary = getProductPrimary(skuGroupKey)
  const self = selfBySkuGroupKey[skuGroupKey]
  const avgPrice = Math.max(0, Math.round(self?.avgPrice ?? primary.price))
  const avgCost = Math.max(0, Math.round(self?.avgCost ?? primary.price * 0.78))
  const feeRatePct = Math.max(0, Math.round((self?.feeRate ?? 13) * 10) / 10)
  const baseQty = Math.max(0, Math.round((self?.qty ?? primary.qty) * 0.58))
  const qty = Math.max(0, Math.round(baseQty * periodWeight))
  const expectedOrderAmount = qty * avgCost
  const expectedSalesAmount = qty * avgPrice
  const expectedOpProfit = qty * Math.round(avgPrice - avgCost - (avgPrice * feeRatePct) / 100)
  const opMarginRatePct = expectedSalesAmount > 0 ? (expectedOpProfit / expectedSalesAmount) * 100 : null
  const sizeMix = primary.sizeMix
  const sizeRatioSum = sizeMix.reduce((acc, sizeRow) => acc + Math.max(0, sizeRow.ratio), 0)
  const insight = buildCandidateItemInsight(
    skuGroupKey,
    qty,
    expectedSalesAmount,
    expectedOpProfit,
    dataReferencePeriod,
  )

  return {
    itemUuid: row.uuid,
    skuUuid: row.skuUuid,
    qty,
    expectedOrderAmount,
    expectedSalesAmount,
    expectedOpProfit,
    orderExport: {
      competitorChannelLabel: insight.competitorChannelLabel,
      selfQty: insight.selfQty,
      competitorQty: insight.competitorQty,
      expectedSalesQty: qty,
      expectedOrderAmount,
      avgCost,
      avgPrice,
      feeRatePct,
      opMarginRatePct,
      inboundExpectedDate: row.details?.drawer2.stockInputs.leadTimeEndDate ?? null,
      sizeOrderQty: sizeRatioSum > 0
        ? sizeMix.map((sizeRow) => ({
            size: sizeRow.size,
            orderQty: Math.max(0, Math.round(qty * (Math.max(0, sizeRow.ratio) / sizeRatioSum))),
          }))
        : [],
    },
  }
}

export function buildCandidateReferenceItems(
  skuGroupKeys: string[],
  dataReferencePeriod?: CandidateDataReferencePeriod,
): CandidateReferenceItemSummary[] {
  return skuGroupKeys.map((skuGroupKey) => buildCandidateReferenceItem(skuGroupKey, dataReferencePeriod))
}

export function buildCandidateReferenceItem(
  skuGroupKey: string,
  dataReferencePeriod?: CandidateDataReferencePeriod,
): CandidateReferenceItemSummary {
  const metadata = getSkuMetadata(skuGroupKey)
  return {
    uuid: skuGroupKey,
    skuGroupKey,
    brand: metadata.brand,
    code: metadata.code,
    productName: metadata.productName,
    colorCode: metadata.colorCode,
    insight: buildCandidateItemInsight(skuGroupKey, 0, 0, 0, dataReferencePeriod),
  }
}

export function hasCandidateRecommendationBadge(skuGroupKey: string): boolean {
  return hasCandidateBadgeSource(skuGroupKey)
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
): CandidateOrderMetric {
  return buildOrderMetric(row, dataReferencePeriod)
}

export function buildCandidateItemSummaries(
  records: CandidateItemRecord[],
  dataReferencePeriod?: CandidateDataReferencePeriod,
  options: { includeOrderMetrics?: boolean; includeRecommendationInsights?: boolean } = {},
): CandidateItemSummary[] {
  const includeOrderMetrics = options.includeOrderMetrics ?? true
  const includeRecommendationInsights = options.includeRecommendationInsights ?? true

  return records
    .map((row) => {
      const skuGroupKey = row.skuGroupKey
      const metadata = getSkuMetadata(skuGroupKey)
      const baseInsight = includeRecommendationInsights
        ? buildCandidateItemInsight(skuGroupKey, 0, 0, 0, dataReferencePeriod)
        : buildCandidateItemPeriodSalesInsight(skuGroupKey, dataReferencePeriod)
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
      return applyCandidateOrderMetric(baseItem, buildOrderMetric(row, dataReferencePeriod))
    })
    .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
}
