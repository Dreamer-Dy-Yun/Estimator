import type { SecondaryDailyTrendSource } from '../../../../../api/types'
import { describe, expect, it } from 'vitest'
import { buildSecondaryDailyTrendPoints, validateSecondaryDailyTrendSource } from './secondaryDailyTrendSourceModel'

function makeSource(overrides: Partial<SecondaryDailyTrendSource> = {}): SecondaryDailyTrendSource {
  return {
    productId: 'sku-a',
    dateStart: '2026-04-01',
    dateEnd: '2026-04-02',
    forecastStartDate: '2026-04-03',
    baseStockAtStart: 10,
    comparisonStockAtStart: null,
    flowByDate: {
      '2026-04-01': {
        base: { sale: 3, inbound: 2 },
        comparison: { sale: 5, inbound: null },
      },
      '2026-04-02': {
        base: { sale: 4, inbound: 0 },
        comparison: { sale: 6, inbound: null },
      },
    },
    ...overrides,
  }
}

describe('secondaryDailyTrendSourceModel', (): void => {
  it('builds inclusive daily points from opening stock and numeric base inbound flow', (): void => {
    const points = buildSecondaryDailyTrendPoints(makeSource())

    expect(points.map((point) => ({ date: point.date, stockBar: point.stockBar, inboundAccumBar: point.inboundAccumBar }))).toEqual([
      { date: '2026-04-01', stockBar: 9, inboundAccumBar: 2 },
      { date: '2026-04-02', stockBar: 5, inboundAccumBar: 0 },
    ])
    expect(points.every((point) => point.isForecast === false)).toBe(true)
    expect(points[0]?.comparisonSales).toBe(5)
  })

  it('keeps stock bars unavailable when opening stock is unavailable', (): void => {
    const points = buildSecondaryDailyTrendPoints(makeSource({ baseStockAtStart: null }))

    expect(points.map((point) => point.stockBar)).toEqual([null, null])
    expect(points.map((point) => point.inboundAccumBar)).toEqual([2, 0])
  })

  it('rejects null base inbound while accepting nullable comparison inbound', (): void => {
    const source: SecondaryDailyTrendSource = makeSource({
      flowByDate: {
        '2026-04-01': {
          base: { sale: 3, inbound: null } as unknown as SecondaryDailyTrendSource['flowByDate'][string]['base'],
          comparison: { sale: 5, inbound: null },
        },
        '2026-04-02': {
          base: { sale: 4, inbound: 0 },
          comparison: { sale: 6, inbound: null },
        },
      },
    })

    expect(() => buildSecondaryDailyTrendPoints(source)).toThrow('2026-04-01.base.inbound')
  })

  it('throws when flowByDate misses an inclusive date', (): void => {
    const source: SecondaryDailyTrendSource = makeSource({
      flowByDate: {
        '2026-04-01': {
          base: { sale: 3, inbound: 0 },
          comparison: { sale: 5, inbound: null },
        },
      },
    })

    expect(() => buildSecondaryDailyTrendPoints(source)).toThrow('Missing daily trend source date: 2026-04-02')
  })

  it('throws when dateEnd is before dateStart', (): void => {
    expect(() => buildSecondaryDailyTrendPoints(makeSource({ dateEnd: '2026-03-31' }))).toThrow('dateEnd')
  })

  it('validates response identity against the request window', (): void => {
    const source: SecondaryDailyTrendSource = makeSource()

    expect(validateSecondaryDailyTrendSource(source, {
      productId: 'sku-a',
      dateStart: '2026-04-01',
      dateEnd: '2026-04-02',
      forecastStartDate: '2026-04-03',
    })).toBe(source)
    expect(() => validateSecondaryDailyTrendSource(source, {
      productId: 'other-sku',
      dateStart: '2026-04-01',
      dateEnd: '2026-04-02',
      forecastStartDate: '2026-04-03',
    })).toThrow('productId mismatch')
    expect(() => validateSecondaryDailyTrendSource(source, {
      productId: 'sku-a',
      dateStart: '2026-04-01',
      dateEnd: '2026-04-05',
      forecastStartDate: '2026-04-03',
    })).toThrow('dateEnd mismatch')
  })
})
