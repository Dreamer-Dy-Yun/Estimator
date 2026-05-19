import { describe, expect, it } from 'vitest'
import type {
  CandidateItemSummary,
  CandidateReferenceItemSummary,
  CandidateStashItemSummary,
} from '../../../api'
import {
  appendRecommendedCandidateItems,
  removeCandidateItemsByUuid,
} from './candidateItemLocalMutationModel'

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

const recommendation = (skuUuid: string): CandidateReferenceItemSummary => ({
  uuid: skuUuid,
  skuGroupKey: skuUuid,
  brand: '추천브랜드',
  code: `code-${skuUuid}`,
  colorCode: '010',
  productName: `추천 ${skuUuid}`,
  insight: {
    competitorChannelLabel: '크림',
    selfQty: 10,
    selfAmount: 1000,
    competitorQty: 20,
    competitorAmount: 2000,
    expectedSalesQty: 30,
    expectedSalesAmount: 3000,
    expectedOpProfit: 400,
    selfOpProfitRatePct: 9,
    rankTone: 'top',
    topPercentThreshold: 10,
    bottomPercentThreshold: 10,
    badges: [{ name: '크림판매', color: '#2dd4bf', tooltip: '테스트' }],
  },
})

const candidateItem = (uuid: string, skuUuid: string): CandidateStashItemSummary => ({
  uuid,
  stashUuid: 'stash-1',
  skuUuid,
  skuGroupKey: skuUuid,
  isLatestLlmComment: false,
  hasSnapshot: false,
  dbCreatedAt: '2026-05-19T01:00:00.000Z',
  dbUpdatedAt: '2026-05-19T01:00:00.000Z',
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

describe('appendRecommendedCandidateItems', () => {
  it('prepends newly created recommendation rows and marks order metrics as loading', () => {
    const items = [item('a')]
    const next = appendRecommendedCandidateItems(
      items,
      [candidateItem('new-1', 'sku-new')],
      [recommendation('sku-new')],
    )

    expect(next.map((row) => row.uuid)).toEqual(['new-1', 'a'])
    expect(next[0]).toMatchObject({
      skuUuid: 'sku-new',
      brand: '추천브랜드',
      productName: '추천 sku-new',
      orderMetricStatus: 'loading',
      qty: 0,
      expectedOrderAmount: 0,
      insightStatus: 'loaded',
      isDetailConfirmed: false,
    })
  })

  it('keeps reference when the backend returned no newly created item', () => {
    const items = [item('a')]

    expect(appendRecommendedCandidateItems(items, [], [recommendation('sku-new')])).toBe(items)
  })

  it('does not duplicate an already visible sku item', () => {
    const items = [item('a')]

    expect(appendRecommendedCandidateItems(
      items,
      [candidateItem('duplicate', items[0].skuUuid)],
      [recommendation(items[0].skuUuid)],
    )).toBe(items)
  })

  it('throws when the created candidate item has no matching recommendation row', () => {
    expect(() => appendRecommendedCandidateItems(
      [],
      [candidateItem('new-1', 'sku-missing')],
      [],
    )).toThrow('추천 후보 응답과 신규 후보 아이템을 매칭할 수 없습니다')
  })
})
