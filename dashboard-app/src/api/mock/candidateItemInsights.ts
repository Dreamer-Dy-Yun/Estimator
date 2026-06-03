import type { SecondaryCompetitorChannel } from '..'
import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { CandidateItemInsightSummary } from '../types/candidate'
import {
  buildCandidateBadges,
  INNER_ORDER_BOTTOM_PERCENT_THRESHOLD,
  INNER_ORDER_TOP_PERCENT_THRESHOLD,
  isBottomCandidatePercent,
  isTopCandidatePercent,
} from './candidateInsightBadgeModel'
import type { CandidateDataReferencePeriod } from './candidateItemSummaryTypes'
import { estimatePeriodWeight } from './productCatalog'
import { scopeMockCompetitorSalesRow, scopeMockSelfSalesRow } from './mockCompanyScope'
import { competitorBySkuGroupKey, secondaryCompetitorChannels, selfBySkuGroupKey } from './salesTables'

function getPrimaryCompetitorChannelLabel() : string {
  const channel: SecondaryCompetitorChannel = secondaryCompetitorChannels[0]
  if (!channel) throw new Error('Missing mock competitor channel master')
  return channel.label
}

function getPeriodWeight(dataReferencePeriod?: CandidateDataReferencePeriod) : number {
  return dataReferencePeriod
    ? estimatePeriodWeight(dataReferencePeriod.start, dataReferencePeriod.end)
    : 1
}

function weightedSalesValue(value: number | null | undefined, periodWeight: number) : number | null {
  return typeof value === 'number' ? Math.max(0, Math.round(value * periodWeight)) : null
}

export function buildCandidateItemInsight(
  skuGroupKey: string,
  expectedSalesQty: number,
  expectedSalesAmount: number,
  expectedOpProfit: number,
  dataReferencePeriod?: CandidateDataReferencePeriod,
  companyUuid?: string,
): CandidateItemInsightSummary {
  const competitorSource: CompetitorSalesRow = competitorBySkuGroupKey[skuGroupKey]
  const selfSource: SelfSalesRow = selfBySkuGroupKey[skuGroupKey]
  const competitor: CompetitorSalesRow | null = competitorSource ? scopeMockCompetitorSalesRow(competitorSource, { companyUuid }) : null
  const self: SelfSalesRow | null = selfSource ? scopeMockSelfSalesRow(selfSource, { companyUuid }) : null
  const channelLabel: string = getPrimaryCompetitorChannelLabel()
  const badgeNameList: string[] = []
  const periodWeight: number = getPeriodWeight(dataReferencePeriod)

  if (isTopCandidatePercent(competitor?.rankPercentile)) badgeNameList.push(`${channelLabel}판매`)
  if (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) badgeNameList.push('자사이익')
  if (isTopCandidatePercent(self?.rankPercentile)) badgeNameList.push('자사판매')

  const top: boolean = badgeNameList.length > 0
  const bottom: boolean = !top && (
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
  companyUuid?: string,
): CandidateItemInsightSummary {
  const insight: CandidateItemInsightSummary = buildCandidateItemInsight(skuGroupKey, 0, 0, 0, dataReferencePeriod, companyUuid)
  return {
    ...insight,
    rankTone: 'neutral',
    badges: [],
  }
}

export function hasCandidateBadgeSource(skuGroupKey: string, companyUuid?: string) : boolean {
  const competitorSource: CompetitorSalesRow = competitorBySkuGroupKey[skuGroupKey]
  const selfSource: SelfSalesRow = selfBySkuGroupKey[skuGroupKey]
  const competitor: CompetitorSalesRow | null = competitorSource ? scopeMockCompetitorSalesRow(competitorSource, { companyUuid }) : null
  const self: SelfSalesRow | null = selfSource ? scopeMockSelfSalesRow(selfSource, { companyUuid }) : null
  return (
    isTopCandidatePercent(competitor?.rankPercentile) ||
    (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) ||
    isTopCandidatePercent(self?.rankPercentile)
  )
}
