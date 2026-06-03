import { describe, expect, it } from 'vitest'
import type { SelfSalesRow } from '../types'
import { selfSalesWeightedMarginRate, selfSalesWeightedOpMarginRate } from './analysisKpiWeighted'

function row(amount: number, marginRate: number, opMarginRate: number): SelfSalesRow {
  return {
    id: `row-${amount}-${marginRate}-${opMarginRate}`,
    skuGroupKey: `sku-${amount}-${marginRate}-${opMarginRate}`,
    rank: 1,
    rankPercentile: 1,
    brand: '브랜드',
    category: '카테고리',
    code: 'CODE',
    productName: '상품',
    colorCode: '010',
    avgPrice: 0,
    qty: 0,
    amount,
    avgCost: 0,
    marginRate,
    feeRate: 0,
    opMarginRate,
    opMarginAmount: 0,
  }
}

describe('analysis KPI weighted helpers', () : void => {
  it('calculates sales-amount weighted margin rates', () : void => {
    const rows: SelfSalesRow[] = [
      row(100, 10, 20),
      row(300, 30, 40),
    ]

    expect(selfSalesWeightedMarginRate(rows)).toBe(25)
    expect(selfSalesWeightedOpMarginRate(rows)).toBe(35)
  })

  it('returns 0 when the filtered total sales amount is zero', () : void => {
    const rows: SelfSalesRow[] = [
      row(0, 10, 20),
      row(0, 30, 40),
    ]

    expect(selfSalesWeightedMarginRate(rows)).toBe(0)
    expect(selfSalesWeightedOpMarginRate(rows)).toBe(0)
  })
})
