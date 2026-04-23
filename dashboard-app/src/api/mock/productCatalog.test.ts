import { describe, expect, it } from 'vitest'
import { estimatePeriodWeight, historicalMonths, makeSalesTrend } from './productCatalog'

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
    expect(maxTrend).toHaveLength(historicalMonths.length + 24)
    expect(maxTrend.filter((p) => p.isForecast)).toHaveLength(24)
    expect(maxTrend.at(-1)?.date).toBe('2027-12')
  })

  it('rounds forecast months before clamping', () => {
    const rounded = makeSalesTrend(1000, 66, 7.6)
    expect(rounded.filter((p) => p.isForecast)).toHaveLength(8)
  })

  it('keeps generated sales above minimum floor', () => {
    const trend = makeSalesTrend(1, 1, 8)
    expect(Math.min(...trend.map((p) => p.sales))).toBeGreaterThanOrEqual(80)
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
