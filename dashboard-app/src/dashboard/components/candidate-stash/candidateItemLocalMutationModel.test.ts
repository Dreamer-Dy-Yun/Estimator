import { describe, expect, it } from 'vitest'
import type { CandidateItemSummary } from '../../../api'
import { removeCandidateItemsByUuid } from './candidateItemLocalMutationModel'

const item = (uuid: string): CandidateItemSummary => ({
  uuid,
  stashUuid: 'stash-1',
  skuUuid: `sku-${uuid}`,
  skuGroupKey: `code-${uuid}:010`,
  brand: '테스트',
  code: `code-${uuid}`,
  colorCode: '010',
  productName: `상품 ${uuid}`,
  insightStatus: 'loaded',
  insight: {
    competitorChannelLabel: '크림',
    selfQty: 0,
    selfAmount: 0,
    competitorQty: 0,
    competitorAmount: 0,
    expectedSalesQty: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    selfOpProfitRatePct: null,
    rankTone: 'neutral',
    topPercentThreshold: 10,
    bottomPercentThreshold: 10,
    badges: [],
  },
  orderMetricStatus: 'loaded',
  qty: 0,
  expectedOrderAmount: 0,
  expectedSalesAmount: 0,
  expectedOpProfit: 0,
  orderExport: null,
  isDetailConfirmed: false,
  isLatestLlmComment: false,
  dbCreatedAt: '2026-05-19T00:00:00.000Z',
  dbUpdatedAt: '2026-05-19T00:00:00.000Z',
})

describe('removeCandidateItemsByUuid', () => {
  it('removes only matching candidate items', () => {
    const items = [item('a'), item('b'), item('c')]

    expect(removeCandidateItemsByUuid(items, ['b']).map((row) => row.uuid)).toEqual(['a', 'c'])
  })

  it('keeps reference when no item is removed', () => {
    const items = [item('a')]

    expect(removeCandidateItemsByUuid(items, ['x'])).toBe(items)
  })
})
