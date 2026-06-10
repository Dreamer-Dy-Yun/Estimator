import type { CandidateItemInsightSummary } from '../../../api/types/candidate'
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

const item: (uuid: string) => CandidateItemSummary = (uuid: string): CandidateItemSummary => ({
  uuid,
  stashUuid: 'stash-1',
  skuUuid: `sku-${uuid}`,
  skuGroupKey: `code-${uuid}:010`,
  brand: '테스트',
  code: `code-${uuid}`,
  colorCode: '010',
    thumbnailUrl: null,
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

const recommendation: (skuUuid: string) => CandidateReferenceItemSummary = (skuUuid: string): CandidateReferenceItemSummary => ({
  uuid: skuUuid,
  skuGroupKey: skuUuid,
  brand: '추천브랜드',
  code: `code-${skuUuid}`,
  colorCode: '010',
    thumbnailUrl: null,
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

const candidateItem: (uuid: string, skuUuid: string) => CandidateStashItemSummary = (uuid: string, skuUuid: string): CandidateStashItemSummary => ({
  uuid,
  stashUuid: 'stash-1',
  skuUuid,
  skuGroupKey: skuUuid,
  isLatestLlmComment: false,
  hasSnapshot: false,
  dbCreatedAt: '2026-05-19T01:00:00.000Z',
  dbUpdatedAt: '2026-05-19T01:00:00.000Z',
})

describe('removeCandidateItemsByUuid', () : void => {
  it('removes only matching candidate items', () : void => {
    const items: CandidateItemSummary[] = [item('a'), item('b'), item('c')]

    expect(removeCandidateItemsByUuid(items, ['b']).map((row: CandidateItemSummary) : string => row.uuid)).toEqual(['a', 'c'])
  })

  it('keeps reference when no item is removed', () : void => {
    const items: CandidateItemSummary[] = [item('a')]

    expect(removeCandidateItemsByUuid(items, ['x'])).toBe(items)
  })
})

describe('appendRecommendedCandidateItems', () : void => {
  it('prepends newly created recommendation rows and marks order metrics as loading', () : void => {
    const items: CandidateItemSummary[] = [item('a')]
    const next: CandidateItemSummary[] = appendRecommendedCandidateItems(
      items,
      [candidateItem('new-1', 'sku-new')],
      [recommendation('sku-new')],
    )

    expect(next.map((row: CandidateItemSummary) : string => row.uuid)).toEqual(['new-1', 'a'])
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

  it('matches an appended candidate item by candidateItem.skuUuid to recommendation row uuid', () : void => {
    const selectedRow: { uuid: string; skuGroupKey: string; brand: string; code: string; productName: string; colorCode: string; thumbnailUrl: string | null; insight: CandidateItemInsightSummary; } = {
      ...recommendation('selected-row-uuid'),
      uuid: 'sku-target',
      skuGroupKey: 'different-group-key',
    }
    const next: CandidateItemSummary[] = appendRecommendedCandidateItems(
      [],
      [candidateItem('new-1', 'sku-target')],
      [selectedRow],
    )

    expect(next[0]).toMatchObject({
      uuid: 'new-1',
      skuUuid: 'sku-target',
      skuGroupKey: 'sku-target',
      productName: '추천 selected-row-uuid',
    })
  })

  it('keeps reference when the backend returned no newly created item', () : void => {
    const items: CandidateItemSummary[] = [item('a')]

    expect(appendRecommendedCandidateItems(items, [], [recommendation('sku-new')])).toBe(items)
  })

  it('does not duplicate an already visible sku item', () : void => {
    const items: CandidateItemSummary[] = [item('a')]

    expect(appendRecommendedCandidateItems(
      items,
      [candidateItem('duplicate', items[0].skuUuid)],
      [recommendation(items[0].skuUuid)],
    )).toBe(items)
  })

  it('throws when the created candidate item has no matching recommendation row', () : void => {
    expect(() : CandidateItemSummary[] => appendRecommendedCandidateItems(
      [],
      [candidateItem('new-1', 'sku-missing')],
      [],
    )).toThrow(
      '추천 추가 응답 불일치: candidateItem.skuUuid는 선택한 추천 row uuid와 일치해야 합니다',
    )
  })

  it('throws instead of partially appending when only part of the append response matches selected rows', () : void => {
    expect(() : CandidateItemSummary[] => appendRecommendedCandidateItems(
      [],
      [candidateItem('new-1', 'sku-new'), candidateItem('new-2', 'sku-missing')],
      [recommendation('sku-new')],
    )).toThrow('candidateItem.skuUuid=sku-missing에 해당하는 추천 row가 없습니다')
  })

  it('throws when a duplicate sku response cannot be matched to a selected recommendation row', () : void => {
    const items: CandidateItemSummary[] = [item('a')]

    expect(() : CandidateItemSummary[] => appendRecommendedCandidateItems(
      items,
      [candidateItem('duplicate', items[0].skuUuid)],
      [],
    )).toThrow('candidateItem.skuUuid=sku-a에 해당하는 추천 row가 없습니다')
  })
})
