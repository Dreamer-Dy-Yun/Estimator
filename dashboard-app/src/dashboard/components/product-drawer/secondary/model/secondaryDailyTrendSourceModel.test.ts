import type { SecondaryDailyTrendSource } from '../../../../../api/types'
import { describe, expect, it } from 'vitest'
import { buildSecondaryDailyTrendPoints, validateSecondaryDailyTrendSource } from './secondaryDailyTrendSourceModel'

const EXPECTATION = {
  size: null,
  dateStart: '2026-04-01',
  dateEnd: '2026-04-02',
  forecastStartDate: '2026-04-03',
} as const

function makeSource(overrides: Partial<SecondaryDailyTrendSource> = {}): SecondaryDailyTrendSource {
  return {
    size: null,
    baseStock: 10,
    data: {
      base: {
        '2026-04-01': { sale: 3, inbound: 2 },
        '2026-04-02': { sale: 4, inbound: 0 },
      },
      comparison: {
        '2026-04-01': { sale: 5, inbound: null },
        '2026-04-02': { sale: 6, inbound: null },
      },
    },
    ...overrides,
  }
}

describe('secondaryDailyTrendSourceModel', (): void => {
  it('builds inclusive daily points from opening stock and numeric base inbound flow', (): void => {
    const points = buildSecondaryDailyTrendPoints(makeSource(), EXPECTATION)

    expect(points.map((point) => ({ date: point.date, stockBar: point.stockBar, inboundAccumBar: point.inboundAccumBar }))).toEqual([
      { date: '2026-04-01', stockBar: 9, inboundAccumBar: 2 },
      { date: '2026-04-02', stockBar: 5, inboundAccumBar: 0 },
    ])
    expect(points.every((point) => point.isForecast === false)).toBe(true)
    expect(points[0]?.comparisonSales).toBe(5)
  })

  it('keeps stock bars unavailable when opening stock is unavailable', (): void => {
    const points = buildSecondaryDailyTrendPoints(makeSource({ baseStock: null }), EXPECTATION)

    expect(points.map((point) => point.stockBar)).toEqual([null, null])
    expect(points.map((point) => point.inboundAccumBar)).toEqual([2, 0])
  })

  it('rejects null base inbound while accepting nullable comparison inbound', (): void => {
    const source: SecondaryDailyTrendSource = makeSource({
      data: {
        base: {
          '2026-04-01': { sale: 3, inbound: null } as unknown as SecondaryDailyTrendSource['data']['base'][string],
          '2026-04-02': { sale: 4, inbound: 0 },
        },
        comparison: {
          '2026-04-01': { sale: 5, inbound: null },
          '2026-04-02': { sale: 6, inbound: null },
        },
      },
    })

    expect(() => buildSecondaryDailyTrendPoints(source, EXPECTATION)).toThrow('2026-04-01.base.inbound')
  })

  it('throws when daily trend data misses an inclusive date', (): void => {
    const source: SecondaryDailyTrendSource = makeSource({
      data: {
        base: {
          '2026-04-01': { sale: 3, inbound: 0 },
        },
        comparison: {
          '2026-04-01': { sale: 5, inbound: null },
        },
      },
    })

    expect(() => buildSecondaryDailyTrendPoints(source, EXPECTATION)).toThrow('Missing daily trend source date: 2026-04-02')
  })

  it('throws when dateEnd is before dateStart', (): void => {
    expect(() => buildSecondaryDailyTrendPoints(makeSource(), { ...EXPECTATION, dateEnd: '2026-03-31' })).toThrow('dateEnd')
  })

  it('validates response identity against the request window', (): void => {
    const source: SecondaryDailyTrendSource = makeSource()

    expect(validateSecondaryDailyTrendSource(source, EXPECTATION)).toBe(source)
    expect(() => validateSecondaryDailyTrendSource(source, {
      ...EXPECTATION,
      size: 'M',
    })).toThrow('size mismatch')
    expect(() => buildSecondaryDailyTrendPoints(source, {
      ...EXPECTATION,
      dateStart: '2026-04-01',
      dateEnd: '2026-04-05',
    })).toThrow('Missing daily trend source date: 2026-04-03')
  })
})
