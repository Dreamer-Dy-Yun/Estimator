import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clampForecastMonths,
  readForecastMonthsFromStorage,
  writeForecastMonthsToStorage,
} from './forecastMonthsStorage'

describe('forecastMonthsStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clamps forecast months into 1..24 and rounds', () => {
    expect(clampForecastMonths(1)).toBe(1)
    expect(clampForecastMonths(24)).toBe(24)
    expect(clampForecastMonths(24.6)).toBe(24)
    expect(clampForecastMonths(0)).toBe(1)
    expect(clampForecastMonths(-10)).toBe(1)
    expect(clampForecastMonths(999)).toBe(24)
    expect(clampForecastMonths(Number.NaN)).toBe(8)
  })

  it('returns default when window is undefined', () => {
    vi.stubGlobal('window', undefined)
    expect(readForecastMonthsFromStorage()).toBe(8)
  })

  it('reads and clamps value from localStorage when available', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
    })
    store.set('han.dashboard.salesTrendForecastMonths', '25')
    expect(readForecastMonthsFromStorage()).toBe(24)
  })

  it('returns default for non-numeric or empty storage value', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
    })
    store.set('han.dashboard.salesTrendForecastMonths', 'abc')
    expect(readForecastMonthsFromStorage()).toBe(8)
    store.set('han.dashboard.salesTrendForecastMonths', '')
    expect(readForecastMonthsFromStorage()).toBe(8)
  })

  it('parses integer prefix from decimal-like value', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
    })
    store.set('han.dashboard.salesTrendForecastMonths', '12.7')
    expect(readForecastMonthsFromStorage()).toBe(12)
  })

  it('returns default when localStorage read throws', () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => undefined,
    })
    expect(readForecastMonthsFromStorage()).toBe(8)
  })

  it('writes clamped value and ignores write exceptions', () => {
    const written: Array<[string, string]> = []
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: (k: string, v: string) => {
        written.push([k, v])
      },
    })
    writeForecastMonthsToStorage(25.2)
    expect(written).toEqual([['han.dashboard.salesTrendForecastMonths', '24']])

    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    })
    expect(() => writeForecastMonthsToStorage(5)).not.toThrow()
  })
})
