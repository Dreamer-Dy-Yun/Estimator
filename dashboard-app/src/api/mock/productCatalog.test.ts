import { describe, expect, it } from 'vitest'
import { estimatePeriodWeight, historicalMonths, makeSalesTrend, productPrimaryBySkuGroupKey, productSecondaryBySkuGroupKey } from './productCatalog'
import { skuGroupKeyByLegacyId } from './salesTables'

describe('api/mock productCatalog', () => {
  it('exposes historical month bounds as 2024-07..2025-12', () => {
    expect(historicalMonths[0]).toBe('2024-07')
    expect(historicalMonths.at(-1)).toBe('2025-12')
    expect(historicalMonths).toHaveLength(18)
  })

  it('builds sales trend with historical + clamped forecast months', () => {
    const minTrend = makeSalesTrend(1000, 66, 0)
    expect(minTrend).toHaveLength(historicalMonths.length + 1)
    expect(minTrend[0]?.date).toBe(historicalMonths[0])
    expect(minTrend.at(-1)?.date).toBe('2026-01')
    expect(minTrend.filter((p) => p.isForecast)).toHaveLength(1)

    const maxTrend = makeSalesTrend(1000, 66, 99)
    expect(maxTrend).toHaveLength(historicalMonths.length + 12)
    expect(maxTrend.filter((p) => p.isForecast)).toHaveLength(12)
    expect(maxTrend.at(-1)?.date).toBe('2026-12')
  })

  it('builds monthly trend from requested 24 completed months plus 12 forecast months', () => {
    const trend = makeSalesTrend(1000, 66, 12, {
      historyStartMonth: '2024-05',
      historyEndMonth: '2026-04',
      forecastStartMonth: '2026-05',
    })

    expect(trend).toHaveLength(36)
    expect(trend[0]?.date).toBe('2024-05')
    expect(trend.at(-1)?.date).toBe('2027-04')
    expect(trend.filter((p) => p.isForecast)).toHaveLength(12)
  })

  it('rounds forecast months before clamping', () => {
    const rounded = makeSalesTrend(1000, 66, 7.6)
    expect(rounded.filter((p) => p.isForecast)).toHaveLength(8)
  })

  it('keeps generated sales above minimum floor', () => {
    const trend = makeSalesTrend(1, 1, 8)
    expect(Math.min(...trend.map((p) => p.sales))).toBeGreaterThanOrEqual(80)
  })

  it('uses apparel sizes for test top and shoe sizes for test shoe', () => {
    const top = productPrimaryBySkuGroupKey[skuGroupKeyByLegacyId.TEST_TOP]
    const shoe = productPrimaryBySkuGroupKey[skuGroupKeyByLegacyId.TEST_SHOE]

    expect(top?.productName).toBe('테스트 상의')
    expect(productSecondaryBySkuGroupKey[skuGroupKeyByLegacyId.TEST_TOP]?.sizeRows.map((row) => row.size)).toEqual(['S', 'M', 'L', 'XL', 'XXL'])
    expect(shoe?.productName).toBe('테스트 신발')
    expect(productSecondaryBySkuGroupKey[skuGroupKeyByLegacyId.TEST_SHOE]?.sizeRows.map((row) => row.size)).toEqual([
      '235',
      '240',
      '245',
      '250',
      '255',
      '260',
      '265',
      '270',
      '275',
      '280',
    ])
  })

  it('keeps test top values simple enough to verify drawer calculations by hand', () => {
    const top = productPrimaryBySkuGroupKey[skuGroupKeyByLegacyId.TEST_TOP]
    const secondary = productSecondaryBySkuGroupKey[skuGroupKeyByLegacyId.TEST_TOP]

    expect(top).toMatchObject({
      price: 100000,
      qty: 2400,
      availableStock: 1200,
    })
    expect(secondary?.competitorPrice).toBe(110000)
    expect(secondary?.competitorQty).toBe(4800)
    expect(secondary?.sizeRows).toHaveLength(5)
    expect(secondary?.sizeRows.every((row) => (
      row.selfRatio === 20
      && row.confirmedQty === 400
      && row.qty === 480
      && row.availableStock === 240
    ))).toBe(true)
    expect(secondary?.sizeRows.reduce((sum, row) => sum + row.confirmedQty, 0)).toBe(2000)
    expect(top?.monthlySalesTrend?.every((point) => point.sales === 200)).toBe(true)
  })

  it('computes period weight with 0.2~1.8 clamp', () => {
    expect(estimatePeriodWeight()).toBe(1)
    expect(estimatePeriodWeight('2026-01', '2026-01')).toBeCloseTo(0.2, 6)
    expect(estimatePeriodWeight('2026-01', '2026-12')).toBeCloseTo(1, 6)
    expect(estimatePeriodWeight('2024-01', '2030-12')).toBeCloseTo(1.8, 6)
    // reversed range should be treated same span
    expect(estimatePeriodWeight('2026-06', '2026-01')).toBeCloseTo(0.5, 6)
  })
})
