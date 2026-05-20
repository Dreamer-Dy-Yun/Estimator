import type { CandidateItemInsightSummary } from '../types/candidate'
import {
  buildCandidateBadges,
  INNER_ORDER_BOTTOM_PERCENT_THRESHOLD,
  INNER_ORDER_TOP_PERCENT_THRESHOLD,
  isBottomCandidatePercent,
  isTopCandidatePercent,
} from './candidateInsightBadgeModel'
import type { CandidateDataReferencePeriod } from './candidateItemSummaryBuilder'
import { estimatePeriodWeight } from './productCatalog'
import { competitorBySkuGroupKey, secondaryCompetitorChannels, selfBySkuGroupKey } from './salesTables'

function getPrimaryCompetitorChannelLabel() {
  const channel = secondaryCompetitorChannels[0]
  if (!channel) throw new Error('Missing mock competitor channel master')
  return channel.label
}

function getPeriodWeight(dataReferencePeriod?: CandidateDataReferencePeriod) {
  return dataReferencePeriod
    ? estimatePeriodWeight(dataReferencePeriod.start, dataReferencePeriod.end)
    : 1
}

function weightedSalesValue(value: number | null | undefined, periodWeight: number) {
  return typeof value === 'number' ? Math.max(0, Math.round(value * periodWeight)) : null
}

export function buildCandidateItemInsight(
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
  const periodWeight = getPeriodWeight(dataReferencePeriod)

  if (isTopCandidatePercent(competitor?.rankPercentile)) badgeNameList.push(`${channelLabel}판매`)
  if (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) badgeNameList.push('자사이익')
  if (isTopCandidatePercent(self?.rankPercentile)) badgeNameList.push('자사판매')

  const top = badgeNameList.length > 0
  const bottom = !top && (
    isBottomCandidatePercent(competitor?.rankPercentile) || isBottomCandidatePercent(self?.rankPercentile)
  )

  return {
    competitorChannelLabel: channelLabel,
    competitorQty: weightedSalesValue(competitor?.competitorQty, periodWeight),
    competitorAmount: weightedSalesValue(competitor?.competitorAmount, periodWeight),
    selfQty: weightedSalesValue(self?.qty, periodWeight),
    selfAmount: weightedSalesValue(self?.amount, periodWeight),
    expectedSalesQty,
    expectedSalesAmount,
    expectedOpProfit,
    selfOpProfitRatePct: self?.opMarginRate ?? null,
    rankTone: top ? 'top' as const : bottom ? 'bottom' as const : 'neutral' as const,
    topPercentThreshold: INNER_ORDER_TOP_PERCENT_THRESHOLD,
    bottomPercentThreshold: INNER_ORDER_BOTTOM_PERCENT_THRESHOLD,
    badges: buildCandidateBadges(badgeNameList),
  }
}

export function buildCandidateItemPeriodSalesInsight(
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

export function hasCandidateBadgeSource(skuGroupKey: string) {
  const competitor = competitorBySkuGroupKey[skuGroupKey]
  const self = selfBySkuGroupKey[skuGroupKey]
  return (
    isTopCandidatePercent(competitor?.rankPercentile) ||
    (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) ||
    isTopCandidatePercent(self?.rankPercentile)
  )
}
