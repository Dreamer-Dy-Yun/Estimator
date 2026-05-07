import { describe, expect, it } from 'vitest'
import {
  computeClientStockOrder,
  dailyMeanSigmaFromTrend,
  forecastDailyMeanFromModel,
  zFromServiceLevelPct,
} from './clientStockOrderCompute'
import type { MonthlySalesPoint } from '../../../../../types'

function p(date: string, sales: number): MonthlySalesPoint {
  return { date, sales, isForecast: false }
}

describe('clientStockOrderCompute helpers', () => {
  it('maps service level to z-value by threshold', () => {
    expect(zFromServiceLevelPct(99)).toBe(2.33)
    expect(zFromServiceLevelPct(98)).toBe(2.05)
    expect(zFromServiceLevelPct(95)).toBe(1.65)
    expect(zFromServiceLevelPct(90)).toBe(1.28)
    expect(zFromServiceLevelPct(85)).toBe(1.04)
    expect(zFromServiceLevelPct(70)).toBe(0.84)
  })

  it('handles threshold boundaries exactly', () => {
    expect(zFromServiceLevelPct(84.9)).toBe(0.84)
    expect(zFromServiceLevelPct(85)).toBe(1.04)
    expect(zFromServiceLevelPct(89.9)).toBe(1.04)
    expect(zFromServiceLevelPct(90)).toBe(1.28)
  })

  it('computes mean/sigma from period range using real month days', () => {
    const trend = [
      p('2026-01', 310),
      p('2026-02', 280),
    ]
    const { dailyMean, sigma } = dailyMeanSigmaFromTrend(trend, '2026-01-01', '2026-02-28')
    expect(dailyMean).toBe(10)
    expect(sigma).toBe(0)
  })

  it('falls back to last 6 months when selected range is empty', () => {
    const trend = [
      p('2025-01', 310), p('2025-02', 280), p('2025-03', 310),
      p('2025-04', 300), p('2025-05', 310), p('2025-06', 300), p('2025-07', 310),
    ]
    const { dailyMean } = dailyMeanSigmaFromTrend(trend, '2026-01-01', '2026-01-31')
    expect(dailyMean).toBeGreaterThan(9.5)
    expect(dailyMean).toBeLessThan(10.5)
  })

  it('weights recent months more in forecast mean', () => {
    const trend = [
      p('2026-01', 310), // 10/day
      p('2026-02', 336), // 12/day
      p('2026-03', 465), // 15/day
    ]
    const weighted = forecastDailyMeanFromModel(trend, '2026-01-01', '2026-03-31')
    const simple = (10 + 12 + 15) / 3
    expect(weighted).toBeGreaterThan(simple)
  })
})

describe('computeClientStockOrder', () => {
  const trend = [p('2026-01', 310), p('2026-02', 280)]

  it('uses manual safety stock when mode is manual', () => {
    const out = computeClientStockOrder({
      monthlySalesTrend: trend,
      periodStart: '2026-01-01',
      periodEnd: '2026-02-28',
      serviceLevelPct: 95,
      leadTimeDays: 10,
      safetyStockMode: 'manual',
      manualSafetyStock: 7,
      dailyMeanClient: 12,
      availableStock: 20,
      price: 100,
    })

    expect(out.trendDailyMean).toBe(10)
    expect(out.forecastDailyMean).toBe(12)
    expect(out.safetyStock).toBe(7)
    expect(out.safetyRecQty).toBe(87)
    expect(out.forecastRecQty).toBe(126)
    expect(out.safetyExpectedSalesAmount).toBe(8700)
    expect(out.safetyExpectedOrderAmount).toBe(6786)
    expect(out.safetyExpectedOpProfit).toBe(783)
  })

  it('uses formula stock and clamps negative custom mean to zero', () => {
    const out = computeClientStockOrder({
      monthlySalesTrend: trend,
      periodStart: '2026-01-01',
      periodEnd: '2026-02-28',
      serviceLevelPct: 95,
      leadTimeDays: 10,
      safetyStockMode: 'formula',
      manualSafetyStock: 0,
      dailyMeanClient: -1,
      availableStock: 150,
      price: 100,
    })

    expect(out.forecastMuRaw).toBe(0)
    expect(out.safetyStock).toBe(100)
    expect(out.safetyRecQty).toBe(50)
    expect(out.forecastRecQty).toBe(0)
  })

  it('clamps negative leadTimeDays to zero and handles zero price', () => {
    const out = computeClientStockOrder({
      monthlySalesTrend: trend,
      periodStart: '2026-01-01',
      periodEnd: '2026-02-28',
      serviceLevelPct: 90,
      leadTimeDays: -10,
      safetyStockMode: 'formula',
      manualSafetyStock: 999,
      dailyMeanClient: null,
      availableStock: 123,
      price: 0,
    })
    expect(out.safetyStock).toBe(0)
    expect(out.safetyRecQty).toBe(0)
    expect(out.safetyExpectedSalesAmount).toBe(0)
    expect(out.safetyExpectedOrderAmount).toBe(0)
    expect(out.safetyExpectedOpProfit).toBe(0)
  })
})
