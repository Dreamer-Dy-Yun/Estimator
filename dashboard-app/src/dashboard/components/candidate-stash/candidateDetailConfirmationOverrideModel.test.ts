import type { CandidateDetailConfirmationOverrideResult } from './candidateDetailConfirmationOverrideModel'
import { describe, expect, it } from 'vitest'
import type { CandidateItemSummary } from '../../../api'
import type { OrderSnapshotDocument } from '../../../snapshot/orderSnapshotTypes'
import {
  applyCandidateDetailConfirmationOverrides,
  createCandidateDetailConfirmationOverride,
  type CandidateDetailConfirmationOverrideMap,
} from './candidateDetailConfirmationOverrideModel'

const snapshot: OrderSnapshotDocument = {} as OrderSnapshotDocument

function item(
  uuid: string,
  isDetailConfirmed: boolean,
  dbUpdatedAt: string,
): CandidateItemSummary {
  return {
    uuid,
    stashUuid: 'stash-1',
    skuUuid: `sku-${uuid}`,
    skuGroupKey: `sku-${uuid}`,
    brand: '브랜드',
    code: 'CODE',
    productName: '상품',
    colorCode: '010',
    orderMetricStatus: 'loading',
    qty: 0,
    expectedOrderAmount: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    insightStatus: 'loading',
    insight: {
      competitorChannelLabel: '크림',
      competitorQty: null,
      competitorAmount: null,
      selfQty: null,
      selfAmount: null,
      expectedSalesQty: 0,
      expectedSalesAmount: 0,
      expectedOpProfit: 0,
      selfOpProfitRatePct: null,
      rankTone: 'neutral',
      topPercentThreshold: 0,
      bottomPercentThreshold: 0,
      badges: [],
    },
    isLatestLlmComment: true,
    isDetailConfirmed,
    orderExport: null,
    dbCreatedAt: '2026-05-18T00:00:00.000Z',
    dbUpdatedAt,
  }
}

describe('candidateDetailConfirmationOverrideModel', () : void => {
  it('keeps a confirmed mutation over a stale unconfirmed list response', () : void => {
    const overrides: CandidateDetailConfirmationOverrideMap = {
      item1: createCandidateDetailConfirmationOverride(item('item1', false, 't1'), true, snapshot),
    }

    const result: CandidateDetailConfirmationOverrideResult = applyCandidateDetailConfirmationOverrides([item('item1', false, 't1')], overrides)

    expect(result.items[0]?.isDetailConfirmed).toBe(true)
    expect(result.items[0]?.isLatestLlmComment).toBe(false)
    expect(result.overrides.item1).toBeDefined()
  })

  it('keeps an unconfirmed mutation over a stale confirmed list response', () : void => {
    const overrides: CandidateDetailConfirmationOverrideMap = {
      item1: createCandidateDetailConfirmationOverride(item('item1', true, 't1'), false, null),
    }

    const result: CandidateDetailConfirmationOverrideResult = applyCandidateDetailConfirmationOverrides([item('item1', true, 't1')], overrides)

    expect(result.items[0]?.isDetailConfirmed).toBe(false)
    expect(result.overrides.item1).toBeDefined()
  })

  it('releases the override when the server returns the new state with a newer dbUpdatedAt', () : void => {
    const overrides: CandidateDetailConfirmationOverrideMap = {
      item1: createCandidateDetailConfirmationOverride(item('item1', false, 't1'), true, snapshot),
    }

    const result: CandidateDetailConfirmationOverrideResult = applyCandidateDetailConfirmationOverrides([item('item1', true, 't2')], overrides)

    expect(result.items[0]?.isDetailConfirmed).toBe(true)
    expect(result.overrides.item1).toBeUndefined()
  })

  it('drops overrides for items missing from the latest list response', () : void => {
    const overrides: CandidateDetailConfirmationOverrideMap = {
      item1: createCandidateDetailConfirmationOverride(item('item1', false, 't1'), true, snapshot),
    }

    const result: CandidateDetailConfirmationOverrideResult = applyCandidateDetailConfirmationOverrides([], overrides)

    expect(result.items).toEqual([])
    expect(result.overrides.item1).toBeUndefined()
  })
})
