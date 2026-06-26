import { describe, expect, it } from 'vitest'
import type { CandidateItemSummary } from '../../../api'
import { resetCandidateOrderMetricsLoadingByUuid } from './candidateItemMetricModel'

function candidateItem(uuid: string): CandidateItemSummary {
  return {
    uuid,
    stashUuid: 'stash-1',
    skuUuid: `sku-${uuid}`,
    skuGroupKey: `sku-group-${uuid}`,
    brand: 'Brand',
    code: `CODE-${uuid}`,
    productName: `Product ${uuid}`,
    colorCode: 'BLACK',
    thumbnailUrl: null,
    orderMetricStatus: 'loaded',
    qty: 10,
    expectedOrderAmount: 1000,
    expectedSalesAmount: 2000,
    expectedOpProfit: 300,
    insightStatus: 'loaded',
    insight: {
      competitorSalesSourceLabel: 'Cream',
      competitorQty: null,
      competitorAmount: null,
      selfQty: null,
      selfAmount: null,
      expectedSalesQty: 10,
      expectedSalesAmount: 2000,
      expectedOpProfit: 300,
      selfOpProfitRatePct: null,
      rankTone: 'neutral',
      topPercentThreshold: 20,
      bottomPercentThreshold: 20,
      badges: [],
    },
    isLatestLlmComment: false,
    hasConfirmedOrderSnapshot: false,
    orderExport: {
      comparisonSubjectLabel: 'Cream',
      selfQty: null,
      competitorQty: null,
      expectedSalesQty: 10,
      expectedOrderAmount: 1000,
      avgCost: 100,
      avgPrice: 200,
      feeRatePct: 10,
      opMarginRatePct: 15,
      inboundExpectedDate: '2026-06-01',
      inboundRounds: [{ round: 1, inboundDate: '2026-06-01', sizeOrderQty: [{ size: 'M', orderQty: 10 }] }],
      sizeOrderQty: [{ size: 'M', orderQty: 10 }],
    },
    dbCreatedAt: '2026-05-01T00:00:00.000Z',
    dbUpdatedAt: '2026-05-01T00:00:00.000Z',
  }
}

describe('resetCandidateOrderMetricsLoadingByUuid', () : void => {
  it('clears stale order export only for targeted items', () : void => {
    const item1: CandidateItemSummary = candidateItem('item-1')
    const item2: CandidateItemSummary = candidateItem('item-2')

    const result: CandidateItemSummary[] = resetCandidateOrderMetricsLoadingByUuid([item1, item2], ['item-1'])

    expect(result[0]).toMatchObject({
      orderMetricStatus: 'loading',
      qty: 0,
      expectedOrderAmount: 0,
      expectedSalesAmount: 0,
      expectedOpProfit: 0,
      orderExport: null,
    })
    expect(result[0]?.insight.expectedSalesQty).toBe(0)
    expect(result[1]).toBe(item2)
  })

  it('keeps the same array when no target item exists', () : void => {
    const items: CandidateItemSummary[] = [candidateItem('item-1')]

    expect(resetCandidateOrderMetricsLoadingByUuid(items, ['missing'])).toBe(items)
  })
})
