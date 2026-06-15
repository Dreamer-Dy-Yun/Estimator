import type { MonthlySalesPoint } from '../../types'
import type { SecondaryDailyTrendPoint, SecondaryDailyTrendSource } from '../types'
import { describe, expect, it } from 'vitest'
import { buildSecondaryDailyTrendPoints } from '../../dashboard/components/product-drawer/secondary/model/secondaryDailyTrendSourceModel'
import { buildSecondaryDailyTrend, buildSecondaryDailyTrendSource } from './secondaryDailyTrendBuilders'

describe('secondaryDailyTrendBuilders', () : void => {
  it('derives source stock state from daily mock points instead of monthly closing stock', () : void => {
    const monthlyTrend: MonthlySalesPoint[] = [
      { date: '2026-04', sales: 300, isForecast: false },
    ]
    const monthlyStockTrend: { date: string; stock: number; inboundExpected: number; }[] = [
      { date: '2026-04', stock: 0, inboundExpected: 300 },
    ]

    const legacyPoints: SecondaryDailyTrendPoint[] = buildSecondaryDailyTrend(
      monthlyTrend,
      monthlyStockTrend,
      '2026-04-01',
      '2026-04-03',
      0,
      1,
    )
    const source: SecondaryDailyTrendSource = buildSecondaryDailyTrendSource(
      'test-product',
      monthlyTrend,
      monthlyStockTrend,
      '2026-04-01',
      '2026-04-03',
      0,
      1,
    )
    const rebuiltPoints: SecondaryDailyTrendPoint[] = buildSecondaryDailyTrendPoints(source)
    const firstLegacyStock: number | null | undefined = legacyPoints[0]?.stockBar
    const firstRebuiltStock: number | null | undefined = rebuiltPoints[0]?.stockBar
    const baseStockAtStart: number | null = source.baseStockAtStart

    if (firstLegacyStock == null || firstRebuiltStock == null || baseStockAtStart == null) {
      throw new Error('Expected mock source to include stock state.')
    }

    expect(firstLegacyStock).toBeGreaterThan(0)
    expect(baseStockAtStart).toBeGreaterThan(0)
    expect(source.flowByDate['2026-04-01']?.base.inbound).toBe(0)
    expect(firstRebuiltStock).toBe(firstLegacyStock)
    expect(rebuiltPoints.some((point: SecondaryDailyTrendPoint) : boolean => (point.stockBar ?? 0) > 0)).toBe(true)
  })

  it('keeps forecast comparison sales numeric in the source contract', () : void => {
    const monthlyTrend: MonthlySalesPoint[] = [
      { date: '2026-04', sales: 300, isForecast: false },
    ]
    const monthlyStockTrend: { date: string; stock: number; inboundExpected: number; }[] = [
      { date: '2026-04', stock: 100, inboundExpected: 0 },
    ]

    const source: SecondaryDailyTrendSource = buildSecondaryDailyTrendSource(
      'test-product',
      monthlyTrend,
      monthlyStockTrend,
      '2026-04-01',
      '2026-04-02',
      2,
      2,
    )

    expect(source.flowByDate[source.forecastStartDate]?.comparison.sale).toBeGreaterThan(0)
  })
})
